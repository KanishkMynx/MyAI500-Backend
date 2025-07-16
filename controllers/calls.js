// const twilio = require("twilio");
// const { VoiceResponse } = require("twilio").twiml;
// const { callModel } = require("../models/call");
// const { agentModel } = require("../models/agent");
// const { StreamService } = require("../services/stream-service");
// const { TranscriptionService } = require("../services/transcription-service");
// const { TextToSpeechService } = require("../services/tts-service");
// const { recordingService } = require("../services/recording-service");
// const { getFullISTDateTime, formatISTTime } = require("../utils/dateTime");
// const { GptService } = require("../services/gpt-service");
// const { connectDB } = require("../config/db");

// const callSidToCalledNumber = new Map();
// let agentMap = {};
// const webhookBaseUrl = `wss://${process.env.SERVER}/call/connection`;

// let transcriptionService;
// let ttsService;
// async function initializeServices() {
//   try {
//     // await connectDB();
//     transcriptionService = new TranscriptionService();
//     ttsService = new TextToSpeechService();
//     console.log("Services pre-warmed".green);
//   } catch (err) {
//     console.error(`Error pre-warming services: ${err.message}`.red);
//   }
// }

// initializeServices();

// const loadAgents = async () => {
//   try {
//     const agents = await agentModel.find().lean();
//     agentMap = agents.reduce((map, agent) => {
//       map[normalizePhoneNumber(agent.twilioNumber)] = agent.name;
//       return map;
//     }, {});
//     console.log(`Loaded agents: ${Object.keys(agentMap).length} agents`.cyan);
//   } catch (error) {
//     console.error(`Error loading agents: ${error.message}`.red);
//   }
// };

// const normalizePhoneNumber = (number) => {
//   if (!number) return number;
//   return '+' + number.replace(/[^0-9]/g, '');
// };

// const getCall = async (req, res) => {
//   try {
//     const calls = await callModel.find().lean();
//     res.status(200).json(calls);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// const createCall = async (req, res) => {
//   try {
//     const newCall = await callModel.create(req.body);
//     res.status(201).json(newCall);
//   } catch (error) {
//     res.status(400).json({ message: error.message });
//   }
// };

// const updateCall = async (req, res) => {
//   try {
//     const updatedCall = await callModel.findByIdAndUpdate(
//       req.params.id,
//       req.body,
//       { new: true, lean: true }
//     );
//     if (!updatedCall) {
//       return res.status(404).json({ message: "callModel not found" });
//     }
//     res.status(200).json(updatedCall);
//   } catch (error) {
//     res.status(400).json({ message: error.message });
//   }
// };

// const deleteCall = async (req, res) => {
//   try {
//     const callObj = await callModel.findByIdAndDelete(req.params.id);
//     if (!callObj) {
//       return res.status(404).json({ message: "callModel not found" });
//     }
//     res.status(200).json({ message: "callModel deleted" });
//   } catch (error) {
//     res.status(400).json({ message: error.message });
//   }
// };

// const incomingCall = async (req, res) => {
//   try {
//     const isValid = twilio.validateRequest(
//       process.env.TWILIO_AUTH_TOKEN_1,
//       req.headers['x-twilio-signature'],
//       `https://${process.env.SERVER}${req.originalUrl}`,
//       req.body
//     ) || twilio.validateRequest(
//       process.env.TWILIO_AUTH_TOKEN_2,
//       req.headers['x-twilio-signature'],
//       `https://${process.env.SERVER}${req.originalUrl}`,
//       req.body
//     );

//     if (!isValid) {
//       console.error('Invalid Twilio signature'.red);
//       return res.status(403).send('<Response><Say>Unauthorized request</Say></Response>');
//     }

//     const response = new VoiceResponse();
//     const connect = response.connect();
//     const { Called, CallSid } = req.body;
//     const calledNumber = normalizePhoneNumber(Called);
//     const agentType = req.query.agent;
//     const webhookUrl = agentType
//       ? `${webhookBaseUrl}?agent=${agentType}`
//       : calledNumber
//         ? `${webhookBaseUrl}?called_number=${encodeURIComponent(calledNumber)}`
//         : webhookBaseUrl;

//     if (calledNumber) {
//       callSidToCalledNumber.set(CallSid, calledNumber);
//     }

//     connect.stream({ url: webhookUrl });
//     res.type('text/xml');
//     res.send(response.toString());
//   } catch (err) {
//     console.error(`Error in incomingCall: ${err.message}`.red);
//     res.status(500).send('<Response><Say>Error processing incoming call</Say></Response>');
//   }
// };

// const callConnection = async (ws, req) => {
//   try {
//     let streamSid, callSid, callStartTime, callEndTime, transcript = [], username = "anonymous", email = "", agentType, initialPrompt, isSpeaking = false, errorCount = 0, transcriptionErrorCount = 0;
//     const marks = [];
//     let audioBuffer = Buffer.alloc(0); // Buffer to aggregate audio chunks
//     const chunkSize = 800; // ~100ms at MULAW/8000
//     let lastReceiveTime = null; // Store last audio receive time

