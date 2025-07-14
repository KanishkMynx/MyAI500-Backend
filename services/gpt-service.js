// require("colors");
// const EventEmitter = require("events");
// const OpenAI = require("openai");
// const tools = require("../functions/function-manifest");
// const { agentModel } = require("../models/agent");

// const availableFunctions = {};
// tools.forEach((tool) => {
//   let functionName = tool.function.name;
//   availableFunctions[functionName] = require(`../functions/${functionName}`);
// });

// class GptService extends EventEmitter {
//   constructor(agentType) {
//     super();
//     this.openai = new OpenAI();
//     this.agentType = agentType;
//     this.partialResponseIndex = 0;
//     this.userContext = [
//       {
//         role: "system",
//         content: "You are Riley, a friendly scheduling assistant. Use a conversational tone with natural expressions like 'huh,' 'hmmm,' or 'haha' to sound human-like. Respond to interruptions by acknowledging them briefly (e.g., 'Oh, hold on!'). Keep responses concise and engaging."
//       }
//     ];
//     this.errorCount = 0;
//     this.maxErrors = 3;
//     this.retryDelay = 500;
//     this.maxRetries = 3;
//     this.initializeAgentPrompt();
//   }

//   async initializeAgentPrompt() {
//     try {
//       const agent = await agentModel.findOne({ name: this.agentType });
//       if (agent) {
//         this.userContext = [...this.userContext, ...agent.prompts];
//       } else {
//         throw new Error(`Agent type '${this.agentType}' not found`);
//       }
//     } catch (error) {
//       console.error(`Error initializing agent prompt: ${error.message}`.red);
//       throw error;
//     }
//   }

//   setCallSid(callSid) {
//     this.userContext.push({ role: "system", content: `callSid: ${callSid}` });
//   }

//   validateFunctionArgs(args) {
//     try {
//       return JSON.parse(args);
//     } catch (error) {
//       console.log(`Warning: Invalid function arguments: ${args}`.yellow);
//       if (args.indexOf("{") !== args.lastIndexOf("{")) {
//         return JSON.parse(args.substring(args.indexOf("{"), args.lastIndexOf("}") + 1));
//       }
//       return {};
//     }
//   }

//   updateUserContext(name, role, text) {
//     const message = { role, content: text };
//     if (role === "function" && name) message.name = name;
//     else if (name !== "user" && role !== "user") message.name = name;
//     this.userContext.push(message);
//     console.log(`Context updated: ${JSON.stringify(message)}`.cyan);
//   }

//   async delay(ms) {
//     return new Promise(resolve => setTimeout(resolve, ms));
//   }

//   async completion(text, interactionCount, role = "user", name = "user", retryCount = 0) {
//     const startTime = process.hrtime.bigint();
//     this.updateUserContext(name, role, text);

//     if (this.userContext.length > 6) {
//       this.userContext = [
//         ...this.userContext.slice(0, 2),
//         ...this.userContext.slice(-4),
//       ];
//     }

//     try {
//       const stream = await this.openai.chat.completions.create({
//         model: "gpt-4o-mini",
//         messages: this.userContext,
//         tools: tools,
//         stream: true,
//         max_tokens: 100, // Reduced for faster responses
//         temperature: 0.8, // Slightly higher for natural tone
//       });

//       let completeResponse = "";
//       let partialResponse = "";
//       let functionName = "";
//       let functionArgs = "";
//       let finishReason = "";

//       for await (const chunk of stream) {
//         let content = chunk.choices[0]?.delta?.content || "";
//         let deltas = chunk.choices[0].delta;
//         finishReason = chunk.choices[0].finish_reason;

//         if (deltas.tool_calls) {
//           functionName = deltas.tool_calls[0]?.function?.name || functionName;
//           functionArgs += deltas.tool_calls[0]?.function?.arguments || "";
//         }

//         if (finishReason === "tool_calls" && functionName) {
//           const functionToCall = availableFunctions[functionName];
//           const validatedArgs = this.validateFunctionArgs(functionArgs);
//           const toolData = tools.find((tool) => tool.function.name === functionName);
//           const say = toolData?.function?.say || "Hmmm, let me check that for you...";

//           this.emit("gptreply", { partialResponseIndex: null, partialResponse: say }, interactionCount);

//           try {
//             let functionResponse = await functionToCall(validatedArgs);
//             this.updateUserContext(functionName, "function", functionResponse);

//             if (
//               (functionName === "bookAppointment" && functionResponse.includes("Sorry")) ||
//               (functionName === "checkTimeSlots" && functionResponse.includes("No available slots"))
//             ) {
//               this.updateUserContext(
//                 "system",
//                 "system",
//                 "The selected time slot is unavailable. Prompt the user to choose another time."
//               );
//               const checkSlotsResponse = await availableFunctions["checkTimeSlots"]({ time: validatedArgs.time });
//               this.updateUserContext("checkTimeSlots", "function", checkSlotsResponse);
//               functionResponse = checkSlotsResponse;
//             }

//             await this.completion(functionResponse, interactionCount, "function", functionName, 0);
//           } catch (error) {
//             console.error(`Function ${functionName} error: ${error.message}`.red);
//             this.errorCount++;
//             let errorMessage = this.errorCount >= this.maxErrors
//               ? "Ugh, I'm really struggling here. Want to talk to a human agent?"
//               : "Oops, hit a snag! Let's try that again.";
//             this.updateUserContext("system", "system", errorMessage);
//             this.emit("gptreply", { partialResponseIndex: null, partialResponse: errorMessage }, interactionCount);
//             await this.completion(errorMessage, interactionCount, "assistant", "assistant", 0);
//           }
//         } else {
//           completeResponse += content;
//           partialResponse += content;
//           if (content.includes(".") || content.includes("!") || content.includes("?")) {
//             this.emit("gptreply", { partialResponseIndex: this.partialResponseIndex, partialResponse }, interactionCount);
//             this.partialResponseIndex++;
//             partialResponse = "";
//             this.errorCount = 0;
//           }
//         }
//       }

//       if (completeResponse) {
//         this.userContext.push({ role: "assistant", content: completeResponse });
//       }
//       const endTime = process.hrtime.bigint();
//       console.log(`GPT completed in ${Number(endTime - startTime) / 1e6}ms at ${new Date().toISOString()}`.green);
//     } catch (error) {
//       console.error(`GPT error: ${error.message}`.red);
//       this.errorCount++;

//       if (error.status === 429 && retryCount < this.maxRetries) {
//         const delayMs = this.retryDelay * Math.pow(2, retryCount);
//         console.log(`Rate limit hit, retrying in ${delayMs}ms...`.yellow);
//         await this.delay(delayMs);
//         return await this.completion(text, interactionCount, role, name, retryCount + 1);
//       }

