import { z } from 'zod';

export const searchSchema = z.object({
  zipcode: z.string().regex(/^\d{5}$/).nullish(),
  city: z.string().min(1).max(100).nullish(),
  dpe: z.enum(['A', 'B', 'C', 'D', 'E', 'F', 'G']),
  ges: z.enum(['A', 'B', 'C', 'D', 'E', 'F', 'G']),
  surface: z.number().positive().max(10000),
  date_diag: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/).nullish(),
  conso_prim: z.number().positive().max(1000).nullish(),
  conso_fin: z.number().positive().max(1000).nullish(),
}).refine(
  data => data.zipcode || data.city,
  { message: 'zipcode ou city requis', path: ['zipcode'] }
);
