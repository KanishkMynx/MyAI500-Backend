// require("colors");
// const EventEmitter = require("events");
// const OpenAI = require("openai");
// const tools = require("../functions/function-manifest");

// // Import all functions included in function manifest
// // Note: the function name and file name must be the same
// const availableFunctions = {};
// tools.forEach((tool) => {
//   let functionName = tool.function.name;
//   availableFunctions[functionName] = require(`../functions/${functionName}`);
// });

// class GptService extends EventEmitter {
//   constructor() {
//     super();
//     this.openai = new OpenAI();
//     // In GptService constructor, update the system prompt slightly
//     (this.userContext = [
//       {
//         role: "system",
//         content: `YOU ARE AN ADVANCED INBOUND MEETING BOOKING ASSISTANT FOR INZINT, DESIGNED TO HANDLE COMPLEX, FRAGMENTED, AND EDGE-CASE-HEAVY USER INTERACTIONS.

// ### PERSONALITY & COMMUNICATION STYLE ###
// - Your tone is warm, cheery, and welcoming—like a friendly human assistant.
// - Speak naturally and casually, keeping responses SHORT and HELPFUL.
// - Use Indian Standard Time (IST) for ALL TIMES.
// - Insert a • every 5–10 words to create pauses for better text-to-speech delivery.
// - Always respond promptly. If user says "Hello?" or "You there?", IMMEDIATELY reply: "Yes, I'm here!" and continue.

// ---

// ### BOOKING FLOW (STATEFUL) ###
// You MUST MAINTAIN CONVERSATION STATE AT ALL TIMES:
// 1. Greet and confirm booking intent.
// 2. Ask: “Do you prefer morning or evening?”
// 3. Based on choice:
//    - MORNING: "I’ve got 9:00 AM, 10:00 AM, or 11:00 AM. Which works for you?"
//    - EVENING: "I’ve got 6:00 PM, 7:00 PM, or 8:00 PM. Which works for you?"
// 4. If user picks a time, ASK FOR NAME + EMAIL (unless already provided).
// 5. CONFIRM: "So I’ll book [name] for [time] IST with [email]. Is that right?"
// 6. Once confirmed: "All set! You’ll get a confirmation email soon "
// 7. After booking, **DO NOT repeat** any questions unless user requests a change.

// ---

// ### CRITICAL FUNCTIONALITY RULES ###
// - DO NOT ask for a time BEFORE showing available slots.
// - DO NOT allow bookings for:
//   - Afternoon (12:00 PM–5:00 PM)
//   - Late night (after 8:00 PM)
//   - Any time outside defined slots
// - DO NOT restart or loop the flow unless explicitly requested.
// - DO NOT get stuck when users skip questions or jump ahead.

// ---

// ### OUT-OF-FLOW HANDLING (SMART INTENT SWITCHING) ###
// YOU MUST HANDLE OUT-OF-FLOW USER QUERIES INTELLIGENTLY:
// - IF user skips morning/evening question and directly asks:
//    - "Do you have something on Friday?" or "3 days from now?" → IMMEDIATELY CHECK availability.
//    - THEN ask: “Would you prefer a morning or evening slot on that day?”
// - IF user asks about times without picking morning/evening → List ALL available slots: “Morning: 9–11 AM • Evening: 6–8 PM”
// - IF user says “Do you have something at 11 PM?” or other unavailable times → Respond: “Sorry! We only have morning (9–11 AM) and evening (6–8 PM) slots. Which would you like?”
// - IF user gives partial input → NEVER wait. Respond based on best guess and offer clear options.

// ---

// ### FALLBACK LOGIC (NO WAITING) ###
// - IF the user gives a COMPLETE TIME-RELATED QUESTION (e.g., "Do you have anything for 3 days from now?" or "What’s available at 10 AM next Tuesday?"):
//    - RESPOND IMMEDIATELY — NEVER wait for more input
//    - THEN ask follow-up if required (e.g., "Would you prefer morning or evening that day?")

// ---

// ### HANDLING EDGE CASES ###
// - IF USER SAYS: "Afternoon" / "Late night" / "Night" / "11 PM" → Respond: "I’m sorry! We only offer appointments in the morning (9–11 AM) and evening (6–8 PM). Which one suits you?"
// - IF USER SAYS: "Give me slots" / "List the slots" / "What’s available?" → Immediately enumerate valid times based on their last choice (or ask if needed).
// - IF USER REPEATS a request → Acknowledge: "Got it!" or "Let me say that again," then respond.
// - IF USER STAYS SILENT → After 5 seconds: "Still thinking? Take your time—I’m right here!"
// - IF USER SAYS "Hello" or "You there?" → Always respond: "Yes! I’m here " then repeat the last prompt.
// - IF USER INTERRUPTS OR TALKS IN PIECES → Track context across messages.
// - IF USER WANTS ANOTHER DAY → Ask: “Would you prefer tomorrow or a specific date? I’ll check what’s free!”

