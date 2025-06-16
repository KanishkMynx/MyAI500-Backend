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
//     this.userContext = [];
//     this.initializeAgentPrompt();
//   }

//   async initializeAgentPrompt() {
//     try {
//       const agent = await agentModel.findOne({ name: this.agentType });
//       if (agent) {
//         this.userContext = agent.prompts;
//       } else {
//         throw new Error(`Agent type '${this.agentType}' not found in database`);
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
//       console.log(
//         "Warning: Double function arguments returned by OpenAI:",
//         args
//       );
//       if (args.indexOf("{") !== args.lastIndexOf("{")) {
//         return JSON.parse(
//           args.substring(args.indexOf("{"), args.lastIndexOf("}") + 1)
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
//       if (name !== "") {
//         functionName = name;
//       }
//       let args = deltas.tool_calls[0]?.function?.arguments || "";
//       if (args !== "") {
//         functionArgs += args;
//       }
//     }

//     for await (const chunk of stream) {
//       let content = chunk.choices[0]?.delta?.content || "";
//       let deltas = chunk.choices[0].delta;
//       finishReason = chunk.choices[0].finish_reason;

//       if (deltas.tool_calls) {
//         collectToolInformation(deltas);
//       }

//       if (finishReason === "tool_calls") {
//         const functionToCall = availableFunctions[functionName];
//         const validatedArgs = this.validateFunctionArgs(functionArgs);

//         const toolData = tools.find(
//           (tool) => tool.function.name === functionName
//         );
//         const say = toolData.function.say;

//         console.log(`Invoking ${functionName} with args: ${JSON.stringify(validatedArgs)}`.cyan);
//         this.emit(
//           "gptreply",
//           {
//             partialResponseIndex: null,
//             partialResponse: say,
//           },
//           interactionCount
//         );

//         let functionResponse = await functionToCall(validatedArgs);
//         console.log(`Function ${functionName} response: ${functionResponse}`.green);

//         this.updateUserContext(functionName, "function", functionResponse);

