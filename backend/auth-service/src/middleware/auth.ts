import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { HttpError } from './errorHandler';
import type { UserRole } from '../types';

export type AuthClaims = {
  sub: string;
  email: string;
  role: UserRole;
  display_name: string;
};

export type AuthedRequest = Request & {
  auth?: AuthClaims;
};

export function createAuthMiddleware(jwtSecret: string) {
  return function requireAuth(req: AuthedRequest, _res: Response, next: NextFunction): void {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      next(new HttpError(401, 'unauthorized', 'Требуется авторизация'));
      return;
    }
    const token = header.slice('Bearer '.length).trim();
    if (!token) {
      next(new HttpError(401, 'unauthorized', 'Требуется авторизация'));
      return;
    }
    try {
      const payload = jwt.verify(token, jwtSecret) as jwt.JwtPayload;
      if (!payload.sub || typeof payload.sub !== 'string') {
        next(new HttpError(401, 'unauthorized', 'Недействительный токен'));
        return;
      }
      req.auth = {
        sub: payload.sub,
        email: String(payload.email || ''),
        role: (payload.role === 'admin' ? 'admin' : 'user') as UserRole,
        display_name: String(payload.display_name || ''),
      };
      next();
    } catch {
      next(new HttpError(401, 'unauthorized', 'Недействительный токен'));
    }
  };
}
