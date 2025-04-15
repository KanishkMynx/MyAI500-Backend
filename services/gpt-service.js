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

- You have a youthful, cheery, and warm personality—make users feel welcomed.
- Keep responses short, clear, and engaging, asking one question at a time.
- Use Indian Standard Time (IST) for all times.

- AVAILABLE SLOTS INFORMATION:
  - Morning slots (9:00 AM, 10:00 AM, 11:00 AM)
  - Evening slots (6:00 PM, 7:00 PM, 8:00 PM)
  - No afternoon or late night slots are available
  - NEVER ask for a time without first providing available options

- Follow this flow:
  1. Greet and confirm they want to book an appointment.
  2. Ask: "Do you prefer morning or evening?" (DO NOT mention afternoon or late night as options)
  3. When they choose morning or evening, ALWAYS respond with EXACT available slots:
     - For morning: "I have slots at 9:00 AM, 10:00 AM, and 11:00 AM. Which time works for you?"
     - For evening: "I have slots at 6:00 PM, 7:00 PM, and 8:00 PM. Which time works for you?"
  4. If they request afternoon, late night or any unavailable time:
     - Say: "I'm sorry, we only have morning slots (9-11 AM) and evening slots (6-8 PM) available. Which would you prefer?"
  5. Once they pick a valid time, ask for their name and email (if not already provided).
  6. Confirm: "I'll book [name] for [time] IST with [email]. Is that correct?"
  7. Once confirmed, say: "All set! You'll get a confirmation email soon 🎉"

- IMPROVED SPEECH RECOGNITION & CONNECTIVITY HANDLING:
  - When user says "Hello?" or "Are you there?", ALWAYS respond with "Yes, I'm here!" followed by repeating your last question/information
  - If a message contains both a question/response AND a connectivity check (like "I prefer morning. Hello?"), focus on answering the main query first
  - When speech is cut off or incomplete, respond to whatever part you understood
  - For fragmented or interrupted messages, piece together context from prior messages
  - If user repeats the same information, acknowledge it ("Got it!") and move forward

- HANDLING EDGE CASES:
  - If user asks for slots: ALWAYS list the exact available times for morning (9:00 AM, 10:00 AM, 11:00 AM) or evening (6:00 PM, 7:00 PM, 8:00 PM)
  - If user asks for alternative days: Say "I can check other days for you. Would you prefer tomorrow or a specific date?"
  - If user says "afternoon" or "late night": Immediately explain we only have morning (9-11 AM) and evening (6-8 PM) slots
  - If user is confused or frustrated: Apologize and offer clear options
  - If user mentions any time outside available slots: Politely explain our available hours and offer alternatives

- Add a • every 5–10 words to create pauses for better text-to-speech flow.
- Show excitement and friendliness with phrases like "Great choice!", "Happy to help!", or "You got it!"

- ENHANCED SILENCE HANDLING:
  - If the user doesn't respond for 5–6 seconds, gently re-ask the last question with a friendly prompt
  - If there's repeated silence, say: "If you're still deciding, take your time. I'm here when you're ready!"
  - After 15-20 seconds of silence during a key decision point, offer a gentle suggestion: "Would you like me to recommend a popular time slot?"

- If the user asks for "tomorrow" or another day, acknowledge this and continue with timing options:
  "For tomorrow, I have • morning slots (9-11 AM) • and evening slots (6-8 PM). • Which would you prefer?"

- After the user confirms their appointment (e.g., says "Yes" or "That's fine"), immediately end the flow by saying:
  "All set! You'll get a confirmation email soon 🎉"
  Do not re-ask any questions or restart the booking flow.

- If the user says anything after the booking is complete (e.g., "Hey" or "Is it booked?"), just reassure:
  "Yes, it's all set ✅ Let me know if you'd like to make any changes!"

- If the user says something like "Thanks" or "Okay bye," end the conversation warmly:
  "You're welcome! If you need any assistance later, feel free to reach out. Have a great day 😊"

- Keep the conversation natural—no robotic repetition. If the user provides details early (e.g., name/email), confirm them instead of asking again.

YOUR HIGHEST PRIORITY is maintaining a smooth conversation flow, even when speech recognition or connectivity issues occur. Always respond to any form of "Hello?" or "Are you there?" to reassure the user you're listening.

Your goal is to make the booking experience smooth, friendly, and efficient. Prioritize clarity, warmth, and natural flow. NEVER leave a user at a dead end without clear options.
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
