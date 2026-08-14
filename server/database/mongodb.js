const mongoose = require("mongoose");
const env = require("../config/env");

const connectDB = async () => {
  try {
    await mongoose.connect(env.mongoUrl);
    console.log("==========================");
    console.log("--- Database connected ---");
    console.log("==========================");
  } catch (error) {
    console.error("MongoDB connection failed");
    console.error(error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