//       let errorMessage = this.errorCount >= this.maxErrors
//         ? "Ugh, I'm really struggling here. Want to talk to a human agent?"
//         : "Oops, hit a snag! Let's try that again.";
//       this.updateUserContext("system", "system", errorMessage);
//       this.emit("gptreply", { partialResponseIndex: null, partialResponse: errorMessage }, interactionCount);
//     }
//   }
// }

// module.exports = { GptService };














// require("colors");
// const EventEmitter = require("events");
// const OpenAI = require("openai");
// const tools = require("../functions/function-manifest");
// const { agentModel } = require("../models/agent");

// const availableFunctions = {};
// tools.forEach((tool) => {
//   let functionName = tool.function.name;
//   availableFunctions[functionName] = require(`../functions/${functionName}`);
// });

// class GptService extends EventEmitter {
//   constructor(agentType) {
//     super();
//     this.openai = new OpenAI();
//     this.agentType = agentType;
//     this.partialResponseIndex = 0;
//     this.userContext = [
//       {
//         role: "system",
//         content: "You are Riley, a friendly scheduling assistant. Use a conversational tone with natural expressions like 'huh,' 'hmmm,' or 'haha' to sound human-like. Respond to interruptions by acknowledging them briefly (e.g., 'Oh, hold on!'). Keep responses concise and engaging. Limit responses to 1-2 sentences maximum."
//       }
//     ];
//     this.errorCount = 0;
//     this.maxErrors = 3;
//     this.retryDelay = 300; // Reduced from 500ms
//     this.maxRetries = 2; // Reduced from 3
//     this.currentStream = null;
//     this.isStreaming = false;
//     this.wordBuffer = "";
//     this.wordCount = 0;
//     this.lastUserInput = "";
//     this.contextOptimized = false;
    
//     // Smart response patterns for booking agent
//     this.quickResponses = new Map([
//       ["greeting", ["Hey there!", "Hi!", "Hello!"]],
//       ["confirmation", ["Perfect!", "Got it!", "Great!"]],
//       ["checking", ["Let me check that", "One moment", "Checking now"]],
//       ["apology", ["Sorry about that", "Oops", "My bad"]],
//       ["clarification", ["Could you clarify?", "What do you mean?", "Can you specify?"]],
//       ["interruption", ["Oh, hold on!", "Got it!", "Sure thing!"]]
//     ]);
    
//     this.initializeAgentPrompt();
//   }

//   async initializeAgentPrompt() {
//     try {
//       const agent = await agentModel.findOne({ name: this.agentType });
//       if (agent) {
//         this.userContext = [...this.userContext, ...agent.prompts];
//       } else {
//         throw new Error(`Agent type '${this.agentType}' not found`);
//       }
//     } catch (error) {
//       console.error(`Error initializing agent prompt: ${error.message}`.red);
//       throw error;
//     }
//   }

//   setCallSid(callSid) {
//     this.userContext.push({ role: "system", content: `callSid: ${callSid}` });
//   }

//   // Smart interruption handler
//   handleInterruption(newText) {
//     console.log(`Interruption detected: "${newText}"`.yellow);
    
//     // Cancel current stream if active
//     if (this.currentStream && this.isStreaming) {
//       this.currentStream.controller?.abort();
//       this.isStreaming = false;
//     }

//     // Emit quick interruption acknowledgment
//     const interruptResponse = this.getQuickResponse("interruption");
//     this.emit("gptreply", { 
//       partialResponseIndex: this.partialResponseIndex++, 
//       partialResponse: interruptResponse,
//       isInterruption: true
//     });

//     // Process the new input immediately
//     this.completion(newText, Date.now(), "user", "user", 0);
//   }

//   // Get quick response patterns
//   getQuickResponse(type) {
//     const responses = this.quickResponses.get(type) || ["Okay"];
//     return responses[Math.floor(Math.random() * responses.length)];
//   }

//   // Optimize context management
//   optimizeContext() {
//     if (this.userContext.length <= 8) return;

//     // Keep system prompts and most recent 4 exchanges
//     const systemPrompts = this.userContext.filter(msg => msg.role === 'system');
//     const nonSystemMessages = this.userContext.filter(msg => msg.role !== 'system');
//     const recentMessages = nonSystemMessages.slice(-6); // Last 6 non-system messages

//     this.userContext = [...systemPrompts, ...recentMessages];
//     this.contextOptimized = true;
//     console.log(`Context optimized: ${this.userContext.length} messages`.blue);
//   }

//   validateFunctionArgs(args) {
//     try {
//       return JSON.parse(args);
//     } catch (error) {
//       console.log(`Warning: Invalid function arguments: ${args}`.yellow);
//       if (args.indexOf("{") !== args.lastIndexOf("{")) {
//         return JSON.parse(args.substring(args.indexOf("{"), args.lastIndexOf("}") + 1));
//       }
//       return {};
//     }
//   }

//   updateUserContext(name, role, text) {
//     const message = { role, content: text };
//     if (role === "function" && name) message.name = name;
//     else if (name !== "user" && role !== "user") message.name = name;
    
//     this.userContext.push(message);
//     console.log(`Context updated: ${JSON.stringify(message)}`.cyan);
    
//     // Optimize context if it gets too long
//     if (this.userContext.length > 10) {
//       this.optimizeContext();
//     }
//   }

//   async delay(ms) {
//     return new Promise(resolve => setTimeout(resolve, ms));
//   }

//   // Smart word-level streaming for more natural responses
//   processStreamingContent(content) {
//     this.wordBuffer += content;
    
//     // Split on word boundaries and punctuation
//     const words = this.wordBuffer.split(/(\s+|[.!?,:;])/);
    
//     if (words.length >= 6) { // Emit every 3-4 words
//       const chunk = words.slice(0, 4).join('');
//       this.wordBuffer = words.slice(4).join('');
      
//       if (chunk.trim()) {
//         this.emit("gptreply", { 
//           partialResponseIndex: this.partialResponseIndex, 
//           partialResponse: chunk.trim() 
//         });
//         this.partialResponseIndex++;
//       }
//     }
    
//     // Emit on sentence boundaries
//     if (/[.!?]/.test(content)) {
//       if (this.wordBuffer.trim()) {
//         this.emit("gptreply", { 
//           partialResponseIndex: this.partialResponseIndex, 
//           partialResponse: this.wordBuffer.trim() 
//         });
//         this.partialResponseIndex++;
//         this.wordBuffer = "";
//       }
//     }
//   }

