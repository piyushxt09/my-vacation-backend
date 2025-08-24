import fs from 'fs';
import path from 'path';
import { IncomingForm } from 'formidable';
import cloudinary from 'cloudinary';
import { getDBConnection } from '../../connection/db';
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
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Use /tmp instead of public (Vercel writable dir)
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
                theme,
                inclusions,
                exclusions,
                indian = 'No',
                international = 'No',
                fixed_departure = 'No',
                itinerary = '[]', // JSON string of itinerary days
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

            // 1. Insert into `tour_packages`
            const sql = `
                INSERT INTO tour_packages (
                    package_name, url, tour_duration, tour_destination, tour_price,
                    theme_name, inclusions, exclusions,
                    indian, international, fixed_departure,
                    image
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const values = [
                package_name,
                url,
                tour_duration,
                tour_destination,
                tour_price,
                theme,
                inclusions,
                exclusions,
                indian,
                international,
                fixed_departure,
                imageUrl, // Store Cloudinary URL
            ];

            await connection.execute(sql, values);

            const itineraryData = JSON.parse(itinerary);
            const itinerarySql = `
                INSERT INTO tour_itinerary (tour_package_url, day_number, title, description)
                VALUES (?, ?, ?, ?)
            `;

            for (let i = 0; i < itineraryData.length; i++) {
                const { title, description } = itineraryData[i];
                await connection.execute(itinerarySql, [url, i + 1, title, description]);
            }

            return res.status(200).json({ success: true, message: 'Tour added successfully' });
        });
    } catch (error) {
        console.error('Error adding tour:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
