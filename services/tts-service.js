// require("dotenv").config();
// const { Buffer } = require("node:buffer");
// const EventEmitter = require("events");
// const fetch = require("node-fetch");
// const ffmpeg = require("fluent-ffmpeg");
// const { Readable } = require("stream");
// const mongoose = require("mongoose");
// const { connectDB } = require("../config/db"); // Adjust path to your connectDB file
// require("colors");

// // Define TTS Cache Schema
// const ttsCacheSchema = new mongoose.Schema({
//   cacheKey: { type: String, required: true, unique: true, index: true },
//   audioData: { type: String, required: true },
//   updatedAt: { type: Date, default: Date.now },
// });

// const TtsCache = mongoose.model("TtsCache", ttsCacheSchema, "ttsCache");

// class TextToSpeechService extends EventEmitter {
//   constructor() {
//     super();
//     this.nextExpectedIndex = 0;
//     this.speechBuffer = {};
//     this.mongoUri = process.env.MONGODB_URI;
//     this.initializeMongoDB();
//   }

//   async initializeMongoDB() {
//     try {
//       // await connectDB(this.mongoUri);
//       await TtsCache.createIndexes();
//       console.log("MongoDB Atlas TTS cache initialized".green);
//     } catch (err) {
//       console.error(`Error initializing MongoDB Atlas: ${err.message}`.red);
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

//     try {
//       // Check MongoDB cache
//       try {
//         const cachedDoc = await TtsCache.findOne({ cacheKey }).lean();
//         if (cachedDoc) {
//           this.emit("speech", partialResponseIndex, cachedDoc.audioData, partialResponse, interactionCount);
//           const endTime = process.hrtime.bigint();
//           console.log(`TTS from MongoDB Atlas cache in ${Number(endTime - startTime) / 1e6}ms at ${new Date().toISOString()}`.cyan);
//           return;
//         }
//       } catch (err) {
//         console.error(`Error reading from MongoDB Atlas cache: ${err.message}`.yellow);
//         // Proceed to generate new audio on cache miss or error
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
//               stability: 0.4,
//               similarity_boost: 0.8,
//               style: 0.6,
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

//         // Cache the audio in MongoDB
//         try {
//           await TtsCache.updateOne(
//             { cacheKey },
//             { $set: { audioData: base64String, updatedAt: new Date() } },
//             { upsert: true }
//           );
//           console.log(`Cached audio to MongoDB Atlas for key: ${cacheKey}`.cyan);
//         } catch (err) {
//           console.error(`Error caching audio to MongoDB Atlas: ${err.message}`.yellow);
//         }

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

//   async close() {
//     try {
//       await mongoose.connection.close();
//       console.log("MongoDB Atlas connection closed".yellow);
//     } catch (err) {
//       console.error(`Error closing MongoDB Atlas connection: ${err.message}`.red);
//     }
//   }
// }

// module.exports = { TextToSpeechService };

// const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
// ffmpeg.setFfmpegPath(ffmpegInstaller.path);


















// require("dotenv").config();
// const { Buffer } = require("node:buffer");
// const EventEmitter = require("events");
// const fetch = require("node-fetch");
// const ffmpeg = require("fluent-ffmpeg");
// const { Readable } = require("stream");
// const mongoose = require("mongoose");
// const { connectDB } = require("../config/db"); // Adjust path to your connectDB file
// require("colors");

// // Define TTS Cache Schema
// const ttsCacheSchema = new mongoose.Schema({
//   cacheKey: { type: String, required: true, unique: true, index: true },
//   audioData: { type: String, required: true },
//   updatedAt: { type: Date, default: Date.now },
// });

// const TtsCache = mongoose.model("TtsCache", ttsCacheSchema, "ttsCache");

// class TextToSpeechService extends EventEmitter {
//   constructor() {
//     super();
//     this.nextExpectedIndex = 0;
//     this.speechBuffer = {};
//     this.mongoUri = process.env.MONGODB_URI;
//     this.initializeMongoDB();
//   }