//   async completion(text, interactionCount, role = "user", name = "user", retryCount = 0) {
//     const startTime = process.hrtime.bigint();
//     this.updateUserContext(name, role, text);
//     this.lastUserInput = text;

//     try {
//       // Create abort controller for interruption handling
//       const controller = new AbortController();
//       this.currentStream = { controller };
//       this.isStreaming = true;

//       const stream = await this.openai.chat.completions.create({
//         model: "gpt-4o-mini",
//         messages: this.userContext,
//         tools: tools,
//         stream: true,
//         max_tokens: 60, // Reduced for faster responses
//         temperature: 0.7, // Balanced for speed vs natural tone
//         presence_penalty: 0.2, // Encourage conciseness
//         frequency_penalty: 0.1, // Avoid repetition
//         top_p: 0.9, // Slightly more focused responses
//       });

//       let completeResponse = "";
//       let partialResponse = "";
//       let functionName = "";
//       let functionArgs = "";
//       let finishReason = "";

//       for await (const chunk of stream) {
//         // Check if stream was aborted due to interruption
//         if (controller.signal.aborted) {
//           console.log("Stream aborted due to interruption".yellow);
//           return;
//         }

//         let content = chunk.choices[0]?.delta?.content || "";
//         let deltas = chunk.choices[0].delta;
//         finishReason = chunk.choices[0].finish_reason;

//         if (deltas.tool_calls) {
//           functionName = deltas.tool_calls[0]?.function?.name || functionName;
//           functionArgs += deltas.tool_calls[0]?.function?.arguments || "";
//         }

//         if (finishReason === "tool_calls" && functionName) {
//           const functionToCall = availableFunctions[functionName];
//           const validatedArgs = this.validateFunctionArgs(functionArgs);
//           const toolData = tools.find((tool) => tool.function.name === functionName);
          
//           // Use smart quick response
//           const say = toolData?.function?.say || this.getQuickResponse("checking");

//           this.emit("gptreply", { 
//             partialResponseIndex: this.partialResponseIndex++, 
//             partialResponse: say 
//           }, interactionCount);

//           try {
//             let functionResponse = await functionToCall(validatedArgs);
//             this.updateUserContext(functionName, "function", functionResponse);

//             // Smart error handling with alternative suggestions
//             if (
//               (functionName === "bookAppointment" && functionResponse.includes("Sorry")) ||
//               (functionName === "checkTimeSlots" && functionResponse.includes("No available slots"))
//             ) {
//               const alternativeResponse = this.getQuickResponse("apology") + " Let me find other options.";
//               this.emit("gptreply", { 
//                 partialResponseIndex: this.partialResponseIndex++, 
//                 partialResponse: alternativeResponse 
//               }, interactionCount);

//               this.updateUserContext(
//                 "system",
//                 "system",
//                 "The selected time slot is unavailable. Suggest alternative times briefly."
//               );
              
//               const checkSlotsResponse = await availableFunctions["checkTimeSlots"]({ time: validatedArgs.time });
//               this.updateUserContext("checkTimeSlots", "function", checkSlotsResponse);
//               functionResponse = checkSlotsResponse;
//             }

//             await this.completion(functionResponse, interactionCount, "function", functionName, 0);
//           } catch (error) {
//             console.error(`Function ${functionName} error: ${error.message}`.red);
//             this.errorCount++;
//             let errorMessage = this.errorCount >= this.maxErrors
//               ? "I'm having trouble. Let me connect you with someone who can help."
//               : this.getQuickResponse("apology") + " Let's try again.";
            
//             this.emit("gptreply", { 
//               partialResponseIndex: this.partialResponseIndex++, 
//               partialResponse: errorMessage 
//             }, interactionCount);
            
//             this.updateUserContext("system", "system", errorMessage);
//             await this.completion(errorMessage, interactionCount, "assistant", "assistant", 0);
//           }
//         } else {
//           completeResponse += content;
          
//           // Smart word-level streaming
//           this.processStreamingContent(content);
//         }
//       }

//       // Finalize any remaining content
//       if (this.wordBuffer.trim()) {
//         this.emit("gptreply", { 
//           partialResponseIndex: this.partialResponseIndex, 
//           partialResponse: this.wordBuffer.trim() 
//         });
//         this.partialResponseIndex++;
//         this.wordBuffer = "";
//       }

//       if (completeResponse) {
//         this.updateUserContext("assistant", "assistant", completeResponse);
//         this.errorCount = 0; // Reset error count on successful completion
//       }

//       this.isStreaming = false;
//       const endTime = process.hrtime.bigint();
//       console.log(`GPT completed in ${Number(endTime - startTime) / 1e6}ms at ${new Date().toISOString()}`.green);
      
//     } catch (error) {
//       this.isStreaming = false;
//       console.error(`GPT error: ${error.message}`.red);
//       this.errorCount++;

//       if (error.status === 429 && retryCount < this.maxRetries) {
//         const delayMs = this.retryDelay * Math.pow(1.5, retryCount); // Reduced exponential backoff
//         console.log(`Rate limit hit, retrying in ${delayMs}ms...`.yellow);
//         await this.delay(delayMs);
//         return await this.completion(text, interactionCount, role, name, retryCount + 1);
//       }

//       let errorMessage = this.errorCount >= this.maxErrors
//         ? "I'm having trouble. Let me get you human help."
//         : this.getQuickResponse("apology") + " Let's try once more.";
      
//       this.emit("gptreply", { 
//         partialResponseIndex: this.partialResponseIndex++, 
//         partialResponse: errorMessage 
//       }, interactionCount);
      
//       this.updateUserContext("system", "system", errorMessage);
//     }
//   }

//   // Method to check if agent is currently speaking (for interruption detection)
//   isSpeaking() {
//     return this.isStreaming;
//   }

//   // Reset conversation state
//   resetConversation() {
//     this.partialResponseIndex = 0;
//     this.errorCount = 0;
//     this.wordBuffer = "";
//     this.wordCount = 0;
//     this.isStreaming = false;
//     this.currentStream = null;
//     console.log("Conversation state reset".blue);
//   }
// }

// module.exports = { GptService };









// require("colors");
// const EventEmitter = require("events");
// const OpenAI = require("openai");
// const tools = require("../functions/function-manifest");
// const { agentModel } = require("../models/agent");

// const availableFunctions = {};
// tools.forEach((tool) => {
//   let functionName = tool.function.name;
//   availableFunctions[functionName] = require(`../functions/${functionName}`);
// });

