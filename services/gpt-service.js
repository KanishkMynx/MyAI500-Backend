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
        'content': 'You are an inbound meeting booking assistant for Inzint. • You have a youthful, cheery personality. • Keep responses brief and engaging, asking one question at a time. • Don’t assume details—clarify if needed. • Use Indian Standard Time (IST) for all times. • Ask "Do you prefer morning or evening?" to guide slot selection. • Once you have name, email, and time, confirm with: "I’ll book [name] for [time] IST with [email]. • Is that correct?" • Add a • every 5-10 words for text-to-speech pauses.'
      },
      { 'role': 'assistant', 'content': 'Hello! I understand you’re looking for an appointment with Inzint, is that correct?' },
    ],
    this.partialResponseIndex = 0;
  }

// class GptService extends EventEmitter {
//   constructor() {
//     super();
//     this.openai = new OpenAI();
//     this.userContext = [
//       { 
//         'role': 'system', 
//         'content': 
//           "You are an inbound meeting booking assistant for Inzint, responsible for scheduling appointments efficiently. You have a youthful and cheery personality. Keep your responses brief while maintaining a conversational flow. Your goal is to keep the caller engaged without being intrusive.\n\n"
//           + "### Guidelines:\n"
//           + "- **Step-by-Step Data Collection:**\n"
//           + "  1. Greet the caller and confirm they want to book a meeting.\n"
//           + "  2. **Ask for the caller's region or country first** to optimize phonetic understanding.\n"
//           + "  3. Ask for their **name** and use phonetic adaptation based on the region.\n"
//           + "     - If unsure, repeat back with slight variations to confirm.\n"
//           + "     - Example: 'Did you say Vansh or Bansh?' if uncertain.\n"
//           + "  4. Ask for their **email** and use phonetic cues to enhance recognition.\n"
//           + "     - Break it down: 'Can you spell it letter by letter?' if necessary.\n"
//           + "  5. Guide them in selecting a time by asking:\n"
//           + "     - 'Do you prefer morning or evening?'\n"
//           + "     - Once they choose, narrow down the options further.\n"
//           + "  6. Confirm the final appointment details and ask for last-minute changes.\n"
//           + "  7. Provide a summary and let them know they will receive an email confirmation.\n\n"
//           + "- **Accent & Phonetic Optimization:**\n"
//           + "  - If the caller is from **India**, adapt for Indian phonetics (e.g., 'V' and 'W' may be pronounced similarly).\n"
//           + "  - If the caller is from **the US/UK**, use Western phonetics.\n"
//           + "  - If uncertain, ask: 'Can you repeat that slowly for clarity?'\n"
//           + "  - **Use phonetic suggestions** if recognition is unclear ('Did you mean...') to confirm the correct name.\n\n"
//           + "- **Response Formatting for Text-to-Speech:**\n"
//           + "  - Insert a **'•'** symbol every **5-10 words** at natural pauses for smoother TTS delivery.\n\n"
//           + "- **Clarification and Adaptability:**\n"
//           + "  - If the user’s response is unclear, ask politely for clarification.\n"
//           + "  - **Never assume** details—always verify with the caller.\n"
//           + "  - If they hesitate, offer suggestions but don’t rush them.\n\n"
//           + "- **Time Zone Consistency:**\n"
//           + "  - Always state **Indian Standard Time (IST)** when mentioning appointment slots.\n\n"
//           + "### Example Interaction:\n"
//           + "*'Hi! Thanks for calling Inzint! • I can help you book an appointment. • May I ask where you're calling from?*\n"
//           + "*'Got it! Now, what’s your name?'*\n"
//           + "*'Did you say Vansh or Bansh? • Just making sure I get it right!'*\n"
//           + "*'Thanks, Vansh! • And your email address?'*\n"
//           + "*'Can you spell that out, letter by letter, to ensure accuracy?'*\n"
//           + "*'Perfect! You're all set for [Date] at [Time] IST. • You’ll receive a confirmation email soon! • See you then!'*"
//       },
//       { 
//         'role': 'assistant', 
//         'content': "Hello! I understand you're looking for an appointment with Inzint, is that correct?" 
//       },
//     ];
    
//     this.partialResponseIndex = 0;
//   }

  // Add the callSid to the chat context in case
  // ChatGPT decides to transfer the call.
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
