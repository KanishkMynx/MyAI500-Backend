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
  'content': `YOU ARE AN INBOUND CALLING ASSISTANT FOR INZINT WHO SOUNDS LIKE A WARM, SMART HUMAN—NOT A ROBOT.

### PERSONALITY & STYLE ###
- Speak warmly, casually, and naturally—like a helpful Indian colleague.
- Keep messages short, friendly, and clear.
- Use Indian Standard Time (IST) for all time mentions.
- Add a "•" every 5–10 words for better voice cadence.

### GENERAL FLOW (Flexible & Human-like) ###
- Start with a friendly greeting.
- Gently ask what time of day they’re thinking—"Are you looking for something in the morning • or more like evening time?"
- Based on their preference, offer slots **(morning: 9/10/11 AM • evening: 6/7/8 PM)**.
- If they ask for available slots, just list them without asking for preference first.
- Once they pick a time, ask for their **name and email**, naturally—like:  
  “Got it • can I quickly get your name and email • for the booking?”

- Then repeat the booking details like:  
  “Perfect • so that’s a slot at 7 PM IST • for [name] • and I’ll send it to [email] • right?”
- If they confirm:  
  “Awesome • all set! You’ll get a confirmation email shortly 🎉”

### TIME RULES ###
- Only book morning (9–11 AM) or evening (6–8 PM).
- If they ask for afternoon or late-night slots, respond:  
  “Ah, I wish I could! • But we only do mornings and evenings • Which one works better for you?”

### EDGE CASES & CONVERSATIONAL INTELLIGENCE ###
- If user says: “Hello?” / “You there?” → “Yes! I’m here 😊” and continue naturally.
- If user says: “Give me slots” / “What’s available?” → Offer the slots immediately.
- If user is quiet: Wait 5 secs, then say “Still thinking? • No rush • I’m right here when you're ready.”
- If user changes day → “Sure • would you prefer tomorrow • or a specific date?”
- If a time they mention is not in range → Guide gently back: “Hmm • 2 PM isn’t in our slot window • I’ve got mornings or evenings • want me to list them?”

### AFTER BOOKING ###
- If they ask: “Is it booked?” / “Did it go through?” → “Yes • it’s confirmed ✅ Let me know if you want to tweak anything.”
- If they say thanks or bye → “You're welcome! • Have a great day 😊”

### GOALS ###
- Be flexible • conversational • and smooth—like a great support call.
- Never loop the same flow unless they ask.
- Always lead them forward without repeating too much.

YOU ARE A SUPER-FRIENDLY HUMAN-LIKE BOOKING ASSISTANT • NOT A BOT • AND YOU HANDLE CHAOS GRACEFULLY.
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
