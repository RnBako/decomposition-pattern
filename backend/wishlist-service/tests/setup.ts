process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'change-me-shared-secret';
process.env.KAFKA_BROKERS = '127.0.0.1:1';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://wishlist:wishlist@127.0.0.1:1/wishly_wishlist';

import path from 'path';
import os from 'os';
import fs from 'fs';

const uploadDir = path.join(os.tmpdir(), 'wishlist-service-test-uploads');
fs.mkdirSync(uploadDir, { recursive: true });
process.env.UPLOAD_DIR = uploadDir;
