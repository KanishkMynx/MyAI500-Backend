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









// require("colors");
// const { createClient, LiveTranscriptionEvents } = require("@deepgram/sdk");
// const { Buffer } = require("node:buffer");
// const EventEmitter = require("events");

// class TranscriptionService extends EventEmitter {
//   constructor() {
//     super();
//     this.deepgram = createClient(process.env.DEEPGRAM_API_KEY);
//     this.dgConnection = null;
//     this.finalResult = "";
//     this.speechFinal = false;
//     this.connectionReady = false;
//     this.reinitializeOnClose = true; // Flag to control reinitialization
//     this.connectionPromise = this.initializeDeepgram();
//     this.initializeEventHandlers();
//   }

//   async initializeDeepgram(maxRetries = 3, retryDelay = 1000) {
//     let attempts = 0;
//     while (attempts < maxRetries) {
//       try {
//         this.dgConnection = this.deepgram.listen.live({
//           encoding: "mulaw",
//           sample_rate: 8000,
//           model: "nova-2",
//           punctuate: true,
//           interim_results: true,
//           endpointing: 50,
//           utterance_end_ms: 1000,
//           smart_format: true,
//         });

//         await new Promise((resolve, reject) => {
//           this.dgConnection.on(LiveTranscriptionEvents.Open, () => {
//             console.log("STT -> Deepgram connection opened".green);
//             this.connectionReady = true;
//             this.keepAliveInterval = setInterval(() => {
//               if (this.dgConnection.getReadyState() === 1) {
//                 this.dgConnection.keepAlive();
//                 console.log("STT -> Deepgram keep-alive sent".cyan);
//               }
//             }, 10000);
//             resolve();
//           });

//           this.dgConnection.on(LiveTranscriptionEvents.Error, (error) => {
//             console.error(`STT -> Deepgram error during initialization: ${error.message}`.red);
//             reject(error);
//           });
//         });
//         return;
//       } catch (error) {
//         attempts++;
//         console.warn(`STT -> Deepgram connection attempt ${attempts} failed, retrying in ${retryDelay}ms...`.yellow);
//         if (attempts >= maxRetries) {
//           console.error(`STT -> Deepgram failed after ${maxRetries} attempts`.red);
//           this.emit("error", new Error("Failed to initialize Deepgram connection"));
//           throw error;
//         }
//         await new Promise(resolve => setTimeout(resolve, retryDelay));
//       }
//     }
//   }

//   async waitForConnection() {
//     if (!this.connectionReady) {
//       await this.connectionPromise;
//     }
//   }

//   send(payload) {
//     if (this.dgConnection.getReadyState() === 1) {
//       const buffer = Buffer.from(payload, "base64");
//       this.dgConnection.send(buffer);
//     } else {
//       console.warn("STT -> Deepgram connection not ready".yellow);
//     }
//   }

//   close(reinitialize = true) {
//     if (this.dgConnection.getReadyState() === 1) {
//       this.dgConnection.finish();
//       clearInterval(this.keepAliveInterval);
//       this.reinitializeOnClose = reinitialize; // Set reinitialization behavior
//     }
//   }

//   initializeEventHandlers() {
//     this.dgConnection.on(LiveTranscriptionEvents.Transcript, (transcriptionEvent) => {
//       const alternatives = transcriptionEvent.channel?.alternatives;
//       let text = alternatives?.[0]?.transcript || "";

//       // Emit interim results
//       if (text.trim().length > 0 && !transcriptionEvent.is_final) {
//         this.emit("utterance", text);
//       }

//       // Handle UtteranceEnd
//       if (transcriptionEvent.type === "UtteranceEnd") {
//         if (this.finalResult.trim().length > 0) {
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

