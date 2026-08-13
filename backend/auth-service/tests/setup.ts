import { beforeAll, afterAll } from 'vitest';

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
});

afterAll(async () => {
  // cleanup handled per-suite
});
