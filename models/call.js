// imports
const mongoose = require("mongoose");

// Call Schema
const callSchema = new mongoose.Schema({
  _id: { type: String, default: () => new mongoose.Types.ObjectId() },
  callStartTime: { type: Date },
  callEndTime: { type: Date },
  callDuration: { type: String },
  istStartTime: { type: String }, // Added IST formatted time
  istEndTime: { type: String }, // Added IST formatted time
  username: { type: String, default: "anonymous" },
  email: { type: String, default: "" },
  transcript: [
    {
      user: { type: String, default: "" },
      gpt: { type: String, default: "" },
      timestamp: { type: String }, // Added timestamp for each interaction
    },
  ],
});

const call = mongoose.model("call", callSchema);
// export user model
module.exports = { callModel: call };
