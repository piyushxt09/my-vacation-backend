const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const multer = require("multer");
const connectDB = require("./connection/db");
const jwt = require("jsonwebtoken");

dotenv.config();

const app = express();

app.use(
  cors({
    origin: "https://myvacationholidays.in",
    credentials: true,
  })
);

app.use(express.json());

const storage = multer.memoryStorage();
const upload = multer({ storage });

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";

app.post("/api/add-tour", upload.single("image"), async (req, res) => {
  try {
    const db = await connectDB();

    const tourData = {
      package_name: req.body.package_name,
      tour_duration: req.body.tour_duration,
      tour_destination: req.body.tour_destination,
      tour_price: req.body.tour_price,
      theme: req.body.theme,
      indian: req.body.indian,
      international: req.body.international,
      fixed_departure: req.body.fixed_departure,
      inclusions: req.body.inclusions,
      exclusions: req.body.exclusions,
      itinerary: JSON.parse(req.body.itinerary || "[]"),
      image: req.file ? req.file.buffer.toString("base64") : null,
      createdAt: new Date()
    };

    const result = await db.collection("users").insertOne(tourData);

    res.json({ success: true, insertedId: result.insertedId });

  } catch (error) {
    console.error("❌ Error inserting tour:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/domestic-packages", async (req, res) => {
  try {
    const db = await connectDB();
    const tours = await db.collection("users").find({ indian: "Yes" }).toArray();
    res.json(tours);
  } catch (error) {
    console.error("❌ Error fetching domestic tours:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/similar-tours", async (req, res) => {
  try {
    const db = await connectDB();

    const tours = await db.collection("users")
      .find({ fixed_departure: "Yes" }) // match fixed departure
      .limit(4)                         // limit to 4
      .toArray();

    res.json(tours);
  } catch (error) {
    console.error("❌ Error fetching Indian tour packages:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/indian-tours", async (req, res) => {
  try {
    const db = await connectDB();

    const tours = await db.collection("users").find(
      { indian: "Yes" }
    ).toArray();

    res.json(tours);
  } catch (error) {
    console.error("❌ Error fetching Indian tours:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/international-tours", async (req, res) => {
  try {
    const db = await connectDB();

    const tours = await db.collection("users").find(
      { international: "Yes" }
    ).toArray();

    res.json(tours);
  } catch (error) {
    console.error("❌ Error fetching Indian tours:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/fixed-tours", async (req, res) => {
  try {
    const db = await connectDB();

    const tours = await db.collection("users").find(
      { fixed_departure: "Yes" }
    ).toArray();

    res.json(tours);
  } catch (error) {
    console.error("❌ Error fetching Indian tours:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/theme-destinations", async (req, res) => {
  try {
    const db = await connectDB();

    const themes = await db.collection("users").aggregate([
      {
        $group: {
          _id: "$theme",            // group by theme
          doc: { $first: "$$ROOT" } // keep only 1 tour per theme
        }
      },
      { $replaceRoot: { newRoot: "$doc" } }, // unwrap the doc
      {
        $project: {
          _id: 1,
          package_name: 1,
          tour_duration: 1,
          tour_destination: 1,
          tour_price: 1,
          image: 1,
          url: 1,
          theme_name: "$theme" // 👈 rename theme → theme_name
        }
      },
      { $limit: 6 } // return only 6 unique themes
    ]).toArray();

    res.json(themes);
  } catch (error) {
    console.error("❌ Error fetching theme destinations:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/tours", async (req, res) => {
  try {
    const db = await connectDB();
    const tours = await db.collection("users").find({}).toArray();
    res.json(tours);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/international-packages", async (req, res) => {
  try {
    const db = await connectDB();
    const tours = await db.collection("users").find({ international: "Yes" }).toArray();
    res.json(tours);
  } catch (error) {
    console.error("❌ Error fetching international tours:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/tour/:url", async (req, res) => {
  try {
    const db = await connectDB();
    const url = req.params.url;

    const tour = await db.collection("users").findOne({ url });
    if (!tour) return res.status(404).json({ error: "Tour not found" });

    res.json(tour);
  } catch (err) {
    console.error("❌ Error fetching tour:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/tour/:url/similar", async (req, res) => {
  try {
    const db = await connectDB();
    const url = req.params.url;

    const currentTour = await db.collection("users").findOne({ url });
    if (!currentTour) return res.json([]);

    const similarTours = await db.collection("users")
      .find({ theme: currentTour.theme, url: { $ne: url } })
      .limit(4)
      .toArray();

    res.json(similarTours);
  } catch (err) {
    console.error("❌ Error fetching similar tours:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const db = await connectDB();
    const { username, password } = req.body;

    const user = await db.collection("admin").findOne({ username });
    if (!user || user.password !== password) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, username: user.username },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none", // required for cross-domain cookies
      path: "/",
      maxAge: 24 * 60 * 60 * 1000,
    });


    return res.json({ success: true, message: "Login successful" });
  } catch (err) {
    console.error("❌ Login error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

const PORT = process.env.PORT || 5000;
connectDB().then(() => {
  app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
});