//     ws.on("error", (err) => {
//       console.error(`WebSocket error: ${err.message}`.red);
//     });

//     ws.on("message", async (data) => {
//       try {
//         const msg = JSON.parse(data);
//         if (msg.event === "start") {
//           streamSid = msg.start.streamSid;
//           callSid = msg.start.callSid;
//           callStartTime = new Date();

//           if (!Object.keys(agentMap).length) {
//             await loadAgents();
//           }

//           const incomingNumber = normalizePhoneNumber(callSidToCalledNumber.get(callSid)) || "+17602786311";
//           agentType = agentMap[incomingNumber] || "booking";

//           const gptService = new GptService(agentType);
//           const streamService = new StreamService(ws);
//           const transcriptionService = new TranscriptionService();
//           const ttsService = new TextToSpeechService({});

//           streamService.setStreamSid(streamSid);
//           gptService.setCallSid(callSid);

//           transcriptionService.on("error", (error) => {
//             console.error(`Transcription error: ${error.message || "Unknown error"}`.red);
//             transcriptionErrorCount++;
//             if (!isSpeaking && transcriptionErrorCount < 3) {
//               ttsService.generate(
//                 { partialResponseIndex: null, partialResponse: "Sorry, I'm having trouble understanding you. Please try again." },
//                 0
//               );
//               isSpeaking = true;
//             } else if (transcriptionErrorCount >= 3) {
//               ttsService.generate(
//                 { partialResponseIndex: null, partialResponse: "I'm experiencing persistent issues. Please try calling back later." },
//                 0
//               );
//               isSpeaking = true;
//               setTimeout(() => ws.close(1000, "Persistent transcription failure"), 2000);
//             }
//           });

//           transcriptionService.on("close", () => {
//             console.log("Transcription service closed".yellow);
//           });

//           let agentDoc = await agentModel.findOne({ name: agentType }).lean();
//           if (!agentDoc) {
//             agentDoc = await agentModel.create({ name: agentType, prompts: [], twilioNumber: incomingNumber });
//             agentMap[incomingNumber] = agentType;
//           }

//           const initialGreeting = agentType === "booking"
//             ? "Hello! This is Riley, your scheduling assistant. How may I help you today?"
//             : "Hi! I'm here to share Mynx's expert services. Interested?";
//           initialPrompt = initialGreeting;

//           await recordingService(ttsService, callSid);
//           ttsService.generate({ partialResponseIndex: null, partialResponse: initialGreeting }, 0);
//           isSpeaking = true;

//           let interactionCount = 0;

//           ws.on("message", async (data) => {
//             try {
//               const msg = JSON.parse(data);
//               if (msg.event === "media") {
//                 lastReceiveTime = process.hrtime.bigint();
//                 // console.log(`Received media: ${msg.media.payload.length} bytes at ${new Date().toISOString()}`.cyan);

//                 // Aggregate audio chunks to ~100ms (800 bytes)
//                 const payload = Buffer.from(msg.media.payload, "base64");
//                 audioBuffer = Buffer.concat([audioBuffer, payload]);

//                 while (audioBuffer.length >= chunkSize) {
//                   const chunk = audioBuffer.slice(0, chunkSize);
//                   transcriptionService.send(chunk.toString("base64"));
//                   audioBuffer = audioBuffer.slice(chunkSize);
//                   // console.log(`Sent ${chunk.length} bytes to Deepgram at ${new Date().toISOString()}`.cyan);
//                 }
//               } else if (msg.event === "mark") {
//                 marks.splice(marks.indexOf(msg.mark.name), 1);
//                 isSpeaking = false;
//               } else if (msg.event === "stop") {
//                 callEndTime = new Date();
//                 await callModel.create({
//                   callStartTime,
//                   callEndTime,
//                   callDuration: `${getFullISTDateTime(callStartTime)} to ${getFullISTDateTime(callEndTime)}`,
//                   istStartTime: getFullISTDateTime(callStartTime),
//                   istEndTime: getFullISTDateTime(callEndTime),
//                   username,
//                   email,
//                   transcript,
//                   agentType,
//                 });
//                 await agentModel.updateOne(
//                   { name: agentType },
//                   { $set: { prompts: [{ role: "assistant", content: initialPrompt }] } },
//                   { upsert: true }
//                 );
//                 transcriptionService.close();
//               }
//             } catch (err) {
//               console.error(`Error processing WebSocket message: ${err.message}`.red);
//             }
//           });

//           transcriptionService.on("utterance", (text) => {
//             if (marks.length && text?.length > 2 && isSpeaking) {
//               ws.send(JSON.stringify({ streamSid, event: "clear" }));
//               isSpeaking = false;
//             }
//             console.log(`Interim transcription: "${text}" at ${new Date().toISOString()}`.cyan);
//           });