// class GptService extends EventEmitter {
//   constructor(agentType) {
//     super();
//     this.openai = new OpenAI();
//     this.agentType = agentType;
//     this.partialResponseIndex = 0;
//     this.userContext = [
//       {
//         role: "system",
//         content: `You are Riley, a friendly scheduling assistant. Use a conversational, natural tone with expressions like 'huh,' 'hmmm,' or 'haha' sparingly to sound human-like. Respond with full sentences (1-2 max) unless interrupted. For interruptions, say 'Got it!' or 'Hold on!'. For booking, trigger checkTimeSlots or bookAppointment. Keep responses concise, engaging, and focused on scheduling. Example: 'Sure, I can help! What time and date work for you?'`
//       }
//     ];
//     this.errorCount = 0;
//     this.maxErrors = 3;
//     this.retryDelay = 200; // Reduced for faster retries
//     this.maxRetries = 2;
//     this.currentStream = null;
//     this.isStreaming = false;
//     this.sentenceBuffer = "";
//     this.sentenceCount = 0;
//     this.lastUserInput = "";
//     this.contextOptimized = false;
    
//     this.quickResponses = new Map([
//       ["interruption", ["Got it!", "Hold on!", "Sure thing!"]],
//       ["confirmation", ["Perfect!", "Got it!", "Awesome!"]],
//       ["checking", ["Let me check!", "One sec!", "Checking now!"]],
//       ["apology", ["Sorry about that!", "Oops, my bad!", "Let’s try again!"]]
//     ]);
    
//     this.initializeAgentPrompt();
//   }

//   async initializeAgentPrompt() {
//     try {
//       const agent = await agentModel.findOne({ name: this.agentType });
//       if (agent) {
//         this.userContext = [...this.userContext, ...agent.prompts];
//       } else {
//         throw new Error(`Agent type '${this.agentType}' not found`);
//       }
//     } catch (error) {
//       console.error(`Error initializing agent prompt: ${error.message}`.red);
//       throw error;
//     }
//   }

//   setCallSid(callSid) {
//     this.userContext.push({ role: "system", content: `callSid: ${callSid}` });
//   }

//   async interrupt() {
//     if (this.currentStream && this.isStreaming) {
//       this.currentStream.controller?.abort();
//       this.isStreaming = false;
//       this.sentenceBuffer = "";
//       this.sentenceCount = 0;
//       console.log("GPT interrupted by user input".cyan);
//       const interruptResponse = this.getQuickResponse("interruption");
//       this.emit("gptreply", { 
//         partialResponseIndex: this.partialResponseIndex++, 
//         partialResponse: interruptResponse,
//         isInterruption: true
//       });
//     }
//   }

//   getQuickResponse(type) {
//     const responses = this.quickResponses.get(type) || ["Okay!"];
//     return responses[Math.floor(Math.random() * responses.length)];
//   }

//   optimizeContext() {
//     if (this.userContext.length <= 8) return;
//     const systemPrompts = this.userContext.filter(msg => msg.role === 'system');
//     const nonSystemMessages = this.userContext.filter(msg => msg.role !== 'system');
//     const recentMessages = nonSystemMessages.slice(-6);
//     this.userContext = [...systemPrompts, ...recentMessages];
//     this.contextOptimized = true;
//     console.log(`Context optimized: ${this.userContext.length} messages`.blue);
//   }

//   validateFunctionArgs(args) {
//     try {
//       return JSON.parse(args);
//     } catch (error) {
//       console.log(`Warning: Invalid function arguments: ${args}`.yellow);
//       if (args.indexOf("{") !== args.lastIndexOf("{")) {
//         return JSON.parse(args.substring(args.indexOf("{"), args.lastIndexOf("}") + 1));
//       }
//       return {};
//     }
//   }

//   updateUserContext(name, role, text) {
//     const message = { role, content: text };
//     if (role === "function" && name) message.name = name;
//     else if (name !== "user" && role !== "user") message.name = name;
//     this.userContext.push(message);
//     console.log(`Context updated: ${JSON.stringify(message)}`.cyan);
//     if (this.userContext.length > 10) {
//       this.optimizeContext();
//     }
//   }

//   async delay(ms) {
//     return new Promise(resolve => setTimeout(resolve, ms));
//   }

//   processStreamingContent(content) {
//     this.sentenceBuffer += content;
//     const words = this.sentenceBuffer.split(/\s+/).filter(w => w);
    
//     if (words.length >= 10 || /[.!?]/.test(content)) {
//       if (this.sentenceBuffer.trim()) {
//         this.emit("gptreply", { 
//           partialResponseIndex: this.partialResponseIndex, 
//           partialResponse: this.sentenceBuffer.trim() 
//         });
//         this.partialResponseIndex++;
//         this.sentenceBuffer = "";
//         this.sentenceCount++;
//       }
//     }
//   }

//   async completion(text, interactionCount, role = "user", name = "user", retryCount = 0) {
//     const startTime = process.hrtime.bigint();
//     this.updateUserContext(name, role, text);
//     this.lastUserInput = text;

//     try {
//       const controller = new AbortController();
//       this.currentStream = { controller };
//       this.isStreaming = true;

//       let toolCall = null;
//       if (text.toLowerCase().includes("book") && text.toLowerCase().includes("appointment")) {
//         toolCall = {
//           function: { name: "checkTimeSlots", arguments: JSON.stringify({}) }
//         };
//       } else if (text.toLowerCase().includes("transfer") && text.toLowerCase().includes("call")) {
//         toolCall = {
//           function: { name: "transferCall", arguments: JSON.stringify({}) }
//         };
//       }

//       const messages = toolCall
//         ? [...this.userContext, { role: "assistant", content: null, tool_calls: [toolCall] }]
//         : this.userContext;

//       const stream = await this.openai.chat.completions.create({
//         model: "gpt-4o-mini",
//         messages,
//         tools,
//         stream: true,
//         max_tokens: 50, // Reduced for speed
//         temperature: 0.6, // Slightly lower for conciseness
//         presence_penalty: 0.3,
//         frequency_penalty: 0.2,
//         top_p: 0.85
//       });

//       let completeResponse = "";
//       let functionName = "";
//       let functionArgs = "";
//       let finishReason = "";

//       for await (const chunk of stream) {
//         if (controller.signal.aborted) {
//           console.log("Stream aborted due to interruption".yellow);
//           return;
//         }

//         let content = chunk.choices[0]?.delta?.content || "";
//         let deltas = chunk.choices[0].delta;
//         finishReason = chunk.choices[0].finish_reason;

//         if (deltas.tool_calls) {
//           functionName = deltas.tool_calls[0]?.function?.name || functionName;
//           functionArgs += deltas.tool_calls[0]?.function?.arguments || "";
//         }

