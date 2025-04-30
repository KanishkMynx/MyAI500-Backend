// require("dotenv").config();
// const { Buffer } = require("node:buffer");
// const EventEmitter = require("events");
// const fetch = require("node-fetch");

// class TextToSpeechService extends EventEmitter {
//   constructor() {
//     super();
//     this.nextExpectedIndex = 0;
//     this.speechBuffer = {};
//   }

//   async generate(gptReply, interactionCount) {
//     const { partialResponseIndex, partialResponse } = gptReply;

//     if (!partialResponse) {
//       return;
//     }

//     try {
//       const response = await fetch(
//         `https://api.deepgram.com/v1/speak?model=${process.env.VOICE_MODEL}&encoding=mulaw&sample_rate=8000&container=none`,
//         {
//           method: "POST",
//           headers: {
//             Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
//             "Content-Type": "application/json",
//           },
//           body: JSON.stringify({
//             text: partialResponse,
//           }),
//         }
//       );

//       if (response.status === 200) {
//         try {
//           const blob = await response.blob();
//           const audioArrayBuffer = await blob.arrayBuffer();
//           const base64String = Buffer.from(audioArrayBuffer).toString("base64");
//           this.emit(
//             "speech",
//             partialResponseIndex,
//             base64String,
//             partialResponse,
//             interactionCount
//           );
//         } catch (err) {
//           console.log(err);
//         }
//       } else {
//         console.log("Deepgram TTS error:");
//         console.log(response);
//       }
//     } catch (err) {
//       console.error("Error occurred in TextToSpeech service");
//       console.error(err);
//     }
//   }
// }

// module.exports = { TextToSpeechService };



require("dotenv").config();
const { Buffer } = require("node:buffer");
const EventEmitter = require("events");
const fetch = require("node-fetch");

class TextToSpeechService extends EventEmitter {
  constructor() {
    super();
    this.nextExpectedIndex = 0;
    this.speechBuffer = {};
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
          `https://api.deepgram.com/v1/speak?model=${process.env.VOICE_MODEL}&encoding=mulaw&sample_rate=8000&container=none`,
          {
            method: "POST",
            headers: {
              Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              text: partialResponse,
            }),
            timeout: 10000, // 10-second timeout
          }
        );

        if (response.status === 200) {
          const blob = await response.blob();
          const audioArrayBuffer = await blob.arrayBuffer();
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
          console.log(`Deepgram TTS error (Status: ${response.status}): ${await response.text()}`.yellow);
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