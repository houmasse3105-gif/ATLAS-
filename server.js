/* ═══════════════════════════════════════════════════════
   Atlas Water Solutions — server.js (FIXED VERSION)
   ═══════════════════════════════════════════════════════ */

const express  = require('express');
const Database = require('better-sqlite3');
const path     = require('path');
const fs       = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// 1. إخبار السيرفر أن الملفات أصبحت في المجلد الرئيسي (Root)
app.use(express.static(__dirname));

// 2. المسار الرئيسي لفتح الصفحة
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

/* ── Database Logic ── */
const db = new Database(path.join(__dirname, 'atlas.db'));
db.exec(`
  CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    service TEXT NOT NULL,
    status TEXT DEFAULT 'new',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

/* ── API Routes ── */
app.post('/api/requests', (req, res) => {
  const { name, phone, service } = req.body;
  const code = `ATX-${Math.floor(10000 + Math.random() * 90000)}`;
  try {
    db.prepare('INSERT INTO requests (request_code, name, phone, service) VALUES (?,?,?,?)').run(code, name, phone, service);
    res.json({ success: true, request_code: code });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server is live on port ${PORT}`);
});