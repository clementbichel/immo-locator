import { Router } from 'express';
import fs from 'node:fs/promises';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { logger } from '../logger.js';

const extractedSchema = z.object({
  surface:    z.string().regex(/^\d+(\.\d+)?$/).max(10).nullish(),
  terrain:    z.string().regex(/^\d+(\.\d+)?$/).max(10).nullish(),
  dpe:        z.enum(['A', 'B', 'C', 'D', 'E', 'F', 'G']).nullish(),
  ges:        z.enum(['A', 'B', 'C', 'D', 'E', 'F', 'G']).nullish(),
  date_diag:  z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/).nullish(),
  conso_prim: z.string().regex(/^\d+(\.\d+)?$/).max(10).nullish(),
  conso_fin:  z.string().regex(/^\d+(\.\d+)?$/).max(10).nullish(),
  city:       z.string().max(100).nullish(),
  zipcode:    z.string().regex(/^\d{5}$/).nullish(),
}).strict();

const router = Router();

const DEFAULT_REPORTS_FILE = path.join(process.cwd(), 'data', 'reports.jsonl');
const BASE_DATA_DIR = path.resolve(process.cwd(), 'data');

function resolveReportsFile(rawPath) {
  const resolved = path.resolve(rawPath);
  if (!resolved.startsWith(BASE_DATA_DIR + path.sep)) {
    throw new Error(`REPORTS_FILE path traversal detected: ${rawPath}`);
  }
  return resolved;
}

function getReportsFile() {
  return resolveReportsFile(process.env.REPORTS_FILE ?? DEFAULT_REPORTS_FILE);
}

let dirEnsured = false;

router.post('/', async (req, res) => {
  const { url, extracted } = req.body;

  if (!url || typeof url !== 'string' || !extracted) {
    return res.status(400).json({ error: 'MISSING_FIELDS', message: 'url et extracted sont requis.' });
  }

  const extractedResult = extractedSchema.safeParse(extracted);
  if (!extractedResult.success) {
    return res.status(400).json({ error: 'INVALID_EXTRACTED', message: 'Données extraites invalides.' });
  }

  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return res.status(400).json({ error: 'INVALID_URL', message: 'url doit être une URL http ou https valide.' });
    }
  } catch {
    return res.status(400).json({ error: 'INVALID_URL', message: 'url doit être une URL http ou https valide.' });
  }

  let reportsFile;
  try {
    reportsFile = getReportsFile();
  } catch (err) {
    logger.error({ err }, 'Invalid REPORTS_FILE path');
    return res.status(400).json({ error: 'INVALID_PATH', message: 'Chemin de fichier invalide.' });
  }

  if (!dirEnsured) {
    mkdirSync(path.dirname(reportsFile), { recursive: true });
    dirEnsured = true;
  }

  const entry = JSON.stringify({
    url,
    timestamp: new Date().toISOString(),
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
