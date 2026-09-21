const express = require('express');
const jwt = require('jsonwebtoken');
const License = require('../models/license');

const router = express.Router();
const USER_COOKIE = 'user_session';

// ---- POST /api/auth/verify ----
// The ONLY way a user gains access. Server is the sole source of truth —
// the frontend never holds or checks the key database itself.
router.post('/verify', (req, res) => {
  const { key } = req.body || {};

  if (!key || typeof key !== 'string') {
    return res.status(400).json({ success: false, message: 'Key is required' });
  }

  const row = License.getByKey(key.trim().toUpperCase());

  if (!row) {
    return res.json({ success: false, message: 'Invalid key' });
  }

  const status = License.effectiveStatus(row);

  if (status === 'BANNED') {
    return res.json({ success: false, message: 'Key banned' });
  }
  if (status === 'EXPIRED') {
    return res.json({ success: false, message: 'Key expired' });
  }

  // status === 'ACTIVE'
  License.touchLastUsed(row.id);

  const hours = Number(process.env.USER_SESSION_HOURS || 12);
  const token = jwt.sign({ role: 'user', licenseId: row.id }, process.env.SESSION_SECRET, {
    expiresIn: `${hours}h`,
  });

  res.cookie(USER_COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: hours * 60 * 60 * 1000,
  });

  res.json({ success: true, message: 'Key verified' });
});

// ---- GET /api/auth/session ----
// Lets the page check "am I already verified?" on reload, without
// re-exposing the key or the database to the client.
router.get('/session', (req, res) => {
  const token = req.cookies[USER_COOKIE];
  if (!token) return res.json({ valid: false });

  try {
    const payload = jwt.verify(token, process.env.SESSION_SECRET);
    if (payload.role !== 'user') return res.json({ valid: false });

    // Re-check DB in case the key was banned/deleted after the session was issued
    const row = License.getById(payload.licenseId);
    const status = License.effectiveStatus(row);
    if (!row || status !== 'ACTIVE') {
      res.clearCookie(USER_COOKIE);
      return res.json({ valid: false });
    }

    return res.json({ valid: true });
  } catch {
    res.clearCookie(USER_COOKIE);
    return res.json({ valid: false });
  }
});

// ---- POST /api/auth/logout ----
router.post('/logout', (req, res) => {
  res.clearCookie(USER_COOKIE);
  res.json({ success: true });
});

module.exports = router;
