const { VoiceResponse } = require("twilio").twiml;

const { callModel } = require("../models/call");
const { agentModel } = require("../models/agent"); // Import agent model
const { StreamService } = require("../services/stream-service");
const { TranscriptionService } = require("../services/transcription-service");
const { TextToSpeechService } = require("../services/tts-service");
const { recordingService } = require("../services/recording-service");
const { getFullISTDateTime, formatISTTime } = require("../utils/dateTime");
const { GptService } = require("../services/gpt-service");

// Log environment variables for debugging
console.log(`BOOKING_NUMBER: ${process.env.BOOKING_NUMBER}`.cyan);
console.log(`SELLING_NUMBER: ${process.env.SELLING_NUMBER}`.cyan);

// get callModel
const getCall = async (req, res) => {
  try {
    const calls = await callModel.find();
    res.status(200).json(calls);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// create callModel
const createCall = async (req, res) => {
  const callObj = new callModel(req.body);
  try {
    const newCall = await callObj.save();
    res.status(201).json(newCall);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// update callModel
const updateCall = async (req, res) => {
  const callObj = await callModel.findById(req.params.id);
  if (!callObj) {
    return res.status(404).json({ message: "callModel not found" });
  }
  try {
    const updatedCall = await callModel.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.status(200).json(updatedCall);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// delete callModel
const deleteCall = async (req, res) => {
  const callObj = await callModel.findById(req.params.id);
  if (!callObj) {
    return res.status(404).json({ message: "callModel not found" });
  }
  try {
    await callModel.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "callModel deleted" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// incoming callModel
const incomingCall = async (req, res) => {
  try {
    const response = new VoiceResponse();
    const connect = response.connect();
    connect.stream({ url: `wss://${process.env.SERVER}/call/connection` });
    res.type("text/xml");
    res.send(response.toString());
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Error processing incoming callModel" });
  }
};

// callModel connection websocket
const callConnection = async (ws) => {
  try {
    ws.on("error", console.error);
    let streamSid;
    let callSid;
    let callStartTime;
    let callEndTime;
    let transcript = [];
    let username = "anonymous";
    let email = "";
    let agentType;

    // Determine agentType based on incoming Twilio number
    ws.on("message", async function message(data) {
      const msg = JSON.parse(data);
      if (msg.event === "start") {
        streamSid = msg.start.streamSid;
        callSid = msg.start.callSid;
        callStartTime = new Date();

        // Map Twilio number to agentType
        const incomingNumber = msg.start.called; // Twilio number that received the call
        if (incomingNumber === process.env.BOOKING_NUMBER) {
          agentType = "booking";
        } else if (incomingNumber === process.env.SELLING_NUMBER) {
          agentType = "selling";
        } else {
          agentType = "booking"; // Default to booking if number not recognized
        }

        // Instantiate services
        const gptService = new GptService(agentType);
        const streamService = new StreamService(ws);
        const transcriptionService = new TranscriptionService();
        const ttsService = new TextToSpeechService({});

        streamService.setStreamSid(streamSid);
        gptService.setCallSid(callSid);

        // Find or create agent document
        let agentDoc = await agentModel.findOne({ name: agentType });
        if (!agentDoc) {
          agentDoc = new agentModel({ name: agentType, prompts: [] });
          await agentDoc.save();
        }

        await recordingService(ttsService, callSid).then(() => {
          console.log(
            `Twilio -> Starting Media Stream for ${streamSid} (Agent: ${agentType}) at ${getFullISTDateTime(
              callStartTime
            )}`.underline.red
          );
          ttsService.generate(
            {
              partialResponseIndex: null,
              partialResponse: agentType === "booking"
                ? "Hello! I understand you're looking for an Appointment, is that correct?"
                : "Hi! I’m here to help you explore Inzint’s expert consultation services. Are you looking for business strategy, tech solutions, or something else?",
            },
            0
          );
        });

        // Handle media, mark, and stop events
        ws.on("message", async function message(data) {
          const msg = JSON.parse(data);
          if (msg.event === "media") {
            transcriptionService.send(msg.media.payload);
          } else if (msg.event === "mark") {
            const label = msg.mark.name;
            console.log(
              `Twilio -> Audio completed mark (${
                msg.sequenceNumber
              }): ${label} at ${formatISTTime(new Date())}`.red
            );
            marks = marks.filter((m) => m !== msg.mark.name);
          } else if (msg.event === "stop") {
            callEndTime = new Date();
            console.log(
              `Twilio -> Media stream ${streamSid} ended at ${getFullISTDateTime(
                callEndTime
              )}`.underline.red
            );

            const callDuration = `${getFullISTDateTime(
              callStartTime
            )} to ${getFullISTDateTime(callEndTime)}`;

            const callRecord = new callModel({
              callStartTime,
              callEndTime,
              callDuration,
              istStartTime: getFullISTDateTime(callStartTime),
              istEndTime: getFullISTDateTime(callEndTime),
              username,
              email,
              transcript,
            });

            try {
              await callRecord.save();
              console.log(
                `CallModel transcript saved to MongoDB at ${getFullISTDateTime(
                  new Date()
                )}`.magenta
              );
            } catch (error) {
              console.error("Error saving callModel transcript:", error);
            }

            // Save transcript to agent document
            try {
              await agentModel.updateOne(
                { name: agentType },
                {
                  $push: {
                    prompts: transcript.map((t) => ({
                      role: t.user ? "user" : "assistant",
                      content: t.user || t.gpt,
                    })),
                  },
                }
              );
              console.log(
                `Agent (${agentType}) prompts saved to MongoDB at ${getFullISTDateTime(
                  new Date()
                )}`.magenta
              );
            } catch (error) {
              console.error("Error saving agent prompts:", error);
            }
          }
        });

        let marks = [];
        let interactionCount = 0;

        transcriptionService.on("utterance", async (text) => {
          if (marks.length > 0 && text?.length > 5) {
            console.log(
              `Twilio -> Interruption at ${formatISTTime(
                new Date()
              )}, Clearing stream`.red
            );
            ws.send(
              JSON.stringify({
                streamSid,
                event: "clear",
              })
            );
          }
        });

        transcriptionService.on("transcription", async (text) => {
          if (!text) {
            return;
          }
          const now = new Date();
          console.log(
            `[${formatISTTime(
              now
            )}] Interaction ${interactionCount} - STT -> GPT: ${text}`.yellow
          );

          transcript.push({
            user: text,
            gpt: "",
            timestamp: formatISTTime(now),
          });

          if (interactionCount === 2 && text.toLowerCase().includes("my name is")) {
            username = text.toLowerCase().replace("my name is", "").trim();
          }
          if (interactionCount === 3 && text.toLowerCase().includes("gmail")) {
            email = text.toLowerCase().replace(/\s/g, "") + "@gmail.com";
          }

          gptService.completion(text, interactionCount);
          interactionCount += 1;
        });

        gptService.on("gptreply", async (gptReply, icount) => {
          const now = new Date();
          console.log(
            `[${formatISTTime(now)}] Interaction ${icount}: GPT -> TTS: ${
              gptReply.partialResponse
            }`.green
          );

          if (transcript[icount]) {
            transcript[icount].gpt = gptReply.partialResponse;
            transcript[icount].timestamp =
              transcript[icount].timestamp || formatISTTime(now);
          } else {
            transcript.push({
              user: "",
              gpt: gptReply.partialResponse,
              timestamp: formatISTTime(now),
            });
          }

          ttsService.generate(gptReply, icount);
        });

        ttsService.on("speech", (responseIndex, audio, label, icount) => {
          console.log(
            `[${formatISTTime(
              new Date()
            )}] Interaction ${icount}: TTS -> TWILIO: ${label}`.blue
          );
          streamService.buffer(responseIndex, audio);
        });

        streamService.on("audiosent", (markLabel) => {
          marks.push(markLabel);
        });
      }
    });
  } catch (err) {
    console.log(`[${formatISTTime(new Date())}] Error:`, err);
    ws.status(500).json({ message: "Error processing incoming call" });
  }
};

// export callModel controller
module.exports = {
  getCall,
  createCall,
  updateCall,
  deleteCall,
  incomingCall,
  callConnection,
};