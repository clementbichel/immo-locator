import { Router } from 'express';
import { processResults } from '../services/dpe-service.js';
import { fetchAdeme } from '../clients/ademe-client.js';
import { searchSchema } from '../schemas/search.js';

const router = Router();

router.post('/search', async (req, res) => {
  const parsed = searchSchema.safeParse(req.body);
  if (!parsed.success) {
    const missing = parsed.error.issues.map(i => i.path.join('.'));
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: `Données invalides : ${parsed.error.issues.map(i => i.message).join(', ')}`,
      missing,
    });
  }

  const data = parsed.data;

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
