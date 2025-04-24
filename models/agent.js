// // imports
// const mongoose = require("mongoose");

// // user schema
// const agentSchema = new mongoose.Schema({
//   _id: { type: String, default: () => new mongoose.Types.ObjectId() },
//   name: { type: String },
//   prompts: [
//     {
//       role: { type: String, default: "" },
//       content: { type: String, default: "" },
//     },
//   ],
// });

// const agent = mongoose.model("agent", agentSchema);
// // export user model
// module.exports = { agentModel: agent };

const mongoose = require("mongoose");

const agentSchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
  name: { type: String, required: true, unique: true },
  twilioNumber: { 
    type: String, 
    required: true, 
    match: [/^\+?[1-9]\d{1,14}$/, "Please enter a valid Twilio phone number (e.g., +1234567890)"] 
  },
  prompts: [
    {
      role: { type: String, required: true },
      content: { type: String, required: true },
    },
  ],
});

const agentModel = mongoose.model("Agent", agentSchema);

module.exports = { agentModel };