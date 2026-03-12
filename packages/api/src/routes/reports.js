import { Router } from 'express';
import { z } from 'zod';
import { logger } from '../logger.js';
import { recordReport } from '../db.js';

const numericString = z.preprocess(
  (val) => {
    if (val == null || val === 'Non trouvé') return undefined;
    const match = String(val).match(/(\d+(?:[.,]\d+)?)/);
    return match ? match[1].replace(',', '.') : val;
  },
  z.string().regex(/^\d+(\.\d+)?$/).max(10).nullish(),
);

const extractedSchema = z.object({
  surface:    numericString,
  terrain:    numericString,
  dpe:        z.enum(['A', 'B', 'C', 'D', 'E', 'F', 'G']).nullish(),
  ges:        z.enum(['A', 'B', 'C', 'D', 'E', 'F', 'G']).nullish(),
  date_diag:  z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/).nullish(),
  conso_prim: numericString,
  conso_fin:  numericString,
  city:       z.string().max(100).nullish(),
  zipcode:    z.string().regex(/^\d{5}$/).nullish(),
}).strict();

const router = Router();

router.post('/', (req, res) => {
  const { url, extracted } = req.body;

  if (!url || typeof url !== 'string' || !extracted) {
    logger.warn({ url: typeof url, hasExtracted: !!extracted }, 'Report rejected: missing fields');
    return res.status(400).json({ error: 'MISSING_FIELDS', message: 'url et extracted sont requis.' });
  }

  const extractedResult = extractedSchema.safeParse(extracted);
  if (!extractedResult.success) {
    logger.warn({ issues: extractedResult.error.issues, extracted }, 'Report rejected: invalid extracted');
    return res.status(400).json({ error: 'INVALID_EXTRACTED', message: 'Données extraites invalides.' });
  }

  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname.endsWith('leboncoin.fr')) {
      return res.status(400).json({ error: 'INVALID_URL', message: 'url doit être une URL leboncoin.fr valide.' });
    }
  } catch {
    return res.status(400).json({ error: 'INVALID_URL', message: 'url doit être une URL leboncoin.fr valide.' });
  }

  try {
    recordReport({ url, ...extractedResult.data });
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, 'Failed to write report');
    res.status(500).json({ error: 'WRITE_ERROR', message: "Impossible d'enregistrer le rapport." });
  }
});

export default router;
