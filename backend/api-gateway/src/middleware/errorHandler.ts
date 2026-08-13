import { Request, Response, NextFunction } from 'express';

export class HttpError extends Error {
  constructor(
    public status: number,
    public error: string,
    public messageRu?: string,
  ) {
    super(error);
    this.name = 'HttpError';
  }
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: 'not_found', message: 'Ресурс не найден' });
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({
      error: err.error,
      ...(err.messageRu ? { message: err.messageRu } : {}),
    });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'internal_error', message: 'Внутренняя ошибка сервера' });
}
