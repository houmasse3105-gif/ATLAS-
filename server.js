/* ═══════════════════════════════════════════════════════
   Atlas Water Solutions — server.js v2
   Routes:
     /          → client/
     /admin     → admin/
     /api/...   → REST API
═══════════════════════════════════════════════════════ */

const express  = require('express');
const Database = require('better-sqlite3');
const path     = require('path');
const fs       = require('fs');

/* ── Load .env manually (no extra deps) ── */
const envFile = path.join(__dirname, '.env');
if (fs.existsSync(envFile)) {
  fs.readFileSync(envFile, 'utf8').split('\n').forEach(line => {
    const clean = line.trim();
    if (!clean || clean.startsWith('#')) return;
    const [k, ...v] = clean.split('=');
    if (k && v.length) process.env[k.trim()] = v.join('=').trim();
  });
}

const app  = express();
const PORT = process.env.PORT           || 3000;
const USER = process.env.ADMIN_USERNAME || 'admin';
const PASS = process.env.ADMIN_PASSWORD || 'atlas2025';

app.use(express.json());
app.use('/',      express.static(path.join(__dirname, 'client')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));

/* ── Database ── */
const db = new Database(path.join(__dirname, 'atlas.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS requests (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    request_code TEXT    UNIQUE NOT NULL,
    name         TEXT    NOT NULL,
    phone        TEXT    NOT NULL,
    service      TEXT    NOT NULL,
    note         TEXT    DEFAULT '',
    status       TEXT    DEFAULT 'new',
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS admins (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  );
`);

/* Seed default admin */
if (!db.prepare('SELECT id FROM admins WHERE username = ?').get(USER)) {
  db.prepare('INSERT INTO admins (username, password) VALUES (?,?)').run(USER, PASS);
  console.log(`✅ Admin created → ${USER}`);
}

/* ── Helper: generate ATX code ── */
function genCode() {
  const n = Math.floor(10000 + Math.random() * 90000);
  return `ATX-${n}`;
}

/* ══════════════════════════════════════════════════════
   PUBLIC API
══════════════════════════════════════════════════════ */

/* Submit new booking */
app.post('/api/requests', (req, res) => {
  const { name, phone, service, note } = req.body;
  if (!name?.trim() || !phone?.trim() || !service?.trim())
    return res.status(400).json({ error: 'name, phone, service are required' });

  let code, attempts = 0;
  do { code = genCode(); attempts++; } while (
    db.prepare('SELECT id FROM requests WHERE request_code = ?').get(code) && attempts < 10
  );

  const r = db.prepare(
    'INSERT INTO requests (request_code,name,phone,service,note) VALUES (?,?,?,?,?)'
  ).run(code, name.trim(), phone.trim(), service.trim(), (note || '').trim());

  res.json({ success: true, request_code: code, id: r.lastInsertRowid });
});

/* Track a request by code */
app.get('/api/track/:code', (req, res) => {
  const row = db.prepare('SELECT request_code,name,service,status,created_at FROM requests WHERE request_code = ?')
                .get(req.params.code.toUpperCase());
  if (!row) return res.status(404).json({ error: 'Request not found' });
  res.json({ success: true, request: row });
});

/* ══════════════════════════════════════════════════════
   ADMIN API
══════════════════════════════════════════════════════ */

app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  const admin = db.prepare('SELECT * FROM admins WHERE username=? AND password=?').get(username, password);
  if (!admin) return res.status(401).json({ error: 'Invalid credentials' });
  res.json({ success: true, username });
});

app.get('/api/admin/requests', (req, res) => {
  const { status, q } = req.query;
  const conds = [], params = [];
  if (status && status !== 'all') { conds.push('status = ?'); params.push(status); }
  if (q?.trim()) {
    conds.push('(name LIKE ? OR phone LIKE ? OR request_code LIKE ?)');
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  const where = conds.length ? ' WHERE ' + conds.join(' AND ') : '';
  const rows  = db.prepare(`SELECT * FROM requests${where} ORDER BY created_at DESC`).all(...params);
  res.json({ success: true, requests: rows, total: rows.length });
});

app.get('/api/admin/stats', (req, res) => {
  const c = s => db.prepare(`SELECT COUNT(*) c FROM requests${s ? ` WHERE status='${s}'` : ''}`).get().c;
  res.json({ success: true, stats: { total: c(''), new: c('new'), in_progress: c('in_progress'), done: c('done') } });
});

app.patch('/api/admin/requests/:id', (req, res) => {
  const { status } = req.body;
  if (!['new','in_progress','done','cancelled'].includes(status))
    return res.status(400).json({ error: 'Invalid status' });
  db.prepare('UPDATE requests SET status=? WHERE id=?').run(status, req.params.id);
  res.json({ success: true });
});

app.delete('/api/admin/requests/:id', (req, res) => {
  db.prepare('DELETE FROM requests WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Client  → http://localhost:${PORT}`);
  console.log(`📊 Admin   → http://localhost:${PORT}/admin\n`);
});
const express = require('express');
const path = require('path');
const app = express();

// 1. إخبار السيرفر بمكان الملفات الثابتة (HTML, CSS, JS)
// إذا كانت ملفاتك في المجلد الرئيسي مباشرة، اتركها هكذا:
app.use(express.static(__dirname));

// 2. توجيه المسار الرئيسي "/" لفتح ملف index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 3. تأكد من استخدام المنفذ الذي يوفره Railway
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});