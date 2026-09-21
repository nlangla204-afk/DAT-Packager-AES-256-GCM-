const express = require('express');
const jwt = require('jsonwebtoken');
const License = require('../models/license');
const { requireAdminApi, COOKIE_NAME } = require('../middleware/adminAuth');
const { loginRateLimit } = require('../middleware/rateLimit');
const { DURATION_MS } = require('../utils/keygen');

const router = express.Router();

// ---- POST /api/admin/login ----
router.post('/login', loginRateLimit, (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password required' });
  }

  const validUser = username === process.env.ADMIN_USERNAME;
  const validPass = password === process.env.ADMIN_PASSWORD;

  if (!validUser || !validPass) {
    return res.status(401).json({ success: false, message: 'Invalid admin credentials' });
  }

  const hours = Number(process.env.ADMIN_SESSION_HOURS || 8);
  const token = jwt.sign({ role: 'admin' }, process.env.SESSION_SECRET, {
    expiresIn: `${hours}h`,
  });

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: hours * 60 * 60 * 1000,
  });

  res.json({ success: true, message: 'Logged in' });
});

// ---- POST /api/admin/logout ----
router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.json({ success: true });
});

// Everything below requires a valid admin session
router.use(requireAdminApi);

// ---- GET /api/admin/keys ----
router.get('/keys', (req, res) => {
  res.json({
    success: true,
    stats: License.getStats(),
    keys: License.listAll(),
  });
});

// ---- POST /api/admin/keys/create ----
router.post('/keys/create', (req, res) => {
  const { duration } = req.body || {};
  if (!duration || !(duration in DURATION_MS)) {
    return res.status(400).json({
      success: false,
      message: `Invalid duration. Must be one of: ${Object.keys(DURATION_MS).join(', ')}`,
    });
  }
  const license = License.createLicense(duration);
  res.json({ success: true, license });
});

// ---- POST /api/admin/keys/ban ----
router.post('/keys/ban', (req, res) => {
  const { id } = req.body || {};
  if (!id) return res.status(400).json({ success: false, message: 'id required' });
  if (!License.getById(id)) return res.status(404).json({ success: false, message: 'Key not found' });
  res.json({ success: true, license: License.banLicense(id) });
});

// ---- POST /api/admin/keys/unban ----
router.post('/keys/unban', (req, res) => {
  const { id } = req.body || {};
  if (!id) return res.status(400).json({ success: false, message: 'id required' });
  if (!License.getById(id)) return res.status(404).json({ success: false, message: 'Key not found' });
  res.json({ success: true, license: License.unbanLicense(id) });
});

// ---- POST /api/admin/keys/delete ----
router.post('/keys/delete', (req, res) => {
  const { id } = req.body || {};
  if (!id) return res.status(400).json({ success: false, message: 'id required' });
  if (!License.getById(id)) return res.status(404).json({ success: false, message: 'Key not found' });
  License.deleteLicense(id);
  res.json({ success: true });
});

// ---- POST /api/admin/keys/extend ----
router.post('/keys/extend', (req, res) => {
  const { id, duration } = req.body || {};
  if (!id || !duration || !(duration in DURATION_MS)) {
    return res.status(400).json({ success: false, message: 'id and valid duration required' });
  }
  if (!License.getById(id)) return res.status(404).json({ success: false, message: 'Key not found' });
  res.json({ success: true, license: License.extendLicense(id, duration) });
});

module.exports = router;