//         await this.completion(
//           functionResponse,
//           interactionCount,
//           "function",
//           functionName
//         );
//       } else {
//         completeResponse += content;
//         partialResponse += content;
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
const { agentModel } = require("../models/agent");

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
    this.userContext = [];
    this.errorCount = 0;
    this.maxErrors = 3;
    this.retryDelay = 1000; // Initial delay in ms for rate limit retries
    this.maxRetries = 3; // Max retries for rate limit errors
    this.initializeAgentPrompt();
  }

  async initializeAgentPrompt() {
    try {
      const agent = await agentModel.findOne({ name: this.agentType });
      if (agent) {
        this.userContext = agent.prompts;
      } else {
        throw new Error(`Agent type '${this.agentType}' not found in database`);
      }
    } catch (error) {
      console.error(`Error initializing agent prompt: ${error.message}`.red);
      throw error;
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
      if (args.indexOf("{") !== args.lastIndexOf("{")) {
        return JSON.parse(
          args.substring(args.indexOf("{"), args.lastIndexOf("}") + 1)
        );
      }
    }
  }

  updateUserContext(name, role, text) {
    const message = { role, content: text };
    if (role === "function") {
      message.name = name; // Always set name for function role
    } else if (name !== "user" && role !== "user") {
      message.name = name;
    }
    this.userContext.push(message);
    console.log(`Context updated: ${JSON.stringify(message)}`.cyan);
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async completion(text, interactionCount, role = "user", name = "user", retryCount = 0) {
    this.updateUserContext(name, role, text);

    // Trim context to reduce token usage (keep last 10 messages)
    if (this.userContext.length > 10) {
      this.userContext = [
        ...this.userContext.slice(0, 2), // Keep system prompts
        ...this.userContext.slice(-8), // Keep last 8 messages
      ];
      console.log(`Trimmed context to ${this.userContext.length} messages to reduce tokens`.yellow);
    }

    try {
      const stream = await this.openai.chat.completions.create({
        // model: "gpt-3.5-turbo",
        model: "gpt-4o-mini",
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
        if (name !== "") {
          functionName = name;
        }
        let args = deltas.tool_calls[0]?.function?.arguments || "";
        if (args !== "") {
          functionArgs += args;
        }
      }

      for await (const chunk of stream) {
        let content = chunk.choices[0]?.delta?.content || "";
        let deltas = chunk.choices[0].delta;
        finishReason = chunk.choices[0].finish_reason;

        if (deltas.tool_calls) {
          collectToolInformation(deltas);
        }

        if (finishReason === "tool_calls") {
          const functionToCall = availableFunctions[functionName];
          const validatedArgs = this.validateFunctionArgs(functionArgs);

          const toolData = tools.find(
            (tool) => tool.function.name === functionName
          );
          const say = toolData.function.say;

          console.log(`Invoking ${functionName} with args: ${JSON.stringify(validatedArgs)}`.cyan);
          this.emit(
            "gptreply",
            {
              partialResponseIndex: null,
              partialResponse: say,
            },
            interactionCount
          );

          try {
            let functionResponse = await functionToCall(validatedArgs);
            console.log(`Function ${functionName} response: ${functionResponse}`.green);

            this.updateUserContext(functionName, "function", functionResponse);

            if (
              (functionName === "bookAppointment" && functionResponse.includes("Sorry")) ||
              (functionName === "checkTimeSlots" && functionResponse.includes("No available slots"))
            ) {
              this.updateUserContext(
                "system",
                "system",
                "The selected time slot is unavailable or no slots are available. Prompt the user to choose another time or try a different day."
              );
              const checkSlotsResponse = await availableFunctions["checkTimeSlots"]({});
              this.updateUserContext("checkTimeSlots", "function", checkSlotsResponse);
              functionResponse = checkSlotsResponse;
            }

            await this.completion(
              functionResponse,
              interactionCount,
              "function",
              functionName,
              0
            );
          } catch (error) {
            console.error(`Error in function ${functionName}: ${error.message}`.red);
            this.errorCount++;
            let errorMessage = `Something went wrong with ${functionName}. • Let's try again.`;
            if (this.errorCount >= this.maxErrors) {
              errorMessage = "I'm having trouble processing your request. • Would you like to transfer to a human agent?";
              this.errorCount = 0;
            }
            this.updateUserContext("system", "system", errorMessage);
            this.emit(
              "gptreply",
              {
                partialResponseIndex: null,
                partialResponse: errorMessage,
              },
              interactionCount
            );
            await this.delay(2000); // Pause to allow user input
            await this.completion(
              this.errorCount === 0 ? "Please choose a time slot for your appointment." : "Would you like to transfer to a human agent?",
              interactionCount,
              "assistant",
              "assistant",
              0
            );
          }
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
            this.errorCount = 0;
          }
        }
      }
      this.userContext.push({ role: "assistant", content: completeResponse });
      console.log(`GPT -> user context length: ${this.userContext.length}`.green);
    } catch (error) {
      console.error(`Error in GPT completion: ${error.message}`.red);
      this.errorCount++;

      if (error.status === 429 && retryCount < this.maxRetries) {
        const delayMs = this.retryDelay * Math.pow(2, retryCount); // Exponential backoff
        console.log(`Rate limit hit, retrying in ${delayMs}ms...`.yellow);
        await this.delay(delayMs);
        return await this.completion(text, interactionCount, role, name, retryCount + 1);
      }

      let errorMessage = "Sorry, I hit a snag. • Let's try again.";
      if (this.errorCount >= this.maxErrors) {
        errorMessage = "I'm having trouble processing your request. • Would you like to transfer to a human agent?";
        this.errorCount = 0;
      }
      this.updateUserContext("system", "system", errorMessage);
      this.emit(
        "gptreply",
        {
          partialResponseIndex: null,
          partialResponse: errorMessage,
        },
        interactionCount
      );
      await this.delay(2000); // Pause to allow user input
      if (retryCount < this.maxRetries) {
        await this.completion(
          this.errorCount === 0 ? "Please choose a time slot for your appointment." : "Would you like to transfer to a human agent?",
          interactionCount,
          "assistant",
          "assistant",
          retryCount + 1
        );
      } else {
        console.log("Max retries reached, pausing to prevent loop".red);
        this.emit(
          "gptreply",
          {
            partialResponseIndex: null,
            partialResponse: "I'm having trouble. • Please try again later or request a transfer.",
          },
          interactionCount
        );
      }
    }
  }
}

module.exports = { GptService };