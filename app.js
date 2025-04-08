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
//...................................................
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

// // Updated Call Schema from the second file
// const callSchema = new mongoose.Schema({
//   callStartTime: { type: Date },
//   callEndTime: { type: Date },
//   callDuration: { type: String }, // e.g., "1:00:00 pm to 1:02:00 pm"
//   username: { type: String, default: 'anonymous' },
//   email: { type: String, default: '' },
//   transcript: [{
//     user: { type: String, default: '' }, // User's speech (STT)
//     gpt: { type: String, default: '' }   // GPT's response (TTS)
//   }]
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
//     let callStartTime; // Added for tracking call duration
//     let callEndTime;   // Added for tracking call duration
//     let transcript = []; // Array to store the entire transcript
//     let username = 'anonymous'; // Default, will update if available
//     let email = ''; // Default, will update if available

//     const gptService = new GptService();
//     const streamService = new StreamService(ws);
//     const transcriptionService = new TranscriptionService();
//     const ttsService = new TextToSpeechService({});
  
//     let marks = [];
//     let interactionCount = 0;
  
//     ws.on('message', async function message(data) { // Mark as async to use await
//       const msg = JSON.parse(data);
//       if (msg.event === 'start') {
//         streamSid = msg.start.streamSid;
//         callSid = msg.start.callSid;
//         const callStartTimeUTC = new Date();
//         callStartTime=callStartTimeUTC.toISOString() // Record the start time
        
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
//         const callEndTimeUTC = new Date();
//         callEndTime=callEndTimeUTC.toISOString() // Record the end time

//         // Format the call duration (e.g., "1:00:00 pm to 1:02:00 pm")
//         const formatTime = (date) => {
//           return new Date(date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
//         };
//         const callDuration = `${formatTime(callStartTime)} to ${formatTime(callEndTime)}`;

//         // Save the entire transcript as a single record
//         const callRecord = new Call({
//           callStartTime,
//           callEndTime,
//           callDuration,
//           username,
//           email,
//           transcript
//         });

//         try {
//           await callRecord.save(); // Use await to save the record
//           console.log(`Entire call transcript saved to MongoDB for call ${callSid}`.magenta);
//         } catch (error) {
//           console.error('Error saving call transcript to MongoDB:', error);
//         }
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
      
//       // Add user transcription to the transcript array (from the second file)
//       transcript.push({ user: text, gpt: '' });

//       // Extract username and email if available in the transcript (from the second file)
//       if (interactionCount === 2 && text.toLowerCase().includes('my name is')) {
//         username = text.toLowerCase().replace('my name is', '').trim();
//       }
//       if (interactionCount === 3 && text.toLowerCase().includes('gmail')) {
//         email = text.toLowerCase().replace(/\s/g, '') + '@gmail.com'; // Basic email extraction
//       }

//       gptService.completion(text, interactionCount);
//       interactionCount += 1;
//     });
    
//     gptService.on('gptreply', async (gptReply, icount) => {
//       console.log(`Interaction ${icount}: GPT -> TTS: ${gptReply.partialResponse}`.green );
      
//       // Update the transcript with the GPT response (from the second file)
//       if (transcript[icount]) {
//         transcript[icount].gpt = gptReply.partialResponse;
//       } else {
//         transcript.push({ user: '', gpt: gptReply.partialResponse });
//       }

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
const mongoose = require('mongoose');

const { GptService } = require('./services/gpt-service');
const { StreamService } = require('./services/stream-service');
const { TranscriptionService } = require('./services/transcription-service');
const { TextToSpeechService } = require('./services/tts-service');
const { recordingService } = require('./services/recording-service');

const VoiceResponse = require('twilio').twiml.VoiceResponse;

const app = express();
ExpressWs(app);

const PORT = process.env.PORT || 8000;

// Helper functions for IST time formatting
const formatISTTime = (date) => {
  return new Date(date).toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
};

const formatISTDate = (date) => {
  const options = { 
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  };
  return new Date(date).toLocaleDateString('en-IN', options);
};

const getFullISTDateTime = (date) => {
  return `${formatISTDate(date)} ${formatISTTime(date)} IST`;
};

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB'.cyan);
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

