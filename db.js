const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DATABASE_PATH || './database/license.db';

// Ensure the containing directory exists (server creates DB on first run)
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS licenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE',      -- ACTIVE | BANNED  (EXPIRED is derived from expires_at)
    created_at TEXT NOT NULL,
    expires_at TEXT,                             -- NULL = lifetime
    last_used_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_licenses_key ON licenses(key);
`);

module.exports = db;
