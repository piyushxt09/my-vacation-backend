const { MongoClient } = require("mongodb");
const dotenv = require("dotenv");

dotenv.config();

let client;
let db;

async function connectDB() {
  if (db) return db; // reuse connection if already connected

  try {
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    db = client.db(process.env.MONGODB_DB);

    console.log("✅ MongoDB connected successfully");
    return db;
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    throw error;
  }
}

module.exports = connectDB;