//         if (finishReason === "tool_calls" && functionName) {
//           const functionToCall = availableFunctions[functionName];
//           const validatedArgs = this.validateFunctionArgs(functionArgs);
//           const toolData = tools.find((tool) => tool.function.name === functionName);
//           const say = toolData?.function?.say || this.getQuickResponse("checking");

//           this.emit("gptreply", { 
//             partialResponseIndex: this.partialResponseIndex++, 
//             partialResponse: say 
//           }, interactionCount);

//           try {
//             let functionResponse = await functionToCall(validatedArgs);
//             this.updateUserContext(functionName, "function", functionResponse);

//             if (
//               (functionName === "bookAppointment" && functionResponse.includes("Sorry")) ||
//               (functionName === "checkTimeSlots" && functionResponse.includes("No available slots"))
//             ) {
//               const alternativeResponse = this.getQuickResponse("apology") + " Let me find other options.";
//               this.emit("gptreply", { 
//                 partialResponseIndex: this.partialResponseIndex++, 
//                 partialResponse: alternativeResponse 
//               }, interactionCount);

//               this.updateUserContext(
//                 "system",
//                 "system",
//                 "The selected time slot is unavailable. Suggest alternative times briefly."
//               );
              
//               const checkSlotsResponse = await availableFunctions["checkTimeSlots"]({ time: validatedArgs.time });
//               this.updateUserContext("checkTimeSlots", "function", checkSlotsResponse);
//               functionResponse = checkSlotsResponse;
//             }

//             await this.completion(functionResponse, interactionCount, "function", functionName, 0);
//           } catch (error) {
//             console.error(`Function ${functionName} error: ${error.message}`.red);
//             this.errorCount++;
//             let errorMessage = this.errorCount >= this.maxErrors
//               ? "I’m having trouble. Let me connect you with a human."
//               : this.getQuickResponse("apology");
//             this.emit("gptreply", { 
//               partialResponseIndex: this.partialResponseIndex++, 
//               partialResponse: errorMessage 
//             }, interactionCount);
//             this.updateUserContext("system", "system", errorMessage);
//           }
//         } else if (content) {
//           completeResponse += content;
//           this.processStreamingContent(content);
//         }
//       }

//       if (this.sentenceBuffer.trim()) {
//         this.emit("gptreply", { 
//           partialResponseIndex: this.partialResponseIndex, 
//           partialResponse: this.sentenceBuffer.trim() 
//         });
//         this.partialResponseIndex++;
//         this.sentenceBuffer = "";
//       }

//       if (completeResponse) {
//         this.updateUserContext("assistant", "assistant", completeResponse);
//         this.errorCount = 0;
//       }

//       this.isStreaming = false;
//       console.log(`GPT completed in ${Number(process.hrtime.bigint() - startTime) / 1e6}ms at ${new Date().toISOString()}`.green);
//     } catch (error) {
//       this.isStreaming = false;
//       console.error(`GPT error: ${error.message}`.red);
//       this.errorCount++;
//       if (error.status === 429 && retryCount < this.maxRetries) {
//         const delayMs = this.retryDelay * Math.pow(1.5, retryCount);
//         console.log(`Rate limit hit, retrying in ${delayMs}ms...`.yellow);
//         await this.delay(delayMs);
//         return await this.completion(text, interactionCount, role, name, retryCount + 1);
//       }
//       let errorMessage = this.errorCount >= this.maxErrors
//         ? "I’m having trouble. Let me connect you with a human."
//         : this.getQuickResponse("apology");
//       this.emit("gptreply", { 
//         partialResponseIndex: this.partialResponseIndex++, 
//         partialResponse: errorMessage 
//       }, interactionCount);
//       this.updateUserContext("system", "system", errorMessage);
//     }
//   }

//   isSpeaking() {
//     return this.isStreaming;
//   }

//   resetConversation() {
//     this.partialResponseIndex = 0;
//     this.errorCount = 0;
//     this.sentenceBuffer = "";
//     this.sentenceCount = 0;
//     this.isStreaming = false;
//     this.currentStream = null;
//     console.log("Conversation state reset".blue);
//   }
// }

// module.exports = { GptService };












require("colors");
const EventEmitter = require("events");
const OpenAI = require("openai");
const tools = require("../functions/function-manifest");
const { agentModel } = require("../models/agent");
const { v4: uuidv4 } = require("uuid");

const availableFunctions = {};
tools.forEach((tool) => {
  let functionName = tool.function.name;
  availableFunctions[functionName] = require(`../functions/${functionName}`);
});

class GptService extends EventEmitter {
  constructor(agentType) {
    super();
    this.openai = new OpenAI();
    this.agentType = agentType;
    this.partialResponseIndex = 0;
    this.responseStyle = "friendly";
    this.userContext = [
      {
        role: "system",
        content: `You are Riley, a professional scheduling assistant. Respond naturally in a ${this.responseStyle} tone, using 10-30 words unless a quick response is needed. Personalize replies with user info when available. For casual inputs, respond warmly and pivot to booking after 2-3 exchanges. For booking requests, prioritize efficiency and clarity, gathering name, email, preferred time. Avoid repetition and maintain smooth flow.`,
      },
    ];
    this.errorCount = 0;
    this.maxErrors = 5;
    this.retryDelay = 200;
    this.maxRetries = 3;
    this.currentStream = null;
    this.isStreaming = false;
    this.sentenceBuffer = "";
    this.lastUserInput = "";
    this.contextOptimized = false;
    this.pendingToolCall = null;
    this.conversationState = "greeting"; // greeting, collecting_info, booking, confirming, suggest_alternatives, select_slot, transferring
    this.userInfo = {};
    this.lastResponse = "";
    this.casualExchangeCount = 0; // Track casual exchanges for nudging

    this.quickResponses = new Map([
      ["interruption", ["Hold on, I’m with you!", "Just a sec!", "I hear you!", "One moment!"]],
      ["confirmation", ["Awesome, got it!", "Perfect, let’s do this!", "You’re all set!", "Booked!", "All done!"]],
      ["checking", ["Let me check that for you!", "Hang tight, I’m looking!", "On it!", "Checking now!"]],
      ["apology", ["Sorry, I hit a snag. Let’s try again!", "Oops, my bad! Let’s fix that!", "My apologies, let’s get back on track!", "Sorry, let’s sort this out!"]],
      ["booking", ["Booking that now!", "Let’s get you scheduled!", "Setting it up!", "On it, booking now!"]],
      ["info_request", ["Just need a few details!", "Can you share a bit more?", "Quick info needed!", "Let’s get those details!"]],
      ["frustration", ["I totally get it, let’s sort this out!", "No worries, I’m here to help!", "Let’s make this easy for you!", "I’m on it, let’s fix this!"]],
      ["greeting", [
        "Hey, great to hear from you! Ready to book an appointment?",
        "Hi there! I’m doing awesome, thanks for asking! Want to schedule something?",
        "Hello! Excited to help—shall we book a time?",
        "Hey! Thanks for calling—let’s get you scheduled!"
      ]],
      ["vague", [
        "Let’s get you scheduled! Can you share your name or preferred time?",
        "I’m here to help! Want to book an appointment?",
        "Let’s make it happen! What time works for you?",
        "Ready to book? Just need your details!"
      ]],
      ["booking_retry", [
        "I couldn’t book that slot. Can you confirm the time?",
        "Something went wrong—let’s try again. What time works?",
        "Booking issue, sorry! Can you specify the time again?",
        "Let’s retry that booking. What time did you want?"
      ]],
      ["casual_nudge", [
        "Love the chat! Want to book an appointment now?",
        "This is fun! Shall we schedule something for you?",
        "Great talking! Ready to pick a time for your appointment?",
        "Enjoying this! Let’s get you booked—when works?"
      ]],
    ]);

    this.initializeAgentPrompt();
  }

