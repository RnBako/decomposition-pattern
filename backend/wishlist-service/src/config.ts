import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3002', 10),
  databaseUrl:
    process.env.DATABASE_URL ||
    'postgresql://wishlist:wishlist@localhost:5432/wishly_wishlist',
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'change-me-shared-secret',
  kafkaBrokers: (process.env.KAFKA_BROKERS || 'localhost:9092')
    .split(',')
    .map((b) => b.trim())
    .filter(Boolean),
  kafkaClientId: process.env.KAFKA_CLIENT_ID || 'wishlist-service',
  kafkaTopic: process.env.KAFKA_TOPIC || 'wishly.wishlist.events',
  uploadDir: process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'),
  publicMediaBase: process.env.PUBLIC_MEDIA_BASE || '/media',
  maxWishlistsPerUser: 20,
  maxGiftsPerWishlist: 200,
  maxImageBytes: 5 * 1024 * 1024,
};
