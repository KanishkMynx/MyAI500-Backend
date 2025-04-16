// imports
const mongoose = require("mongoose");

// user schema
const agentSchema = new mongoose.Schema({
  _id: { type: String, default: () => new mongoose.Types.ObjectId() },
  name: { type: Date },
  prompts: [
    {
      role: { type: String, default: "" },
      content: { type: String, default: "" },
    },
  ],
});

const agent = mongoose.model("agent", agentSchema);
// export user model
module.exports = { agentModel: agent };
