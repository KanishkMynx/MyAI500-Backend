require("colors");
const { createClient, LiveTranscriptionEvents } = require("@deepgram/sdk");
const { Buffer } = require("node:buffer");
const EventEmitter = require("events");

class TranscriptionService extends EventEmitter {
  constructor() {
    super();
    const deepgram = createClient(process.env.DEEPGRAM_API_KEY);
    this.dgConnection = deepgram.listen.live({
      encoding: "mulaw",
      sample_rate: 8000,
      model: "nova-2",
      punctuate: true,
      interim_results: true,
      endpointing: 50, // 50ms for fast interim results
      utterance_end_ms: 1000,
      smart_format: true
    });

    this.finalResult = "";
    this.speechFinal = false;

    this.dgConnection.on(LiveTranscriptionEvents.Open, () => {
      console.log("STT -> Deepgram connection opened".green);
    });

    this.dgConnection.on(LiveTranscriptionEvents.Transcript, (transcriptionEvent) => {
      const alternatives = transcriptionEvent.channel?.alternatives;
      let text = alternatives?.[0]?.transcript || "";

      // Emit interim results
      if (text.trim().length > 0 && !transcriptionEvent.is_final) {
        this.emit("utterance", text);
      }

      // Handle UtteranceEnd
      if (transcriptionEvent.type === "UtteranceEnd") {
        if (!this.speechFinal && this.finalResult.trim().length > 0) {
          console.log(`UtteranceEnd: ${this.finalResult}`.yellow);
          this.emit("transcription", this.finalResult.trim());
          this.finalResult = "";
          this.speechFinal = false;
        }
        return;
      }

      // Handle finalized transcriptions
      if (transcriptionEvent.is_final && text.trim().length > 0) {
        this.finalResult += ` ${text}`;
        if (transcriptionEvent.speech_final) {
          this.speechFinal = true;
          console.log(`Final transcription: ${this.finalResult}`.green);
          this.emit("transcription", this.finalResult.trim());
          this.finalResult = "";
          this.speechFinal = false;
        }
      }
    });

    this.dgConnection.on(LiveTranscriptionEvents.Error, (error) => {
      console.error(`STT -> Deepgram error: ${error.message}`.red);
      this.emit("error", error);
    });

    this.dgConnection.on(LiveTranscriptionEvents.Close, () => {
      console.log("STT -> Deepgram connection closed".yellow);
      this.emit("close");
    });
  }

  send(payload) {
    if (this.dgConnection.getReadyState() === 1) {
      const buffer = Buffer.from(payload, "base64");
      this.dgConnection.send(buffer);
    } else {
      console.warn("STT -> Deepgram connection not ready".yellow);
    }
  }

  close() {
    if (this.dgConnection.getReadyState() === 1) {
      this.dgConnection.finish();
    }
  }
}

module.exports = { TranscriptionService };