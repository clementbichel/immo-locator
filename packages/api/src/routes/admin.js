import { Router } from 'express';
import { z } from 'zod';
import {
  getSearchStats,
  getReportStats,
  listSearches,
  listReports,
  exportSearches,
  exportReports,
} from '../db.js';
import { toCsv } from '../utils/csv.js';

const router = Router();

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  from: z.coerce.number().int().min(0).optional(),
  to: z.coerce.number().int().min(0).optional(),
});

const searchFiltersSchema = paginationSchema.extend({
  status: z.enum(['ok', 'no_results', 'error']).optional(),
});

const exportFiltersSchema = z.object({
  from: z.coerce.number().int().min(0).optional(),
  to: z.coerce.number().int().min(0).optional(),
});

const searchExportFiltersSchema = exportFiltersSchema.extend({
  status: z.enum(['ok', 'no_results', 'error']).optional(),
});

const SEARCH_COLUMNS = [
  'id',
  'ts',
  'zipcode',
  'city',
  'dpe',
  'ges',
  'surface',
  'date_diag',
  'conso_prim',
  'results_count',
  'duration_ms',
  'status',
];

const REPORT_COLUMNS = [
  'id',
  'ts',
  'url',
  'surface',
  'terrain',
  'dpe',
  'ges',
  'date_diag',
  'conso_prim',
  'conso_fin',
  'city',
  'zipcode',
];

router.get('/stats', (_req, res) => {
  const searches = getSearchStats();
  const reports = getReportStats();
  res.json({ searches, reports });
});

router.get('/searches', (req, res) => {
  const parsed = searchFiltersSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', issues: parsed.error.issues });
  }
  res.json(listSearches(parsed.data));
});

router.get('/reports', (req, res) => {
  const parsed = paginationSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', issues: parsed.error.issues });
  }
  res.json(listReports(parsed.data));
});

router.get('/export/searches', (req, res) => {
  const parsed = searchExportFiltersSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', issues: parsed.error.issues });
  }
  const rows = exportSearches(parsed.data);
  const csv = toCsv(rows, SEARCH_COLUMNS);
  const date = new Date().toISOString().split('T')[0];
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=searches-${date}.csv`);
  res.send(csv);
});

router.get('/export/reports', (req, res) => {
  const parsed = exportFiltersSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', issues: parsed.error.issues });
  }
  const rows = exportReports(parsed.data);
  const csv = toCsv(rows, REPORT_COLUMNS);
  const date = new Date().toISOString().split('T')[0];
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=reports-${date}.csv`);
  res.send(csv);
});

export default router;