//   async initializeMongoDB() {
//     try {
//       await connectDB(this.mongoUri);
//       await TtsCache.createIndexes();
//       console.log("MongoDB Atlas TTS cache initialized".green);
//     } catch (err) {
//       console.error(`Error initializing MongoDB Atlas: ${err.message}`.red);
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

//     try {
//       // Check MongoDB cache
//       try {
//         const cachedDoc = await TtsCache.findOne({ cacheKey }).lean();
//         if (cachedDoc) {
//           this.emit("speech", partialResponseIndex, cachedDoc.audioData, partialResponse, interactionCount);
//           const endTime = process.hrtime.bigint();
//           console.log(`TTS from MongoDB Atlas cache in ${Number(endTime - startTime) / 1e6}ms at ${new Date().toISOString()}`.cyan);
//           return;
//         }
//       } catch (err) {
//         console.error(`Error reading from MongoDB Atlas cache: ${err.message}`.yellow);
//         // Proceed to generate new audio on cache miss or error
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
//               stability: 0.4,
//               similarity_boost: 0.8,
//               style: 0.6,
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

//         // Cache the audio in MongoDB
//         try {
//           await TtsCache.updateOne(
//             { cacheKey },
//             { $set: { audioData: base64String, updatedAt: new Date() } },
//             { upsert: true }
//           );
//           console.log(`Cached audio to MongoDB Atlas for key: ${cacheKey}`.cyan);
//         } catch (err) {
//           console.error(`Error caching audio to MongoDB Atlas: ${err.message}`.yellow);
//         }

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

//   async close() {
//     try {
//       await mongoose.connection.close();
//       console.log("MongoDB Atlas connection closed".yellow);
//     } catch (err) {
//       console.error(`Error closing MongoDB Atlas connection: ${err.message}`.red);
//     }
//   }
// }

// module.exports = { TextToSpeechService };

// const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
// ffmpeg.setFfmpegPath(ffmpegInstaller.path);












// require("dotenv").config();
// const { Buffer } = require("node:buffer");
// const EventEmitter = require("events");
// const fetch = require("node-fetch");
// const ffmpeg = require("fluent-ffmpeg");
// const { Readable } = require("stream");
// const mongoose = require("mongoose");
// const { connectDB } = require("../config/db");
// require("colors");

// const ttsCacheSchema = new mongoose.Schema({
//   cacheKey: { type: String, required: true, unique: true, index: true },
//   audioData: { type: String, required: true },
//   hitCount: { type: Number, default: 1 },
//   category: { type: String, default: 'general' },
//   updatedAt: { type: Date, default: Date.now },
// });

// const TtsCache = mongoose.model("TtsCache", ttsCacheSchema, "ttsCache");

// class TextToSpeechService extends EventEmitter {
//   constructor() {
//     super();
//     this.nextExpectedIndex = 0;
//     this.speechBuffer = {};
//     this.mongoUri = process.env.MONGODB_URI;
//     this.isInitialized = false;
//     this.generationQueue = [];
//     this.processingQueue = false;
    
