import { Router } from 'express';
import { processResults } from '../services/dpe-service.js';
import { fetchAdeme } from '../clients/ademe-client.js';
import { searchSchema } from '../schemas/search.js';
import { logger } from '../logger.js';

const router = Router();

router.post('/search', async (req, res) => {
  const parsed = searchSchema.safeParse(req.body);
  if (!parsed.success) {
    const missing = parsed.error.issues.map(i => i.path.join('.'));
    logger.warn({ missing, issues: parsed.error.issues }, 'Validation failed');
    return res.status(400).json({
      error: 'MISSING_FIELDS',
      message: `Champs manquants ou invalides : ${missing.join(', ')}`,
      missing,
    });
  }

  const data = parsed.data;
  const searchParams = { ...data };

  try {
    const ademeResponse = await fetchAdeme(data);
    const results = ademeResponse.results ? processResults(data, ademeResponse.results) : [];

    logger.info({ searchParams, count: results.length }, 'Search completed');
    return res.json({
      results,
      count: results.length,
    });
  } catch (err) {
    logger.error({ err, searchParams }, 'ADEME search error');
    return res.status(502).json({
      error: 'UPSTREAM_ERROR',
      message: 'Erreur lors de la communication avec le service de données.',
    });
  }
});

export default router;
