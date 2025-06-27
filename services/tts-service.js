require("dotenv").config();
const { Buffer } = require("node:buffer");
const EventEmitter = require("events");
const fetch = require("node-fetch");

class TextToSpeechService extends EventEmitter {
  constructor() {
    super();
    this.nextExpectedIndex = 0;
    this.speechBuffer = {};
    this.voiceId = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM"; // Default to Rachel voice
    this.model = "eleven_flash_v2";
    this.optimizationLevel = 3; // Highest optimization for latency
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
        console.log(`Attempt ${attempt} to generate TTS for: ${partialResponse}`.cyan);
        const response = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${this.voiceId}/stream`,
          {
            method: "POST",
            headers: {
              "xi-api-key": process.env.ELEVENLABS_API_KEY,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              text: partialResponse,
              model_id: this.model,
              voice_settings: {
                stability: 0.5,
                similarity_boost: 0.75,
                style: 0.5,
                use_speaker_boost: true
              },
              optimize_streaming_latency: this.optimizationLevel
            }),
            timeout: 5000,
           }
          ); // 5-second timeout for lower latency

        if (response.status === 200) {
          const audioArrayBuffer = await response.arrayBuffer();
          const base64String = Buffer.from(audioArrayBuffer).toString("base64");
          this.emit(
            "speech",
            partialResponseIndex,
            base64String,
            partialResponse,
            interactionCount
          );
          console.log(`TTS generation successful for: ${partialResponse}`.green);
          return;
        } else {
          console.log(`ElevenLabs TTS error (Status: ${response.status}): ${await response.text()}`.yellow);
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