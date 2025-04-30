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
    // Ensure function messages always have a name
    if (role === 'function') {
      this.userContext.push({ 
        role: role, 
        name: name || 'function_response', // Provide default name if missing
        content: text 
      });
    } else {
      this.userContext.push({ 
        role: role, 
        ...(name !== "user" && { name }), // Only include name if not "user"
        content: text 
      });
    }
  }

  async completion(text, interactionCount, role = "user", name = "user") {
    this.updateUserContext(name, role, text);

    try {
      const stream = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: this.userContext.map(msg => {
          // Ensure function messages have a name
          if (msg.role === 'function' && !msg.name) {
            return {
              ...msg,
              name: msg.name || 'function_response' // Provide default name if missing
            };
          }
          return msg;
        }),
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

          let functionResponse = await functionToCall(validatedArgs);
          console.log(`Function ${functionName} response: ${functionResponse}`.green);

          this.updateUserContext(functionName, "function", functionResponse);

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
    } catch (error) {
      console.error("Error in completion:", error);
      throw error;
    }
  }
}

module.exports = { GptService };
