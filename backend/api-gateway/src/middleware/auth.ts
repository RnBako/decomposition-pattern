import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { HttpError } from './errorHandler';

export type UserRole = 'user' | 'admin';

export type AuthClaims = {
  sub: string;
  email: string;
  role: UserRole;
  display_name: string;
};

export type AuthedRequest = Request & {
  auth?: AuthClaims;
};

function parseClaims(payload: jwt.JwtPayload): AuthClaims | null {
  if (!payload.sub || typeof payload.sub !== 'string') return null;
  return {
    sub: payload.sub,
    email: String(payload.email || ''),
    role: payload.role === 'admin' ? 'admin' : 'user',
    display_name: String(payload.display_name || ''),
  };
}

/** Paths that must remain public (no JWT). Preflight OPTIONS is always public. */
export function isPublicRoute(method: string, path: string): boolean {
  const m = method.toUpperCase();
  if (m === 'OPTIONS') return true;
  if (path === '/health' || path === '/api/health') return true;
  if (m === 'POST' && (path === '/api/auth/register' || path === '/api/auth/login')) return true;
  if (m === 'GET' && path.startsWith('/api/share/')) return true;
  if (m === 'GET' && path.startsWith('/api/media/')) return true;
  if (m === 'GET' && path === '/api/bookings/status') return true;
  return false;
}

export function createEdgeAuthMiddleware(opts: {
  jwtSecret: string;
  validateAtEdge: boolean;
}) {
  return function edgeAuth(req: AuthedRequest, _res: Response, next: NextFunction): void {
    if (isPublicRoute(req.method, req.path)) {
      next();
      return;
    }

    if (!req.path.startsWith('/api/')) {
      next();
      return;
    }

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

    if (!opts.validateAtEdge) {
      // Forward Authorization only; upstream validates.
      next();
      return;
    }

    try {
      const payload = jwt.verify(token, opts.jwtSecret) as jwt.JwtPayload;
      const claims = parseClaims(payload);
      if (!claims) {
        next(new HttpError(401, 'unauthorized', 'Недействительный токен'));
        return;
      }
      req.auth = claims;

      // Inject identity headers for upstreams (also keep Authorization).
      req.headers['x-user-id'] = claims.sub;
      req.headers['x-user-role'] = claims.role;
      req.headers['x-user-email'] = claims.email;
      req.headers['x-user-display-name'] = claims.display_name;

      if (req.path.startsWith('/api/admin/') && claims.role !== 'admin') {
        next(new HttpError(403, 'forbidden', 'Требуется роль admin'));
        return;
      }

      next();
    } catch {
      next(new HttpError(401, 'unauthorized', 'Недействительный токен'));
    }
  };
}