//           transcriptionService.on("transcription", async (text) => {
//             if (!text) return;
//             if (isSpeaking) {
//               await new Promise(resolve => setTimeout(resolve, 50));
//             }

//             console.log(`Final transcription: "${text}" at ${new Date().toISOString()}`.green);
//             if (lastReceiveTime) {
//               const transcriptionTime = process.hrtime.bigint();
//               console.log(`Time since audio received: ${Number(transcriptionTime - lastReceiveTime) / 1e6}ms`.green);
//             }

//             transcript.push({ user: text, gpt: "", timestamp: formatISTTime(new Date()) });

//             if (interactionCount === 2 && text.toLowerCase().includes("my name is")) {
//               username = text.toLowerCase().replace("my name is", "").trim();
//             }
//             if (interactionCount === 3 && text.toLowerCase().includes("gmail")) {
//               email = text.toLowerCase().replace(/\s/g, "") + "@gmail.com";
//             }

//             try {
//               if (text.toLowerCase().includes("transfer") && text.toLowerCase().includes("call")) {
//                 ws.send(JSON.stringify({ streamSid, event: "clear" }));
//                 const transferPrompt = "Sure, I’m transferring you to a human agent now. Whom would you like to speak to?";
//                 ttsService.generate({ partialResponseIndex: null, partialResponse: transferPrompt }, interactionCount);
//                 isSpeaking = true;
//                 await gptService.completion("User requested to transfer the call.", interactionCount, "system", "system");
//               } else {
//                 await gptService.completion(text, interactionCount);
//               }
//               interactionCount++;
//               errorCount = 0;
//               transcriptionErrorCount = 0;
//             } catch (err) {
//               console.error(`Error in GPT completion: ${err.message}`.red);
//               errorCount++;
//               const errorMessage = errorCount > 3
//                 ? "I'm having trouble. Would you like to transfer to a human agent?"
//                 : "Sorry, I hit a snag. Let's try again.";
//               ws.send(JSON.stringify({ streamSid, event: "clear" }));
//               ttsService.generate({ partialResponseIndex: null, partialResponse: errorMessage }, interactionCount);
//               isSpeaking = true;
//               if (errorCount > 3) errorCount = 0;
//             }
//           });

//           gptService.on("gptreply", async (gptReply, icount) => {
//             if (isSpeaking) {
//               await new Promise(resolve => setTimeout(resolve, 50));
//             }
//             const now = new Date();
//             console.log(`GPT reply: "${gptReply.partialResponse}" at ${new Date().toISOString()}`.cyan);
//             if (transcript[icount]) {
//               transcript[icount].gpt = gptReply.partialResponse;
//               transcript[icount].timestamp = transcript[icount].timestamp || formatISTTime(now);
//             } else {
//               transcript.push({ user: "", gpt: gptReply.partialResponse, timestamp: formatISTTime(now) });
//             }
//             ttsService.generate(gptReply, icount);
//             isSpeaking = true;
//           });

//           ttsService.on("speech", (responseIndex, audio, label, icount) => {
//             console.log(`TTS generated at ${new Date().toISOString()}`.cyan);
//             streamService.sendAudio(audio);
//           });

//           streamService.on("audiosent", (markLabel) => {
//             marks.push(markLabel);
//           });
//         }
//       } catch (err) {
//         console.error(`Error in callConnection: ${err.message}`.red);
//         ws.close(1011, "Internal server error");
//       }
//     });
//   } catch (err) {
//     console.error(`Error in callConnection: ${err.message}`.red);
//     ws.close(1011, "Internal server error");
//   }
// };

// module.exports = {
//   getCall,
//   createCall,
//   updateCall,
//   deleteCall,
//   incomingCall,
//   callConnection,
// };






















// const twilio = require("twilio");
// const { VoiceResponse } = require("twilio").twiml;
// const { callModel } = require("../models/call");
// const { agentModel } = require("../models/agent");
// const { StreamService } = require("../services/stream-service");
// const { TranscriptionService } = require("../services/transcription-service");
// const { TextToSpeechService } = require("../services/tts-service");
// const { recordingService } = require("../services/recording-service");
// const { getFullISTDateTime, formatISTTime } = require("../utils/dateTime");
// const { GptService } = require("../services/gpt-service");
// const { connectDB } = require("../config/db");

// const callSidToCalledNumber = new Map();
// let agentMap = {};
// const webhookBaseUrl = `wss://${process.env.SERVER}/call/connection`;

// let transcriptionService;
// let ttsService;

// async function initializeServices() {
//   try {
//     // await connectDB();
//     transcriptionService = new TranscriptionService();
//     const startTime = new Date();
//     await transcriptionService.waitForConnection();
//     console.log(`Deepgram connection established in ${(new Date() - startTime)}ms`.green);
//     ttsService = new TextToSpeechService();
//     console.log("Services pre-warmed and Deepgram connection established".green);
//   } catch (err) {
//     console.error(`Error pre-warming services: ${err.message}`.red);
//   }
// }

