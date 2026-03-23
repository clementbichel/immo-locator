import { z } from 'zod';

export const searchSchema = z
  .object({
    zipcode: z
      .string()
      .regex(/^\d{5}$/)
      .nullish(),
    city: z.string().min(1).max(100).nullish(),
    dpe: z.enum(['A', 'B', 'C', 'D', 'E', 'F', 'G']),
    ges: z.enum(['A', 'B', 'C', 'D', 'E', 'F', 'G']),
    surface: z.number().finite().positive().max(10000),
    date_diag: z
      .string()
      .refine(
        (s) => {
          const match = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
          if (!match) return false;
          const [, d, m, y] = match;
          const date = new Date(+y, +m - 1, +d);
          return (
            date.getDate() === +d &&
            date.getMonth() === +m - 1 &&
            date.getFullYear() >= 2000 &&
            date.getFullYear() <= new Date().getFullYear() + 1
          );
        },
        { message: "Date invalide ou hors plage (2000 — aujourd'hui)" }
      )
      .nullish(),
    conso_prim: z.number().finite().positive().max(1000).nullish(),
    conso_fin: z.number().finite().positive().max(1000).nullish(),
  })
  .strict()
  .refine((data) => data.zipcode || data.city, {
    message: 'zipcode ou city requis',
    path: ['zipcode'],
  });
