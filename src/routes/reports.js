import { Router } from 'express';
import fs from 'node:fs/promises';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { logger } from '../logger.js';

const router = Router();

const DEFAULT_REPORTS_FILE = path.join(process.cwd(), 'data', 'reports.jsonl');

function getReportsFile() {
  return process.env.REPORTS_FILE ?? DEFAULT_REPORTS_FILE;
}

let dirEnsured = false;

router.post('/', async (req, res) => {
  const { url, extracted } = req.body;

  if (!url || typeof url !== 'string' || !extracted) {
    return res.status(400).json({ error: 'MISSING_FIELDS', message: 'url et extracted sont requis.' });
  }

  const reportsFile = getReportsFile();

  if (!dirEnsured) {
    mkdirSync(path.dirname(reportsFile), { recursive: true });
    dirEnsured = true;
  }

  const entry = JSON.stringify({
    url,
    timestamp: req.body.timestamp ?? new Date().toISOString(),
    extracted,
  });

  try {
    await fs.appendFile(reportsFile, entry + '\n', 'utf8');
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, 'Failed to write report');
    res.status(500).json({ error: 'WRITE_ERROR', message: "Impossible d'enregistrer le rapport." });
  }
});

export default router;
