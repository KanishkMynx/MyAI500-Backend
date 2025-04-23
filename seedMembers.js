const mongoose = require("mongoose");
const { memberModel } = require("./models/member");
const { connectDB } = require("./config/db");
require("dotenv").config();

const seedMembers = async () => {
  try {
    await connectDB(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    const members = [
      {
        name: "John Doe",
        phoneNumber: "+18597245646",
      },
      {
        name: "Jane Smith",
        phoneNumber: "+1987654321",
      },
    ];

    await memberModel.deleteMany({});
    await memberModel.insertMany(members);
    console.log("Members seeded successfully");
  } catch (error) {
    console.error("Error seeding members:", error);
  } finally {
    mongoose.connection.close();
  }
};

seedMembers();