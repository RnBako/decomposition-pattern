import dotenv from 'dotenv';

dotenv.config();

function parseIntEnv(value: string | undefined, fallback: number): number {
  const n = parseInt(value || '', 10);
  return Number.isFinite(n) ? n : fallback;
}

function parseBoolEnv(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

const defaultCorsOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:3000',
  'http://localhost',
];

export const config = {
  port: parseIntEnv(process.env.PORT, 8080),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'dev-jwt-secret-change-me',
  jwtValidateAtEdge: parseBoolEnv(process.env.JWT_VALIDATE_AT_EDGE, true),
  corsOrigins: (process.env.CORS_ORIGINS || defaultCorsOrigins.join(','))
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  authServiceUrl: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  wishlistServiceUrl: process.env.WISHLIST_SERVICE_URL || 'http://localhost:3002',
  bookingServiceUrl: process.env.BOOKING_SERVICE_URL || 'http://localhost:3003',
  notificationServiceUrl: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3004',
};
