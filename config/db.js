// imports
const mongoose = require("mongoose");

// mongodb connection and schema details
function connectDB(url) {
  mongoose.connect(url, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  const db = mongoose.connection;
  db.on("error", console.error.bind(console, "MongoDB connection error:"));
  db.once("open", () => {
    console.log("MongoDB connected");
  });
  return db;
}

module.exports = { connectDB };
//     const callSchema = new mongoose.Schema({
//       callStartTime: { type: Date },
//       callEndTime: { type: Date },
//       callDuration: { type: String },
