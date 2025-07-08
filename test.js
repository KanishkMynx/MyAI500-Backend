require("dotenv").config();
const fs = require("fs").promises;
const path = require("path");
const mongoose = require("mongoose");
require("colors");

const { connectDB } = require("./config/db"); // Adjust path to your connectDB file

// Define TTS Cache Schema
const ttsCacheSchema = new mongoose.Schema({
  cacheKey: { type: String, required: true, unique: true, index: true },
  audioData: { type: String, required: true },
  updatedAt: { type: Date, default: Date.now },
});

const TtsCache = mongoose.model("TtsCache", ttsCacheSchema, "ttsCache");

async function migrateTtsCache() {
  const cacheDir = path.join(__dirname, "tts_cache");
  const mongoUri = "mongodb+srv://grkhatri95:qfByMUEybZ8t0ywU@cluster1.jofyxs5.mongodb.net/voiceAgent?retryWrites=true&w=majority&appName=Cluster1";

  try {
    // Connect to MongoDB Atlas
    await connectDB(mongoUri);
    console.log("Connected to MongoDB Atlas".green);

    // Ensure index on cacheKey (already defined in schema)
    await TtsCache.createIndexes();
    console.log("Index created on cacheKey".green);

    // Read all .mulaw files from tts_cache
    const files = await fs.readdir(cacheDir);
    const mulawFiles = files.filter((file) => file.endsWith(".mulaw"));

    if (mulawFiles.length === 0) {
      console.log("No .mulaw files found in tts_cache directory".yellow);
      return;
    }

    console.log(`Found ${mulawFiles.length} .mulaw files to migrate`.cyan);

    // Prepare bulk operations
    const operations = [];
    for (const file of mulawFiles) {
      try {
        const filePath = path.join(cacheDir, file);
        const cacheKey = file.replace(/\.mulaw$/, "");
        const audioData = await fs.readFile(filePath);
        const base64String = audioData.toString("base64");

        operations.push({
          updateOne: {
            filter: { cacheKey },
            update: { $set: { cacheKey, audioData: base64String, updatedAt: new Date() } },
            upsert: true,
          },
        });
      } catch (err) {
        console.error(`Error reading file ${file}: ${err.message}`.red);
      }
    }

    if (operations.length === 0) {
      console.log("No valid files to migrate".yellow);
      return;
    }

    // Perform bulk write
    const startTime = process.hrtime.bigint();
    const result = await TtsCache.bulkWrite(operations, { ordered: false });
    const endTime = process.hrtime.bigint();

    console.log(
      `Migrated ${result.upsertedCount + result.modifiedCount} audio files to MongoDB Atlas in ${
        Number(endTime - startTime) / 1e6
      }ms`.green
    );

    // Verify migration
    const mongoCount = await TtsCache.countDocuments();
    console.log(`Total documents in ttsCache collection: ${mongoCount}`.cyan);
    if (mongoCount >= mulawFiles.length) {
      console.log("Migration completed successfully".green);
    } else {
      console.warn(
        `Mismatch: ${mulawFiles.length} files found, but ${mongoCount} documents in MongoDB`.yellow
      );
    }

  } catch (err) {
    console.error(`Migration error: ${err.message}`.red);
  } finally {
    await mongoose.connection.close();
    console.log("MongoDB Atlas connection closed".yellow);
  }
}

migrateTtsCache().catch((err) => {
  console.error(`Script error: ${err.message}`.red);
  process.exit(1);
});