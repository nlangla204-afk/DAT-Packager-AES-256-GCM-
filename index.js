require('dotenv').config();

const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');

// Fail fast if critical secrets are missing/default
if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.includes('CHANGE_ME')) {
  console.error('❌ SESSION_SECRET is not set (or still the default). Edit your .env file.');
  process.exit(1);
}
if (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.includes('CHANGE_ME')) {
  console.error('❌ ADMIN_PASSWORD is not set (or still the default). Edit your .env file.');
  process.exit(1);
}

const { requireAdminPage } = require('./middleware/adminAuth');
const adminRoutes = require('./routes/adminRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// ============================================================
//  API ROUTES
// ============================================================
app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);

// ============================================================
//  ADMIN PANEL (separate area, admin-only)
// ============================================================
app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'admin', 'login.html'));
});

app.get('/admin/dashboard', requireAdminPage, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'admin', 'dashboard.html'));
});

app.get('/admin', (req, res) => res.redirect('/admin/login'));

// Static assets for the admin panel (css/js) live in admin/public — a
// SEPARATE folder from the gated HTML pages, so static serving can never
// expose dashboard.html directly and bypass requireAdminPage above.
app.use('/admin/assets', express.static(path.join(__dirname, '..', 'admin', 'public')));

// ============================================================
//  USER WEB APP (DAT Packager, gated by license verification)
// ============================================================
app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// ============================================================
//  START
// ============================================================
app.listen(PORT, () => {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║        CONFIG LICENSE SERVER — ONLINE         ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`  User Web:     http://localhost:${PORT}/`);
  console.log(`  Admin Login:  http://localhost:${PORT}/admin/login`);
  console.log(`  Database:     ${process.env.DATABASE_PATH || './database/license.db'}`);
});
