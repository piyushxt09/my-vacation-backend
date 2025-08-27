const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const connectDB = require("../connection/db");

// ✅ Helper: validate ObjectId safely
const isValidObjectId = (id) => {
  try {
    return ObjectId.isValid(id) && String(new ObjectId(id)) === id;
  } catch {
    return false;
  }
};


router.get('/tour-packages-seo/:id', async (req, res) => {
  const { id } = req.params;

  try {
    console.log('GET request received for tour ID:', id);

    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid tour ID format' });
    }

    const db = await connectDB();
    const tour = await db.collection('tours').findOne({ _id: new ObjectId(id) });

    if (!tour) {
      return res.status(404).json({ error: 'Tour not found' });
    }

    res.json({ success: true, tour });
  } catch (error) {
    console.error('Error fetching tour:', error);
    res.status(500).json({
      error: 'Server error',
      details: error.message,
    });
  }
});


router.put('/tour-packages-seo/:id', async (req, res) => {
  const { id } = req.params;
  const { seo_title, seo_description, seo_keyword } = req.body;

  try {
    console.log('PUT request received for tour SEO ID:', id);

    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid tour ID format' });
    }

    if (!seo_title && !seo_description && !seo_keyword) {
      return res.status(400).json({ error: 'At least one SEO field must be provided' });
    }

    const db = await connectDB();
    const tourId = new ObjectId(id);

    const existingTour = await db.collection('tours').findOne({ _id: tourId });
    if (!existingTour) {
      return res.status(404).json({ error: 'Tour not found' });
    }

    // Build update object only with provided fields
    const updateData = { updatedAt: new Date() };
    if (seo_title !== undefined) updateData.seo_title = seo_title;
    if (seo_description !== undefined) updateData.seo_description = seo_description;
    if (seo_keyword !== undefined) updateData.seo_keyword = seo_keyword;

    const result = await db.collection('tours').updateOne(
      { _id: tourId },
      { $set: updateData }
    );

    if (result.modifiedCount === 0) {
      return res.status(304).json({ message: 'No changes applied' });
    }

    res.json({
      success: true,
      message: 'SEO details updated successfully',
      tourId: id,
      updatedFields: updateData,
    });
  } catch (error) {
    console.error('Error updating SEO details:', error);
    res.status(500).json({
      error: 'Server error',
      details: error.message,
    });
  }
});

module.exports = router;
