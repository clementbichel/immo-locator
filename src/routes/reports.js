import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';

const router = express.Router();

const DEFAULT_REPORTS_FILE = path.join(process.cwd(), 'data', 'reports.jsonl');

function getReportsFile() {
  return process.env.REPORTS_FILE ?? DEFAULT_REPORTS_FILE;
}

router.post('/', async (req, res) => {
  const { url, extracted } = req.body;

  if (!url || !extracted) {
    return res.status(400).json({ error: 'MISSING_FIELDS', message: 'url et extracted sont requis.' });
  }

  const reportsFile = getReportsFile();
  const entry = JSON.stringify({
    url,
    timestamp: req.body.timestamp ?? new Date().toISOString(),
    extracted,
  });

  try {
    await fs.mkdir(path.dirname(reportsFile), { recursive: true });
    await fs.appendFile(reportsFile, entry + '\n', 'utf8');
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to write report:', err);
    res.status(500).json({ error: 'WRITE_ERROR', message: "Impossible d'enregistrer le rapport." });
  }
});

export default router;
