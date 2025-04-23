const mongoose = require("mongoose");

const memberSchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
  name: { type: String, required: true, unique: true, trim: true },
  phoneNumber: { 
    type: String, 
    required: true, 
    match: [/^\+?[1-9]\d{1,14}$/, "Please enter a valid phone number"] 
  },
  createdAt: { type: Date, default: Date.now },
});

const memberModel = mongoose.model("Member", memberSchema);

module.exports = { memberModel };