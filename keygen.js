const crypto = require('crypto');

// Charset excludes ambiguous characters: 0/O, 1/I/L
const CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function randomGroup(len) {
  let out = '';
  const bytes = crypto.randomBytes(len);
  for (let i = 0; i < len; i++) {
    out += CHARSET[bytes[i] % CHARSET.length];
  }
  return out;
}

/**
 * Generates a license key in the form CONFIG-XXXX-XXXX-XXXX
 * Uses crypto.randomBytes for cryptographically secure randomness.
 */
function generateLicenseKey() {
  return `CONFIG-${randomGroup(4)}-${randomGroup(4)}-${randomGroup(4)}`;
}

// Duration presets -> milliseconds. LIFETIME maps to null (no expiry).
const DURATION_MS = {
  '1_DAY': 24 * 60 * 60 * 1000,
  '7_DAYS': 7 * 24 * 60 * 60 * 1000,
  '30_DAYS': 30 * 24 * 60 * 60 * 1000,
  '90_DAYS': 90 * 24 * 60 * 60 * 1000,
  '365_DAYS': 365 * 24 * 60 * 60 * 1000,
  'LIFETIME': null,
};

function computeExpiresAt(duration) {
  if (!(duration in DURATION_MS)) {
    throw new Error(`Invalid duration: ${duration}`);
  }
  const ms = DURATION_MS[duration];
  if (ms === null) return null; // lifetime
  return new Date(Date.now() + ms).toISOString();
}

module.exports = { generateLicenseKey, computeExpiresAt, DURATION_MS };
