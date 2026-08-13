import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'test-secret',
      KAFKA_DISABLED: 'true',
      SMTP_HOST: '',
    },
  },
});
