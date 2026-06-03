CREATE DATABASE IF NOT EXISTS timetable_db;
USE timetable_db;

CREATE TABLE IF NOT EXISTS timetable (
    id INT AUTO_INCREMENT PRIMARY KEY,
    day VARCHAR(20) NOT NULL,
    time_slot VARCHAR(50) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    teacher VARCHAR(100) NOT NULL,
    room VARCHAR(50) NOT NULL,
    class_name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sample data
INSERT INTO timetable (day, time_slot, subject, teacher, room, class_name) VALUES
('Monday', '09:00 - 10:00', 'Mathematics', 'Dr. Smith', 'Room 101', 'CS-A'),
('Monday', '10:00 - 11:00', 'Physics', 'Prof. Johnson', 'Room 102', 'CS-A'),
('Tuesday', '09:00 - 10:00', 'Chemistry', 'Dr. Brown', 'Lab 1', 'CS-A'),
('Wednesday', '11:00 - 12:00', 'English', 'Ms. Davis', 'Room 103', 'CS-A');