import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockRecordReport } = vi.hoisted(() => ({
  mockRecordReport: vi.fn(),
}));

vi.mock('../../src/db.js', () => ({
  recordSearch: vi.fn(),
  recordReport: mockRecordReport,
}));

vi.mock('../../src/clients/ademe-client.js', () => ({
  fetchAdeme: vi.fn(),
}));

import request from 'supertest';
import { createApp } from '../../src/index.js';

describe('POST /api/reports', () => {
  let app;

  beforeEach(() => {
    mockRecordReport.mockReset();
    app = createApp();
  });

  it('returns 200 and calls recordReport', async () => {
    const payload = {
      url: 'https://leboncoin.fr/ad/123',
      extracted: { dpe: 'D', surface: '45', city: 'Paris' },
    };

    const res = await request(app).post('/api/reports').send(payload);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    expect(mockRecordReport).toHaveBeenCalledOnce();
    expect(mockRecordReport).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://leboncoin.fr/ad/123',
        dpe: 'D',
        surface: '45',
        city: 'Paris',
      })
    );
  });

  it('returns 400 when url is missing', async () => {
    const res = await request(app)
      .post('/api/reports')
      .send({ extracted: { dpe: 'D' } });
    expect(res.status).toBe(400);
  });

  it('returns 400 when extracted is missing', async () => {
    const res = await request(app)
      .post('/api/reports')
      .send({ url: 'https://leboncoin.fr/ad/123' });
    expect(res.status).toBe(400);
  });

  it('calls recordReport for each request', async () => {
    const payload = {
      url: 'https://leboncoin.fr/ad/123',
      extracted: { dpe: 'D' },
    };

    await request(app).post('/api/reports').send(payload);
    await request(app)
      .post('/api/reports')
      .send({ ...payload, url: 'https://leboncoin.fr/ad/456' });

    expect(mockRecordReport).toHaveBeenCalledTimes(2);
    expect(mockRecordReport).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ url: 'https://leboncoin.fr/ad/456' })
    );
  });

  it('returns 500 when recordReport throws', async () => {
    mockRecordReport.mockImplementation(() => {
      throw new Error('DB write failed');
    });

    const res = await request(app)
      .post('/api/reports')
      .send({ url: 'https://leboncoin.fr/ad/123', extracted: { dpe: 'D' } });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('WRITE_ERROR');
  });

  it('returns 400 when url is not http(s)', async () => {
    const res = await request(app)
      .post('/api/reports')
      .send({ url: 'javascript:alert(1)', extracted: { dpe: 'D' } });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_URL');
  });

  it('returns 400 when url is not leboncoin.fr', async () => {
    const res = await request(app)
      .post('/api/reports')
      .send({ url: 'https://evil.com/phishing', extracted: { dpe: 'D' } });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_URL');
  });

  it('returns 400 when DPE value is outside A-G', async () => {
    const res = await request(app)
      .post('/api/reports')
      .send({ url: 'https://leboncoin.fr/ad/123', extracted: { dpe: 'Z' } });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_EXTRACTED');
  });

  it('returns 400 when extracted contains unknown fields', async () => {
    const res = await request(app)
      .post('/api/reports')
      .send({ url: 'https://leboncoin.fr/ad/123', extracted: { dpe: 'A', unknown: 'field' } });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_EXTRACTED');
  });
});
