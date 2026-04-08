import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { logger } from './logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_DATA_DIR = path.resolve(__dirname, '..', 'data');

function resolveDbPath(rawPath) {
  const resolved = path.resolve(rawPath);
  if (!resolved.startsWith(BASE_DATA_DIR + path.sep)) {
    throw new Error(`DB_PATH path traversal detected: ${rawPath}`);
  }
  return resolved;
}

const dbPath = resolveDbPath(process.env.DB_PATH ?? path.join(BASE_DATA_DIR, 'searches.db'));

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
for (const table of ['reports', 'searches']) {
  const deleted = db.prepare(`DELETE FROM ${table} WHERE ts < ?`).run(Date.now() - retentionMs);
  if (deleted.changes > 0) {
    logger.info(
      { table, deleted: deleted.changes, retentionDays: RETENTION_DAYS },
      'Purged old rows'
    );
  }
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

export function recordReport({
  url,
  surface,
  terrain,
  dpe,
  ges,
  date_diag,
  conso_prim,
  conso_fin,
  city,
  zipcode,
}) {
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

// --- Admin read functions ---

function buildWhereClause(filters, table) {
  const conditions = [];
  const params = [];

  if (filters.from !== undefined) {
    conditions.push('ts >= ?');
    params.push(filters.from);
  }
  if (filters.to !== undefined) {
    conditions.push('ts <= ?');
    params.push(filters.to);
  }
  if (table === 'searches' && filters.status) {
    conditions.push('status = ?');
    params.push(filters.status);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return { where, params };
}

export function getSearchStats() {
  const now = Date.now();
  const startOfToday = new Date().setHours(0, 0, 0, 0);
  const last7d = now - 7 * 24 * 60 * 60 * 1000;
  const last30d = now - 30 * 24 * 60 * 60 * 1000;

  const counts = db
    .prepare(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN ts >= ? THEN 1 ELSE 0 END) as today,
        SUM(CASE WHEN ts >= ? THEN 1 ELSE 0 END) as last7d,
        SUM(CASE WHEN ts >= ? THEN 1 ELSE 0 END) as last30d,
        AVG(duration_ms) as avgDurationMs
      FROM searches`
    )
    .get(startOfToday, last7d, last30d);

  const byStatus = {};
  for (const row of db
    .prepare('SELECT status, COUNT(*) as count FROM searches GROUP BY status')
    .all()) {
    byStatus[row.status] = row.count;
  }

  const byDpe = {};
  for (const row of db
    .prepare(
      'SELECT dpe, COUNT(*) as count FROM searches WHERE dpe IS NOT NULL GROUP BY dpe ORDER BY dpe'
    )
    .all()) {
    byDpe[row.dpe] = row.count;
  }

  const topCities = db
    .prepare(
      'SELECT city, COUNT(*) as count FROM searches WHERE city IS NOT NULL GROUP BY city ORDER BY count DESC LIMIT 10'
    )
    .all();

  return {
    total: counts.total,
    today: counts.today,
    last7d: counts.last7d,
    last30d: counts.last30d,
    avgDurationMs: Math.round(counts.avgDurationMs ?? 0),
    byStatus,
    byDpe,
    topCities,
  };
}

export function getReportStats() {
  const now = Date.now();
  const startOfToday = new Date().setHours(0, 0, 0, 0);
  const last7d = now - 7 * 24 * 60 * 60 * 1000;
  const last30d = now - 30 * 24 * 60 * 60 * 1000;

  const counts = db
    .prepare(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN ts >= ? THEN 1 ELSE 0 END) as today,
        SUM(CASE WHEN ts >= ? THEN 1 ELSE 0 END) as last7d,
        SUM(CASE WHEN ts >= ? THEN 1 ELSE 0 END) as last30d
      FROM reports`
    )
    .get(startOfToday, last7d, last30d);

  return {
    total: counts.total,
    today: counts.today,
    last7d: counts.last7d,
    last30d: counts.last30d,
  };
}

export function listSearches({ page, limit, status, from, to }) {
  const { where, params } = buildWhereClause({ status, from, to }, 'searches');
  const { total } = db.prepare(`SELECT COUNT(*) as total FROM searches ${where}`).get(...params);
  const pages = Math.ceil(total / limit) || 1;
  const offset = (page - 1) * limit;
  const data = db
    .prepare(`SELECT * FROM searches ${where} ORDER BY ts DESC LIMIT ? OFFSET ?`)
    .all(...params, limit, offset);
  return { data, total, page, pages };
}

export function listReports({ page, limit, from, to }) {
  const { where, params } = buildWhereClause({ from, to }, 'reports');
  const { total } = db.prepare(`SELECT COUNT(*) as total FROM reports ${where}`).get(...params);
  const pages = Math.ceil(total / limit) || 1;
  const offset = (page - 1) * limit;
  const data = db
    .prepare(`SELECT * FROM reports ${where} ORDER BY ts DESC LIMIT ? OFFSET ?`)
    .all(...params, limit, offset);
  return { data, total, page, pages };
}

export function exportSearches(filters) {
  const { where, params } = buildWhereClause(filters, 'searches');
  return db.prepare(`SELECT * FROM searches ${where} ORDER BY ts DESC`).all(...params);
}

export function exportReports(filters) {
  const { where, params } = buildWhereClause(filters, 'reports');
  return db.prepare(`SELECT * FROM reports ${where} ORDER BY ts DESC`).all(...params);
}

export function recordSearch({
  zipcode,
  city,
  dpe,
  ges,
  surface,
  date_diag,
  conso_prim,
  results_count,
  duration_ms,
  status,
}) {
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
