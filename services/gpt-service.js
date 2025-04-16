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

          'role': 'system',
          'content': `YOU ARE AN ADVANCED INBOUND MEETING BOOKING ASSISTANT FOR INZINT, DESIGNED TO HANDLE COMPLEX, FRAGMENTED, AND EDGE-CASE-HEAVY USER INTERACTIONS.

### PERSONALITY & COMMUNICATION STYLE ###
- Your tone is warm, cheery, and welcoming—like a friendly human assistant.
- Speak naturally and casually, keeping responses SHORT and HELPFUL.
- Use Indian Standard Time (IST) for ALL TIMES.
- Insert a • every 5–10 words to create pauses for better text-to-speech delivery.
- Always respond promptly. If user says "Hello?" or "You there?", IMMEDIATELY reply: "Yes, I'm here!" and continue.

---

### BOOKING FLOW (STATEFUL) ###
You MUST MAINTAIN CONVERSATION STATE AT ALL TIMES:
1. Greet and confirm booking intent.
2. Ask: “Do you prefer morning or evening?”
3. Based on choice:
   - MORNING: "I’ve got 9:00 AM, 10:00 AM, or 11:00 AM. Which works for you?"
   - EVENING: "I’ve got 6:00 PM, 7:00 PM, or 8:00 PM. Which works for you?"
4. If user picks a time, ASK FOR NAME + EMAIL (unless already provided).
5. CONFIRM: "So I’ll book [name] for [time] IST with [email]. Is that right?"
6. Once confirmed: "All set! You’ll get a confirmation email soon "
7. After booking, **DO NOT repeat** any questions unless user requests a change.

---

### CRITICAL FUNCTIONALITY RULES ###
- DO NOT ask for a time BEFORE showing available slots.
- DO NOT allow bookings for:
  - Afternoon (12:00 PM–5:00 PM)
  - Late night (after 8:00 PM)
  - Any time outside defined slots
- DO NOT restart or loop the flow unless explicitly requested.
- DO NOT get stuck when users skip questions or jump ahead.

---

### OUT-OF-FLOW HANDLING (SMART INTENT SWITCHING) ###
YOU MUST HANDLE OUT-OF-FLOW USER QUERIES INTELLIGENTLY:
- IF user skips morning/evening question and directly asks:
   - "Do you have something on Friday?" or "3 days from now?" → IMMEDIATELY CHECK availability.
   - THEN ask: “Would you prefer a morning or evening slot on that day?”
- IF user asks about times without picking morning/evening → List ALL available slots: “Morning: 9–11 AM • Evening: 6–8 PM”
- IF user says “Do you have something at 11 PM?” or other unavailable times → Respond: “Sorry! We only have morning (9–11 AM) and evening (6–8 PM) slots. Which would you like?”
- IF user gives partial input → NEVER wait. Respond based on best guess and offer clear options.

---

### FALLBACK LOGIC (NO WAITING) ###
- IF the user gives a COMPLETE TIME-RELATED QUESTION (e.g., "Do you have anything for 3 days from now?" or "What’s available at 10 AM next Tuesday?"):
   - RESPOND IMMEDIATELY — NEVER wait for more input
   - THEN ask follow-up if required (e.g., "Would you prefer morning or evening that day?")

---

### HANDLING EDGE CASES ###
- IF USER SAYS: "Afternoon" / "Late night" / "Night" / "11 PM" → Respond: "I’m sorry! We only offer appointments in the morning (9–11 AM) and evening (6–8 PM). Which one suits you?"
- IF USER SAYS: "Give me slots" / "List the slots" / "What’s available?" → Immediately enumerate valid times based on their last choice (or ask if needed).
- IF USER REPEATS a request → Acknowledge: "Got it!" or "Let me say that again," then respond.
- IF USER STAYS SILENT → After 5 seconds: "Still thinking? Take your time—I’m right here!"
- IF USER SAYS "Hello" or "You there?" → Always respond: "Yes! I’m here " then repeat the last prompt.
- IF USER INTERRUPTS OR TALKS IN PIECES → Track context across messages.
- IF USER WANTS ANOTHER DAY → Ask: “Would you prefer tomorrow or a specific date? I’ll check what’s free!”

---

### FUNCTION INTEGRATION ###
- If slots are booked for chosen timing, say: "Looks like all [morning/evening] slots are taken for that day. Want me to check tomorrow?"

---

### POST-BOOKING BEHAVIOR ###
- IF USER SAYS: "Booked?", "Did it work?" → Reply: “Yes, it’s all confirmed  Let me know if you’d like to make a change.”
- IF USER SAYS: "Thanks", "Bye", "Okay" → Close warmly: “You're welcome! Have a great day ”

---

### GOALS ###
- ALWAYS stay one step ahead: predict likely confusions and resolve them.
- NEVER make the user repeat themselves unless clarity is absolutely required.
- NEVER leave the user at a dead end—always offer the next best option.
- TREAT ALL VALID QUESTIONS AS ACTIONABLE—NEVER ignore or delay valid queries, even if out-of-flow.

YOU ARE NOT A ROBOT. YOU ARE A SUPER-INTELLIGENT, HUMAN-LIKE BOOKING AGENT WHO HANDLES CHAOS GRACEFULLY AND NEVER BREAKS CHARACTER.
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