//     this.commonPhrases = [
//       "Hello! This is Riley, your scheduling assistant. How may I help you today?",
//       "Hey there!", "Hi!", "Hello!", "Great!", "Perfect!", "Got it!",
//       "Let me check!", "One sec!", "Checking now!", "Sorry about that!",
//       "Oops, my bad!", "Let’s try again!", "Hold on!", "Sure thing!", "Okay!",
//       "I’m having trouble. Let me connect you with a human.",
//       "I’m here to help.", "What can I do for you?", "Anything else?",
//       "Have a great day!", "Thanks for calling!", "Let me find that for you.",
//       "What time works best for you?", "I can help you with that.",
//       "Sure, I can help! What time and date work for you?",
//       "What time and date are you looking to schedule your appointment for?",
//       "I’ve got two morning slots available: 09:00 AM and 10:00 AM IST.",
//       "Which time would you like to book—09:00 AM or 10:00 AM IST?",
//       "Perfect! Let’s book that. Can you confirm your name?",
//       "Sorry, that slot is taken. How about another time?",
//       "Let me find other options.",
//       "Available morning slots: 09:00 AM, 10:00 AM IST. Which one works for you?",
//       "Available evening slots: 06:00 PM, 07:00 PM IST. Which one works for you?",
//       "All right, let me book it for you.",
//       "Sure, I’m transferring you to a human agent now. Whom would you like to speak to?",
//       "Could you please clarify what time you’d like to book your appointment for?",
//       "Can I have your name and email address to book the appointment?",
//       "Great choice!",
//       "We have two morning slots available: 9:00 AM and 10:00 AM.",
//       "Which one works for you?",
//       "What time in the evening would you like to book your appointment?"
//     ];
    
//     this.avoidCachingPatterns = [
//       /\b\d{1,2}[:\s-]\d{2}(?:\s?[ap]m)?\b/i,
//       /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/,
//       /\b[\w\.-]+@[\w\.-]+\.\w+\b/,
//       /\b\d{10,}\b/,
//       /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/,
//       /\$\d+/,
//       /\b\d+\s+(minutes?|hours?|days?|weeks?|months?)\b/i,
//     ];
    
//     this.initializeMongoDB();
//   }

//   async initializeMongoDB() {
//     try {
//       await connectDB(this.mongoUri);
//       await TtsCache.createIndexes();
//       console.log("MongoDB Atlas TTS cache initialized".green);
//       this.isInitialized = true;
//       await this.preWarmCache();
//     } catch (err) {
//       console.error(`Error initializing MongoDB Atlas: ${err.message}`.red);
//     }
//   }

//   async preWarmCache() {
//     console.log("Pre-warming TTS cache with common phrases...".blue);
//     let cachedCount = 0;
    
//     for (const phrase of this.commonPhrases) {
//       const cacheKey = this.generateCacheKey(phrase);
//       try {
//         const exists = await TtsCache.findOne({ cacheKey }).lean();
//         if (!exists) {
//           await this.generateAndCache(phrase, 'common');
//           cachedCount++;
//           await this.delay(30);
//         }
//       } catch (err) {
//         console.error(`Error pre-warming phrase "${phrase}": ${err.message}`.yellow);
//       }
//     }
    
//     console.log(`Pre-warmed ${cachedCount} common phrases`.green);
//   }

//   generateCacheKey(text) {
//     return text.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
//   }

//   shouldCache(text) {
//     if (!text || text.trim() === "?" || text.trim().length < 2) return false;
//     for (const pattern of this.avoidCachingPatterns) {
//       if (pattern.test(text)) return false;
//     }
//     if (text.length > 150) return false;
//     return true;
//   }

//   async convertToMulaw(mp3Buffer) {
//     const ffmpegStart = Date.now();
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
//         .audioBitrate(48)
//         .outputOptions('-preset ultrafast')
//         .on("error", (err) => reject(new Error(`FFmpeg error: ${err.message}`)))
//         .on("end", () => {
//           console.log(`FFmpeg conversion time: ${Date.now() - ffmpegStart}ms`.cyan);
//           resolve(Buffer.concat(outputBuffers));
//         })
//         .pipe()
//         .on("data", (chunk) => outputBuffers.push(chunk));
//     });
//   }

//   async delay(ms) {
//     return new Promise(resolve => setTimeout(resolve, ms));
//   }

//   async generateAndCache(text, category = 'general') {
//     if (!text || text.trim() === "?" || text.trim().length < 2) {
//       console.log(`Skipping TTS generation for: "${text}"`.yellow);
//       return null;
//     }
//     const cacheKey = this.generateCacheKey(text);
//     const startTime = process.hrtime.bigint();
    
