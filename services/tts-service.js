// require('dotenv').config();
// const { Buffer } = require('node:buffer');
// const EventEmitter = require('events');
// const fetch = require('node-fetch');

// class TextToSpeechService extends EventEmitter {
//   constructor() {
//     super();
//     this.nextExpectedIndex = 0;
//     this.speechBuffer = {};
//   }

//   async generate(gptReply, interactionCount) {
//     const { partialResponseIndex, partialResponse } = gptReply;

//     if (!partialResponse) { return; }

//     try {
//       const response = await fetch(
//         `https://api.deepgram.com/v1/speak?model=${process.env.VOICE_MODEL}&encoding=mulaw&sample_rate=8000&container=none`,
//         {
//           method: 'POST',
//           headers: {
//             'Authorization': `Token ${process.env.DEEPGRAM_API_KEY}`,
//             'Content-Type': 'application/json',
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
//           const base64String = Buffer.from(audioArrayBuffer).toString('base64');
//           this.emit('speech', partialResponseIndex, base64String, partialResponse, interactionCount);
//         } catch (err) {
//           console.log(err);
//         }
//       } else {
//         console.log('Deepgram TTS error:');
//         console.log(response);
//       }
//     } catch (err) {
//       console.error('Error occurred in TextToSpeech service');
//       console.error(err);
//     }
//   }
// }

// module.exports = { TextToSpeechService };






require('colors');
const EventEmitter = require('events');
const fetch = require('node-fetch');

class TTSService extends EventEmitter {
  constructor() {
    super();
    this.ELEVEN_LABS_API_KEY = process.env.ELEVEN_LABS_API_KEY;
    
    // Voice IDs for different languages
    this.voices = {
      ar: {
        male: "pNInz6obpgDQGcFmaJgB",    // Example ID for Arabic male voice
        female: "qi4PkV9c01kb869Vh7Su"   // Example ID for Arabic female voice
      },
      en: {
        male: "21m00Tcm4TlvDq8ikWAM",    // Example ID for English male voice
        female: "qi4PkV9c01kb869Vh7Su"    // Example ID for English female voice
      }
    };

    // Default settings
    this.defaultVoiceSettings = {
      stability: 0.5,
      similarity_boost: 0.75,
      style: 0.5,
      use_speaker_boost: true
    };
  }

  async generate({ partialResponse, partialResponseIndex }, interactionCount, language = 'ar') {
    if (!partialResponse) return;

    try {
      // Select appropriate voice based on language
      const voiceId = this.voices[language]?.male || this.voices.ar.male;
      
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?optimize_streaming_latency=3&output_format=ulaw_8000`,
        {
          method: 'POST',
          headers: {
            'xi-api-key': this.ELEVEN_LABS_API_KEY,
            'Content-Type': 'application/json',
            'accept': 'audio/wav'
          },
          body: JSON.stringify({
            text: partialResponse,
            model_id: "eleven_multilingual_v2", // Use multilingual model
            voice_settings: this.defaultVoiceSettings
          })
        }
      );

      if (response.status === 200) {
        const audioArrayBuffer = await response.arrayBuffer();
        const base64String = Buffer.from(audioArrayBuffer).toString('base64');
        
        console.log(`TTS -> Generated audio for: "${partialResponse}"`.green);
        this.emit('speech', partialResponseIndex, base64String, partialResponse, interactionCount);
      } else {
        const errorData = await response.json();
        console.error('Eleven Labs Error:'.red);
        console.error(errorData);
        throw new Error(`Eleven Labs API error: ${errorData.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error in Eleven Labs TTS service:'.red);
      console.error(err);
      
      // Fallback to alternative voice if primary fails
      if (err.message?.includes('voice not found')) {
        console.log('Attempting fallback to default voice...'.yellow);
        // Retry with default voice
        await this.generateWithFallbackVoice(partialResponse, partialResponseIndex, interactionCount);
      }
    }
  }

  async generateWithFallbackVoice(text, partialResponseIndex, interactionCount) {
    // Implementation for fallback voice if needed
    // Similar to generate() but with a guaranteed-available voice
  }
}

module.exports = { TTSService };