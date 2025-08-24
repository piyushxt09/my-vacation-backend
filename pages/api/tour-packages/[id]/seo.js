import { getDBConnection } from '../../db';

export default async function handler(req, res) {
    const { id } = req.query;

    if (req.method === 'PUT') {
        try {
            const { seo_title, seo_description, seo_keyword } = req.body;

            const connection = await getDBConnection();
            await connection.execute(
                `UPDATE tour_packages SET seo_title = ?, seo_description = ?, seo_keyword = ? WHERE id = ?`,
                [seo_title, seo_description, seo_keyword, id]
            );

            return res.status(200).json({ message: 'SEO updated successfully' });
        } catch (error) {
            console.error('Error updating SEO:', error);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    } else {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }
}