// initializeServices();

// const loadAgents = async () => {
//   try {
//     const agents = await agentModel.find().lean();
//     agentMap = agents.reduce((map, agent) => {
//       map[normalizePhoneNumber(agent.twilioNumber)] = agent.name;
//       return map;
//     }, {});
//     console.log(`Loaded agents: ${Object.keys(agentMap).length} agents`.cyan);
//   } catch (error) {
//     console.error(`Error loading agents: ${error.message}`.red);
//   }
// };

// const normalizePhoneNumber = (number) => {
//   if (!number) return number;
//   return '+' + number.replace(/[^0-9]/g, '');
// };

// const getCall = async (req, res) => {
//   try {
//     const calls = await callModel.find().lean();
//     res.status(200).json(calls);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// const createCall = async (req, res) => {
//   try {
//     const newCall = await callModel.create(req.body);
//     res.status(201).json(newCall);
//   } catch (error) {
//     res.status(400).json({ message: error.message });
//   }
// };

// const updateCall = async (req, res) => {
//   try {
//     const updatedCall = await callModel.findByIdAndUpdate(
//       req.params.id,
//       req.body,
//       { new: true, lean: true }
//     );
//     if (!updatedCall) {
//       return res.status(404).json({ message: "callModel not found" });
//     }
//     res.status(200).json(updatedCall);
//   } catch (error) {
//     res.status(400).json({ message: error.message });
//   }
// };

// const deleteCall = async (req, res) => {
//   try {
//     const callObj = await callModel.findByIdAndDelete(req.params.id);
//     if (!callObj) {
//       return res.status(404).json({ message: "callModel not found" });
//     }
//     res.status(200).json({ message: "callModel deleted" });
//   } catch (error) {
//     res.status(400).json({ message: error.message });
//   }
// };

// const incomingCall = async (req, res) => {
//   try {
//     const isValid = twilio.validateRequest(
//       process.env.TWILIO_AUTH_TOKEN_1,
//       req.headers['x-twilio-signature'],
//       `https://${process.env.SERVER}${req.originalUrl}`,
//       req.body
//     ) || twilio.validateRequest(
//       process.env.TWILIO_AUTH_TOKEN_2,
//       req.headers['x-twilio-signature'],
//       `https://${process.env.SERVER}${req.originalUrl}`,
//       req.body
//     );

//     if (!isValid) {
//       console.error('Invalid Twilio signature'.red);
//       return res.status(403).send('<Response><Say>Unauthorized request</Say></Response>');
//     }

//     const response = new VoiceResponse();
//     const connect = response.connect();
//     const { Called, CallSid } = req.body;
//     const calledNumber = normalizePhoneNumber(Called);
//     const agentType = req.query.agent;
//     const webhookUrl = agentType
//       ? `${webhookBaseUrl}?agent=${agentType}`
//       : calledNumber
//         ? `${webhookBaseUrl}?called_number=${encodeURIComponent(calledNumber)}`
//         : webhookBaseUrl;

//     if (calledNumber) {
//       callSidToCalledNumber.set(CallSid, calledNumber);
//     }

//     connect.stream({ url: webhookUrl });
//     res.type('text/xml');
//     res.send(response.toString());
//   } catch (err) {
//     console.error(`Error in incomingCall: ${err.message}`.red);
//     res.status(500).send('<Response><Say>Error processing incoming call</Say></Response>');
//   }
// };

// const callConnection = async (ws, req) => {
//   try {
//     let streamSid, callSid, callStartTime, callEndTime, transcript = [], username = "anonymous", email = "", agentType, initialPrompt, isSpeaking = false, errorCount = 0, transcriptionErrorCount = 0;
//     const marks = [];
//     let audioBuffer = Buffer.alloc(0);
//     const chunkSize = 800;
//     let lastReceiveTime = null;

//     ws.on("error", (err) => {
//       console.error(`WebSocket error: ${err.message}`.red);
//     });

//     ws.on("message", async (data) => {
//       try {
//         const msg = JSON.parse(data);
//         if (msg.event === "start") {
//           streamSid = msg.start.streamSid;
//           callSid = msg.start.callSid;
//           callStartTime = new Date();

//           if (!Object.keys(agentMap).length) {
//             await loadAgents();
//           }

//           const incomingNumber = normalizePhoneNumber(callSidToCalledNumber.get(callSid)) || "+17602786311";
//           agentType = agentMap[incomingNumber] || "booking";

//           const gptService = new GptService(agentType);
//           const streamService = new StreamService(ws);

//           // Use the pre-warmed transcriptionService
//           if (!transcriptionService.connectionReady) {
//             console.log("Reinitializing Deepgram connection...".cyan);
//             await transcriptionService.initializeDeepgram();
//             await transcriptionService.waitForConnection();
//           }
//           console.log("Using pre-warmed Deepgram connection".green);

//           streamService.setStreamSid(streamSid);
//           gptService.setCallSid(callSid);

