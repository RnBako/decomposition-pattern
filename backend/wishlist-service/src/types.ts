import { Request } from 'express';

export type UserRole = 'user' | 'admin';

export interface AuthUser {
  id: string;
  role: UserRole;
  email?: string;
  displayName?: string;
}

export interface AuthedRequest extends Request {
  user?: AuthUser;
}

export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
