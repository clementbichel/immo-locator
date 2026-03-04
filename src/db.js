import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { logger } from './logger.js';

const BASE_DATA_DIR = path.resolve(process.cwd(), 'data');

function resolveDbPath(rawPath) {
  const resolved = path.resolve(rawPath);
  if (!resolved.startsWith(BASE_DATA_DIR + path.sep)) {
    throw new Error(`DB_PATH path traversal detected: ${rawPath}`);
  }
  return resolved;
}

const dbPath = resolveDbPath(process.env.DB_PATH ?? path.join(process.cwd(), 'data', 'searches.db'));

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS searches (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    ts         INTEGER NOT NULL,
    zipcode    TEXT,
    city       TEXT,
    dpe        TEXT,
    ges        TEXT,
    surface    REAL,
    date_diag  TEXT,
    conso_prim REAL,
    results_count INTEGER,
    duration_ms   INTEGER,
    status        TEXT
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS reports (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    ts         INTEGER NOT NULL,
    url        TEXT NOT NULL,
    surface    TEXT,
    terrain    TEXT,
    dpe        TEXT,
    ges        TEXT,
    date_diag  TEXT,
    conso_prim TEXT,
    conso_fin  TEXT,
    city       TEXT,
    zipcode    TEXT
  )
`);

const RETENTION_DAYS = 90;
const retentionMs = RETENTION_DAYS * 24 * 60 * 60 * 1000;
const deleted = db.prepare('DELETE FROM reports WHERE ts < ?').run(Date.now() - retentionMs);
if (deleted.changes > 0) {
  logger.info({ deleted: deleted.changes, retentionDays: RETENTION_DAYS }, 'Purged old reports');
}

logger.info({ dbPath }, 'SQLite database ready');

const insertSearch = db.prepare(`
  INSERT INTO searches (ts, zipcode, city, dpe, ges, surface, date_diag, conso_prim, results_count, duration_ms, status)
  VALUES (@ts, @zipcode, @city, @dpe, @ges, @surface, @date_diag, @conso_prim, @results_count, @duration_ms, @status)
`);

const insertReport = db.prepare(`
  INSERT INTO reports (ts, url, surface, terrain, dpe, ges, date_diag, conso_prim, conso_fin, city, zipcode)
  VALUES (@ts, @url, @surface, @terrain, @dpe, @ges, @date_diag, @conso_prim, @conso_fin, @city, @zipcode)
`);

export function recordReport({ url, surface, terrain, dpe, ges, date_diag, conso_prim, conso_fin, city, zipcode }) {
  insertReport.run({
    ts: Date.now(),
    url,
    surface: surface ?? null,
    terrain: terrain ?? null,
    dpe: dpe ?? null,
    ges: ges ?? null,
    date_diag: date_diag ?? null,
    conso_prim: conso_prim ?? null,
    conso_fin: conso_fin ?? null,
    city: city ?? null,
    zipcode: zipcode ?? null,
  });
}

export function recordSearch({ zipcode, city, dpe, ges, surface, date_diag, conso_prim, results_count, duration_ms, status }) {
  try {
    insertSearch.run({
      ts: Date.now(),
      zipcode: zipcode ?? null,
      city: city ?? null,
      dpe: dpe ?? null,
      ges: ges ?? null,
      surface: surface ?? null,
      date_diag: date_diag ?? null,
      conso_prim: conso_prim ?? null,
      results_count: results_count ?? null,
      duration_ms: duration_ms ?? null,
      status,
    });
  } catch (err) {
    logger.error({ err }, 'Failed to record search in DB');
  }
}
