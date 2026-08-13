import dotenv from 'dotenv';

dotenv.config();

function parseIntEnv(value: string | undefined, fallback: number): number {
  const n = parseInt(value || '', 10);
  return Number.isFinite(n) ? n : fallback;
}

export const config = {
  port: parseIntEnv(process.env.PORT, 3001),
  databaseUrl:
    process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/wishly_auth',
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'dev-jwt-secret-change-me',
  jwtExpiresIn: parseIntEnv(process.env.JWT_EXPIRES_IN, 86400),
  adminEmail: process.env.ADMIN_EMAIL || '',
  adminPassword: process.env.ADMIN_PASSWORD || '',
  adminDisplayName: process.env.ADMIN_DISPLAY_NAME || 'Admin',
  kafkaBrokers: (process.env.KAFKA_BROKERS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  kafkaClientId: process.env.KAFKA_CLIENT_ID || 'auth-service',
  kafkaTopicAuthEvents: process.env.KAFKA_TOPIC_AUTH_EVENTS || 'wishly.auth.events',
};
