const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const db = new sqlite3.Database('timetable.db', (err) => {
    if (err) console.error('❌ DB Error:', err.message);
    else console.log('✅ Connected to SQLite database');
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS timetable (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        day TEXT NOT NULL,
        time_slot TEXT NOT NULL,
        subject TEXT NOT NULL,
        teacher TEXT NOT NULL,
        room TEXT NOT NULL,
        class_name TEXT NOT NULL
    )`, () => {
        console.log('✅ Table ready');
        db.get('SELECT COUNT(*) as count FROM timetable', (err, row) => {
            if (row && row.count === 0) {
                const samples = [
                    ['Monday', '09:00 - 10:00', 'Mathematics', 'Dr. Smith', 'Room 101', 'CS-A'],
                    ['Monday', '10:00 - 11:00', 'Physics', 'Prof. Johnson', 'Room 102', 'CS-A'],
                    ['Tuesday', '09:00 - 10:00', 'Chemistry', 'Dr. Brown', 'Lab 1', 'CS-A'],
                    ['Wednesday', '11:00 - 12:00', 'English', 'Ms. Davis', 'Room 103', 'CS-A'],
                    ['Thursday', '09:00 - 10:00', 'Computer Science', 'Mr. Lee', 'Lab 2', 'CS-B'],
                    ['Friday', '10:00 - 11:00', 'Biology', 'Dr. Wilson', 'Lab 3', 'CS-B']
                ];
                const stmt = db.prepare('INSERT INTO timetable (day, time_slot, subject, teacher, room, class_name) VALUES (?,?,?,?,?,?)');
                samples.forEach(s => stmt.run(...s));
                stmt.finalize();
                console.log('✅ Sample data inserted');
            }
        });
    });
});

const ORDER = `ORDER BY CASE day WHEN 'Monday' THEN 1 WHEN 'Tuesday' THEN 2 WHEN 'Wednesday' THEN 3 WHEN 'Thursday' THEN 4 WHEN 'Friday' THEN 5 WHEN 'Saturday' THEN 6 END, time_slot`;

app.get('/api/timetable', (req, res) => {
    db.all(`SELECT * FROM timetable ${ORDER}`, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/api/timetable/class/:className', (req, res) => {
    db.all(`SELECT * FROM timetable WHERE class_name = ? ${ORDER}`, [req.params.className], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/timetable', (req, res) => {
    const { day, time_slot, subject, teacher, room, class_name } = req.body;
    db.run('INSERT INTO timetable (day, time_slot, subject, teacher, room, class_name) VALUES (?,?,?,?,?,?)',
        [day, time_slot, subject, teacher, room, class_name], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, message: 'Added' });
    });
});

app.put('/api/timetable/:id', (req, res) => {
    const { day, time_slot, subject, teacher, room, class_name } = req.body;
    db.run('UPDATE timetable SET day=?, time_slot=?, subject=?, teacher=?, room=?, class_name=? WHERE id=?',
        [day, time_slot, subject, teacher, room, class_name, req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Updated' });
    });
});

app.delete('/api/timetable/:id', (req, res) => {
    db.run('DELETE FROM timetable WHERE id=?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Deleted' });
    });
});

app.get('/api/classes', (req, res) => {
    db.all('SELECT DISTINCT class_name FROM timetable ORDER BY class_name', (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows.map(r => r.class_name));
    });
});

app.get('/api/stats', (req, res) => {
    db.get(`SELECT COUNT(*) as total, COUNT(DISTINCT class_name) as classes, COUNT(DISTINCT teacher) as teachers, COUNT(DISTINCT subject) as subjects FROM timetable`, (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row);
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});