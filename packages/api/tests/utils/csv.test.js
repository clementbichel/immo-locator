import { describe, it, expect } from 'vitest';
import { toCsv } from '../../src/utils/csv.js';

describe('toCsv', () => {
  it('generates header + rows', () => {
    const rows = [
      { a: 1, b: 'hello' },
      { a: 2, b: 'world' },
    ];
    const csv = toCsv(rows, ['a', 'b']);
    expect(csv).toBe('a,b\n1,hello\n2,world\n');
  });

  it('handles empty rows', () => {
    const csv = toCsv([], ['a', 'b']);
    expect(csv).toBe('a,b\n');
  });

  it('handles null values', () => {
    const csv = toCsv([{ a: null, b: undefined }], ['a', 'b']);
    expect(csv).toBe('a,b\n,\n');
  });

  it('escapes commas in values', () => {
    const csv = toCsv([{ a: 'hello,world' }], ['a']);
    expect(csv).toBe('a\n"hello,world"\n');
  });

  it('escapes double-quotes in values', () => {
    const csv = toCsv([{ a: 'say "hello"' }], ['a']);
    expect(csv).toBe('a\n"say ""hello"""\n');
  });

  it('sanitizes formula injection with =', () => {
    const csv = toCsv([{ a: '=CMD("calc")' }], ['a']);
    expect(csv).toContain("'=CMD");
  });

  it('sanitizes formula injection with +', () => {
    const csv = toCsv([{ a: '+1234' }], ['a']);
    expect(csv).toContain("'+1234");
  });

  it('sanitizes formula injection with -', () => {
    const csv = toCsv([{ a: '-1+2' }], ['a']);
    expect(csv).toContain("'-1+2");
  });

  it('sanitizes formula injection with @', () => {
    const csv = toCsv([{ a: '@SUM(A1:A10)' }], ['a']);
    expect(csv).toContain("'@SUM");
  });
});
