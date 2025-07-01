require("dotenv").config();
const { Buffer } = require("node:buffer");
const EventEmitter = require("events");
const fetch = require("node-fetch");
const ffmpeg = require("fluent-ffmpeg");
const { Readable } = require("stream");

class TextToSpeechService extends EventEmitter {
  constructor() {
    super();
    this.nextExpectedIndex = 0;
    this.speechBuffer = {};
  }

  // Convert MP3 buffer to mulaw
  async convertToMulaw(mp3Buffer) {
    return new Promise((resolve, reject) => {
      const inputStream = new Readable();
      inputStream.push(mp3Buffer);
      inputStream.push(null);

      const outputBuffers = [];
      ffmpeg(inputStream)
        .inputFormat("mp3")
        .audioCodec("pcm_mulaw")
        .audioFrequency(8000)
        .audioChannels(1)
        .format("mulaw")
        .on("error", (err) => reject(new Error(`FFmpeg error: ${err.message}`)))
        .on("end", () => resolve(Buffer.concat(outputBuffers)))
        .pipe()
        .on("data", (chunk) => outputBuffers.push(chunk));
    });
  }

  async generate(gptReply, interactionCount) {
    const { partialResponseIndex, partialResponse } = gptReply;

    if (!partialResponse) {
      return;
    }

    const maxRetries = 3;
    const retryDelay = 1000; // 1 second delay between retries

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempt ${attempt} to generate TTS for: ${partialResponse}`);
        const response = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}?optimize_streaming_latency=4`,
          {
            method: "POST",
            headers: {
              "xi-api-key": `${process.env.ELEVENLABS_API_KEY}`,
              "Content-Type": "application/json",
              "Accept": "audio/mpeg"
            },
            body: JSON.stringify({
              text: partialResponse,
              model_id: "eleven_multilingual_v2",
              voice_settings: {
                stability: 0.5,
                similarity_boost: 0.75,
                style: 0.2,
                use_speaker_boost: true
              }
            }),
            timeout: 10000 // 10-second timeout
          }
        );

        if (response.status === 200) {
          const blob = await response.blob();
          const audioArrayBuffer = await blob.arrayBuffer();
          console.log(`MP3 buffer size: ${audioArrayBuffer.byteLength} bytes`);

          // Convert to mulaw
          const mulawBuffer = await this.convertToMulaw(Buffer.from(audioArrayBuffer));
          console.log(`Mulaw buffer size: ${mulawBuffer.length} bytes`);

          const base64String = mulawBuffer.toString("base64");
          console.log(`Base64 string length: ${base64String.length}`);

          this.emit(
            "speech",
            partialResponseIndex,
            base64String,
            partialResponse,
            interactionCount
          );
          console.log(`TTS generation successful for: ${partialResponse}`);
          return;
        } else {
          console.log(`ElevenLabs TTS error (Status: ${response.status}): ${await response.text()}`);
          if (attempt === maxRetries) throw new Error(`Failed after ${maxRetries} attempts with status ${response.status}`);
        }
      } catch (err) {
        console.error(`Error occurred in TextToSpeech service (Attempt ${attempt}):`, err);
        if (attempt === maxRetries) throw err;
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }
}

module.exports = { TextToSpeechService };