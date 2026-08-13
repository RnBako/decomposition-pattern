import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AppError, AuthUser, AuthedRequest, UserRole } from '../types';

interface JwtPayload {
  sub?: string;
  email?: string;
  role?: string;
  display_name?: string;
}

function parseRole(value: unknown): UserRole {
  return value === 'admin' ? 'admin' : 'user';
}

export function authenticate(
  req: AuthedRequest,
  _res: Response,
  next: NextFunction,
): void {
  try {
    const headerUserId = req.header('X-User-Id');
    const headerRole = req.header('X-User-Role');

    if (headerUserId) {
      req.user = {
        id: headerUserId,
        role: parseRole(headerRole),
        displayName: req.header('X-User-Display-Name') || undefined,
        email: req.header('X-User-Email') || undefined,
      };
      next();
      return;
    }

    const auth = req.header('Authorization');
    if (!auth?.startsWith('Bearer ')) {
      throw new AppError(401, 'Unauthorized');
    }

    const token = auth.slice('Bearer '.length).trim();
    const payload = jwt.verify(token, config.jwtSecret) as JwtPayload;
    if (!payload.sub) {
      throw new AppError(401, 'Unauthorized');
    }

    req.user = {
      id: payload.sub,
      role: parseRole(payload.role),
      email: payload.email,
      displayName: payload.display_name,
    };
    next();
  } catch (err) {
    if (err instanceof AppError) {
      next(err);
      return;
    }
    next(new AppError(401, 'Unauthorized'));
  }
}

export function requireUser(req: AuthedRequest): AuthUser {
  if (!req.user) {
    throw new AppError(401, 'Unauthorized');
  }
  return req.user;
}

export function optionalAuth(
  req: AuthedRequest,
  _res: Response,
  next: NextFunction,
): void {
  try {
    const auth = req.header('Authorization');
    const headerUserId = req.header('X-User-Id');
    if (!auth && !headerUserId) {
      next();
      return;
    }
    authenticate(req, _res, next);
  } catch {
    next();
  }
}
