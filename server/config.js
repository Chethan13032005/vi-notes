const mongoose = require("mongoose");

const LOCAL_MONGO_URI = "mongodb://127.0.0.1:27017/vinotes";
const isProduction = process.env.NODE_ENV === "production";
const MONGO_URI = process.env.MONGO_URI || LOCAL_MONGO_URI;
const RETRY_DELAY_MS = 5000;

if (isProduction && !process.env.MONGO_URI) {
  throw new Error("MONGO_URI must be set in production.");
}

const connectDB = async () => {
  const tryConnect = async () => {
    try {
      await mongoose.connect(MONGO_URI);
      console.log("MongoDB Connected");
    } catch (error) {
      console.error("MongoDB connection failed:", error.message);
      setTimeout(tryConnect, RETRY_DELAY_MS);
    }
  };

  mongoose.connection.on("disconnected", () => {
    console.warn("MongoDB disconnected. Retrying connection...");
    setTimeout(tryConnect, RETRY_DELAY_MS);
  });

  mongoose.connection.on("error", (error) => {
    console.error("MongoDB error:", error.message);
  });

  await tryConnect();
};

module.exports = connectDB;