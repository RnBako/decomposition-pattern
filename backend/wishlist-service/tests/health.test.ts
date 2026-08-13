import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';

describe('Health', () => {
  it('GET /health returns 200', async () => {
    const app = createApp();
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('wishlist-service');
  });
});

describe('Auth guard', () => {
  it('GET /wishlists without auth returns 401', async () => {
    const app = createApp();
    const res = await request(app).get('/wishlists');
    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
  });
});

describe('Public share validation', () => {
  it('GET /share/short returns 404', async () => {
    const app = createApp();
    const res = await request(app).get('/share/short');
    expect(res.status).toBe(404);
  });
});
