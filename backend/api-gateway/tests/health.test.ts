import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';

describe('api-gateway health', () => {
  const app = createApp({ jwtSecret: 'test-jwt-secret', jwtValidateAtEdge: true });

  it('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', service: 'api-gateway' });
  });

  it('GET /api/health returns aggregated status', async () => {
    const res = await request(app).get('/api/health');
    expect([200, 503]).toContain(res.status);
    expect(res.body.service).toBe('api-gateway');
    expect(Array.isArray(res.body.upstreams)).toBe(true);
    expect(res.body.upstreams).toHaveLength(4);
  });
});
