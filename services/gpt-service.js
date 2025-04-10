require('colors');
const EventEmitter = require('events');
const OpenAI = require('openai');
const tools = require('../functions/function-manifest');

// Import all functions included in function manifest
// Note: the function name and file name must be the same
const availableFunctions = {};
tools.forEach((tool) => {
  let functionName = tool.function.name;
  availableFunctions[functionName] = require(`../functions/${functionName}`);
});

class GptService extends EventEmitter {
  constructor() {
    super();
    this.openai = new OpenAI();
// In GptService constructor, update the system prompt slightly
    this.userContext = [
      {
//         'role': 'system',
//         'content': `You are an inbound meeting booking assistant for Inzint.
// • You have a youthful, cheery, and warm personality—make users feel welcomed.
// • Keep responses short, clear, and engaging, asking one question at a time.
// • Use Indian Standard Time (IST) for all times.
// • Follow this flow:
//   1. Greet and confirm they want to book an appointment.
 
//   2. Ask: "Do you prefer morning or evening?"
//   3. Show available slots for their chosen timings, then ask: "Which time works for you? Please say the exact time, like '10:30 AM'."
//   4. Once they pick a time, ask for their name and email (if not already provided).
//   5. Confirm: "I’ll book [name] for [time] IST with [email]. Is that correct?"
//   6. Book the appointment and say: "All set! You’ll get a confirmation email soon."
// • After the booking is completed, **do not repeat confirmations or ask further questions unless the user explicitly requests a change.**
// • Keep the conversation natural—no robotic repetition. If they give details early, confirm them instead of asking again.
// • If they provide details early (e.g., name/email), confirm them instead of asking again.
// • Add a • every 5-10 words for text-to-speech pauses.
// • Show enthusiasm like "Great choice!" or "Happy to help!" when it fits.
// `


  'role': 'system',
  'content': `You are an inbound meeting booking assistant for Inzint.

• You have a youthful, cheery, and warm personality—make users feel welcomed.
• Keep responses short, clear, and engaging, asking one question at a time.
• Use Indian Standard Time (IST) for all times.

• Follow this flow:
  1. Greet and confirm they want to book an appointment.
  2. Ask: "Do you prefer morning or evening?"
  3. Show available slots for their chosen timings, then ask: "Which time works for you? Please say the exact time, like '10:30 AM'."
  4. Once they pick a time, ask for their name and email (if not already provided).
  5. Confirm: "I’ll book [name] for [time] IST with [email]. Is that correct?"
  6. Once confirmed, say: "All set! You’ll get a confirmation email soon 🎉"
  7. Do not repeat or restart the booking process after confirmation unless the user clearly asks to modify or rebook.

• Add a • every 5–10 words to create pauses for better text-to-speech flow.
• Show excitement and friendliness with phrases like “Great choice!”, “Happy to help!”, or “You got it!”

• Be sensitive to silence:
  - If the user doesn’t respond for 5–6 seconds, gently re-ask the last question.
  - If there's repeated silence, say: “If you're still deciding, take your time. I'm here when you're ready!”

• BEFORE saying: “Let me find some slots for you!” — always check that slots are available. If there are no available slots, instead say:  
  “Let me check availability for you!” followed by an empathetic message like:  
  “Ahh, it looks like all evening slots are booked for today 😔. Want me to check for another day or a different time?”

• If no slots are available, offer alternatives:
  - Suggest checking another time of day or a different day.
  - Never leave the user at a dead end—always provide a next helpful step.

• After the user confirms their appointment (e.g., says “Yes” or “That’s fine”), immediately end the flow by saying:
  “All set! You’ll get a confirmation email soon 🎉”
  Do not re-ask any questions or restart the booking flow.

• If the user says anything after the booking is complete (e.g., “Hey” or “Is it booked?”), just reassure:
  “Yes, it’s all set ✅ Let me know if you'd like to make any changes!”

• If the user says something like “Thanks” or “Okay bye,” end the conversation warmly:
  “You're welcome! If you need any assistance later, feel free to reach out. Have a great day 😊”

• Keep the conversation natural—no robotic repetition. If the user provides details early (e.g., name/email), confirm them instead of asking again.

Your goal is to make the booking experience smooth, friendly, and efficient. Prioritize clarity, warmth, and natural flow.
`


      },
      { 'role': 'assistant', 'content': 'Hello! I understand you’re looking for an appointment with Inzint, is that correct?' },
    ],
    this.partialResponseIndex = 0;
  }


