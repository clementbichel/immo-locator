import { Router } from 'express';
import { processResults } from '../services/dpe-service.js';
import { fetchAdeme } from '../clients/ademe-client.js';
import { searchSchema } from '../schemas/search.js';
import { logger } from '../logger.js';
import { recordSearch } from '../db.js';

const router = Router();

router.post('/search', async (req, res) => {
  const parsed = searchSchema.safeParse(req.body);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => i.path.join('.'));
    logger.warn({ missing, issues: parsed.error.issues }, 'Validation failed');
    return res.status(400).json({
      error: 'MISSING_FIELDS',
      message: `Champs manquants ou invalides : ${missing.join(', ')}`,
      missing,
    });
  }

  const data = parsed.data;
  const searchParams = { ...data };
  const start = Date.now();

  try {
    const ademeResponse = await fetchAdeme(data);
    const results = ademeResponse.results ? processResults(data, ademeResponse.results) : [];
    const duration_ms = Date.now() - start;

    recordSearch({
      ...data,
      results_count: results.length,
      duration_ms,
      status: results.length === 0 ? 'no_results' : 'ok',
    });
    logger.info({ searchParams, count: results.length }, 'Search completed');
    return res.json({
      results,
      count: results.length,
    });
  } catch (err) {
    const duration_ms = Date.now() - start;
    recordSearch({ ...data, results_count: 0, duration_ms, status: 'error' });
    logger.error({ err, searchParams }, 'ADEME search error');
    return res.status(502).json({
      error: 'UPSTREAM_ERROR',
      message: 'Erreur lors de la communication avec le service de données.',
    });
  }
});

export default router;