//     try {
//       const apiStart = Date.now();
//       const response = await fetch(
//         `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}/stream?optimize_streaming_latency=0`,
//         {
//           method: "POST",
//           headers: {
//             "xi-api-key": `${process.env.ELEVENLABS_API_KEY}`,
//             "Content-Type": "application/json",
//             "Accept": "audio/mpeg"
//           },
//           body: JSON.stringify({
//             text,
//             model_id: "eleven_turbo_v2_5",
//             voice_settings: {
//               stability: text.includes("?") ? 0.4 : 0.3,
//               similarity_boost: 0.75,
//               style: text.includes("?") ? 0.9 : 0.8,
//               use_speaker_boost: text.length > 20
//             }
//           }),
//           timeout: 1500
//         }
//       );
//       console.log(`ElevenLabs API time: ${Date.now() - apiStart}ms`.cyan);

//       if (response.status === 200) {
//         const blobStart = Date.now();
//         const blob = await response.blob();
//         console.log(`Blob retrieval time: ${Date.now() - blobStart}ms`.cyan);
//         const audioArrayBuffer = await blob.arrayBuffer();
//         const mp3Buffer = Buffer.from(audioArrayBuffer);
//         const mulawBuffer = await this.convertToMulaw(mp3Buffer);
//         const base64String = mulawBuffer.toString("base64");

//         await TtsCache.updateOne(
//           { cacheKey },
//           { 
//             $set: { 
//               audioData: base64String, 
//               category,
//               updatedAt: new Date() 
//             },
//             $inc: { hitCount: 1 }
//           },
//           { upsert: true }
//         );

//         console.log(`Cached audio for: "${text}" in ${Number(process.hrtime.bigint() - startTime) / 1e6}ms`.cyan);
//         return base64String;
//       } else {
//         throw new Error(`ElevenLabs TTS error (Status: ${response.status})`);
//       }
//     } catch (error) {
//       console.error(`Error generating TTS for "${text}": ${error.message}`.red);
//       throw error;
//     }
//   }

//   async generateSingle(gptReply, interactionCount) {
//     const { partialResponseIndex, partialResponse, isInterruption } = gptReply;
//     if (!partialResponse || partialResponse.trim() === "?" || partialResponse.trim().length < 2) {
//       console.log(`Skipping TTS for: "${partialResponse}"`.yellow);
//       return;
//     }

//     const startTime = process.hrtime.bigint();
//     const cacheKey = this.generateCacheKey(partialResponse);
//     const shouldCacheThis = this.shouldCache(partialResponse);

//     console.log(`Generating TTS for: "${partialResponse}", cacheKey: ${cacheKey}, shouldCache: ${shouldCacheThis}, isInterruption: ${isInterruption}`.cyan);

//     try {
//       if (this.isInitialized) {
//         const cachedDoc = await TtsCache.findOne({ cacheKey }).lean();
//         if (cachedDoc) {
//           await TtsCache.updateOne({ cacheKey }, { $inc: { hitCount: 1 }, $set: { updatedAt: new Date() } });
//           this.emit("speech", partialResponseIndex, cachedDoc.audioData, partialResponse, interactionCount);
//           console.log(`TTS from cache in ${Number(process.hrtime.bigint() - startTime) / 1e6}ms at ${new Date().toISOString()}`.cyan);
//           return;
//         }
//       }

