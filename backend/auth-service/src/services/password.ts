import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { UserRole } from '../types';

const BCRYPT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export type TokenPayload = {
  sub: string;
  email: string;
  role: UserRole;
  display_name: string;
};

export function signAccessToken(
  payload: TokenPayload,
  secret: string,
  expiresInSeconds: number,
): string {
  return jwt.sign(
    {
      email: payload.email,
      role: payload.role,
      display_name: payload.display_name,
    },
    secret,
    {
      subject: payload.sub,
      expiresIn: expiresInSeconds,
    },
  );
}
