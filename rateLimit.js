// Lightweight in-memory rate limiter (no external dependency).
// Good enough for a single-instance admin login endpoint.

const attempts = new Map(); // ip -> { count, firstAttemptAt }

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 10;

function loginRateLimit(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const record = attempts.get(ip);

  if (!record || now - record.firstAttemptAt > WINDOW_MS) {
    attempts.set(ip, { count: 1, firstAttemptAt: now });
    return next();
  }

  if (record.count >= MAX_ATTEMPTS) {
    const retryAfterSec = Math.ceil((WINDOW_MS - (now - record.firstAttemptAt)) / 1000);
    res.set('Retry-After', String(retryAfterSec));
    return res.status(429).json({
      success: false,
      message: 'Too many login attempts. Please try again later.',
    });
  }

  record.count++;
  next();
}

module.exports = { loginRateLimit };
