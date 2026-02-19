import { describe, it, expect } from 'vitest';
import { searchSchema } from '../../src/schemas/search.js';

const validPayload = {
  zipcode: '75011',
  city: 'Paris',
  dpe: 'D',
  ges: 'E',
  surface: 45,
  date_diag: '15/03/2024',
  conso_prim: 230,
};

describe('searchSchema', () => {
  it('accepts valid payload', () => {
    const result = searchSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it('rejects invalid DPE letter', () => {
    const result = searchSchema.safeParse({ ...validPayload, dpe: 'Z' });
    expect(result.success).toBe(false);
  });

  it('rejects negative surface', () => {
    const result = searchSchema.safeParse({ ...validPayload, surface: -10 });
    expect(result.success).toBe(false);
  });

  it('rejects zipcode with wrong format', () => {
    const result = searchSchema.safeParse({ ...validPayload, zipcode: '123' });
    expect(result.success).toBe(false);
  });

  it('requires zipcode or city', () => {
    const { zipcode, city, ...rest } = validPayload;
    const result = searchSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('accepts payload with only city (no zipcode)', () => {
    const { zipcode, ...rest } = validPayload;
    const result = searchSchema.safeParse(rest);
    expect(result.success).toBe(true);
  });

  it('rejects invalid date format', () => {
    const result = searchSchema.safeParse({ ...validPayload, date_diag: '2024-03-15' });
    expect(result.success).toBe(false);
  });

  it('accepts payload without date_diag', () => {
    const { date_diag, ...rest } = validPayload;
    const result = searchSchema.safeParse(rest);
    expect(result.success).toBe(true);
  });

  it('accepts payload with null date_diag', () => {
    const result = searchSchema.safeParse({ ...validPayload, date_diag: null });
    expect(result.success).toBe(true);
  });

  it('rejects surface over 10000', () => {
    const result = searchSchema.safeParse({ ...validPayload, surface: 50000 });
    expect(result.success).toBe(false);
  });
});