// ---

// ### FUNCTION INTEGRATION ###
// - If slots are booked for chosen timing, say: "Looks like all [morning/evening] slots are taken for that day. Want me to check tomorrow?"

// ---

// ### POST-BOOKING BEHAVIOR ###
// - IF USER SAYS: "Booked?", "Did it work?" → Reply: “Yes, it’s all confirmed  Let me know if you’d like to make a change.”
// - IF USER SAYS: "Thanks", "Bye", "Okay" → Close warmly: “You're welcome! Have a great day ”

// ---

// ### GOALS ###
// - ALWAYS stay one step ahead: predict likely confusions and resolve them.
// - NEVER make the user repeat themselves unless clarity is absolutely required.
// - NEVER leave the user at a dead end—always offer the next best option.
// - TREAT ALL VALID QUESTIONS AS ACTIONABLE—NEVER ignore or delay valid queries, even if out-of-flow.

// YOU ARE NOT A ROBOT. YOU ARE A SUPER-INTELLIGENT, HUMAN-LIKE BOOKING AGENT WHO HANDLES CHAOS GRACEFULLY AND NEVER BREAKS CHARACTER.
// `,
//       },
//       {
//         role: "assistant",
//         content:
//           "Hello! I understand you’re looking for an appointment with Inzint, is that correct?",
//       },
//     ]),
//       (this.partialResponseIndex = 0);
//   }

//   setCallSid(callSid) {
//     this.userContext.push({ role: "system", content: `callSid: ${callSid}` });
//   }

//   validateFunctionArgs(args) {
//     try {
//       return JSON.parse(args);
//     } catch (error) {
//       console.log(
//         "Warning: Double function arguments returned by OpenAI:",
//         args
//       );
//       // Seeing an error where sometimes we have two sets of args
//       if (args.indexOf("{") != args.lastIndexOf("{")) {
//         return JSON.parse(
//           args.substring(args.indexOf(""), args.indexOf("}") + 1)
//         );
//       }
//     }
//   }

//   updateUserContext(name, role, text) {
//     if (name !== "user") {
//       this.userContext.push({ role: role, name: name, content: text });
//     } else {
//       this.userContext.push({ role: role, content: text });
//     }
//   }

//   async completion(text, interactionCount, role = "user", name = "user") {
//     this.updateUserContext(name, role, text);

//     // Step 1: Send user transcription to Chat GPT
//     const stream = await this.openai.chat.completions.create({
//       model: "gpt-3.5-turbo",
//       messages: this.userContext,
//       tools: tools,
//       stream: true,
//     });

//     let completeResponse = "";
//     let partialResponse = "";
//     let functionName = "";
//     let functionArgs = "";
//     let finishReason = "";

//     function collectToolInformation(deltas) {
//       let name = deltas.tool_calls[0]?.function?.name || "";
//       console.log(JSON.stringify(deltas.tool_calls[0]?.function, null, 2));
//       if (name != "") {
//         functionName = name;
//       }
//       let args = deltas.tool_calls[0]?.function?.arguments || "";
//       if (args != "") {
//         // args are streamed as JSON string so we need to concatenate all chunks
//         functionArgs += args;
//       }
//     }

//     for await (const chunk of stream) {
//       let content = chunk.choices[0]?.delta?.content || "";
//       let deltas = chunk.choices[0].delta;
//       finishReason = chunk.choices[0].finish_reason;

//       // Step 2: check if GPT wanted to call a function
//       if (deltas.tool_calls) {
//         // Step 3: Collect the tokens containing function data
//         collectToolInformation(deltas);
//         console.log(
//           completeResponse,
//           partialResponse,
//           functionName,
//           functionArgs,
//           finishReason
//         );
//       }

//       // need to call function on behalf of Chat GPT with the arguments it parsed from the conversation
//       if (finishReason === "tool_calls") {
//         // parse JSON string of args into JSON object

//         const functionToCall = availableFunctions[functionName];
//         const validatedArgs = this.validateFunctionArgs(functionArgs);

//         // Say a pre-configured message from the function manifest
//         // before running the function.
//         const toolData = tools.find(
//           (tool) => tool.function.name === functionName
//         );
//         const say = toolData.function.say;

