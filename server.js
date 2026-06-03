const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Create/connect to SQLite database file (auto-created, no setup!)
const db = new Database('timetable.db');
console.log('✅ Connected to SQLite database');

// Create table
db.exec(`
    CREATE TABLE IF NOT EXISTS timetable (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        day TEXT NOT NULL,
        time_slot TEXT NOT NULL,
        subject TEXT NOT NULL,
        teacher TEXT NOT NULL,
        room TEXT NOT NULL,
        class_name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);
console.log('✅ Table ready');

// Insert sample data if empty
const count = db.prepare('SELECT COUNT(*) as count FROM timetable').get();
if (count.count === 0) {
    const insert = db.prepare('INSERT INTO timetable (day, time_slot, subject, teacher, room, class_name) VALUES (?,?,?,?,?,?)');
    const samples = [
        ['Monday', '09:00 - 10:00', 'Mathematics', 'Dr. Smith', 'Room 101', 'CS-A'],
        ['Monday', '10:00 - 11:00', 'Physics', 'Prof. Johnson', 'Room 102', 'CS-A'],
        ['Tuesday', '09:00 - 10:00', 'Chemistry', 'Dr. Brown', 'Lab 1', 'CS-A'],
        ['Wednesday', '11:00 - 12:00', 'English', 'Ms. Davis', 'Room 103', 'CS-A'],
        ['Thursday', '09:00 - 10:00', 'Computer Science', 'Mr. Lee', 'Lab 2', 'CS-B'],
        ['Friday', '10:00 - 11:00', 'Biology', 'Dr. Wilson', 'Lab 3', 'CS-B']
    ];
    samples.forEach(s => insert.run(...s));
    console.log('✅ Sample data inserted');
}

// Helper to sort by day order
const DAY_ORDER = `CASE day 
    WHEN 'Monday' THEN 1 WHEN 'Tuesday' THEN 2 WHEN 'Wednesday' THEN 3 
    WHEN 'Thursday' THEN 4 WHEN 'Friday' THEN 5 WHEN 'Saturday' THEN 6 END`;

// ===== API ROUTES =====

app.get('/api/timetable', (req, res) => {
    try {
        const rows = db.prepare(`SELECT * FROM timetable ORDER BY ${DAY_ORDER}, time_slot`).all();
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/timetable/class/:className', (req, res) => {
    try {
        const rows = db.prepare(`SELECT * FROM timetable WHERE class_name = ? ORDER BY ${DAY_ORDER}, time_slot`).all(req.params.className);
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/timetable', (req, res) => {
    try {
        const { day, time_slot, subject, teacher, room, class_name } = req.body;
        const result = db.prepare('INSERT INTO timetable (day, time_slot, subject, teacher, room, class_name) VALUES (?,?,?,?,?,?)')
            .run(day, time_slot, subject, teacher, room, class_name);
        res.json({ id: result.lastInsertRowid, message: 'Added successfully' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/timetable/:id', (req, res) => {
    try {
        const { day, time_slot, subject, teacher, room, class_name } = req.body;
        db.prepare('UPDATE timetable SET day=?, time_slot=?, subject=?, teacher=?, room=?, class_name=? WHERE id=?')
            .run(day, time_slot, subject, teacher, room, class_name, req.params.id);
        res.json({ message: 'Updated successfully' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/timetable/:id', (req, res) => {
    try {
        db.prepare('DELETE FROM timetable WHERE id=?').run(req.params.id);
        res.json({ message: 'Deleted successfully' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/classes', (req, res) => {
    try {
        const rows = db.prepare('SELECT DISTINCT class_name FROM timetable ORDER BY class_name').all();
        res.json(rows.map(r => r.class_name));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/stats', (req, res) => {
    try {
        const stats = db.prepare(`SELECT 
            COUNT(*) as total, 
            COUNT(DISTINCT class_name) as classes, 
            COUNT(DISTINCT teacher) as teachers, 
            COUNT(DISTINCT subject) as subjects 
            FROM timetable`).get();
        res.json(stats);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.listen(PORT, () => {
    console.log(`\n🚀 Server running at http://localhost:${PORT}\n`);
});