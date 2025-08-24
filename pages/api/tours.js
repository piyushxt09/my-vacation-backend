import { getDBConnection } from './db';

export default async function handler(req, res) {
    try {
        const db = await getDBConnection(); 
        const [rows] = await db.query('SELECT * FROM tour_packages');
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching tour packages:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