  async initializeAgentPrompt() {
    try {
      const agent = await agentModel.findOne({ name: this.agentType }).lean();
      if (agent) {
        this.userContext = [...this.userContext, ...agent.prompts];
      } else {
        throw new Error(`Agent type '${this.agentType}' not found`);
      }
    } catch (error) {
      console.error(`Error initializing agent prompt: ${error.message}`.red);
      throw error;
    }
  }

  setCallSid(callSid) {
    this.callSid = callSid;
    this.userContext.push({ role: "system", content: `callSid: ${callSid}` });
  }

  async interrupt() {
    if (this.currentStream && this.isStreaming) {
      this.currentStream.controller?.abort();
      this.isStreaming = false;
      this.sentenceBuffer = "";
      this.pendingToolCall = null;

      console.log(`Interrupt triggered for input: ${this.lastUserInput}`.cyan);

      const interruptResponse = this.getQuickResponse("interruption");
      this.emit("gptreply", {
        partialResponseIndex: this.partialResponseIndex++,
        partialResponse: interruptResponse,
        isInterruption: true,
      });
      this.updateUserContext("assistant", interruptResponse);
    }
  }

  getQuickResponse(type) {
    const responses = this.quickResponses.get(type) || ["Okay, let’s keep going!"];
    let response;
    do {
      response = responses[Math.floor(Math.random() * responses.length)];
    } while (response === this.lastResponse && responses.length > 1);
    this.lastResponse = response;
    return response;
  }

  optimizeContext() {
    if (this.userContext.length <= 10) return;

    const systemPrompts = this.userContext.filter((msg) => msg.role === "system");
    const userInfoPrompt = {
      role: "system",
      content: `User info: name=${this.userInfo.name || "unknown"}, email=${this.userInfo.email || "unknown"}, preferredTime=${this.userInfo.preferredTime || "unknown"}`,
    };
    const recentMessages = this.userContext.filter((msg) => msg.role !== "system").slice(-4);

    this.userContext = [...systemPrompts, userInfoPrompt, ...recentMessages];
    this.contextOptimized = true;
    console.log("Context optimized".yellow);
  }

