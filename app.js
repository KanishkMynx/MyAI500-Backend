// require('dotenv').config();
// require('colors');

// const express = require('express');
// const ExpressWs = require('express-ws');
// const mongoose = require('mongoose'); // Added MongoDB dependency

// const { GptService } = require('./services/gpt-service');
// const { StreamService } = require('./services/stream-service');
// const { TranscriptionService } = require('./services/transcription-service');
// const { TextToSpeechService } = require('./services/tts-service');
// const { recordingService } = require('./services/recording-service');

// const VoiceResponse = require('twilio').twiml.VoiceResponse;

// const app = express();
// ExpressWs(app);

// const PORT = process.env.PORT || 8000;

// // MongoDB Connection
// mongoose.connect(process.env.MONGODB_URI, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true
// }).then(() => {
//   console.log('Connected to MongoDB'.cyan);
// }).catch(err => {
//   console.error('MongoDB connection error:', err);
// });

// // Call Schema
// const callSchema = new mongoose.Schema({
//   callDateTime: { type: Date, default: Date.now },
//   username: { type: String, default: 'anonymous' }, // Default value, modify as needed
//   email: { type: String, default: '' }, // Default value, modify as needed
//   transcription: String
// });

// const Call = mongoose.model('Call', callSchema);

// app.post('/incoming', (req, res) => {
//   try {
//     const response = new VoiceResponse();
//     const connect = response.connect();
//     connect.stream({ url: `wss://${process.env.SERVER}/connection` });
//     res.type('text/xml');
//     res.end(response.toString());
//   } catch (err) {
//     console.log(err);
//   }
// });

// app.ws('/connection', (ws) => {
//   try {
//     ws.on('error', console.error);
//     let streamSid;
//     let callSid;

//     const gptService = new GptService();
//     const streamService = new StreamService(ws);
//     const transcriptionService = new TranscriptionService();
//     const ttsService = new TextToSpeechService({});
  
//     let marks = [];
//     let interactionCount = 0;
  
//     ws.on('message', function message(data) {
//       const msg = JSON.parse(data);
//       if (msg.event === 'start') {
//         streamSid = msg.start.streamSid;
//         callSid = msg.start.callSid;
        
//         streamService.setStreamSid(streamSid);
//         gptService.setCallSid(callSid);

//         recordingService(ttsService, callSid).then(() => {
//           console.log(`Twilio -> Starting Media Stream for ${streamSid}`.underline.red);
//           ttsService.generate({partialResponseIndex: null, partialResponse: 'Hello! I understand you\'re looking for an Appointment, is that correct?'}, 0);
//         });
//       } else if (msg.event === 'media') {
//         transcriptionService.send(msg.media.payload);
//       } else if (msg.event === 'mark') {
//         const label = msg.mark.name;
//         console.log(`Twilio -> Audio completed mark (${msg.sequenceNumber}): ${label}`.red);
//         marks = marks.filter(m => m !== msg.mark.name);
//       } else if (msg.event === 'stop') {
//         console.log(`Twilio -> Media stream ${streamSid} ended.`.underline.red);
//       }
//     });
  
//     transcriptionService.on('utterance', async (text) => {
//       if(marks.length > 0 && text?.length > 5) {
//         console.log('Twilio -> Interruption, Clearing stream'.red);
//         ws.send(
//           JSON.stringify({
//             streamSid,
//             event: 'clear',
//           })
//         );
//       }
//     });
  
//     transcriptionService.on('transcription', async (text) => {
//       if (!text) { return; }
//       console.log(`Interaction ${interactionCount} - STT -> GPT: ${text}`.yellow);
      
//       // Save to MongoDB
//       const callRecord = new Call({
//         callDateTime: new Date(),
//         transcription: text,
//         // Add username and email if you have this data available
//         // username: 'someUsername', // Replace with actual username if available
//         // email: 'some@email.com'   // Replace with actual email if available
//       });
      
//       try {
//         await callRecord.save();
//         console.log(`Transcription saved to MongoDB: ${text}`.magenta);
//       } catch (error) {
//         console.error('Error saving to MongoDB:', error);
//       }

//       gptService.completion(text, interactionCount);
//       interactionCount += 1;
//     });
    
//     gptService.on('gptreply', async (gptReply, icount) => {
//       console.log(`Interaction ${icount}: GPT -> TTS: ${gptReply.partialResponse}`.green );
//       ttsService.generate(gptReply, icount);
//     });
  
//     ttsService.on('speech', (responseIndex, audio, label, icount) => {
//       console.log(`Interaction ${icount}: TTS -> TWILIO: ${label}`.blue);
//       streamService.buffer(responseIndex, audio);
//     });
  
//     streamService.on('audiosent', (markLabel) => {
//       marks.push(markLabel);
//     });
//   } catch (err) {
//     console.log(err);
//   }
// });

// app.listen(PORT);
// console.log(`Server running on port ${PORT}`);
require('dotenv').config();
require('colors');

const express = require('express');
const ExpressWs = require('express-ws');
const mongoose = require('mongoose'); // Added MongoDB dependency

const { GptService } = require('./services/gpt-service');
const { StreamService } = require('./services/stream-service');
const { TranscriptionService } = require('./services/transcription-service');
const { TextToSpeechService } = require('./services/tts-service');
const { recordingService } = require('./services/recording-service');

