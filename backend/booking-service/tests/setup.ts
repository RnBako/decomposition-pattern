import { beforeAll, afterAll } from 'vitest';

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.KAFKA_DISABLED = 'true';
  process.env.JWT_SECRET = 'test-secret';
});

afterAll(async () => {
  // cleanup
});