//       const apiStart = Date.now();
//       const response = await fetch(
//         `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}/stream?optimize_streaming_latency=0`,
//         {
//           method: "POST",
//           headers: {
//             "xi-api-key": `${process.env.ELEVENLABS_API_KEY}`,
//             "Content-Type": "application/json",
//             "Accept": "audio/mpeg"
//           },
//           body: JSON.stringify({
//             text: partialResponse,
//             model_id: "eleven_turbo_v2_5",
//             voice_settings: {
//               stability: partialResponse.includes("?") ? 0.4 : 0.3,
//               similarity_boost: 0.75,
//               style: partialResponse.includes("?") ? 0.9 : 0.8,
//               use_speaker_boost: partialResponse.length > 20
//             }
//           }),
//           timeout: 1500
//         }
//       );
//       console.log(`ElevenLabs API time: ${Date.now() - apiStart}ms`.cyan);

//       if (response.status === 200) {
//         const blobStart = Date.now();
//         const blob = await response.blob();
//         console.log(`Blob retrieval time: ${Date.now() - blobStart}ms`.cyan);
//         const audioArrayBuffer = await blob.arrayBuffer();
//         const mp3Buffer = Buffer.from(audioArrayBuffer);
//         const mulawBuffer = await this.convertToMulaw(mp3Buffer);
//         const base64String = mulawBuffer.toString("base64");

//         if (shouldCacheThis) {
//           await TtsCache.updateOne(
//             { cacheKey },
//             { 
//               $set: { 
//                 audioData: base64String, 
//                 category: 'runtime',
//                 updatedAt: new Date() 
//               },
//               $inc: { hitCount: 1 }
//             },
//             { upsert: true }
//           );
//           console.log(`Cached audio for: "${partialResponse}"`.cyan);
//         } else {
//           console.log(`Not caching user-specific content: "${partialResponse}"`.yellow);
//         }

//         this.emit("speech", partialResponseIndex, base64String, partialResponse, interactionCount);
//         console.log(`TTS generated in ${Number(process.hrtime.bigint() - startTime) / 1e6}ms at ${new Date().toISOString()}`.cyan);
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

//   async generate(gptReply, interactionCount) {
//     console.log(`Queueing TTS for: "${gptReply.partialResponse}", isInterruption: ${gptReply.isInterruption}`.cyan);
//     if (gptReply.isInterruption) {
//       await this.generateSingle(gptReply, interactionCount);
//     } else {
//       this.generationQueue.push({ gptReply, interactionCount });
//       setImmediate(() => this.processGenerationQueue());
//     }
//   }

//   async processGenerationQueue() {
//     if (this.processingQueue || this.generationQueue.length === 0) return;
//     this.processingQueue = true;
    
//     while (this.generationQueue.length > 0) {
//       const item = this.generationQueue.shift();
//       await this.generateSingle(item.gptReply, item.interactionCount);
//       await this.delay(10); // Small delay to prevent MongoDB overload
//     }
    
//     this.processingQueue = false;
//   }

//   async cleanupCache() {
//     try {
//       const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
//       const result = await TtsCache.deleteMany({
//         updatedAt: { $lt: oneWeekAgo },
//         hitCount: { $lt: 2 },
//         category: { $ne: 'common' }
//       });
//       console.log(`Cleaned up ${result.deletedCount} old cache entries`.blue);
//     } catch (err) {
//       console.error(`Cache cleanup error: ${err.message}`.red);
//     }
//   }

//   async getCacheStats() {
//     try {
//       const stats = await TtsCache.aggregate([
//         {
//           $group: {
//             _id: '$category',
//             count: { $sum: 1 },
//             totalHits: { $sum: '$hitCount' }
//           }
//         }
//       ]);
//       console.log('TTS Cache Statistics:'.blue);
//       stats.forEach(stat => {
//         console.log(`  ${stat._id}: ${stat.count} entries, ${stat.totalHits} total hits`.cyan);
//       });
//     } catch (err) {
//       console.error(`Error getting cache stats: ${err.message}`.red);
//     }
//   }

//   async close() {
//     try {
//       await mongoose.connection.close();
//       console.log("MongoDB Atlas connection closed".yellow);
//     } catch (err) {
//       console.error(`Error closing MongoDB Atlas connection: ${err.message}`.red);
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
const { connectDB } = require("../config/db");
require("colors");