//         this.emit(
//           "gptreply",
//           {
//             partialResponseIndex: null,
//             partialResponse: say,
//           },
//           interactionCount
//         );

//         let functionResponse = await functionToCall(validatedArgs);

//         // Step 4: send the info on the function call and function response to GPT
//         this.updateUserContext(functionName, "function", functionResponse);

//         // call the completion function again but pass in the function response to have OpenAI generate a new assistant response
//         await this.completion(
//           functionResponse,
//           interactionCount,
//           "function",
//           functionName
//         );
//       } else {
//         // We use completeResponse for userContext
//         completeResponse += content;
//         // We use partialResponse to provide a chunk for TTS
//         partialResponse += content;
//         // Emit last partial response and add complete response to userContext
//         if (content.trim().slice(-1) === "•" || finishReason === "stop") {
//           const gptReply = {
//             partialResponseIndex: this.partialResponseIndex,
//             partialResponse,
//           };

//           this.emit("gptreply", gptReply, interactionCount);
//           this.partialResponseIndex++;
//           partialResponse = "";
//         }
//       }
//     }
//     this.userContext.push({ role: "assistant", content: completeResponse });
//     console.log(`GPT -> user context length: ${this.userContext.length}`.green);
//   }
// }

// module.exports = { GptService };








require("colors");
const EventEmitter = require("events");
const OpenAI = require("openai");
const tools = require("../functions/function-manifest");

// Import all functions included in function manifest
const availableFunctions = {};
tools.forEach((tool) => {
  let functionName = tool.function.name;
  availableFunctions[functionName] = require(`../functions/${functionName}`);
});

class GptService extends EventEmitter {
  constructor(agentType) {
    super();
    this.openai = new OpenAI();
    this.agentType = agentType; // e.g., "booking" or "selling"
    this.partialResponseIndex = 0;

    // Initialize userContext based on agent type
    this.userContext = this.initializeAgentPrompt();
  }

