// require("colors");
// const { createClient, LiveTranscriptionEvents } = require("@deepgram/sdk");
// const { Buffer } = require("node:buffer");
// const EventEmitter = require("events");

// class TranscriptionService extends EventEmitter {
//   constructor() {
//     super();
//     const deepgram = createClient(process.env.DEEPGRAM_API_KEY);
//     this.dgConnection = deepgram.listen.live({
//       encoding: "mulaw",
//       sample_rate: 8000,
//       model: "nova-2",
//       punctuate: true,
//       interim_results: true,
//       endpointing: 50, // 50ms for fast interim results
//       utterance_end_ms: 1000,
//       smart_format: true
//     });

//     this.finalResult = "";
//     this.speechFinal = false;

//     this.dgConnection.on(LiveTranscriptionEvents.Open, () => {
//       console.log("STT -> Deepgram connection opened".green);
//     });

// class TranscriptionService extends EventEmitter {
//   constructor() {
//     super();
//     this.deepgram = createClient(process.env.DEEPGRAM_API_KEY);
//     this.dgConnection = null;
//     this.finalResult = "";
//     this.speechFinal = false;
//     this.initializeDeepgram();
//   }

//   initializeDeepgram() {
//     this.dgConnection = this.deepgram.listen.live({
//       encoding: "mulaw",
//       sample_rate: 8000,
//       model: "nova-2",
//       punctuate: true,
//       interim_results: true,
//       endpointing: 50, // 50ms for fast interim results
//       utterance_end_ms: 1000,
//       smart_format: true
//     });

//     this.dgConnection.on(LiveTranscriptionEvents.Open, () => {
//       console.log("STT -> Deepgram connection opened".green);
//       this.keepAliveInterval = setInterval(() => {
//         if (this.dgConnection.getReadyState() === 1) {
//           this.dgConnection.keepAlive();
//           console.log("STT -> Deepgram keep-alive sent".cyan);
//         }
//       }, 5000);
//     });

//     this.dgConnection.on(LiveTranscriptionEvents.Transcript, (transcriptionEvent) => {
//       const alternatives = transcriptionEvent.channel?.alternatives;
//       let text = alternatives?.[0]?.transcript || "";

//       // Emit interim results
//       if (text.trim().length > 0 && !transcriptionEvent.is_final) {
//         this.emit("utterance", text);
//       }

//       // Handle UtteranceEnd
//       if (transcriptionEvent.type === "UtteranceEnd") {
//         if (!this.speechFinal && this.finalResult.trim().length > 0) {
//           console.log(`UtteranceEnd: ${this.finalResult}`.yellow);
//           this.emit("transcription", this.finalResult.trim());
//           this.finalResult = "";
//           this.speechFinal = false;
//         }
//         return;
//       }

//       // Handle finalized transcriptions
//       if (transcriptionEvent.is_final && text.trim().length > 0) {
//         this.finalResult += ` ${text}`;
//         if (transcriptionEvent.speech_final) {
//           this.speechFinal = true;
//           console.log(`Final transcription: ${this.finalResult}`.green);
//           this.emit("transcription", this.finalResult.trim());
//           this.finalResult = "";
//           this.speechFinal = false;
//         }
//       }
//     });

//     this.dgConnection.on(LiveTranscriptionEvents.Error, (error) => {
//       console.error(`STT -> Deepgram error: ${error.message}`.red);
//       this.emit("error", error);
//     });

//     this.dgConnection.on(LiveTranscriptionEvents.Close, () => {
//       console.log("STT -> Deepgram connection closed".yellow);
//       this.emit("close");
//     });
//   }

//   send(payload) {
//     if (this.dgConnection.getReadyState() === 1) {
//       const buffer = Buffer.from(payload, "base64");
//       this.dgConnection.send(buffer);
//     } else {
//       console.warn("STT -> Deepgram connection not ready".yellow);
//     }
//   }

//   close() {
//     if (this.dgConnection.getReadyState() === 1) {
//       this.dgConnection.finish();
//     }
//   }
// }

// module.exports = { TranscriptionService };



















require("colors");
const { createClient, LiveTranscriptionEvents } = require("@deepgram/sdk");
const { Buffer } = require("node:buffer");
const EventEmitter = require("events");

class TranscriptionService extends EventEmitter {
  constructor() {
    super();
    this.deepgram = createClient(process.env.DEEPGRAM_API_KEY);
    this.dgConnection = null;
    this.finalResult = "";
    this.speechFinal = false;
    this.connectionReady = false;
    this.connectionPromise = this.initializeDeepgram();
    this.initializeEventHandlers();
  }

  async initializeDeepgram(maxRetries = 3, retryDelay = 1000) {
    let attempts = 0;
    while (attempts < maxRetries) {
      try {
        this.dgConnection = this.deepgram.listen.live({
          encoding: "mulaw",
          sample_rate: 8000,
          model: "nova-2",
          punctuate: true,
          interim_results: true,
          endpointing: 50,
          utterance_end_ms: 1000,
          smart_format: true,
        });

        await new Promise((resolve, reject) => {
          this.dgConnection.on(LiveTranscriptionEvents.Open, () => {
            console.log("STT -> Deepgram connection opened".green);
            this.connectionReady = true;
            this.keepAliveInterval = setInterval(() => {
              if (this.dgConnection.getReadyState() === 1) {
                this.dgConnection.keepAlive();
                console.log("STT -> Deepgram keep-alive sent".cyan);
              }
            }, 10000);
            resolve();
          });

          this.dgConnection.on(LiveTranscriptionEvents.Error, (error) => {
            console.error(`STT -> Deepgram error during initialization: ${error.message}`.red);
            reject(error);
          });
        });
        return;
      } catch (error) {
        attempts++;
        console.warn(`STT -> Deepgram connection attempt ${attempts} failed, retrying in ${retryDelay}ms...`.yellow);
        if (attempts >= maxRetries) {
          console.error(`STT -> Deepgram failed after ${maxRetries} attempts`.red);
          this.emit("error", new Error("Failed to initialize Deepgram connection"));
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  async waitForConnection() {
    if (!this.connectionReady) {
      await this.connectionPromise;
    }
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
      clearInterval(this.keepAliveInterval);
    }
  }

  initializeEventHandlers() {
    this.dgConnection.on(LiveTranscriptionEvents.Transcript, (transcriptionEvent) => {
      const alternatives = transcriptionEvent.channel?.alternatives;
      let text = alternatives?.[0]?.transcript || "";

      // Emit interim results
      if (text.trim().length > 0 && !transcriptionEvent.is_final) {
        this.emit("utterance", text);
      }

      // Handle UtteranceEnd
      if (transcriptionEvent.type === "UtteranceEnd") {
        if (this.finalResult.trim().length > 0) {
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
      this.connectionReady = false;
      clearInterval(this.keepAliveInterval);
      this.emit("close");
    });
  }
}

module.exports = { TranscriptionService };
