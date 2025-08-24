import fs from 'fs';
import path from 'path';
import { IncomingForm } from 'formidable';
import cloudinary from 'cloudinary';
import { getDBConnection } from '../../../connection/db';
import dotenv from 'dotenv';
dotenv.config();


export const config = {
    api: {
        bodyParser: false,
    },
};

// Cloudinary config
cloudinary.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const slugify = (text) =>
    text
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9 -]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');

export default async function handler(req, res) {
    const { id } = req.query;

    if (req.method === 'PUT') {
        try {
            const uploadDir = path.join('/tmp', 'galleryimg');
            fs.mkdirSync(uploadDir, { recursive: true });

            const form = new IncomingForm({
                uploadDir,
                keepExtensions: true,
                multiples: false,
            });

            form.parse(req, async (err, fields, files) => {
                if (err) {
                    console.error('Formidable parse error:', err);
                    return res.status(400).json({ error: 'Error parsing form data' });
                }

                const {
                    package_name,
                    tour_duration,
                    tour_destination,
                    tour_price,
                    inclusions,
                    exclusions,
                    indian,
                    international,
                    fixed_departure,
                    itinerary = '[]',
                } = fields;

                const url = slugify(package_name);
                const connection = await getDBConnection();

                let imageUrl = null;
                if (files.image && files.image.size > 0) {
                    // Upload to Cloudinary directly from /tmp
                    const uploadResult = await cloudinary.v2.uploader.upload(files.image.filepath, {
                        folder: 'tour_packages',
                        public_id: `tour_${Date.now()}`,
                        resource_type: 'image',
                    });

                    imageUrl = uploadResult.secure_url;
                }

                const updateFields = {
                    package_name,
                    url,
                    tour_duration,
                    tour_destination,
                    tour_price,
                    inclusions,
                    exclusions,
                    indian,
                    international,
                    fixed_departure,
                };

                if (imageUrl) {
                    updateFields.image = imageUrl;
                }

                const updateSet = Object.keys(updateFields)
                    .map((key) => `${key} = ?`)
                    .join(', ');

                const updateValues = [...Object.values(updateFields), id];

                await connection.execute(
                    `UPDATE tour_packages SET ${updateSet} WHERE id = ?`,
                    updateValues
                );

                // Delete old itinerary
                await connection.execute(
                    'DELETE FROM tour_itinerary WHERE tour_package_url = ?',
                    [url]
                );

                // Insert new itinerary
                const itineraryDays = JSON.parse(itinerary);
                for (const day of itineraryDays) {
                    const { day_number, title, description } = day;
                    await connection.execute(
                        `INSERT INTO tour_itinerary (tour_package_url, day_number, title, description)
                         VALUES (?, ?, ?, ?)`,
                        [url, day_number, title, description]
                    );
                }

                return res.status(200).json({ message: 'Tour updated successfully' });
            });
        } catch (error) {
            console.error('Error updating tour:', error);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    } else {
        return res.status(405).json({ error: 'Method not allowed' });
    }
}
