const express = require('express');
const router = express.Router();
const multer = require('multer');
const { ObjectId } = require('mongodb');
const cloudinary = require('cloudinary');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const connectDB = require("../connection/db");

// Cloudinary config
cloudinary.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure multer for file uploads
const upload = multer({
    dest: 'uploads/',
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Ensure uploads directory exists
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// GET route to fetch a tour package by ID
router.get('/tour-packages/:id', async (req, res) => {
    try {
        const db = await connectDB();
        const tour = await db.collection('tours').findOne({ _id: new ObjectId(req.params.id) });

        if (!tour) {
            return res.status(404).json({ error: 'Tour not found' });
        }

        res.json({
            success: true,
            tour,
            itinerary: tour.itinerary || []
        });
    } catch (error) {
        console.error('Error fetching tour:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
});

// PUT route to update a tour package
// PUT route to update a tour package
router.put('/tour-packages/:id', upload.single('image'), async (req, res) => {
    try {
        const db = await connectDB();
        const tourId = new ObjectId(req.params.id);

        // Find the existing tour
        const existingTour = await db.collection('tours').findOne({ _id: tourId });
        if (!existingTour) {
            return res.status(404).json({ error: 'Tour not found' });
        }

        // Parse itinerary data safely with better error handling
        let itinerary = [];
        try {
            // Check if itinerary is a string before parsing
            if (typeof req.body.itinerary === 'string') {
                itinerary = JSON.parse(req.body.itinerary || "[]");
            } else if (req.body.itinerary && Array.isArray(req.body.itinerary)) {
                // If it's already an array, use it directly
                itinerary = req.body.itinerary;
            } else {
                itinerary = [];
            }

            // Ensure each itinerary item has the required structure
            itinerary = itinerary.map(day => ({
                title: day.title || '',
                description: day.description || ''
            }));
        } catch (e) {
            console.error("Error parsing itinerary:", e);
            console.log("Received itinerary data:", req.body.itinerary);
            return res.status(400).json({
                error: "Invalid itinerary format",
                details: e.message
            });
        }

        // Process image upload if provided
        let imageUrl = existingTour.image; // Keep existing image by default
        if (req.file) {
            try {
                // Check if file exists at the path
                if (!fs.existsSync(req.file.path)) {
                    throw new Error('File not found at temporary path');
                }

                // Upload to Cloudinary
                const result = await cloudinary.v2.uploader.upload(req.file.path, {
                    folder: "travel_website/tours",
                    public_id: `tour-${uuidv4()}`,
                    transformation: [
                        { width: 800, height: 600, crop: "limit" },
                        { quality: "auto" }
                    ]
                });

                imageUrl = result.secure_url;

                // Delete temporary file after successful upload
                fs.unlinkSync(req.file.path);
            } catch (uploadError) {
                console.error("Cloudinary upload error:", uploadError);
                return res.status(500).json({
                    error: "Image upload failed",
                    details: uploadError.message
                });
            }
        }

        // Prepare update data
        const updateData = {
            package_name: req.body.package_name,
            url: req.body.url,
            tour_duration: req.body.tour_duration,
            tour_destination: req.body.tour_destination,
            tour_price: req.body.tour_price,
            theme: req.body.theme,
            indian: req.body.indian || 'No',
            international: req.body.international || 'No',
            fixed_departure: req.body.fixed_departure || 'No',
            inclusions: req.body.inclusions,
            exclusions: req.body.exclusions,
            itinerary: itinerary,
            image: imageUrl,
            updatedAt: new Date()
        };

        // Update the tour in the database
        const result = await db.collection('tours').updateOne(
            { _id: tourId },
            { $set: updateData }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Tour not found' });
        }

        res.json({
            success: true,
            message: 'Tour updated successfully',
            tourId: req.params.id,
            imageUrl: imageUrl
        });
    } catch (error) {
        console.error('Error updating tour:', error);
        res.status(500).json({
            error: 'Server error',
            details: error.message
        });
    }
});

module.exports = router;