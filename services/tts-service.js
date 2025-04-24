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

    try {
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
        }
      );

      if (response.status === 200) {
        try {
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
        } catch (err) {
          console.log(err);
        }
      } else {
        console.log("Deepgram TTS error:");
        console.log(response);
      }
    } catch (err) {
      console.error("Error occurred in TextToSpeech service");
      console.error(err);
    }
  }
}

module.exports = { TextToSpeechService };




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
//       console.log("TTS: Empty partial response, skipping generation.");
//       return;
//     }
 
//     // Store the response in the buffer if out of order
//     if (partialResponseIndex !== this.nextExpectedIndex) {
//       console.log(
//         `TTS: Out-of-order response at index ${partialResponseIndex}, expected ${this.nextExpectedIndex}. Buffering.`
//       );
//       this.speechBuffer[partialResponseIndex] = { gptReply, interactionCount };
//       return;
//     }
 
//     try {
//       console.log(
//         `TTS: Generating audio for index ${partialResponseIndex}: "${partialResponse}"`
//       );
//       const response = await fetch(
//         `https://api.deepgram.com/v1/speak?model=aura-athena-en&encoding=mulaw&sample_rate=8000&container=none`,
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
//         const blob = await response.blob();
//         const audioArrayBuffer = await blob.arrayBuffer();
//         const base64String = Buffer.from(audioArrayBuffer).toString("base64");
 
//         console.log(
//           `TTS: Audio generated for index ${partialResponseIndex}, size: ${audioArrayBuffer.byteLength} bytes`
//         );
 
//         // Emit the speech event
//         this.emit(
//           "speech",
//           partialResponseIndex,
//           base64String,
//           partialResponse,
//           interactionCount
//         );
 
//         // Increment the expected index
//         this.nextExpectedIndex++;
 
//         // Check for buffered responses
//         while (this.speechBuffer[this.nextExpectedIndex]) {
//           const buffered = this.speechBuffer[this.nextExpectedIndex];
//           console.log(
//             `TTS: Processing buffered response at index ${this.nextExpectedIndex}`
//           );
//           delete this.speechBuffer[this.nextExpectedIndex];
//           await this.generate(buffered.gptReply, buffered.interactionCount);
//         }
//       } else {
//         console.error(
//           `TTS: Deepgram API error, status: ${response.status}, response:`,
//           await response.text()
//         );
//       }
//     } catch (err) {
//       console.error(
//         `TTS: Error generating speech for index ${partialResponseIndex}:`,
//         err
//       );
//     }
//   }
// }
 
// module.exports = { TextToSpeechService };