const VoiceResponse = require('twilio').twiml.VoiceResponse;

const app = express();
ExpressWs(app);

const PORT = process.env.PORT || 8000;

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB'.cyan);
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

// Updated Call Schema
const callSchema = new mongoose.Schema({
  callStartTime: { type: Date },
  callEndTime: { type: Date },
  callDuration: { type: String }, // e.g., "1:00:00 pm to 1:02:00 pm"
  username: { type: String, default: 'anonymous' },
  email: { type: String, default: '' },
  transcript: [{
    user: { type: String, default: '' }, // User's speech (STT)
    gpt: { type: String, default: '' }   // GPT's response (TTS)
  }]
});

const Call = mongoose.model('Call', callSchema);

app.post('/incoming', (req, res) => {
  try {
    const response = new VoiceResponse();
    const connect = response.connect();
    connect.stream({ url: `wss://${process.env.SERVER}/connection` });
    res.type('text/xml');
    res.end(response.toString());
  } catch (err) {
    console.log(err);
  }
});

app.ws('/connection', (ws) => {
  try {
    ws.on('error', console.error);
    let streamSid;
    let callSid;
    let callStartTime;
    let callEndTime;
    let transcript = []; // Array to store the entire transcript
    let username = 'anonymous'; // Default, will update if available
    let email = ''; // Default, will update if available

    const gptService = new GptService();
    const streamService = new StreamService(ws);
    const transcriptionService = new TranscriptionService();
    const ttsService = new TextToSpeechService({});
  
    let marks = [];
    let interactionCount = 0;
  
    ws.on('message', function message(data) {
      const msg = JSON.parse(data);
      if (msg.event === 'start') {
        streamSid = msg.start.streamSid;
        callSid = msg.start.callSid;
        callStartTime = new Date(); // Record the start time
        
        streamService.setStreamSid(streamSid);
        gptService.setCallSid(callSid);

        recordingService(ttsService, callSid).then(() => {
          console.log(`Twilio -> Starting Media Stream for ${streamSid}`.underline.red);
          ttsService.generate({partialResponseIndex: null, partialResponse: 'Hello! I understand you\'re looking for an Appointment, is that correct?'}, 0);
        });
      } else if (msg.event === 'media') {
        transcriptionService.send(msg.media.payload);
      } else if (msg.event === 'mark') {
        const label = msg.mark.name;
        console.log(`Twilio -> Audio completed mark (${msg.sequenceNumber}): ${label}`.red);
        marks = marks.filter(m => m !== msg.mark.name);
      } else if (msg.event === 'stop') {
        console.log(`Twilio -> Media stream ${streamSid} ended.`.underline.red);
        callEndTime = new Date(); // Record the end time

        // Format the call duration (e.g., "1:00:00 pm to 1:02:00 pm")
        const formatTime = (date) => {
          return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
        };
        const callDuration = `${formatTime(callStartTime)} to ${formatTime(callEndTime)}`;

        // Save the entire transcript as a single record
        const callRecord = new Call({
          callStartTime,
          callEndTime,
          callDuration,
          username,
          email,
          transcript
        });

        try {
          await callRecord.save();
          console.log(`Entire call transcript saved to MongoDB for call ${callSid}`.magenta);
        } catch (error) {
          console.error('Error saving call transcript to MongoDB:', error);
        }
      }
    });
  
    transcriptionService.on('utterance', async (text) => {
      if (marks.length > 0 && text?.length > 5) {
        console.log('Twilio -> Interruption, Clearing stream'.red);
        ws.send(
          JSON.stringify({
            streamSid,
            event: 'clear',
          })
        );
      }
    });
  
    transcriptionService.on('transcription', async (text) => {
      if (!text) { return; }
      console.log(`Interaction ${interactionCount} - STT -> GPT: ${text}`.yellow);
      
      // Add user transcription to the transcript array
      transcript.push({ user: text, gpt: '' });

      // Extract username and email if available in the transcript
      if (interactionCount === 2 && text.toLowerCase().includes('my name is')) {
        username = text.toLowerCase().replace('my name is', '').trim();
      }
      if (interactionCount === 3 && text.toLowerCase().includes('gmail')) {
        email = text.toLowerCase().replace(/\s/g, '') + '@gmail.com'; // Basic email extraction
      }

      gptService.completion(text, interactionCount);
      interactionCount += 1;
    });
    
    gptService.on('gptreply', async (gptReply, icount) => {
      console.log(`Interaction ${icount}: GPT -> TTS: ${gptReply.partialResponse}`.green);
      
      // Update the transcript with the GPT response for the corresponding interaction
      if (transcript[icount]) {
        transcript[icount].gpt = gptReply.partialResponse;
      } else {
        transcript.push({ user: '', gpt: gptReply.partialResponse });
      }

      ttsService.generate(gptReply, icount);
    });
  
    ttsService.on('speech', (responseIndex, audio, label, icount) => {
      console.log(`Interaction ${icount}: TTS -> TWILIO: ${label}`.blue);
      streamService.buffer(responseIndex, audio);
    });
  
    streamService.on('audiosent', (markLabel) => {
      marks.push(markLabel);
    });
  } catch (err) {
    console.log(err);
  }
});

app.listen(PORT);
console.log(`Server running on port ${PORT}`);