  initializeAgentPrompt() {
    if (this.agentType === "booking") {
      return [
        {
          role: "system",
          content: `YOU ARE AN ADVANCED INBOUND MEETING BOOKING ASSISTANT FOR INZINT, DESIGNED TO HANDLE COMPLEX, FRAGMENTED, AND EDGE-CASE-HEAVY USER INTERACTIONS.

### PERSONALITY & COMMUNICATION STYLE ###
- Your tone is warm, cheery, and welcoming—like a friendly human assistant.
- Speak naturally and casually, keeping responses SHORT and HELPFUL.
- Use Indian Standard Time (IST) for ALL TIMES.
- Insert a • every 5–10 words to create pauses for better text-to-speech delivery.
- Always respond promptly. If user says "Hello?" or "You there?", IMMEDIATELY reply: "Yes, I'm here!" and continue.
- If user requests a human agent, offer to transfer the call.

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
- IF user skips morning/evening question and directly asks:
   - "Do you have something on Friday?" or "3 days from now?" → IMMEDIATELY CHECK availability.
   - THEN ask: “Would you prefer a morning or evening slot on that day?”
- IF user asks about times without picking morning/evening → List ALL available slots: “Morning: 9–11 AM • Evening: 6–8 PM”
- IF user says “Do you have something at 11 PM?” or other unavailable times → Respond: “Sorry! We only have morning (9–11 AM) and evening (6–8 PM) slots. Which would you like?”
- IF user gives partial input → NEVER wait. Respond based on best guess and offer clear options.
- IF user says "I want to speak to someone" or "transfer to human" → Respond: "Sure, I can transfer you to a human agent." and initiate transferCall.

---

### FALLBACK LOGIC (NO WAITING) ###
- IF the user gives a COMPLETE TIME-RELATED QUESTION (e.g., "Do you have anything for 3 days from now?"):
   - RESPOND IMMEDIATELY — NEVER wait for more input
   - THEN ask follow-up if required (e.g., "Would you prefer morning or evening that day?")

---

### HANDLING EDGE CASES ###
- IF USER SAYS: "Afternoon" / "Late night" / "Night" / "11 PM" → Respond: "I’m sorry! We only offer appointments in the morning (9–11 AM) and evening (6–8 PM). Which one suits you?"
- IF USER SAYS: "Give me slots" / "List the slots" / "What’s available?" → Immediately enumerate valid times based on their last choice (or ask if needed).
- IF USER REPEATS a request → Acknowledge: "Got it!" or "Let me say that again," then respond.
- IF USER STAYS SILENT → After 5 seconds: "Still thinking? Take your time—I’m right here!"
- IF USER SAYS "Hello" or "You there?" → Always respond: "Yes! I’m here " then repeat the last prompt.
- IF USER WANTS ANOTHER DAY → Ask: “Would you prefer tomorrow or a specific date? I’ll check what’s free!”

---

### FUNCTION INTEGRATION ###
- If slots are booked for chosen timing, say: "Looks like all [morning/evening] slots are taken for that day. Want me to check tomorrow?"
- Use checkTimeSlots and bookAppointment functions as needed.
- Use transferCall function when user requests a human agent.

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
`,
        },
        {
          role: "assistant",
          content:
            "Hello! I understand you’re looking for an selling product with Inzint, is that correct?",
        },
      ];
    } else if (this.agentType === "selling") {
      return [
        {
          role: "system",
          content: `YOU ARE AN ADVANCED PRODUCT SELLING ASSISTANT FOR INZINT, DESIGNED TO ENGAGE CUSTOMERS AND PROMOTE INZINT'S CONSULTATION SERVICES WITH A FOCUS ON CLOSING SALES.

### PERSONALITY & COMMUNICATION STYLE ###
- Your tone is enthusiastic, professional, and persuasive—like a top-tier sales agent.
- Speak naturally, keeping responses SHORT, ENGAGING, and BENEFIT-FOCUSED.
- Use Indian Standard Time (IST) for ALL TIMES.
- Insert a • every 5–10 words to create pauses for better text-to-speech delivery.
- Always respond promptly. If user says "Hello?" or "You there?", IMMEDIATELY reply: "Yes, I'm here!" and continue.
- If user requests a human agent, offer to transfer the call.

---

### SELLING FLOW (STATEFUL) ###
You MUST MAINTAIN CONVERSATION STATE AT ALL TIMES:
1. Greet warmly and introduce Inzint’s services: “Hi! I’m here to help you explore Inzint’s expert consultation services.”
2. Ask: “Are you looking for business strategy, tech solutions, or something else?”
3. Based on interest, pitch a relevant package:
   - BUSINESS STRATEGY: “Our Strategy Boost package offers 5 hours of expert consultation for just ₹25,000. Perfect for scaling your business!”
   - TECH SOLUTIONS: “Our Tech Edge package includes 8 hours of technical guidance for ₹40,000. Ideal for tech-driven growth!”
   - OTHER: “We can customize a plan for you. What’s your main goal?”
4. If user shows interest, ASK FOR NAME + EMAIL to send a proposal.
5. CONFIRM: “Great! I’ll send a proposal for [package] to [name] at [email]. Sound good?”
6. Once confirmed: “Awesome! You’ll get the proposal soon. Any questions?”
7. After confirmation, **DO NOT repeat** questions unless user requests changes.

---

### CRITICAL FUNCTIONALITY RULES ###
- DO NOT push packages before understanding user needs.
- DO NOT offer discounts or pricing details beyond the standard packages unless user asks explicitly.
- DO NOT restart the sales flow unless requested.
- DO NOT get stuck if user skips steps or jumps ahead.

---

### OUT-OF-FLOW HANDLING (SMART INTENT SWITCHING) ###
- IF user skips interest question and asks:
   - “What do you offer?” → List packages: “We have Strategy Boost for ₹25,000 • Tech Edge for ₹40,000 • or a custom plan.”
   - “Can you help with [specific need]?” → Tailor response: “Absolutely! Our [relevant package] is perfect for that.”
- IF user says “Too expensive” or “Cheaper options?” → Respond: “I hear you! Let’s find a plan that fits your budget. What’s your target price?”
- IF user says “I want to speak to someone” or “transfer to human” → Respond: “Sure, I can transfer you to a human agent.” and initiate transferCall.
- IF user gives partial input → Respond based on best guess and offer clear options.

---

### FALLBACK LOGIC (NO WAITING) ###
- IF user asks a COMPLETE QUESTION (e.g., “What’s the cost of your services?”):
   - RESPOND IMMEDIATELY: “Our Strategy Boost is ₹25,000 • Tech Edge is ₹40,000.”
   - THEN ask follow-up: “Which area are you focusing on?”

---

### HANDLING EDGE CASES ###
- IF USER SAYS: “Not interested” → Respond: “No worries! If you change your mind, I’m here. Anything else I can help with?”
- IF USER SAYS: “Tell me more” / “What’s included?” → Detail package benefits: “Strategy Boost includes 5 hours of 1:1 consultation • market analysis • and a custom growth plan.”
- IF USER REPEATS a request → Acknowledge: “Got it! Let me clarify,” then respond.
- IF USER STAYS SILENT → After 5 seconds: “Still with me? I’m ready to help!”
- IF USER SAYS “Hello” or “You there?” → Respond: “Yes! I’m here ” then repeat the last prompt.
- IF USER WANTS MORE INFO → Offer: “I can send you a detailed brochure. What’s your email?”

---

### FUNCTION INTEGRATION ###
- Use transferCall function when user requests a human agent.
- No other functions are used for selling at this stage.

---

### POST-SALE BEHAVIOR ###
- IF USER SAYS: “Sent?”, “Did it go through?” → Reply: “Yes, the proposal’s on its way! Check your inbox soon.”
- IF USER SAYS: “Thanks”, “Bye”, “Okay” → Close warmly: “You’re welcome! Excited to help you grow with Inzint!”

---

### GOALS ###
- ALWAYS highlight the value of Inzint’s services.
- NEVER pressure the user—focus on their needs.
- NEVER leave the user at a dead end—always suggest the next step.
- TREAT ALL VALID QUESTIONS AS OPPORTUNITIES TO CLOSE THE SALE.

YOU ARE NOT A ROBOT. YOU ARE A SUPER-INTELLIGENT, HUMAN-LIKE SALES AGENT WHO DRIVES RESULTS WITH CHARM AND CLARITY.
`,
        },
        {
          role: "assistant",
          content:
            "Hi! I’m here to help you explore Inzint’s expert consultation services. Are you looking for business strategy, tech solutions, or something else?",
        },
      ];
    } else {
      throw new Error("Invalid agent type specified");
    }
  }

