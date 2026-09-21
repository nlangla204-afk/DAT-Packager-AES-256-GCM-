const db = require('../db');
const { generateLicenseKey, computeExpiresAt } = require('../utils/keygen');

/**
 * Computes the EFFECTIVE status of a license row.
 * DB only ever stores 'ACTIVE' or 'BANNED' explicitly.
 * 'EXPIRED' is derived at read-time from expires_at vs now.
 */
function effectiveStatus(row) {
  if (!row) return null;
  if (row.status === 'BANNED') return 'BANNED';
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
    return 'EXPIRED';
  }
  return 'ACTIVE';
}

function toPublicRow(row) {
  return {
    id: row.id,
    key: row.key,
    status: effectiveStatus(row),
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    lastUsedAt: row.last_used_at,
  };
}

function createLicense(duration) {
  const key = generateLicenseKey();
  const expiresAt = computeExpiresAt(duration);
  const createdAt = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO licenses (key, status, created_at, expires_at, last_used_at)
    VALUES (?, 'ACTIVE', ?, ?, NULL)
  `);
  const info = stmt.run(key, createdAt, expiresAt);

  return toPublicRow(getById(info.lastInsertRowid));
}

function getById(id) {
  return db.prepare('SELECT * FROM licenses WHERE id = ?').get(id);
}

function getByKey(key) {
  return db.prepare('SELECT * FROM licenses WHERE key = ?').get(key);
}

function listAll() {
  const rows = db.prepare('SELECT * FROM licenses ORDER BY id DESC').all();
  return rows.map(toPublicRow);
}

function getStats() {
  const rows = db.prepare('SELECT * FROM licenses').all();
  const stats = { total: rows.length, active: 0, expired: 0, banned: 0 };
  for (const row of rows) {
    const s = effectiveStatus(row);
    if (s === 'ACTIVE') stats.active++;
    else if (s === 'EXPIRED') stats.expired++;
    else if (s === 'BANNED') stats.banned++;
  }
  return stats;
}

function banLicense(id) {
  db.prepare(`UPDATE licenses SET status = 'BANNED' WHERE id = ?`).run(id);
  return toPublicRow(getById(id));
}

function unbanLicense(id) {
  db.prepare(`UPDATE licenses SET status = 'ACTIVE' WHERE id = ?`).run(id);
  return toPublicRow(getById(id));
}

function deleteLicense(id) {
  db.prepare('DELETE FROM licenses WHERE id = ?').run(id);
}

function extendLicense(id, duration) {
  const expiresAt = computeExpiresAt(duration);
  db.prepare('UPDATE licenses SET expires_at = ? WHERE id = ?').run(expiresAt, id);
  return toPublicRow(getById(id));
}

function touchLastUsed(id) {
  db.prepare('UPDATE licenses SET last_used_at = ? WHERE id = ?')
    .run(new Date().toISOString(), id);
}

module.exports = {
  effectiveStatus,
  toPublicRow,
  createLicense,
  getById,
  getByKey,
  listAll,
  getStats,
  banLicense,
  unbanLicense,
  deleteLicense,
  extendLicense,
  touchLastUsed,
};
