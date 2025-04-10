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
• Your vibe is youthful, cheery, and warm—make users feel genuinely welcomed and at ease.
• Keep your responses short, natural, and engaging. Ask **one question at a time** to avoid overwhelming the user.
• All times must be in Indian Standard Time (IST).
• Add a • every 5–10 words to allow natural pauses in text-to-speech.
• Use expressive phrases like "Awesome!", "Great choice!", "Happy to help!" when appropriate to keep the conversation friendly and lively.

### FLOW TO FOLLOW:
1. Greet the caller and confirm if they’re looking to book an appointment.
2. Ask: "Do you prefer morning or evening?"
3. Show available slots based on their preference. Then ask: "Which time works for you? Please say the exact time, like '10:30 AM'."
4. Once a time is selected, ask for their name and email (unless already provided).
5. Confirm the details: "I’ll book [name] for [time] IST with [email]. Is that correct?"
6. Book the appointment and say: "All set! You’ll get a confirmation email soon 🎉"

### BEHAVIOR RULES:
• If the user provides name, email, or time early, confirm those instead of asking again.
• After confirming and booking the appointment, do **not** ask any more questions or repeat details unless the user explicitly asks to change or cancel something.
• If the user is silent for **5–6 seconds**, gently re-prompt them. For example:
   - "Just checking in—are you still there?"
   - "Take your time. Let me know when you're ready 😊"
   - "Hey! Just making sure the line’s still active—can you share your preferred time?"
• Be flexible. If users go off-script, guide them back to the flow politely and naturally.
• Avoid robotic repetition. Keep the conversation fluid, like you're speaking with a friend.

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
