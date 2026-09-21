const jwt = require('jsonwebtoken');

const COOKIE_NAME = 'admin_session';

function verifyAdminToken(token) {
  try {
    const payload = jwt.verify(token, process.env.SESSION_SECRET);
    return payload && payload.role === 'admin';
  } catch {
    return false;
  }
}

/**
 * Protects JSON API routes: /api/admin/*
 * Responds 401 JSON if not authenticated (never redirects an API call).
 */
function requireAdminApi(req, res, next) {
  const token = req.cookies[COOKIE_NAME];
  if (!token || !verifyAdminToken(token)) {
    return res.status(401).json({ success: false, message: 'Admin authentication required' });
  }
  next();
}

/**
 * Protects HTML admin pages, e.g. /admin/dashboard
 * Redirects to /admin/login if not authenticated.
 */
function requireAdminPage(req, res, next) {
  const token = req.cookies[COOKIE_NAME];
  if (!token || !verifyAdminToken(token)) {
    return res.redirect('/admin/login');
  }
  next();
}

module.exports = { requireAdminApi, requireAdminPage, COOKIE_NAME };