//     this.dgConnection.on(LiveTranscriptionEvents.Close, async () => {
//       console.log("STT -> Deepgram connection closed".yellow);
//       this.connectionReady = false;
//       clearInterval(this.keepAliveInterval);
//       this.emit("close");
//       if (this.reinitializeOnClose) {
//         console.log("Reinitializing Deepgram connection due to close event...".cyan);
//         this.connectionPromise = this.initializeDeepgram();
//         await this.waitForConnection();
//       }
//     });
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
    this.reinitializeOnClose = true;
    this.keepAliveInterval = null;
    this.isReconnecting = false;
    this.connectionPromise = this.initializeDeepgram();
  }

  async initializeDeepgram(maxRetries = 3, retryDelay = 1000) {
    if (this.isReconnecting) {
      console.log("STT -> Already reconnecting, skipping...".yellow);
      return;
    }
    
    this.isReconnecting = true;
    let attempts = 0;
    
    while (attempts < maxRetries) {
      try {
        // Clean up existing connection if any
        await this.cleanupConnection();
        
        console.log(`STT -> Initializing Deepgram connection (attempt ${attempts + 1})`.cyan);
        
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

        // Initialize event handlers BEFORE waiting for connection
        this.initializeEventHandlers();

        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("Connection timeout"));
          }, 10000);

          this.dgConnection.on(LiveTranscriptionEvents.Open, () => {
            clearTimeout(timeout);
            console.log("STT -> Deepgram connection opened".green);
            this.connectionReady = true;
            this.isReconnecting = false;
            this.startKeepAlive();
            resolve();
          });

          this.dgConnection.on(LiveTranscriptionEvents.Error, (error) => {
            clearTimeout(timeout);
            console.error(`STT -> Deepgram error during initialization: ${error.message}`.red);
            reject(error);
          });
        });
        
        return;
      } catch (error) {
        attempts++;
        console.warn(`STT -> Deepgram connection attempt ${attempts} failed: ${error.message}`.yellow);
        
        if (attempts >= maxRetries) {
          console.error(`STT -> Deepgram failed after ${maxRetries} attempts`.red);
          this.isReconnecting = false;
          this.emit("error", new Error("Failed to initialize Deepgram connection"));
          throw error;
        }
        
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  async cleanupConnection() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }

    if (this.dgConnection) {
      try {
        // Remove all listeners to prevent memory leaks
        this.dgConnection.removeAllListeners();
        
        if (this.dgConnection.getReadyState() === 1) {
          this.dgConnection.finish();
        }
      } catch (error) {
        console.warn(`STT -> Error cleaning up connection: ${error.message}`.yellow);
      }
    }

    this.connectionReady = false;
    this.finalResult = "";
    this.speechFinal = false;
  }

  startKeepAlive() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
    }
    
    this.keepAliveInterval = setInterval(() => {
      try {
        if (this.dgConnection && this.dgConnection.getReadyState() === 1) {
          this.dgConnection.keepAlive();
          console.log("STT -> Deepgram keep-alive sent".cyan);
        }
      } catch (error) {
        console.warn(`STT -> Keep-alive error: ${error.message}`.yellow);
      }
    }, 10000);
  }

  async waitForConnection() {
    if (!this.connectionReady && !this.isReconnecting) {
      await this.connectionPromise;
    }
    
    // Wait for connection to be ready
    let attempts = 0;
    while (!this.connectionReady && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (!this.connectionReady) {
      throw new Error("Connection not ready after waiting");
    }
  }

  async send(payload) {
    try {
      await this.waitForConnection();
      
      if (this.dgConnection && this.dgConnection.getReadyState() === 1) {
        const buffer = Buffer.from(payload, "base64");
        this.dgConnection.send(buffer);
      } else {
        console.warn("STT -> Deepgram connection not ready for sending".yellow);
        // Try to reconnect if connection is not ready
        if (!this.isReconnecting) {
          this.connectionPromise = this.initializeDeepgram();
          await this.waitForConnection();
        }
      }
    } catch (error) {
      console.error(`STT -> Error sending data: ${error.message}`.red);
      this.emit("error", error);
    }
  }

  async close(reinitialize = true) {
    console.log(`STT -> Closing connection, reinitialize: ${reinitialize}`.cyan);
    this.reinitializeOnClose = reinitialize;
    
    if (this.dgConnection && this.dgConnection.getReadyState() === 1) {
      this.dgConnection.finish();
    }
    
    await this.cleanupConnection();
  }

  initializeEventHandlers() {
    if (!this.dgConnection) return;

    this.dgConnection.on(LiveTranscriptionEvents.Transcript, (transcriptionEvent) => {
      try {
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
      } catch (error) {
        console.error(`STT -> Error processing transcript: ${error.message}`.red);
      }
    });

    this.dgConnection.on(LiveTranscriptionEvents.Error, (error) => {
      console.error(`STT -> Deepgram error: ${error.message}`.red);
      this.emit("error", error);
    });

    this.dgConnection.on(LiveTranscriptionEvents.Close, async () => {
      console.log("STT -> Deepgram connection closed".yellow);
      this.connectionReady = false;
      
      if (this.keepAliveInterval) {
        clearInterval(this.keepAliveInterval);
        this.keepAliveInterval = null;
      }
      
      this.emit("close");
      
      if (this.reinitializeOnClose && !this.isReconnecting) {
        console.log("STT -> Reinitializing Deepgram connection due to close event...".cyan);
        // Add a small delay before reconnecting
        setTimeout(async () => {
          try {
            this.connectionPromise = this.initializeDeepgram();
            await this.waitForConnection();
          } catch (error) {
            console.error(`STT -> Failed to reconnect: ${error.message}`.red);
          }
        }, 1000);
      }
    });

    this.dgConnection.on(LiveTranscriptionEvents.Metadata, (metadata) => {
      console.log(`STT -> Deepgram metadata received`.blue);
    });
  }

  // Method to reset service between calls
  async reset() {
    console.log("STT -> Resetting transcription service".cyan);
    this.finalResult = "";
    this.speechFinal = false;
    
    if (!this.connectionReady) {
      this.connectionPromise = this.initializeDeepgram();
      await this.waitForConnection();
    }
  }
}

module.exports = { TranscriptionService };