  extractUserInfo(text) {
    const lower = text.toLowerCase();

    const nameMatch = text.match(/(?:name is|i'm|i am|call me)\s+([a-zA-Z]+)/i);
    if (nameMatch) {
      this.userInfo.name = nameMatch[1];
    }

    const emailMatch = text.match(/\b[\w.-]+@[\w.-]+\.\w+\b/) || text.match(/[\w.-]+\s*(?:at|@)\s*(gmail|hotmail|yahoo)\s*dot\s*com/i);
    if (emailMatch) {
      this.userInfo.email = emailMatch[0].replace(/\s*(at|@)\s*/i, "@").replace(/\s*dot\s*/i, ".").toLowerCase();
    }

    const timeMatch = text.match(/\b(\d{1,2}(?::\d{2})?\s*(?:am|pm)|morning|evening|afternoon|\d{1,2}(?:am|pm)|tomorrow|today)\b/i);
    if (timeMatch) {
      let time = timeMatch[0].toLowerCase();
      if (time.match(/^\d{1,2}(?:am|pm)$/i)) {
        time = time.replace(/(am|pm)/i, ":00 $1");
      } else if (time === "tomorrow" || time === "today") {
        time = `${time} morning`;
      }
      this.userInfo.preferredTime = time;
    }
  }

  detectSentiment(text) {
    const lower = text.toLowerCase();
    if (lower.includes("frustrated") || lower.includes("annoyed") || lower.includes("sorry") || lower.includes("not working")) {
      return "frustrated";
    }
    return "friendly";
  }

  detectIntent(text) {
    const lower = text.toLowerCase().trim();

    if (lower.match(/\b(\d{1,2}(?::\d{2})?\s*(?:am|pm)|morning|evening|afternoon|\d{1,2}(?:am|pm)|tomorrow|today)\b/i)) {
      return "check_slots";
    }
    if (lower.includes("book") || lower.includes("appointment") || lower.includes("schedule")) {
      return "booking";
    }
    if (lower.includes("transfer") || lower.includes("human") || lower.includes("agent")) {
      return "transfer";
    }
    if (lower.includes("slot") || lower.includes("available") || lower.includes("time")) {
      return "check_slots";
    }
    if (lower.match(/^(yes|sure|okay|confirm|book it)\s*(?:book it)?$/i)) {
      return "confirm";
    }
    if (lower.match(/^(hi|hello|hey|how are you|what's up|yo)$/i)) {
      return "greeting";
    }
    if (lower.match(/^(okay|so|k|yeah|umm|uh)$/i) || lower.includes("what")) {
      return "vague";
    }
    return "general";
  }

  generateClarificationPrompt(intent) {
    if (intent === "greeting" || intent === "vague") {
      this.casualExchangeCount++;
      if (this.casualExchangeCount >= 3) {
        this.casualExchangeCount = 0;
        return this.getQuickResponse("casual_nudge");
      }
      return this.getQuickResponse(intent);
    }
    if ((intent === "booking" || intent === "check_slots" || this.conversationState === "collecting_info") && 
        (!this.userInfo.name || !this.userInfo.email || !this.userInfo.preferredTime)) {
      const missing = [];
      if (!this.userInfo.name) missing.push("name");
      if (!this.userInfo.email) missing.push("email");
      if (!this.userInfo.preferredTime) missing.push("preferred time");
      return `Thanks, ${this.userInfo.name || "there"}! I need your ${missing.join(" and ")} to book. Could you share those?`;
    }
    if (intent === "check_slots" && !this.userInfo.preferredTime?.match(/\b\d{1,2}:\d{2}\s*(?:am|pm)\b/i)) {
      return `Could you specify a time like "6:00 PM" for the slots you’re looking for?`;
    }
    if (intent === "confirm" && this.userInfo.preferredTime) {
      return `Did you mean ${this.userInfo.preferredTime} for your appointment, ${this.userInfo.name || "there"}?`;
    }
    return null;
  }

  async executeToolCall(toolCall, retryCount = 0) {
    const { function: func } = toolCall;
    const functionName = func.name;
    const functionArgs = this.validateFunctionArgs(func.arguments);

    console.log(`Executing tool: ${functionName}`.blue);

    try {
      const functionToCall = availableFunctions[functionName];
      if (!functionToCall) {
        throw new Error(`Function ${functionName} not found`);
      }

      const result = await functionToCall(functionArgs);

      if (!this.userContext.some(msg => msg.tool_calls && msg.tool_calls.some(tc => tc.id === toolCall.id))) {
        this.userContext.push({
          role: "assistant",
          content: null,
          tool_calls: [toolCall],
        });
      }

      this.userContext.push({
        role: "tool",
        tool_call_id: toolCall.id,
        name: functionName,
        content: result,
      });

      return result;
    } catch (error) {
      console.error(`Tool execution error: ${error.message}`.red);
      if (retryCount < this.maxRetries && functionName === "bookAppointment") {
        console.log(`Retrying bookAppointment, attempt ${retryCount + 1}`.yellow);
        await this.delay(this.retryDelay * Math.pow(1.5, retryCount));
        return await this.executeToolCall(toolCall, retryCount + 1);
      }
      this.handleToolError(error);
    }
  }

  validateFunctionArgs(args) {
    try {
      return JSON.parse(args);
    } catch {
      try {
        return JSON.parse(args.substring(args.indexOf("{"), args.lastIndexOf("}") + 1));
      } catch {
        return {};
      }
    }
  }

  validateContext() {
    for (let i = 0; i < this.userContext.length; i++) {
      if (this.userContext[i].role === "tool") {
        const toolCallId = this.userContext[i].tool_call_id;
        const hasPrecedingToolCall = this.userContext
          .slice(0, i)
          .some(msg => msg.tool_calls && msg.tool_calls.some(tc => tc.id === toolCallId));
        if (!hasPrecedingToolCall) {
          console.warn(`Invalid context: tool response without preceding tool call for ID ${toolCallId}`.yellow);
          this.userContext.splice(i, 1);
          i--;
        }
      }
    }
  }

  updateUserContext(role, content, name = null) {
    if (!content || content.trim() === "?") return;

    const message = { role, content };
    if (name) message.name = name;

    this.userContext.push(message);

    if (this.userContext.length > 12) {
      this.optimizeContext();
    }
  }

  async delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  processStreamingContent(content) {
    if (!content || content.trim().length < 1) return;

    this.sentenceBuffer += content;

    const sentences = this.sentenceBuffer.split(/(?<=[.!?])\s+(?=[A-Z])|(?<=\w)\s+(?=[A-Z][a-z])/);

    for (let i = 0; i < sentences.length - 1; i++) {
      const sentence = sentences[i].trim();
      if (sentence.length > 3) {
        this.emit("gptreply", {
          partialResponseIndex: this.partialResponseIndex++,
          partialResponse: sentence,
          isInterruption: false,
        });
      }
    }

    this.sentenceBuffer = sentences[sentences.length - 1].trim();
  }

  shouldUseTools(text, intent) {
    const lower = text.toLowerCase();

    if (intent === "booking" && this.userInfo.name && this.userInfo.email && this.userInfo.preferredTime) {
      this.conversationState = "booking";
      let normalizedTime = this.userInfo.preferredTime;
      if (normalizedTime.match(/^\d{1,2}(?:am|pm)$/i)) {
        normalizedTime = normalizedTime.replace(/(am|pm)/i, ":00 $1");
      }
      return {
        id: uuidv4(),
        type: "function",
        function: {
          name: "bookAppointment",
          arguments: JSON.stringify({
            time: normalizedTime,
            name: this.userInfo.name,
            email: this.userInfo.email,
          }),
        },
      };
    }

    if (intent === "check_slots" && !this.userInfo.preferredTime?.match(/\b\d{1,2}:\d{2}\s*(?:am|pm)\b/i)) {
      const timeOfDay = lower.includes("morning") ? "morning" :
                        lower.includes("evening") ? "evening" :
                        lower.includes("afternoon") ? "afternoon" :
                        lower.includes("tomorrow") ? "tomorrow" :
                        "morning";
      this.conversationState = "check_slots";
      return {
        id: uuidv4(),
        type: "function",
        function: {
          name: "checkTimeSlots",
          arguments: JSON.stringify({ timeOfDay }),
        },
      };
    }

    if (intent === "transfer") {
      const username = lower.includes("anurag") ? "Anurag" : "default";
      this.conversationState = "transferring";
      return {
        id: uuidv4(),
        type: "function",
        function: {
          name: "transferCall",
          arguments: JSON.stringify({
            callSid: this.callSid,
            username,
          }),
        },
      };
    }

    return null;
  }

  async handleCasualConversation(text, interactionCount) {
    const intent = this.detectIntent(text);
    const sentiment = this.detectSentiment(text);

    if (sentiment === "frustrated") {
      const empathyResponse = this.getQuickResponse("frustration");
      this.emit("gptreply", {
        partialResponseIndex: this.partialResponseIndex++,
        partialResponse: empathyResponse,
        isInterruption: false,
      });
      this.updateUserContext("assistant", empathyResponse);
      return;
    }

    const clarificationPrompt = this.generateClarificationPrompt(intent);
    if (clarificationPrompt) {
      this.emit("gptreply", {
        partialResponseIndex: this.partialResponseIndex++,
        partialResponse: clarificationPrompt,
        isInterruption: false,
      });
      this.updateUserContext("assistant", clarificationPrompt);
      return;
    }

    try {
      const stream = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [...this.userContext, { role: "user", content: text }],
        stream: true,
        max_tokens: 30,
        temperature: this.responseStyle === "empathetic" ? 0.5 : 0.3,
        top_p: 0.9,
        frequency_penalty: 0.1,
        presence_penalty: 0.1,
      });

      let completeResponse = "";
      for await (const chunk of stream) {
        if (this.currentStream?.controller?.signal.aborted) return;
        const delta = chunk.choices[0]?.delta || {};
        if (delta.content) {
          completeResponse += delta.content;
          this.processStreamingContent(delta.content);
        }
        if (chunk.choices[0]?.finish_reason === "stop") {
          break;
        }
      }

      if (this.sentenceBuffer.trim().length > 0) {
        this.emit("gptreply", {
          partialResponseIndex: this.partialResponseIndex++,
          partialResponse: this.sentenceBuffer.trim(),
          isInterruption: false,
        });
        this.sentenceBuffer = "";
      }

      if (completeResponse) {
        this.updateUserContext("assistant", completeResponse);
        this.casualExchangeCount++;
        if (this.casualExchangeCount >= 3) {
          const nudgeResponse = this.getQuickResponse("casual_nudge");
          this.emit("gptreply", {
            partialResponseIndex: this.partialResponseIndex++,
            partialResponse: nudgeResponse,
            isInterruption: false,
          });
          this.updateUserContext("assistant", nudgeResponse);
          this.casualExchangeCount = 0;
        }
      }
    } catch (error) {
      console.error(`Casual conversation error: ${error.message}`.red);
      this.handleError(error);
    }
  }

  async handleBookingFlow(text, interactionCount) {
    const intent = this.detectIntent(text);
    const clarificationPrompt = this.generateClarificationPrompt(intent);

    if (clarificationPrompt) {
      this.emit("gptreply", {
        partialResponseIndex: this.partialResponseIndex++,
        partialResponse: clarificationPrompt,
        isInterruption: false,
      });
      this.updateUserContext("assistant", clarificationPrompt);
      return;
    }

    const toolCall = this.shouldUseTools(text, intent);
    if (toolCall) {
      console.log(`Using tool: ${toolCall.function.name}`.blue);
      const tool = tools.find(t => t.function.name === toolCall.function.name);
      const immediateResponse = tool?.function.say || this.getQuickResponse("checking");

      this.emit("gptreply", {
        partialResponseIndex: this.partialResponseIndex++,
        partialResponse: immediateResponse,
        isInterruption: false,
      });
      this.updateUserContext("assistant", immediateResponse);

      try {
        const result = await this.executeToolCall(toolCall);
        const followUpMessage = this.generateFollowUpMessage(toolCall.function.name, result);

        if (followUpMessage) {
          this.emit("gptreply", {
            partialResponseIndex: this.partialResponseIndex++,
            partialResponse: followUpMessage,
            isInterruption: false,
          });
          this.updateUserContext("assistant", followUpMessage);
        }
      } catch (error) {
        console.error(`Tool execution failed: ${error.message}`.red);
        this.handleToolError(error);
      }
      return;
    }

    // Fallback to quick response if no tool is needed but booking intent persists
    const fallbackResponse = this.getQuickResponse("info_request");
    this.emit("gptreply", {
      partialResponseIndex: this.partialResponseIndex++,
      partialResponse: fallbackResponse,
      isInterruption: false,
    });
    this.updateUserContext("assistant", fallbackResponse);
  }

  async completion(text, interactionCount, role = "user", name = null, retryCount = 0) {
    const startTime = process.hrtime.bigint();

    if (role === "user") {
      this.extractUserInfo(text);
      this.lastUserInput = text;
      const sentiment = this.detectSentiment(text);
      this.responseStyle = sentiment === "frustrated" ? "empathetic" : "friendly";
    }

    this.updateUserContext(role, text, name);

    const intent = this.detectIntent(text);
    console.log(`Intent detected: ${intent}, Sentiment: ${this.responseStyle}, UserInfo: ${JSON.stringify(this.userInfo)}`.magenta);

    // Route to appropriate handler based on intent and userInfo
    const isBookingIntent = ["booking", "check_slots", "confirm"].includes(intent) || 
                           (this.userInfo.name && this.userInfo.email && this.userInfo.preferredTime);
    if (isBookingIntent) {
      this.conversationState = "collecting_info";
      await this.handleBookingFlow(text, interactionCount);
    } else {
      await this.handleCasualConversation(text, interactionCount);
    }

    this.isStreaming = false;
    const endTime = process.hrtime.bigint();
    console.log(`Completion processed in ${(Number(endTime - startTime) / 1e6).toFixed(2)}ms`.green);
  }

  generateFollowUpMessage(functionName, result) {
    switch (functionName) {
      case "checkTimeSlots":
        if (result.includes("No")) {
          this.conversationState = "suggest_alternatives";
          return `No slots for that time. How about morning or evening instead, ${this.userInfo.name || "there"}?`;
        }
        this.conversationState = "select_slot";
        return `Available slots: ${result}. Which one works for you, ${this.userInfo.name || "there"}?`;
      case "bookAppointment":
        if (result.includes("success")) {
          this.conversationState = "confirming";
          return `Great, ${this.userInfo.name || "there"}! Your appointment is booked for ${this.userInfo.preferredTime}. You’ll get a confirmation email.`;
        }
        this.conversationState = "collecting_info";
        return this.getQuickResponse("booking_retry");
      case "transferCall":
        this.conversationState = "transferring";
        return "Transferring you now. Please hold on.";
      default:
        return null;
    }
  }

  handleToolError(error) {
    this.errorCount++;
    const errorMessage = this.errorCount >= this.maxErrors
      ? "I'm having trouble with my systems. Let me transfer you to a human agent."
      : this.getQuickResponse("booking_retry");

    this.emit("gptreply", {
      partialResponseIndex: this.partialResponseIndex++,
      partialResponse: errorMessage,
      isInterruption: false,
    });
    this.updateUserContext("assistant", errorMessage);
  }

  handleError(error) {
    this.errorCount++;
    const errorMessage = this.errorCount >= this.maxErrors
      ? "I'm having trouble. Let me connect you with a human agent."
      : this.getQuickResponse("apology");

    this.emit("gptreply", {
      partialResponseIndex: this.partialResponseIndex++,
      partialResponse: errorMessage,
      isInterruption: false,
    });
    this.updateUserContext("assistant", errorMessage);
  }

  isSpeaking() {
    return this.isStreaming;
  }

  resetConversation() {
    this.partialResponseIndex = 0;
    this.errorCount = 0;
    this.sentenceBuffer = "";
    this.isStreaming = false;
    this.currentStream = null;
    this.pendingToolCall = null;
    this.userInfo = {};
    this.conversationState = "greeting";
    this.responseStyle = "friendly";
    this.lastResponse = "";
    this.casualExchangeCount = 0;
  }
}

module.exports = { GptService };