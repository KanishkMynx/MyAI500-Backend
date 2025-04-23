// imports
const mongoose = require("mongoose");

// user schema
const userSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true,
    default: () => new mongoose.Types.ObjectId(),
  },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const user = mongoose.model("user", userSchema);
// export user model
module.exports = { userModel: user };
