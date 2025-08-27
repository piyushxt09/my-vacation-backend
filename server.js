const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const multer = require("multer");
const connectDB = require("./connection/db");
const jwt = require("jsonwebtoken");
const cloudinary = require('cloudinary');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const tourRoutes = require('./routes/tourRoutes');
const seoRoutes = require('./routes/seoRoutes');
const deleteTourRoutes = require('./routes/deleteRoutes');


dotenv.config();

const app = express();
connectDB();
app.use(cors());
app.use(express.json());


const upload = multer({ dest: "uploads/" });

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";

// Cloudinary config
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")   // replace non-alphanumeric with -
    .replace(/^-+|-+$/g, "");      // remove leading/trailing -
};

app.post("/api/add-tour", upload.single("image"), async (req, res) => {
  try {
    const db = await connectDB();

    // Parse itinerary safely
    let itinerary = [];
    try {
      itinerary = JSON.parse(req.body.itinerary || "[]");
    } catch (e) {
      console.error("Error parsing itinerary:", e);
      return res.status(400).json({ error: "Invalid itinerary format" });
    }

    // Upload image to Cloudinary (no folder, root level)
    let imageUrl = null;
    if (req.file) {
      try {
        if (!fs.existsSync(req.file.path)) {
          throw new Error("File not found at temporary path");
        }

        const result = await cloudinary.v2.uploader.upload(req.file.path, {
          public_id: `tour-${uuidv4()}`, // optional unique name
          transformation: [
            { width: 800, height: 600, crop: "limit" },
            { quality: "auto" }
          ]
        });

        imageUrl = result.secure_url;

        // delete temp file
        fs.unlinkSync(req.file.path);
      } catch (uploadError) {
        console.error("Cloudinary upload error:", uploadError);
        return res.status(500).json({
          error: "Image upload failed",
          details: uploadError.message
        });
      }
    }

    // Generate slug URL from package_name
    const urlSlug = slugify(req.body.package_name);

    // Prepare data
    const tourData = {
      package_name: req.body.package_name,
      tour_duration: req.body.tour_duration,
      tour_destination: req.body.tour_destination,
      tour_price: req.body.tour_price,
      theme: req.body.theme,
      indian: req.body.indian || "No",
      international: req.body.international || "No",
      fixed_departure: req.body.fixed_departure || "No",
      inclusions: req.body.inclusions,
      exclusions: req.body.exclusions,
      itinerary,
      image: imageUrl,
      url: urlSlug,   // ✅ store the slug
      createdAt: new Date(),
    };

    // Insert into MongoDB
    const result = await db.collection("tours").insertOne(tourData);

    res.status(201).json({
      success: true,
      message: "Tour added successfully",
      tourId: result.insertedId,
      imageUrl,
      url: urlSlug,
    });
  } catch (error) {
    console.error("❌ Error inserting tour:", error);
    res.status(500).json({
      error: "Server error",
      details: error.message,
    });
  }
});

app.use('/api', tourRoutes);

app.use('/api', seoRoutes);
app.use('/api', deleteTourRoutes);



app.get("/api/domestic-packages", async (req, res) => {
  try {
    const db = await connectDB();
    const tours = await db.collection("tours").find({ indian: "Yes" }).toArray();
    res.json(tours);
  } catch (error) {
    console.error("❌ Error fetching domestic tours:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/similar-tours", async (req, res) => {
  try {
    const db = await connectDB();

    const tours = await db.collection("tours")
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

    const tours = await db.collection("tours").find(
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

    const tours = await db.collection("tours").find(
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

    const tours = await db.collection("tours").find(
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

    const themes = await db.collection("tours").aggregate([
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
    const tours = await db.collection("tours").find({}).toArray();
    res.json(tours);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/alltour", async (req, res) => {
  try {
    const db = await connectDB();
    const tours = await db.collection("tours").find({}).toArray();
    res.json(tours);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});


app.get("/api/international-packages", async (req, res) => {
  try {
    const db = await connectDB();
    const tours = await db.collection("tours").find({ international: "Yes" }).toArray();
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

    const tour = await db.collection("tours").findOne({ url });
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

    const currentTour = await db.collection("tours").findOne({ url });
    if (!currentTour) return res.json([]);

    const similarTours = await db.collection("tours")
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

    // Check if user exists
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

    // Return JWT in response body (to be stored in sessionStorage on frontend)
    return res.json({
      success: true,
      message: "Login successful",
      token, // <-- frontend stores this in sessionStorage
    });
  } catch (err) {
    console.error("❌ Login error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});


const PORT = process.env.PORT || 5000;
connectDB().then(() => {
  app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
});