//           transcriptionService.on("error", (error) => {
//             console.error(`Transcription error: ${error.message || "Unknown error"}`.red);
//             transcriptionErrorCount++;
//             if (!isSpeaking && transcriptionErrorCount < 3) {
//               ttsService.generate(
//                 { partialResponseIndex: null, partialResponse: "Sorry, I'm having trouble understanding you. Please try again." },
//                 0
//               );
//               isSpeaking = true;
//             } else if (transcriptionErrorCount >= 3) {
//               ttsService.generate(
//                 { partialResponseIndex: null, partialResponse: "I'm experiencing persistent issues. Please try calling back later." },
//                 0
//               );
//               isSpeaking = true;
//               setTimeout(() => ws.close(1000, "Persistent transcription failure"), 2000);
//             }
//           });

//           transcriptionService.on("close", () => {
//             console.log("Transcription service closed".yellow);
//           });

//           let agentDoc = await agentModel.findOne({ name: agentType }).lean();
//           if (!agentDoc) {
//             agentDoc = await agentModel.create({ name: agentType, prompts: [], twilioNumber: incomingNumber });
//             agentMap[incomingNumber] = agentType;
//           }

//           const initialGreeting = agentType === "booking"
//             ? "Hello! This is Riley, your scheduling assistant. How may I help you today?"
//             : "Hi! I'm here to share Mynx's expert services. Interested?";
//           initialPrompt = initialGreeting;

//           await recordingService(ttsService, callSid);
//           ttsService.generate({ partialResponseIndex: null, partialResponse: initialGreeting }, 0);
//           isSpeaking = true;

//           let interactionCount = 0;

//           ws.on("message", async (data) => {
//             try {
//               const msg = JSON.parse(data);
//               if (msg.event === "media") {
//                 lastReceiveTime = process.hrtime.bigint();
//                 const payload = Buffer.from(msg.media.payload, "base64");
//                 audioBuffer = Buffer.concat([audioBuffer, payload]);

//                 while (audioBuffer.length >= chunkSize) {
//                   const chunk = audioBuffer.slice(0, chunkSize);
//                   await transcriptionService.waitForConnection(); // Ensure connection is ready before sending
//                   transcriptionService.send(chunk.toString("base64"));
//                   audioBuffer = audioBuffer.slice(chunkSize);
//                 }
//               } else if (msg.event === "mark") {
//                 marks.splice(marks.indexOf(msg.mark.name), 1);
//                 isSpeaking = false;
//               } else if (msg.event === "stop") {
//                 callEndTime = new Date();
//                 await callModel.create({
//                   callStartTime,
//                   callEndTime,
//                   callDuration: `${getFullISTDateTime(callStartTime)} to ${getFullISTDateTime(callEndTime)}`,
//                   istStartTime: getFullISTDateTime(callStartTime),
//                   istEndTime: getFullISTDateTime(callEndTime),
//                   username,
//                   email,
//                   transcript,
//                   agentType,
//                 });
//                 await agentModel.updateOne(
//                   { name: agentType },
//                   { $set: { prompts: [{ role: "assistant", content: initialPrompt }] } },
//                   { upsert: true }
//                 );
//                 transcriptionService.close();
//               }
//             } catch (err) {
//               console.error(`Error processing WebSocket message: ${err.message}`.red);
//             }
//           });

//           transcriptionService.on("utterance", (text) => {
//             if (marks.length && text?.length > 2 && isSpeaking) {
//               ws.send(JSON.stringify({ streamSid, event: "clear" }));
//               isSpeaking = false;
//             }
//             console.log(`Interim transcription: "${text}" at ${new Date().toISOString()}`.cyan);
//           });

//           transcriptionService.on("transcription", async (text) => {
//             if (!text) return;
//             if (isSpeaking) {
//               await new Promise(resolve => setTimeout(resolve, 50));
//             }

//             console.log(`Final transcription: "${text}" at ${new Date().toISOString()}`.green);
//             if (lastReceiveTime) {
//               const transcriptionTime = process.hrtime.bigint();
//               console.log(`Time since audio received: ${Number(transcriptionTime - lastReceiveTime) / 1e6}ms`.green);
//             }

//             transcript.push({ user: text, gpt: "", timestamp: formatISTTime(new Date()) });

//             if (interactionCount === 2 && text.toLowerCase().includes("my name is")) {
//               username = text.toLowerCase().replace("my name is", "").trim();
//             }
//             if (interactionCount === 3 && text.toLowerCase().includes("gmail")) {
//               email = text.toLowerCase().replace(/\s/g, "") + "@gmail.com";
//             }

