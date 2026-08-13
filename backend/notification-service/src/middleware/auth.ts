import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AppError, AuthUser, UserRole } from '../types';

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

interface JwtPayload {
  sub?: string;
  email?: string;
  role?: string;
  display_name?: string;
}

function parseRole(value: string | undefined): UserRole {
  return value === 'admin' ? 'admin' : 'user';
}

function userFromHeaders(req: Request): AuthUser | null {
  const id = req.header('x-user-id');
  if (!id) return null;
  return {
    id,
    email: req.header('x-user-email') || '',
    role: parseRole(req.header('x-user-role') || undefined),
    displayName: req.header('x-user-display-name') || '',
  };
}

function userFromJwt(token: string): AuthUser {
  try {
    const payload = jwt.verify(token, config.jwtSecret) as JwtPayload;
    if (!payload.sub) {
      throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
    }
    return {
      id: payload.sub,
      email: payload.email || '',
      role: parseRole(payload.role),
      displayName: payload.display_name || '',
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
  }
}

export function requireAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): void {
  try {
    const headerUser = userFromHeaders(req);
    if (headerUser) {
      req.user = headerUser;
      next();
      return;
    }
    const auth = req.header('authorization');
    if (!auth?.startsWith('Bearer ')) {
      throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
    }
    req.user = userFromJwt(auth.slice(7));
    next();
  } catch (err) {
    next(err);
  }
}