const ttsCacheSchema = new mongoose.Schema({
  cacheKey: { type: String, required: true, unique: true, index: true },
  audioData: { type: String, required: true },
  hitCount: { type: Number, default: 1 },
  category: { type: String, default: 'general' },
  updatedAt: { type: Date, default: Date.now },
});

const TtsCache = mongoose.model("TtsCache", ttsCacheSchema, "ttsCache");

class TextToSpeechService extends EventEmitter {
  constructor() {
    super();
    this.nextExpectedIndex = 0;
    this.speechBuffer = {};
    this.mongoUri = process.env.MONGODB_URI;
    this.isInitialized = false;
    this.generationQueue = [];
    this.processingQueue = false;
    
    // Refined common phrases to exclude time-specific or user-specific entries
    this.commonPhrases = [
      "Hello! This is Riley, your scheduling assistant. How may I help you today?",
      "Hey there!", "Hi!", "Hello!", "Great!", "Perfect!", "Got it!",
      "Let me check!", "One sec!", "Checking now!", "Sorry about that!",
      "Oops, my bad!", "Let’s try again!", "Hold on!", "Sure thing!", "Okay!",
      "I’m having trouble. Let me connect you with a human.",
      "I’m here to help.", "What can I do for you?", "Anything else?",
      "Have a great day!", "Thanks for calling!", "Let me find that for you.",
      "What time works best for you?", "I can help you with that.",
      "Sure, I can help! What time and date work for you?",
      "Great choice!", "Which one works for you?"
    ];
    
    this.avoidCachingPatterns = [
      /\b\d{1,2}[:\s-]\d{2}(?:\s?[ap]m)?\b/i, // Time patterns
      /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/, // Date patterns
      /\b[\w\.-]+@[\w\.-]+\.\w+\b/, // Email addresses
      /\b\d{10,}\b/, // Phone numbers
      /\b[A-Z][a-z]+\b/, // Names (single capitalized words)
      /\$\d+/, // Monetary values
      /\b\d+\s+(minutes?|hours?|days?|weeks?|months?)\b/i, // Time durations
    ];

    this.initializeMongoDB();
  }

  async initializeMongoDB() {
    try {
      await connectDB(this.mongoUri);
      await TtsCache.createIndexes();
      console.log("MongoDB Atlas TTS cache initialized".green);
      this.isInitialized = true;
      await this.preWarmCache();
    } catch (err) {
      console.error(`Error initializing MongoDB Atlas: ${err.message}`.red);
    }
  }

  async preWarmCache() {
    console.log("Pre-warming TTS cache with common phrases...".blue);
    let cachedCount = 0;
    
    for (const phrase of this.commonPhrases) {
      const cacheKey = this.generateCacheKey(phrase);
      try {
        const exists = await TtsCache.findOne({ cacheKey }).lean();
        if (!exists) {
          await this.generateAndCache(phrase, 'common');
          cachedCount++;
          await this.delay(30);
        }
      } catch (err) {
        console.error(`Error pre-warming phrase "${phrase}": ${err.message}`.yellow);
      }
    }
    
    console.log(`Pre-warmed ${cachedCount} common phrases`.green);
  }

  generateCacheKey(text) {
    return text.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
  }

  shouldCache(text) {
    if (!text || text.trim() === "?" || text.trim().length < 2) return false;
    for (const pattern of this.avoidCachingPatterns) {
      if (pattern.test(text)) return false;
    }
    if (text.length > 100) return false; // Reduced max length for caching
    return true;
  }

