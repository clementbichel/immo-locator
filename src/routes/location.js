import { Router } from 'express';
import { validateSearchData, processResults } from '../services/dpe-service.js';
import { fetchAdeme } from '../clients/ademe-client.js';

const router = Router();

router.post('/search', async (req, res) => {
  const data = req.body;

  const validation = validateSearchData(data);
  if (!validation.isValid) {
    return res.status(400).json({
      error: 'MISSING_FIELDS',
      message: `Champs manquants : ${validation.missing.join(', ')}`,
      missing: validation.missing,
    });
  }

  try {
    const ademeResponse = await fetchAdeme(data);
    const results = ademeResponse.results ? processResults(data, ademeResponse.results) : [];

    return res.json({
      results,
      count: results.length,
    });
  } catch (err) {
    console.error('ADEME search error:', err.message);
    return res.status(502).json({
      error: 'UPSTREAM_ERROR',
      message: 'Erreur lors de la communication avec le service de données.',
    });
  }
});

export default router;