// Call Schema
const callSchema = new mongoose.Schema({
  callStartTime: { type: Date },
  callEndTime: { type: Date },
  callDuration: { type: String },
  istStartTime: { type: String }, // Added IST formatted time
  istEndTime: { type: String },   // Added IST formatted time
  username: { type: String, default: 'anonymous' },
  email: { type: String, default: '' },
  transcript: [{
    user: { type: String, default: '' },
    gpt: { type: String, default: '' },
    timestamp: { type: String } // Added timestamp for each interaction
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
    let transcript = [];
    let username = 'anonymous';
    let email = '';

    const gptService = new GptService();
    const streamService = new StreamService(ws);
    const transcriptionService = new TranscriptionService();
    const ttsService = new TextToSpeechService({});
  
    let marks = [];
    let interactionCount = 0;
  
    ws.on('message', async function message(data) {
      const msg = JSON.parse(data);
      if (msg.event === 'start') {
        streamSid = msg.start.streamSid;
        callSid = msg.start.callSid;
        callStartTime = new Date();
        
        streamService.setStreamSid(streamSid);
        gptService.setCallSid(callSid);

        recordingService(ttsService, callSid).then(() => {
          console.log(`Twilio -> Starting Media Stream for ${streamSid} at ${getFullISTDateTime(callStartTime)}`.underline.red);
          ttsService.generate({partialResponseIndex: null, partialResponse: 'Hello! I understand you\'re looking for an Appointment, is that correct?'}, 0);
        });
      } else if (msg.event === 'media') {
        transcriptionService.send(msg.media.payload);
      } else if (msg.event === 'mark') {
        const label = msg.mark.name;
        console.log(`Twilio -> Audio completed mark (${msg.sequenceNumber}): ${label} at ${formatISTTime(new Date())}`.red);
        marks = marks.filter(m => m !== msg.mark.name);
      } else if (msg.event === 'stop') {
        callEndTime = new Date();
        console.log(`Twilio -> Media stream ${streamSid} ended at ${getFullISTDateTime(callEndTime)}`.underline.red);

        const callDuration = `${getFullISTDateTime(callStartTime)} to ${getFullISTDateTime(callEndTime)}`;

        const callRecord = new Call({
          callStartTime,
          callEndTime,
          callDuration,
          istStartTime: getFullISTDateTime(callStartTime),
          istEndTime: getFullISTDateTime(callEndTime),
          username,
          email,
          transcript
        });

        try {
          await callRecord.save();
          console.log(`Call transcript saved to MongoDB at ${getFullISTDateTime(new Date())}`.magenta);
        } catch (error) {
          console.error('Error saving call transcript:', error);
        }
      }
    });
  
    // transcriptionService.on('utterance', async (text) => {
    //   if(marks.length > 0 && text?.length > 5) {
    //     console.log(`Twilio -> Interruption at ${formatISTTime(new Date())}, Clearing stream`.red);
    //     ws.send(
    //       JSON.stringify({
    //         streamSid,
    //         event: 'clear',
    //       })
    //     );
    //   }
    // });
  
    // transcriptionService.on('transcription', async (text) => {
    //   if (!text) { return; }
    //   const now = new Date();
    //   console.log(`[${formatISTTime(now)}] Interaction ${interactionCount} - STT -> GPT: ${text}`.yellow);
      
    //   transcript.push({ 
    //     user: text, 
    //     gpt: '',
    //     timestamp: formatISTTime(now)
    //   });

    //   if (interactionCount === 2 && text.toLowerCase().includes('my name is')) {
    //     username = text.toLowerCase().replace('my name is', '').trim();
    //   }
    //   if (interactionCount === 3 && text.toLowerCase().includes('gmail')) {
    //     email = text.toLowerCase().replace(/\s/g, '') + '@gmail.com';
    //   }

      
       
    //   gptService.completion(text, interactionCount);
    //   interactionCount += 1;
    // });

    // Update the transcription event handler
    transcriptionService.on('transcription', async (text, language) => {
      if (!text) { return; }
      const now = new Date();
      console.log(`[${formatISTTime(now)}] Interaction ${interactionCount} - STT [${language}] -> GPT: ${text}`.yellow);
      
      transcript.push({ 
        user: text, 
        gpt: '',
        language: language, // Store the detected language
        timestamp: formatISTTime(now)
      });

      // You might want to adjust your GPT prompt based on the detected language
      const systemPrompt = language === 'ar' 
        ? "Respond in Arabic" 
        : "Respond in English";
      
      await gptService.completion(text, interactionCount, 'user', 'user', systemPrompt);
      interactionCount += 1;
    });

    // Update the utterance event handler
    transcriptionService.on('utterance', async (text, language) => {
      if(marks.length > 0 && text?.length > 5) {
        console.log(`Twilio -> Interruption [${language}], Clearing stream`.red);
        ws.send(
          JSON.stringify({
            streamSid,
            event: 'clear',
          })
        );
      }
    });

    
    gptService.on('gptreply', async (gptReply, icount) => {
      const now = new Date();
      console.log(`[${formatISTTime(now)}] Interaction ${icount}: GPT -> TTS: ${gptReply.partialResponse}`.green);
      
      if (transcript[icount]) {
        transcript[icount].gpt = gptReply.partialResponse;
        transcript[icount].timestamp = transcript[icount].timestamp || formatISTTime(now);
      } else {
        transcript.push({ 
          user: '', 
          gpt: gptReply.partialResponse,
          timestamp: formatISTTime(now)
        });
      }

      ttsService.generate(gptReply, icount);
    });
  
    ttsService.on('speech', (responseIndex, audio, label, icount) => {
      console.log(`[${formatISTTime(new Date())}] Interaction ${icount}: TTS -> TWILIO: ${label}`.blue);
      streamService.buffer(responseIndex, audio);
    });
  
    streamService.on('audiosent', (markLabel) => {
      marks.push(markLabel);
    });
  } catch (err) {
    console.log(`[${formatISTTime(new Date())}] Error:`, err);
  }
});

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT} at ${getFullISTDateTime(new Date())}`);
});


//..............


// require('dotenv').config();
// require('colors');

// const express = require('express');
// const ExpressWs = require('express-ws');
// const mongoose = require('mongoose');

// const { GptService } = require('./services/gpt-service');
// const { StreamService } = require('./services/stream-service');
// const { TranscriptionService } = require('./services/transcription-service');
// const { TextToSpeechService } = require('./services/tts-service');
// const { recordingService } = require('./services/recording-service');

// const VoiceResponse = require('twilio').twiml.VoiceResponse;

// const app = express();
// ExpressWs(app);

// const PORT = process.env.PORT || 8000;

// // Helper functions for IST time formatting
// const formatISTTime = (date) => {
//   return new Date(date).toLocaleTimeString('en-IN', {
//     timeZone: 'Asia/Kolkata',
//     hour: 'numeric',
//     minute: '2-digit',
//     second: '2-digit',
//     hour12: true
//   });
// };

// const formatISTDate = (date) => {
//   const options = { 
//     timeZone: 'Asia/Kolkata',
//     day: '2-digit',
//     month: '2-digit',
//     year: 'numeric'
//   };
//   return new Date(date).toLocaleDateString('en-IN', options);
// };

// const getFullISTDateTime = (date) => {
//   return `${formatISTDate(date)} ${formatISTTime(date)} IST`;
// };

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
//   callStartTime: { type: Date },
//   callEndTime: { type: Date },
//   callDuration: { type: String },
//   istStartTime: { type: String },
//   istEndTime: { type: String },
//   username: { type: String, default: 'anonymous' },
//   email: { type: String, default: '' },
//   transcript: [{
//     user: { type: String, default: '' },
//     gpt: { type: String, default: '' },
//     timestamp: { type: String }
//   }]
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
//     let streamSid, callSid, callStartTime, callEndTime;
//     let transcript = [];
//     let username = 'anonymous';
//     let email = '';
//     let interactionCount = 0;
    
//     const gptService = new GptService();
//     const streamService = new StreamService(ws);
//     const transcriptionService = new TranscriptionService();
//     const ttsService = new TextToSpeechService({});

//     ws.on('message', async function message(data) {
//       const msg = JSON.parse(data);
//       if (msg.event === 'start') {
//         streamSid = msg.start.streamSid;
//         callSid = msg.start.callSid;
//         callStartTime = new Date();
        
//         streamService.setStreamSid(streamSid);
//         gptService.setCallSid(callSid);

//         recordingService(ttsService, callSid).then(() => {
//           console.log(`Twilio -> Starting Media Stream at ${getFullISTDateTime(callStartTime)}`.red);
//           ttsService.generate({ partialResponse: 'Hello! Are you looking to book an appointment?' }, 0);
//         });
//       }
//     });

//     transcriptionService.on('transcription', async (text) => {
//       if (!text) return;
//       const now = new Date();
//       transcript.push({ user: text, gpt: '', timestamp: formatISTTime(now) });
      
//       const nameMatch = text.match(/(?:my name is|i am|this is) ([A-Za-z\s]+)/i);
//       if (nameMatch) username = nameMatch[1].trim();

//       const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
//       if (emailMatch) email = emailMatch[0].trim();
      
//       const timeMatch = text.match(/(\d{1,2}:\d{2}\s?(AM|PM)?)/i);
//       const dateMatch = text.match(/\b(today|tomorrow|\d{4}-\d{2}-\d{2})\b/i);

//       if (timeMatch && dateMatch) {
//         const time = timeMatch[0].trim();
//         const date = dateMatch[1] === 'today' ? new Date().toISOString().split('T')[0] : new Date(Date.now() + 86400000).toISOString().split('T')[0];
        
//         if (!isValidSlot(time)) {
//           ttsService.generate({ partialResponse: `Sorry, ${time} is outside our booking hours.` }, interactionCount);
//           return;
//         }
        
//         const bookingResponse = await bookAppointment({ time, date, name: username, email });
//         ttsService.generate({ partialResponse: bookingResponse }, interactionCount);
//       }
//     });

//     function isValidSlot(time) {
//       const [hour, minutes] = time.match(/\d{1,2}:\d{2}/)[0].split(':').map(Number);
//       const meridian = time.includes('PM') ? 'PM' : 'AM';
//       if (meridian === 'AM' && (hour < 8 || hour >= 12)) return false;
//       if (meridian === 'PM' && (hour < 4 || hour >= 8)) return false;
//       return true;
//     }

//   } catch (err) {
//     console.log(`Error:`, err);
//   }
// });

// app.listen(PORT, () => {
//   console.log(`Server started on port ${PORT} at ${getFullISTDateTime(new Date())}`);
// });
