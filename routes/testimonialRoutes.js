const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const connectDB = require("../connection/db");

// POST: Add a new testimonial
router.post("/add-testimonial", async (req, res) => {
    try {
        const db = await connectDB();
        const { video_url } = req.body;

        if (!video_url || video_url.trim() === "") {
            return res.status(400).json({ error: "Video URL is required" });
        }

        const newTestimonial = {
            video_url,
            createdAt: new Date(),
        };

        const result = await db.collection("testimonial").insertOne(newTestimonial);

        res.status(201).json({
            success: true,
            message: "Testimonial added successfully",
            testimonial: { _id: result.insertedId, ...newTestimonial },
        });
    } catch (error) {
        console.error("Error adding testimonial:", error);
        res.status(500).json({ error: "Server error", details: error.message });
    }
});

module.exports = router;
