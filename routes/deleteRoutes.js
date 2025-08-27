const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const connectDB = require("../connection/db");

// Helper function to validate ObjectId
const isValidObjectId = (id) => {
    return ObjectId.isValid(id) && new ObjectId(id).toString() === id;
};

// DELETE route to delete a tour package
router.delete('/delete-tour/:id', async (req, res) => {
    try {
        console.log('DELETE request received for tour ID:', req.params.id);

        // Validate ObjectId
        if (!isValidObjectId(req.params.id)) {
            console.log('Invalid ObjectId format:', req.params.id);
            return res.status(400).json({ error: 'Invalid tour ID format' });
        }

        const db = await connectDB();
        const tourId = new ObjectId(req.params.id);

        // Check if the tour exists before deleting
        const existingTour = await db.collection('tours').findOne({ _id: tourId });
        if (!existingTour) {
            console.log('Tour not found in database');
            return res.status(404).json({ error: 'Tour not found' });
        }

        // Delete the tour from the database
        const result = await db.collection('tours').deleteOne({ _id: tourId });

        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Tour not found' });
        }

        console.log('Tour deleted successfully');
        res.json({
            success: true,
            message: 'Tour package deleted successfully',
            tourId: req.params.id
        });
    } catch (error) {
        console.error('Error deleting tour package:', error);
        res.status(500).json({
            error: 'Server error',
            details: error.message
        });
    }
});

module.exports = router;