// pages/api/domestic-packages.js
import connectDB from "../../../backend/connection/db"; // adjust path

export default async function handler(req, res) {
  try {
    const db = await connectDB();
    const tours = await db
      .collection("tours")
      .find({ indian: "Yes" })
      .toArray();

    res.status(200).json(tours);
  } catch (error) {
    console.error("❌ Error fetching domestic packages:", error.message);
    res.status(500).json({ error: "Server error" });
  }
}
