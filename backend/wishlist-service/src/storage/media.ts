import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { config } from '../config';
import { AppError } from '../types';

const ALLOWED_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

export function ensureUploadDir(): void {
  fs.mkdirSync(config.uploadDir, { recursive: true });
}

export function extensionForMime(mime: string): string {
  const ext = ALLOWED_MIME[mime];
  if (!ext) {
    throw new AppError(400, 'Invalid image type; allowed: jpeg, png, webp');
  }
  return ext;
}

export function assertAllowedMime(mime: string): void {
  if (!ALLOWED_MIME[mime]) {
    throw new AppError(400, 'Invalid image type; allowed: jpeg, png, webp');
  }
}

export function buildStorageKey(giftId: string, mime: string): string {
  return `${giftId}-${randomUUID()}${extensionForMime(mime)}`;
}

export function absolutePathForKey(storageKey: string): string {
  // prevent path traversal
  const safe = path.basename(storageKey);
  if (safe !== storageKey || storageKey.includes('..')) {
    throw new AppError(404, 'Not found');
  }
  return path.join(config.uploadDir, safe);
}

export function publicUrlForKey(storageKey: string): string {
  const base = config.publicMediaBase.replace(/\/$/, '');
  return `${base}/${storageKey}`;
}

export function writeUpload(storageKey: string, buffer: Buffer): void {
  ensureUploadDir();
  fs.writeFileSync(absolutePathForKey(storageKey), buffer);
}

export function deleteUpload(storageKey: string | null | undefined): void {
  if (!storageKey) return;
  try {
    const filePath = absolutePathForKey(storageKey);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {
    // ignore cleanup errors
  }
}

export function mimeFromKey(storageKey: string): string {
  const ext = path.extname(storageKey).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  return 'image/jpeg';
}