  setCallSid (callSid) {
    this.userContext.push({ 'role': 'system', 'content': `callSid: ${callSid}` });
  }

  validateFunctionArgs (args) {
    try {
      return JSON.parse(args);
    } catch (error) {
      console.log('Warning: Double function arguments returned by OpenAI:', args);
      // Seeing an error where sometimes we have two sets of args
      if (args.indexOf('{') != args.lastIndexOf('{')) {
        return JSON.parse(args.substring(args.indexOf(''), args.indexOf('}') + 1));
      }
    }
  }

  updateUserContext(name, role, text) {
    if (name !== 'user') {
      this.userContext.push({ 'role': role, 'name': name, 'content': text });
    } else {
      this.userContext.push({ 'role': role, 'content': text });
    }
  }

  async completion(text, interactionCount, role = 'user', name = 'user') {
    this.updateUserContext(name, role, text);

    // Step 1: Send user transcription to Chat GPT
    const stream = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: this.userContext,
      tools: tools,
      stream: true,
    });

    let completeResponse = '';
    let partialResponse = '';
    let functionName = '';
    let functionArgs = '';
    let finishReason = '';

    function collectToolInformation(deltas) {
      let name = deltas.tool_calls[0]?.function?.name || '';
      console.log(JSON.stringify(deltas.tool_calls[0]?.function, null, 2));
      if (name != '') {
        functionName = name;
      }
      let args = deltas.tool_calls[0]?.function?.arguments || '';
      if (args != '') {
        // args are streamed as JSON string so we need to concatenate all chunks
        functionArgs += args;
      }
    }

    for await (const chunk of stream) {
      let content = chunk.choices[0]?.delta?.content || '';
      let deltas = chunk.choices[0].delta;
      finishReason = chunk.choices[0].finish_reason;

      // Step 2: check if GPT wanted to call a function
      if (deltas.tool_calls) {
        // Step 3: Collect the tokens containing function data
        collectToolInformation(deltas);
        console.log(completeResponse,
          partialResponse,
          functionName,
          functionArgs,
          finishReason);
      }

      // need to call function on behalf of Chat GPT with the arguments it parsed from the conversation
      if (finishReason === 'tool_calls') {
        // parse JSON string of args into JSON object

        const functionToCall = availableFunctions[functionName];
        const validatedArgs = this.validateFunctionArgs(functionArgs);
        
        // Say a pre-configured message from the function manifest
        // before running the function.
        const toolData = tools.find(tool => tool.function.name === functionName);
        const say = toolData.function.say;

        this.emit('gptreply', {
          partialResponseIndex: null,
          partialResponse: say
        }, interactionCount);

        let functionResponse = await functionToCall(validatedArgs);

        // Step 4: send the info on the function call and function response to GPT
        this.updateUserContext(functionName, 'function', functionResponse);
        
        // call the completion function again but pass in the function response to have OpenAI generate a new assistant response
        await this.completion(functionResponse, interactionCount, 'function', functionName);
      } else {
        // We use completeResponse for userContext
        completeResponse += content;
        // We use partialResponse to provide a chunk for TTS
        partialResponse += content;
        // Emit last partial response and add complete response to userContext
        if (content.trim().slice(-1) === '•' || finishReason === 'stop') {
          const gptReply = { 
            partialResponseIndex: this.partialResponseIndex,
            partialResponse
          };

          this.emit('gptreply', gptReply, interactionCount);
          this.partialResponseIndex++;
          partialResponse = '';
        }
      }
    }
    this.userContext.push({'role': 'assistant', 'content': completeResponse});
    console.log(`GPT -> user context length: ${this.userContext.length}`.green);
  }
}

module.exports = { GptService };
