import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// --- Database Configuration ---
const dbConfig = {
    host: 'localhost',
    user: 'root', // Replace with your MySQL username
    password: '', // Replace with your MySQL password
    database: 'campus_companion_db' // Updated database name
};

let db;

async function connectToDatabase() {
    try {
        db = await mysql.createConnection(dbConfig);
        console.log('✅ Successfully connected to MySQL database.');
    } catch (error) {
        console.error('❌ Error connecting to MySQL:', error);
        // Exit the process if the database connection fails
        process.exit(1);
    }
}

// --- API Endpoints ---

// GET /schedule?year=1&section=A
app.get('/schedule', async (req, res) => {
    const { year, section } = req.query;

    if (!year || !section) {
        return res.status(400).json({ error: 'Year and section are required query parameters.' });
    }

    try {
        const [rows] = await db.execute(
            'SELECT * FROM unified_schedules WHERE year = ? AND section = ?',
            [year, section]
        );
        res.json(rows);
    } catch (error) {
        console.error('Error fetching schedule:', error);
        res.status(500).json({ error: 'Failed to fetch schedule data.' });
    }
});

// POST /schedule
app.post('/schedule', async (req, res) => {
    const classData = req.body;

    // Basic validation
    if (!classData.subject || !classData.startTime || !classData.endTime) {
        return res.status(400).json({ error: 'Missing required class data fields.' });
    }

    try {
        const [result] = await db.execute(
            `INSERT INTO unified_schedules (id, year, section, date, day, subject, faculty, startTime, endTime, startHour, endHour, createdAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                classData.id,
                classData.year,
                classData.section,
                classData.date,
                classData.day,
                classData.subject,
                classData.faculty,
                classData.startTime,
                classData.endTime,
                classData.startHour,
                classData.endHour,
                classData.createdAt
            ]
        );
        res.status(201).json({ message: 'Class created successfully', id: result.insertId });
    } catch (error) {
        console.error('Error creating class:', error);
        res.status(500).json({ error: 'Failed to create class.' });
    }
});

// PUT /schedule/:id
app.put('/schedule/:id', async (req, res) => {
    const { id } = req.params;
    const classData = req.body;

    try {
        await db.execute(
            `UPDATE unified_schedules 
             SET subject = ?, faculty = ?, startTime = ?, endTime = ?
             WHERE id = ?`,
            [classData.subject, classData.faculty, classData.startTime, classData.endTime, id]
        );
        res.json({ message: 'Class updated successfully' });
    } catch (error) {
        console.error('Error updating class:', error);
        res.status(500).json({ error: 'Failed to update class.' });
    }
});

// DELETE /schedule/:id
app.delete('/schedule/:id', async (req, res) => {
    const { id } = req.params;

    try {
        await db.execute('DELETE FROM unified_schedules WHERE id = ?', [id]);
        res.json({ message: 'Class deleted successfully' });
    } catch (error) {
        console.error('Error deleting class:', error);
        res.status(500).json({ error: 'Failed to delete class.' });
    }
});

// --- Events API ---
app.get('/events', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM events ORDER BY date');
        res.json(rows);
    } catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).json({ error: 'Failed to fetch events.' });
    }
});

// --- Bus Routes API ---
app.get('/bus-routes', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM bus_routes ORDER BY departureTime');
        res.json(rows);
    } catch (error) {
        console.error('Error fetching bus routes:', error);
        res.status(500).json({ error: 'Failed to fetch bus routes.' });
    }
});

// --- Resources API ---
app.get('/resources', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM campus_resources ORDER BY name');
        res.json(rows);
    } catch (error) {
        console.error('Error fetching resources:', error);
        res.status(500).json({ error: 'Failed to fetch resources.' });
    }
});

// --- Server Start ---
app.listen(port, async () => {
    await connectToDatabase();
    console.log(`🚀 Server running at http://localhost:${port}`);
});
