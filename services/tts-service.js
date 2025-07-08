// require("dotenv").config();
// const { Buffer } = require("node:buffer");
// const EventEmitter = require("events");
// const fetch = require("node-fetch");
// const ffmpeg = require("fluent-ffmpeg");
// const { Readable } = require("stream");
// const fs = require("fs").promises;
// const path = require("path");

// class TextToSpeechService extends EventEmitter {
//   constructor() {
//     super();
//     this.nextExpectedIndex = 0;
//     this.speechBuffer = {};
//     this.cacheDir = path.join(__dirname, "../tts_cache");
//     this.ensureCacheDir();
//   }

//   async ensureCacheDir() {
//     try {
//       await fs.mkdir(this.cacheDir, { recursive: true });
//     } catch (err) {
//       console.error(`Error creating cache directory: ${err.message}`.red);
//     }
//   }

//   async convertToMulaw(mp3Buffer) {
//     return new Promise((resolve, reject) => {
//       const inputStream = new Readable();
//       inputStream.push(mp3Buffer);
//       inputStream.push(null);

//       const outputBuffers = [];
//       ffmpeg(inputStream)
//         .inputFormat("mp3")
//         .audioCodec("pcm_mulaw")
//         .audioFrequency(8000)
//         .audioChannels(1)
//         .format("mulaw")
//         .audioBitrate(64)
//         .on("error", (err) => reject(new Error(`FFmpeg error: ${err.message}`)))
//         .on("end", () => resolve(Buffer.concat(outputBuffers)))
//         .pipe()
//         .on("data", (chunk) => outputBuffers.push(chunk));
//     });
//   }

//   async generate(gptReply, interactionCount) {
//     const { partialResponseIndex, partialResponse } = gptReply;
//     if (!partialResponse) return;

//     const startTime = process.hrtime.bigint();
//     const cacheKey = partialResponse.replace(/\s+/g, "_").toLowerCase();
//     const cachePath = path.join(this.cacheDir, `${cacheKey}.mulaw`);

//     try {
//       // Check cache
//       try {
//         const cachedAudio = await fs.readFile(cachePath);
//         this.emit("speech", partialResponseIndex, cachedAudio.toString("base64"), partialResponse, interactionCount);
//         const endTime = process.hrtime.bigint();
//         console.log(`TTS from cache in ${Number(endTime - startTime) / 1e6}ms at ${new Date().toISOString()}`.cyan);
//         return;
//       } catch (err) {
//         // Cache miss, proceed to generate
//       }

//       const response = await fetch(
//         `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}/stream?optimize_streaming_latency=4`,
//         {
//           method: "POST",
//           headers: {
//             "xi-api-key": `${process.env.ELEVENLABS_API_KEY}`,
//             "Content-Type": "application/json",
//             "Accept": "audio/mpeg"
//           },
//           body: JSON.stringify({
//             text: partialResponse,
//             model_id: "eleven_turbo_v2",
//             voice_settings: {
//               stability: 0.4, // Slightly lower for more variation
//               similarity_boost: 0.8,
//               style: 0.6, // Increase for emotional expressiveness
//               use_speaker_boost: true
//             }
//           }),
//           timeout: 5000
//         }
//       );

//       if (response.status === 200) {
//         const blob = await response.blob();
//         const audioArrayBuffer = await blob.arrayBuffer();
//         const mp3Buffer = Buffer.from(audioArrayBuffer);

//         const mulawBuffer = await this.convertToMulaw(mp3Buffer);
//         const base64String = mulawBuffer.toString("base64");

//         // Cache the audio
//         await fs.writeFile(cachePath, mulawBuffer).catch(err => console.error(`Error caching audio: ${err.message}`.yellow));

//         this.emit("speech", partialResponseIndex, base64String, partialResponse, interactionCount);

//         const endTime = process.hrtime.bigint();
//         console.log(`TTS generated in ${Number(endTime - startTime) / 1e6}ms at ${new Date().toISOString()}`.cyan);
//       } else {
//         throw new Error(`ElevenLabs TTS error (Status: ${response.status})`);
//       }
//     } catch (err) {
//       console.error(`TTS error: ${err.message}`.red);
//       this.emit(
//         "speech",
//         partialResponseIndex,
//         null,
//         "Sorry, I couldn't generate a response. Please try again.",
//         interactionCount
//       );
//     }
//   }
// }

// module.exports = { TextToSpeechService };

// const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
// ffmpeg.setFfmpegPath(ffmpegInstaller.path);