//             try {
//               if (text.toLowerCase().includes("transfer") && text.toLowerCase().includes("call")) {
//                 ws.send(JSON.stringify({ streamSid, event: "clear" }));
//                 const transferPrompt = "Sure, I’m transferring you to a human agent now. Whom would you like to speak to?";
//                 ttsService.generate({ partialResponseIndex: null, partialResponse: transferPrompt }, interactionCount);
//                 isSpeaking = true;
//                 await gptService.completion("User requested to transfer the call.", interactionCount, "system", "system");
//               } else {
//                 await gptService.completion(text, interactionCount);
//               }
//               interactionCount++;
//               errorCount = 0;
//               transcriptionErrorCount = 0;
//             } catch (err) {
//               console.error(`Error in GPT completion: ${err.message}`.red);
//               errorCount++;
//               const errorMessage = errorCount > 3
//                 ? "I'm having trouble. Would you like to transfer to a human agent?"
//                 : "Sorry, I hit a snag. Let's try again.";
//               ws.send(JSON.stringify({ streamSid, event: "clear" }));
//               ttsService.generate({ partialResponseIndex: null, partialResponse: errorMessage }, interactionCount);
//               isSpeaking = true;
//               if (errorCount > 3) errorCount = 0;
//             }
//           });

//           gptService.on("gptreply", async (gptReply, icount) => {
//             if (isSpeaking) {
//               await new Promise(resolve => setTimeout(resolve, 50));
//             }
//             const now = new Date();
//             console.log(`GPT reply: "${gptReply.partialResponse}" at ${new Date().toISOString()}`.cyan);
//             if (transcript[icount]) {
//               transcript[icount].gpt = gptReply.partialResponse;
//               transcript[icount].timestamp = transcript[icount].timestamp || formatISTTime(now);
//             } else {
//               transcript.push({ user: "", gpt: gptReply.partialResponse, timestamp: formatISTTime(now) });
//             }
//             ttsService.generate(gptReply, icount);
//             isSpeaking = true;
//           });

//           ttsService.on("speech", (responseIndex, audio, label, icount) => {
//             console.log(`TTS generated at ${new Date().toISOString()}`.cyan);
//             streamService.sendAudio(audio);
//           });

//           streamService.on("audiosent", (markLabel) => {
//             marks.push(markLabel);
//           });
//         }
//       } catch (err) {
//         console.error(`Error in callConnection: ${err.message}`.red);
//         ws.close(1011, "Internal server error");
//       }
//     });
//   } catch (err) {
//     console.error(`Error in callConnection: ${err.message}`.red);
//     ws.close(1011, "Internal server error");
//   }
// };

// module.exports = {
//   getCall,
//   createCall,
//   updateCall,
//   deleteCall,
//   incomingCall,
//   callConnection,
// };









const twilio = require("twilio");
const { VoiceResponse } = require("twilio").twiml;
const { callModel } = require("../models/call");
const { agentModel } = require("../models/agent");
const { StreamService } = require("../services/stream-service");
const { TranscriptionService } = require("../services/transcription-service");
const { TextToSpeechService } = require("../services/tts-service");
const { recordingService } = require("../services/recording-service");
const { getFullISTDateTime, formatISTTime } = require("../utils/dateTime");
const { GptService } = require("../services/gpt-service");
const { connectDB } = require("../config/db");

const callSidToCalledNumber = new Map();
let agentMap = {};
const webhookBaseUrl = `wss://${process.env.SERVER}/call/connection`;

let transcriptionService;
let ttsService;

async function initializeServices() {
  try {
    transcriptionService = new TranscriptionService();
    const startTime = new Date();
    await transcriptionService.waitForConnection();
    console.log(`Deepgram connection established in ${(new Date() - startTime)}ms`.green);
    ttsService = new TextToSpeechService();
    console.log("Services pre-warmed and Deepgram connection established".green);
  } catch (err) {
    console.error(`Error pre-warming services: ${err.message}`.red);
  }
}

initializeServices();

const loadAgents = async () => {
  try {
    const agents = await agentModel.find().lean();
    agentMap = agents.reduce((map, agent) => {
      map[normalizePhoneNumber(agent.twilioNumber)] = agent.name;
      return map;
    }, {});
    console.log(`Loaded agents: ${Object.keys(agentMap).length} agents`.cyan);
  } catch (error) {
    console.error(`Error loading agents: ${error.message}`.red);
  }
};

const normalizePhoneNumber = (number) => {
  if (!number) return number;
  return '+' + number.replace(/[^0-9]/g, '');
};

