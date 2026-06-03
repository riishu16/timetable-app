const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// PostgreSQL connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// ===== ADMIN AUTHENTICATION =====
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const validTokens = new Set();

function generateToken() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function requireAdmin(req, res, next) {
    const token = req.headers['authorization'];
    if (token && validTokens.has(token)) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized. Admin login required.' });
    }
}

// ===== DATABASE SETUP =====
async function initDB() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS timetable (
                id SERIAL PRIMARY KEY,
                day VARCHAR(20) NOT NULL,
                time_slot VARCHAR(50) NOT NULL,
                subject VARCHAR(100) NOT NULL,
                teacher VARCHAR(100) NOT NULL,
                room VARCHAR(50) NOT NULL,
                class_name VARCHAR(50) NOT NULL
            )
        `);
        console.log('✅ Table ready');

        const result = await pool.query('SELECT COUNT(*) FROM timetable');
        if (parseInt(result.rows[0].count) === 0) {
            const samples = [
                ['Monday', '09:00 AM - 10:00 AM', 'Mathematics', 'Dr. Smith', 'Room 101', 'CS-A'],
                ['Monday', '10:00 AM - 11:00 AM', 'Physics', 'Prof. Johnson', 'Room 102', 'CS-A'],
                ['Tuesday', '09:00 AM - 10:00 AM', 'Chemistry', 'Dr. Brown', 'Lab 1', 'CS-A'],
                ['Wednesday', '11:00 AM - 12:00 PM', 'English', 'Ms. Davis', 'Room 103', 'CS-A'],
                ['Thursday', '09:00 AM - 10:00 AM', 'Computer Science', 'Mr. Lee', 'Lab 2', 'CS-B'],
                ['Friday', '10:00 AM - 11:00 AM', 'Biology', 'Dr. Wilson', 'Lab 3', 'CS-B']
            ];
            for (const s of samples) {
                await pool.query('INSERT INTO timetable (day, time_slot, subject, teacher, room, class_name) VALUES ($1,$2,$3,$4,$5,$6)', s);
            }
            console.log('✅ Sample data inserted');
        }
    } catch (err) {
        console.error('❌ DB Error:', err.message);
    }
}

const ORDER = `ORDER BY CASE day WHEN 'Monday' THEN 1 WHEN 'Tuesday' THEN 2 WHEN 'Wednesday' THEN 3 WHEN 'Thursday' THEN 4 WHEN 'Friday' THEN 5 WHEN 'Saturday' THEN 6 END, time_slot`;

// ===== AUTH ROUTES =====
app.post('/api/login', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        const token = generateToken();
        validTokens.add(token);
        res.json({ success: true, token });
    } else {
        res.status(401).json({ success: false, error: 'Wrong password' });
    }
});

app.post('/api/logout', (req, res) => {
    const token = req.headers['authorization'];
    validTokens.delete(token);
    res.json({ success: true });
});

// ===== PUBLIC ROUTES (everyone can view) =====
app.get('/api/timetable', async (req, res) => {
    try {
        const result = await pool.query(`SELECT * FROM timetable ${ORDER}`);
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/timetable/class/:className', async (req, res) => {
    try {
        const result = await pool.query(`SELECT * FROM timetable WHERE class_name = $1 ${ORDER}`, [req.params.className]);
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/classes', async (req, res) => {
    try {
        const result = await pool.query('SELECT DISTINCT class_name FROM timetable ORDER BY class_name');
        res.json(result.rows.map(r => r.class_name));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/stats', async (req, res) => {
    try {
        const result = await pool.query(`SELECT COUNT(*) as total, COUNT(DISTINCT class_name) as classes, COUNT(DISTINCT teacher) as teachers, COUNT(DISTINCT subject) as subjects FROM timetable`);
        res.json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ===== PROTECTED ROUTES (only admin) =====
app.post('/api/timetable', requireAdmin, async (req, res) => {
    try {
        const { day, time_slot, subject, teacher, room, class_name } = req.body;
        const result = await pool.query(
            'INSERT INTO timetable (day, time_slot, subject, teacher, room, class_name) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
            [day, time_slot, subject, teacher, room, class_name]
        );
        res.json({ id: result.rows[0].id, message: 'Added' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/timetable/:id', requireAdmin, async (req, res) => {
    try {
        const { day, time_slot, subject, teacher, room, class_name } = req.body;
        await pool.query(
            'UPDATE timetable SET day=$1, time_slot=$2, subject=$3, teacher=$4, room=$5, class_name=$6 WHERE id=$7',
            [day, time_slot, subject, teacher, room, class_name, req.params.id]
        );
        res.json({ message: 'Updated' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/timetable/:id', requireAdmin, async (req, res) => {
    try {
        await pool.query('DELETE FROM timetable WHERE id=$1', [req.params.id]);
        res.json({ message: 'Deleted' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ===== START SERVER =====
initDB().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
    });
});