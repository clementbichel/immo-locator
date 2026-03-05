import { Router } from 'express';
import { z } from 'zod';
import { logger } from '../logger.js';
import { recordReport } from '../db.js';

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

const NUMERIC_FIELDS = ['surface', 'terrain', 'conso_prim', 'conso_fin'];

/**
 * Compat: old extension sends raw values with units ("76 m²", "230 kWh/m²/an")
 * and "Non trouvé" instead of null. Clean before validation.
 */
function cleanExtracted(raw) {
  const result = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value == null || value === 'Non trouvé') continue;
    if (NUMERIC_FIELDS.includes(key)) {
      const match = String(value).match(/(\d+(?:[.,]\d+)?)/);
      if (!match) continue;
      result[key] = match[1].replace(',', '.');
    } else {
      result[key] = value;
    }
  }
  return result;
}

const router = Router();

router.post('/', (req, res) => {
  const { url, extracted } = req.body;

  if (!url || typeof url !== 'string' || !extracted) {
    logger.warn({ url: typeof url, hasExtracted: !!extracted }, 'Report rejected: missing fields');
    return res.status(400).json({ error: 'MISSING_FIELDS', message: 'url et extracted sont requis.' });
  }

  const cleaned = cleanExtracted(extracted);

  const extractedResult = extractedSchema.safeParse(cleaned);
  if (!extractedResult.success) {
    logger.warn({ issues: extractedResult.error.issues, cleaned }, 'Report rejected: invalid extracted');
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
