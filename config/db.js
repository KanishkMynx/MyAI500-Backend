const mongoose = require("mongoose");

let isConnected = false;

async function connectDB() {
  if (isConnected) return;
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    isConnected = true;
    console.log("MongoDB connected".green);
  } catch (err) {
    console.error(`MongoDB connection error: ${err.message}`.red);
    throw err;
  }
}

module.exports = { connectDB };