require("dotenv").config();
const { Buffer } = require("node:buffer");
const EventEmitter = require("events");
const fetch = require("node-fetch");
const ffmpeg = require("fluent-ffmpeg");
const { Readable } = require("stream");
const mongoose = require("mongoose");
const { connectDB } = require("../config/db"); // Adjust path to your connectDB file
require("colors");

// Define TTS Cache Schema
const ttsCacheSchema = new mongoose.Schema({
  cacheKey: { type: String, required: true, unique: true, index: true },
  audioData: { type: String, required: true },
  updatedAt: { type: Date, default: Date.now },
});

const TtsCache = mongoose.model("TtsCache", ttsCacheSchema, "ttsCache");

class TextToSpeechService extends EventEmitter {
  constructor() {
    super();
    this.nextExpectedIndex = 0;
    this.speechBuffer = {};
    this.mongoUri = process.env.MONGODB_URI;
    this.initializeMongoDB();
  }

  async initializeMongoDB() {
    try {
      await connectDB(this.mongoUri);
      await TtsCache.createIndexes();
      console.log("MongoDB Atlas TTS cache initialized".green);
    } catch (err) {
      console.error(`Error initializing MongoDB Atlas: ${err.message}`.red);
    }
  }

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
        .audioBitrate(64)
        .on("error", (err) => reject(new Error(`FFmpeg error: ${err.message}`)))
        .on("end", () => resolve(Buffer.concat(outputBuffers)))
        .pipe()
        .on("data", (chunk) => outputBuffers.push(chunk));
    });
  }

  async generate(gptReply, interactionCount) {
    const { partialResponseIndex, partialResponse } = gptReply;
    if (!partialResponse) return;

    const startTime = process.hrtime.bigint();
    const cacheKey = partialResponse.replace(/\s+/g, "_").toLowerCase();

    try {
      // Check MongoDB cache
      try {
        const cachedDoc = await TtsCache.findOne({ cacheKey }).lean();
        if (cachedDoc) {
          this.emit("speech", partialResponseIndex, cachedDoc.audioData, partialResponse, interactionCount);
          const endTime = process.hrtime.bigint();
          console.log(`TTS from MongoDB Atlas cache in ${Number(endTime - startTime) / 1e6}ms at ${new Date().toISOString()}`.cyan);
          return;
        }
      } catch (err) {
        console.error(`Error reading from MongoDB Atlas cache: ${err.message}`.yellow);
        // Proceed to generate new audio on cache miss or error
      }

      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}/stream?optimize_streaming_latency=4`,
        {
          method: "POST",
          headers: {
            "xi-api-key": `${process.env.ELEVENLABS_API_KEY}`,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg"
          },
          body: JSON.stringify({
            text: partialResponse,
            model_id: "eleven_turbo_v2",
            voice_settings: {
              stability: 0.4,
              similarity_boost: 0.8,
              style: 0.6,
              use_speaker_boost: true
            }
          }),
          timeout: 5000
        }
      );

      if (response.status === 200) {
        const blob = await response.blob();
        const audioArrayBuffer = await blob.arrayBuffer();
        const mp3Buffer = Buffer.from(audioArrayBuffer);

        const mulawBuffer = await this.convertToMulaw(mp3Buffer);
        const base64String = mulawBuffer.toString("base64");

        // Cache the audio in MongoDB
        try {
          await TtsCache.updateOne(
            { cacheKey },
            { $set: { audioData: base64String, updatedAt: new Date() } },
            { upsert: true }
          );
          console.log(`Cached audio to MongoDB Atlas for key: ${cacheKey}`.cyan);
        } catch (err) {
          console.error(`Error caching audio to MongoDB Atlas: ${err.message}`.yellow);
        }

        this.emit("speech", partialResponseIndex, base64String, partialResponse, interactionCount);

        const endTime = process.hrtime.bigint();
        console.log(`TTS generated in ${Number(endTime - startTime) / 1e6}ms at ${new Date().toISOString()}`.cyan);
      } else {
        throw new Error(`ElevenLabs TTS error (Status: ${response.status})`);
      }
    } catch (err) {
      console.error(`TTS error: ${err.message}`.red);
      this.emit(
        "speech",
        partialResponseIndex,
        null,
        "Sorry, I couldn't generate a response. Please try again.",
        interactionCount
      );
    }
  }

  async close() {
    try {
      await mongoose.connection.close();
      console.log("MongoDB Atlas connection closed".yellow);
    } catch (err) {
      console.error(`Error closing MongoDB Atlas connection: ${err.message}`.red);
    }
  }
}

module.exports = { TextToSpeechService };

const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
ffmpeg.setFfmpegPath(ffmpegInstaller.path);