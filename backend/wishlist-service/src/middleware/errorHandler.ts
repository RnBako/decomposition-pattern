import { Request, Response, NextFunction } from 'express';
import { AppError } from '../types';

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: 'Not found' });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.status).json({
      error: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
    return;
  }

  // multer errors
  if (err && typeof err === 'object' && 'code' in err) {
    const code = (err as { code?: string }).code;
    if (code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ error: 'Image exceeds 5MB limit' });
      return;
    }
  }

  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
}