const getCall = async (req, res) => {
  try {
    const calls = await callModel.find().lean();
    res.status(200).json(calls);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createCall = async (req, res) => {
  try {
    const newCall = await callModel.create(req.body);
    res.status(201).json(newCall);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const updateCall = async (req, res) => {
  try {
    const updatedCall = await callModel.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, lean: true }
    );
    if (!updatedCall) {
      return res.status(404).json({ message: "callModel not found" });
    }
    res.status(200).json(updatedCall);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteCall = async (req, res) => {
  try {
    const callObj = await callModel.findByIdAndDelete(req.params.id);
    if (!callObj) {
      return res.status(404).json({ message: "callModel not found" });
    }
    res.status(200).json({ message: "callModel deleted" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const incomingCall = async (req, res) => {
  try {
    const isValid = twilio.validateRequest(
      process.env.TWILIO_AUTH_TOKEN_1,
      req.headers['x-twilio-signature'],
      `https://${process.env.SERVER}${req.originalUrl}`,
      req.body
    ) || twilio.validateRequest(
      process.env.TWILIO_AUTH_TOKEN_2,
      req.headers['x-twilio-signature'],
      `https://${process.env.SERVER}${req.originalUrl}`,
      req.body
    );

    if (!isValid) {
      console.error('Invalid Twilio signature'.red);
      return res.status(403).send('<Response><Say>Unauthorized request</Say></Response>');
    }

    const response = new VoiceResponse();
    const connect = response.connect();
    const { Called, CallSid } = req.body;
    const calledNumber = normalizePhoneNumber(Called);
    const agentType = req.query.agent;
    const webhookUrl = agentType
      ? `${webhookBaseUrl}?agent=${agentType}`
      : calledNumber
        ? `${webhookBaseUrl}?called_number=${encodeURIComponent(calledNumber)}`
        : webhookBaseUrl;

    if (calledNumber) {
      callSidToCalledNumber.set(CallSid, calledNumber);
    }

    connect.stream({ url: webhookUrl });
    res.type('text/xml');
    res.send(response.toString());
  } catch (err) {
    console.error(`Error in incomingCall: ${err.message}`.red);
    res.status(500).send('<Response><Say>Error processing incoming call</Say></Response>');
  }
};

const callConnection = async (ws, req) => {
  try {
    let streamSid, callSid, callStartTime, callEndTime, transcript = [], username = "anonymous", email = "", agentType, initialPrompt, isSpeaking = false, errorCount = 0, transcriptionErrorCount = 0;
    const marks = [];
    let audioBuffer = Buffer.alloc(0);
    const chunkSize = 800;
    let lastReceiveTime = null;

    ws.on("error", (err) => {
      console.error(`WebSocket error: ${err.message}`.red);
    });

    ws.on("message", async (data) => {
      try {
        const msg = JSON.parse(data);
        if (msg.event === "start") {
          streamSid = msg.start.streamSid;
          callSid = msg.start.callSid;
          callStartTime = new Date();

          if (!Object.keys(agentMap).length) {
            await loadAgents();
          }

          const incomingNumber = normalizePhoneNumber(callSidToCalledNumber.get(callSid)) || "+17602786311";
          agentType = agentMap[incomingNumber] || "booking";

          const gptService = new GptService(agentType);
          const streamService = new StreamService(ws);

          if (!transcriptionService.connectionReady) {
            console.log("Reinitializing Deepgram connection...".cyan);
            await transcriptionService.initializeDeepgram();
            await transcriptionService.waitForConnection();
          }
          console.log("Using pre-warmed Deepgram connection".green);

          streamService.setStreamSid(streamSid);
          gptService.setCallSid(callSid);

          transcriptionService.on("error", (error) => {
            console.error(`Transcription error: ${error.message || "Unknown error"}`.red);
            transcriptionErrorCount++;
            if (!isSpeaking && transcriptionErrorCount < 3) {
              ttsService.generate(
                { partialResponseIndex: null, partialResponse: "Sorry, I'm having trouble understanding you. Please try again." },
                0
              );
              isSpeaking = true;
            } else if (transcriptionErrorCount >= 3) {
              ttsService.generate(
                { partialResponseIndex: null, partialResponse: "I'm experiencing persistent issues. Please try calling back later." },
                0
              );
              isSpeaking = true;
              setTimeout(() => ws.close(1000, "Persistent transcription failure"), 2000);
            }
          });

          transcriptionService.on("close", () => {
            console.log("Transcription service closed".yellow);
          });

          let agentDoc = await agentModel.findOne({ name: agentType }).lean();
          if (!agentDoc) {
            agentDoc = await agentModel.create({ name: agentType, prompts: [], twilioNumber: incomingNumber });
            agentMap[incomingNumber] = agentType;
          }

          const initialGreeting = agentType === "booking"
            ? "Hello! This is Riley, your scheduling assistant. How may I help you today?"
            : "Hi! I'm here to share Mynx's expert services. Interested?";
          initialPrompt = initialGreeting;

          await recordingService(ttsService, callSid);
          ttsService.generate({ partialResponseIndex: null, partialResponse: initialGreeting }, 0);
          isSpeaking = true;

          let interactionCount = 0;

          ws.on("message", async (data) => {
            try {
              const msg = JSON.parse(data);
              if (msg.event === "media") {
                lastReceiveTime = process.hrtime.bigint();
                const payload = Buffer.from(msg.media.payload, "base64");
                audioBuffer = Buffer.concat([audioBuffer, payload]);

                while (audioBuffer.length >= chunkSize) {
                  const chunk = audioBuffer.slice(0, chunkSize);
                  await transcriptionService.waitForConnection();
                  transcriptionService.send(chunk.toString("base64"));
                  audioBuffer = audioBuffer.slice(chunkSize);
                }
              } else if (msg.event === "mark") {
                marks.splice(marks.indexOf(msg.mark.name), 1);
                isSpeaking = false;
              } else if (msg.event === "stop") {
                callEndTime = new Date();
                await callModel.create({
                  callStartTime,
                  callEndTime,
                  callDuration: `${getFullISTDateTime(callStartTime)} to ${getFullISTDateTime(callEndTime)}`,
                  istStartTime: getFullISTDateTime(callStartTime),
                  istEndTime: getFullISTDateTime(callEndTime),
                  username,
                  email,
                  transcript,
                  agentType,
                });
                await agentModel.updateOne(
                  { name: agentType },
                  { $set: { prompts: [{ role: "assistant", content: initialPrompt }] } },
                  { upsert: true }
                );
                // Do not close transcriptionService here to keep it alive for future calls
              }
            } catch (err) {
              console.error(`Error processing WebSocket message: ${err.message}`.red);
            }
          });

          transcriptionService.on("utterance", (text) => {
            console.log(`Utterance received: "${text}", isSpeaking: ${isSpeaking}, marks: ${marks.length}`.cyan);
            if (marks.length && text?.length > 2 && isSpeaking) {
              console.log(`Triggering interruption for utterance: "${text}"`.cyan);
              ws.send(JSON.stringify({ streamSid, event: "clear" }));
              gptService.interrupt();
              isSpeaking = false;
            }
          });

          transcriptionService.on("transcription", async (text) => {
            if (!text) return;
            if (isSpeaking) {
              await new Promise(resolve => setTimeout(resolve, 50));
            }

            console.log(`Final transcription: "${text}" at ${new Date().toISOString()}`.green);
            if (lastReceiveTime) {
              const transcriptionTime = process.hrtime.bigint();
              console.log(`Time since audio received: ${Number(transcriptionTime - lastReceiveTime) / 1e6}ms`.green);
            }

            transcript.push({ user: text, gpt: "", timestamp: formatISTTime(new Date()) });

            if (interactionCount === 2 && text.toLowerCase().includes("my name is")) {
              username = text.toLowerCase().replace("my name is", "").trim();
            }
            if (interactionCount === 3 && text.toLowerCase().includes("gmail")) {
              email = text.toLowerCase().replace(/\s/g, "") + "@gmail.com";
            }

            try {
              if (text.toLowerCase().includes("transfer") && text.toLowerCase().includes("call")) {
                ws.send(JSON.stringify({ streamSid, event: "clear" }));
                const transferPrompt = "Sure, I’m transferring you to a human agent now. Whom would you like to speak to?";
                ttsService.generate({ partialResponseIndex: null, partialResponse: transferPrompt }, interactionCount);
                isSpeaking = true;
                await gptService.completion("User requested to transfer the call.", interactionCount, "system", "system");
              } else {
                await gptService.completion(text, interactionCount);
              }
              interactionCount++;
              errorCount = 0;
              transcriptionErrorCount = 0;
            } catch (err) {
              console.error(`Error in GPT completion: ${err.message}`.red);
              errorCount++;
              const errorMessage = errorCount > 3
                ? "I'm having trouble. Would you like to transfer to a human agent?"
                : "Sorry, I hit a snag. Let's try again.";
              ws.send(JSON.stringify({ streamSid, event: "clear" }));
              ttsService.generate({ partialResponseIndex: null, partialResponse: errorMessage }, interactionCount);
              isSpeaking = true;
              if (errorCount > 3) errorCount = 0;
            }
          });

          gptService.on("gptreply", async (gptReply, icount) => {
            if (isSpeaking) {
              await new Promise(resolve => setTimeout(resolve, 50));
            }
            const now = new Date();
            console.log(`GPT reply: "${gptReply.partialResponse}" at ${new Date().toISOString()}`.cyan);
            if (transcript[icount]) {
              transcript[icount].gpt = gptReply.partialResponse;
              transcript[icount].timestamp = transcript[icount].timestamp || formatISTTime(now);
            } else {
              transcript.push({ user: "", gpt: gptReply.partialResponse, timestamp: formatISTTime(now) });
            }
            ttsService.generate(gptReply, icount);
            isSpeaking = true;
          });

          ttsService.on("speech", (responseIndex, audio, label, icount) => {
            console.log(`TTS generated at ${new Date().toISOString()}`.cyan);
            streamService.sendAudio(audio);
          });

          streamService.on("audiosent", (markLabel) => {
            marks.push(markLabel);
          });
        }
      } catch (err) {
        console.error(`Error in callConnection: ${err.message}`.red);
        ws.close(1011, "Internal server error");
      }
    });
  } catch (err) {
    console.error(`Error in callConnection: ${err.message}`.red);
    ws.close(1011, "Internal server error");
  }
};

module.exports = {
  getCall,
  createCall,
  updateCall,
  deleteCall,
  incomingCall,
  callConnection,
};