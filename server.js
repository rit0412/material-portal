const express = require('express');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Create uploads directory
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Database setup
const db = new sqlite3.Database(path.join(__dirname, 'materials.db'));

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS materials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL,
        originalName TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        category TEXT,
        fileSize INTEGER,
        downloadCount INTEGER DEFAULT 0,
        uploadDate DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'));
        }
    }
});

// Admin password (change this!)
const ADMIN_PASSWORD = 'admin123';

// Routes

// Get all materials (public)
app.get('/api/materials', (req, res) => {
    const { category, search } = req.query;
    let query = 'SELECT * FROM materials';
    let params = [];
    let conditions = [];

    if (category && category !== 'all') {
        conditions.push('category = ?');
        params.push(category);
    }

    if (search) {
        conditions.push('(title LIKE ? OR description LIKE ?)');
        params.push(`%${search}%`, `%${search}%`);
    }

    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY uploadDate DESC';

    db.all(query, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Get categories (public)
app.get('/api/categories', (req, res) => {
    db.all('SELECT DISTINCT category FROM materials WHERE category IS NOT NULL', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows.map(row => row.category));
    });
});

// Upload material (admin only)
app.post('/api/upload', (req, res) => {
    const { password } = req.body;
    if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Invalid password' });
    }
    
    upload.single('file')(req, res, (err) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { title, description, category } = req.body;

        db.run(
            `INSERT INTO materials (filename, originalName, title, description, category, fileSize) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [req.file.filename, req.file.originalname, title || req.file.originalname, description, category, req.file.size],
            function(err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                res.json({ 
                    success: true, 
                    id: this.lastID,
                    message: 'File uploaded successfully' 
                });
            }
        );
    });
});

// Download material (public)
app.get('/api/download/:id', (req, res) => {
    const { id } = req.params;

    db.get('SELECT * FROM materials WHERE id = ?', [id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: 'File not found' });
        }

        const filePath = path.join(uploadsDir, row.filename);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found on disk' });
        }

        // Update download count
        db.run('UPDATE materials SET downloadCount = downloadCount + 1 WHERE id = ?', [id]);

        res.download(filePath, row.originalName);
    });
});

// Delete material (admin only)
app.delete('/api/materials/:id', (req, res) => {
    const { id } = req.params;
    const { password } = req.body;

    if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Invalid password' });
    }

    db.get('SELECT * FROM materials WHERE id = ?', [id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: 'File not found' });
        }

        const filePath = path.join(uploadsDir, row.filename);
        
        // Delete from database
        db.run('DELETE FROM materials WHERE id = ?', [id], (err) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            // Delete file from disk
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
            
            res.json({ success: true, message: 'File deleted successfully' });
        });
    });
});

// Stats (admin only)
app.get('/api/stats', (req, res) => {
    const { password } = req.query;
    if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Invalid password' });
    }

    db.get('SELECT COUNT(*) as totalFiles, SUM(downloadCount) as totalDownloads FROM materials', [], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(row);
    });
});

// Default route - serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Admin route
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Material Portal running on port ${PORT}`);
    console.log(`Public page: http://localhost:${PORT}/`);
    console.log(`Admin panel: http://localhost:${PORT}/admin`);
});
