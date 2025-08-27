const { getDBConnection } = require("../../connection/db");

module.exports = async function handler(req, res) {
    try {
        const db = await getDBConnection();
        const users = await db.collection("tours").find({}).toArray();

        res.status(200).json({ success: true, users });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
