// pages/api/indian-tours.js
import { getDBConnection } from './db';

export default async function handler(req, res) {
    try {
        const db = await getDBConnection();
        const [rows] = await db.query(
            "SELECT * FROM tour_packages WHERE fixed_departure = 'yes' LIMIT 4"
        );
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching Indian tour packages:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