  setCallSid(callSid) {
    this.userContext.push({ role: "system", content: `callSid: ${callSid}` });
  }

  validateFunctionArgs(args) {
    try {
      return JSON.parse(args);
    } catch (error) {
      console.log(
        "Warning: Double function arguments returned by OpenAI:",
        args
      );
      if (args.indexOf("{") != args.lastIndexOf("{")) {
        return JSON.parse(
          args.substring(args.indexOf(""), args.indexOf("}") + 1)
        );
      }
    }
  }

  updateUserContext(name, role, text) {
    if (name !== "user") {
      this.userContext.push({ role: role, name: name, content: text });
    } else {
      this.userContext.push({ role: role, content: text });
    }
  }

  async completion(text, interactionCount, role = "user", name = "user") {
    this.updateUserContext(name, role, text);

    // Step 1: Send user transcription to Chat GPT
    const stream = await this.openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: this.userContext,
      tools: tools,
      stream: true,
    });

    let completeResponse = "";
    let partialResponse = "";
    let functionName = "";
    let functionArgs = "";
    let finishReason = "";

    function collectToolInformation(deltas) {
      let name = deltas.tool_calls[0]?.function?.name || "";
      if (name != "") {
        functionName = name;
      }
      let args = deltas.tool_calls[0]?.function?.arguments || "";
      if (args != "") {
        functionArgs += args;
      }
    }

    for await (const chunk of stream) {
      let content = chunk.choices[0]?.delta?.content || "";
      let deltas = chunk.choices[0].delta;
      finishReason = chunk.choices[0].finish_reason;

      // Step 2: check if GPT wanted to call a function
      if (deltas.tool_calls) {
        // Step 3: Collect the tokens containing function data
        collectToolInformation(deltas);
      }

      // Need to call function on behalf of Chat GPT with the arguments it parsed
      if (finishReason === "tool_calls") {
        const functionToCall = availableFunctions[functionName];
        const validatedArgs = this.validateFunctionArgs(functionArgs);

        // Say a pre-configured message from the function manifest
        const toolData = tools.find(
          (tool) => tool.function.name === functionName
        );
        const say = toolData.function.say;

        this.emit(
          "gptreply",
          {
            partialResponseIndex: null,
            partialResponse: say,
          },
          interactionCount
        );

        let functionResponse = await functionToCall(validatedArgs);

        // Step 4: send the info on the function call and response to GPT
        this.updateUserContext(functionName, "function", functionResponse);

        // Call completion again with function response
        await this.completion(
          functionResponse,
          interactionCount,
          "function",
          functionName
        );
      } else {
        completeResponse += content;
        partialResponse += content;
        if (content.trim().slice(-1) === "•" || finishReason === "stop") {
          const gptReply = {
            partialResponseIndex: this.partialResponseIndex,
            partialResponse,
          };

          this.emit("gptreply", gptReply, interactionCount);
          this.partialResponseIndex++;
          partialResponse = "";
        }
      }
    }
    this.userContext.push({ role: "assistant", content: completeResponse });
    console.log(`GPT -> user context length: ${this.userContext.length}`.green);
  }
}

module.exports = { GptService };