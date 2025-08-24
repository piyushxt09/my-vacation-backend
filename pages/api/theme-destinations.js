import { getDBConnection } from './db';

export default async function handler(req, res) {
    try {
        const db = await getDBConnection();
        const [rows] = await db.query(`
            SELECT tp.*
            FROM tour_packages tp
            INNER JOIN (
                SELECT theme_name, MIN(id) AS min_id
                FROM tour_packages
                GROUP BY theme_name
            ) grouped ON tp.id = grouped.min_id
            LIMIT 6
        `);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching theme destinations:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
