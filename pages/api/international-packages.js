import { getDBConnection } from './db';

export default async function handler(req, res) {
    try {
         const db = await getDBConnection();

        const [tourPackages] = await db.query(
            `SELECT * FROM tour_packages WHERE international = "yes"`
        );

        res.status(200).json(tourPackages);
    } catch (error) {
        console.error('Error fetching India holidays tour packages:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