  async convertToMulaw(mp3Buffer) {
    const ffmpegStart = Date.now();
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
        .audioBitrate(48)
        .outputOptions('-preset ultrafast')
        .on("error", (err) => reject(new Error(`FFmpeg error: ${err.message}`)))
        .on("end", () => {
          console.log(`FFmpeg conversion time: ${Date.now() - ffmpegStart}ms`.cyan);
          resolve(Buffer.concat(outputBuffers));
        })
        .pipe()
        .on("data", (chunk) => outputBuffers.push(chunk));
    });
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async generateAndCache(text, category = 'general') {
    if (!text || text.trim() === "?" || text.trim().length < 2) {
      console.log(`Skipping TTS generation for: "${text}"`.yellow);
      return null;
    }
    const cacheKey = this.generateCacheKey(text);
    const startTime = process.hrtime.bigint();
    
    try {
      const apiStart = Date.now();
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}/stream?optimize_streaming_latency=0`,
        {
          method: "POST",
          headers: {
            "xi-api-key": `${process.env.ELEVENLABS_API_KEY}`,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg"
          },
          body: JSON.stringify({
            text,
            model_id: "eleven_turbo_v2_5",
            voice_settings: {
              stability: text.includes("?") ? 0.4 : 0.3,
              similarity_boost: 0.75,
              style: text.includes("?") ? 0.9 : 0.8,
              use_speaker_boost: text.length > 20
            }
          }),
          timeout: 1500
        }
      );
      console.log(`ElevenLabs API time: ${Date.now() - apiStart}ms`.cyan);

      if (response.status === 200) {
        const blobStart = Date.now();
        const blob = await response.blob();
        console.log(`Blob retrieval time: ${Date.now() - blobStart}ms`.cyan);
        const audioArrayBuffer = await blob.arrayBuffer();
        const mp3Buffer = Buffer.from(audioArrayBuffer);
        const mulawBuffer = await this.convertToMulaw(mp3Buffer);
        const base64String = mulawBuffer.toString("base64");

        await TtsCache.updateOne(
          { cacheKey },
          { 
            $set: { 
              audioData: base64String, 
              category,
              updatedAt: new Date() 
            },
            $inc: { hitCount: 1 }
          },
          { upsert: true }
        );

        console.log(`Cached audio for: "${text}" in ${Number(process.hrtime.bigint() - startTime) / 1e6}ms`.cyan);
        return base64String;
      } else {
        throw new Error(`ElevenLabs TTS error (Status: ${response.status})`);
      }
    } catch (error) {
      console.error(`Error generating TTS for "${text}": ${error.message}`.red);
      throw error;
    }
  }

  async generateSingle(gptReply, interactionCount) {
    const { partialResponseIndex, partialResponse, isInterruption } = gptReply;
    if (!partialResponse || partialResponse.trim() === "?" || partialResponse.trim().length < 2) {
      console.log(`Skipping TTS for: "${partialResponse}"`.yellow);
      return;
    }

    const startTime = process.hrtime.bigint();
    const cacheKey = this.generateCacheKey(partialResponse);
    const shouldCacheThis = this.shouldCache(partialResponse);

    console.log(`Generating TTS for: "${partialResponse}", cacheKey: ${cacheKey}, shouldCache: ${shouldCacheThis}, isInterruption: ${isInterruption}`.cyan);

    try {
      if (this.isInitialized) {
        const cachedDoc = await TtsCache.findOne({ cacheKey }).lean();
        if (cachedDoc && shouldCacheThis) {
          // Verify cached response matches current context
          const isContextAppropriate = this.isResponseContextAppropriate(partialResponse);
          if (isContextAppropriate) {
            await TtsCache.updateOne({ cacheKey }, { $inc: { hitCount: 1 }, $set: { updatedAt: new Date() } });
            this.emit("speech", partialResponseIndex, cachedDoc.audioData, partialResponse, interactionCount);
            console.log(`TTS from cache in ${Number(process.hrtime.bigint() - startTime) / 1e6}ms at ${new Date().toISOString()}`.cyan);
            return;
          } else {
            console.log(`Skipping cached audio for "${partialResponse}" due to context mismatch`.yellow);
          }
        }
      }

      const apiStart = Date.now();
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}/stream?optimize_streaming_latency=0`,
        {
          method: "POST",
          headers: {
            "xi-api-key": `${process.env.ELEVENLABS_API_KEY}`,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg"
          },
          body: JSON.stringify({
            text: partialResponse,
            model_id: "eleven_turbo_v2_5",
            voice_settings: {
              stability: partialResponse.includes("?") ? 0.4 : 0.3,
              similarity_boost: 0.75,
              style: partialResponse.includes("?") ? 0.9 : 0.8,
              use_speaker_boost: partialResponse.length > 20
            }
          }),
          timeout: 1500
        }
      );
      console.log(`ElevenLabs API time: ${Date.now() - apiStart}ms`.cyan);

      if (response.status === 200) {
        const blobStart = Date.now();
        const blob = await response.blob();
        console.log(`Blob retrieval time: ${Date.now() - blobStart}ms`.cyan);
        const audioArrayBuffer = await blob.arrayBuffer();
        const mp3Buffer = Buffer.from(audioArrayBuffer);
        const mulawBuffer = await this.convertToMulaw(mp3Buffer);
        const base64String = mulawBuffer.toString("base64");

        if (shouldCacheThis) {
          await TtsCache.updateOne(
            { cacheKey },
            { 
              $set: { 
                audioData: base64String, 
                category: 'runtime',
                updatedAt: new Date() 
              },
              $inc: { hitCount: 1 }
            },
            { upsert: true }
          );
          console.log(`Cached audio for: "${partialResponse}"`.cyan);
        } else {
          console.log(`Not caching user-specific content: "${partialResponse}"`.yellow);
        }

        this.emit("speech", partialResponseIndex, base64String, partialResponse, interactionCount);
        console.log(`TTS generated in ${Number(process.hrtime.bigint() - startTime) / 1e6}ms at ${new Date().toISOString()}`.cyan);
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

  isResponseContextAppropriate(response) {
    // Avoid using cached responses in booking or confirming states unless they are generic
    const nonGenericStates = ["booking", "confirming", "select_slot"];
    if (nonGenericStates.includes(this.conversationState)) {
      return this.commonPhrases.includes(response);
    }
    return true;
  }

  async generate(gptReply, interactionCount) {
    console.log(`Queueing TTS for: "${gptReply.partialResponse}", isInterruption: ${gptReply.isInterruption}`.cyan);
    if (gptReply.isInterruption) {
      await this.generateSingle(gptReply, interactionCount);
    } else {
      this.generationQueue.push({ gptReply, interactionCount });
      setImmediate(() => this.processGenerationQueue());
    }
  }

  async processGenerationQueue() {
    if (this.processingQueue || this.generationQueue.length === 0) return;
    this.processingQueue = true;
    
    while (this.generationQueue.length > 0) {
      const item = this.generationQueue.shift();
      await this.generateSingle(item.gptReply, item.interactionCount);
      await this.delay(10);
    }
    
    this.processingQueue = false;
  }

  async cleanupCache() {
    try {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const result = await TtsCache.deleteMany({
        updatedAt: { $lt: oneWeekAgo },
        hitCount: { $lt: 2 },
        category: { $ne: 'common' }
      });
      console.log(`Cleaned up ${result.deletedCount} old cache entries`.blue);
    } catch (err) {
      console.error(`Cache cleanup error: ${err.message}`.red);
    }
  }

  async getCacheStats() {
    try {
      const stats = await TtsCache.aggregate([
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            totalHits: { $sum: '$hitCount' }
          }
        }
      ]);
      console.log('TTS Cache Statistics:'.blue);
      stats.forEach(stat => {
        console.log(`  ${stat._id}: ${stat.count} entries, ${stat.totalHits} total hits`.cyan);
      });
    } catch (err) {
      console.error(`Error getting cache stats: ${err.message}`.red);
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