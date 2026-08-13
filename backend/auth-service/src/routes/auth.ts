import { Router, Response, NextFunction } from 'express';
import type { Db } from '../db/pool';
import { HttpError } from '../middleware/errorHandler';
import { createAuthMiddleware, type AuthedRequest } from '../middleware/auth';
import { hashPassword, verifyPassword, signAccessToken } from '../services/password';
import {
  createUser,
  findActiveUserByEmail,
  findActiveUserById,
  findUserByEmail,
} from '../services/users';
import { toUserPublic } from '../types';
import type { EventPublisher } from '../services/kafka';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateRegisterBody(body: unknown): {
  email: string;
  password: string;
  display_name: string;
} {
  if (!body || typeof body !== 'object') {
    throw new HttpError(400, 'validation_error', 'Некорректное тело запроса');
  }
  const { email, password, display_name } = body as Record<string, unknown>;
  if (typeof email !== 'string' || !EMAIL_RE.test(email) || email.length > 320) {
    throw new HttpError(400, 'validation_error', 'Некорректный email');
  }
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
    throw new HttpError(400, 'validation_error', 'Пароль должен быть от 8 до 128 символов');
  }
  if (typeof display_name !== 'string' || display_name.trim().length < 1 || display_name.length > 120) {
    throw new HttpError(400, 'validation_error', 'Некорректное отображаемое имя');
  }
  return { email: email.trim(), password, display_name: display_name.trim() };
}

function validateLoginBody(body: unknown): { email: string; password: string } {
  if (!body || typeof body !== 'object') {
    throw new HttpError(400, 'validation_error', 'Некорректное тело запроса');
  }
  const { email, password } = body as Record<string, unknown>;
  if (typeof email !== 'string' || !EMAIL_RE.test(email)) {
    throw new HttpError(401, 'invalid_credentials', 'Неверный email или пароль');
  }
  if (typeof password !== 'string' || !password) {
    throw new HttpError(401, 'invalid_credentials', 'Неверный email или пароль');
  }
  return { email: email.trim(), password };
}

export function createAuthRouter(options: {
  db: Db;
  jwtSecret: string;
  jwtExpiresIn: number;
  events: EventPublisher;
}): Router {
  const router = Router();
  const requireAuth = createAuthMiddleware(options.jwtSecret);

  router.post('/auth/register', async (req, res, next) => {
    try {
      const input = validateRegisterBody(req.body);
      const existing = await findUserByEmail(options.db, input.email);
      if (existing) {
        throw new HttpError(409, 'email_taken', 'Email уже зарегистрирован');
      }
      const passwordHash = await hashPassword(input.password);
      const user = await createUser(options.db, {
        email: input.email,
        passwordHash,
        displayName: input.display_name,
        role: 'user',
      });
      const publicUser = toUserPublic(user);
      const access_token = signAccessToken(
        {
          sub: user.id,
          email: user.email,
          role: user.role,
          display_name: user.display_name,
        },
        options.jwtSecret,
        options.jwtExpiresIn,
      );

      void options.events.publishUserRegistered({
        type: 'UserRegistered',
        occurred_at: new Date().toISOString(),
        user: {
          id: user.id,
          email: user.email,
          display_name: user.display_name,
          role: user.role,
        },
      });

      res.status(201).json({
        access_token,
        token_type: 'Bearer',
        expires_in: options.jwtExpiresIn,
        user: publicUser,
      });
    } catch (err) {
      next(err);
    }
  });

  router.post('/auth/login', async (req, res, next) => {
    try {
      const input = validateLoginBody(req.body);
      const user = await findActiveUserByEmail(options.db, input.email);
      if (!user) {
        throw new HttpError(401, 'invalid_credentials', 'Неверный email или пароль');
      }
      const ok = await verifyPassword(input.password, user.password_hash);
      if (!ok) {
        throw new HttpError(401, 'invalid_credentials', 'Неверный email или пароль');
      }
      const access_token = signAccessToken(
        {
          sub: user.id,
          email: user.email,
          role: user.role,
          display_name: user.display_name,
        },
        options.jwtSecret,
        options.jwtExpiresIn,
      );
      res.status(200).json({
        access_token,
        token_type: 'Bearer',
        expires_in: options.jwtExpiresIn,
        user: toUserPublic(user),
      });
    } catch (err) {
      next(err);
    }
  });

  router.post(
    '/auth/logout',
    requireAuth,
    (_req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        // Stateless JWT: client must discard token; best-effort 204.
        res.status(204).send();
      } catch (err) {
        next(err);
      }
    },
  );

  router.get('/auth/me', requireAuth, async (req: AuthedRequest, res, next) => {
    try {
      const user = await findActiveUserById(options.db, req.auth!.sub);
      if (!user) {
        throw new HttpError(401, 'unauthorized', 'Пользователь не найден');
      }
      res.json(toUserPublic(user));
    } catch (err) {
      next(err);
    }
  });

  router.get('/auth/users/:id', requireAuth, async (req: AuthedRequest, res, next) => {
    try {
      const id = String(req.params.id || '');
      const uuidRe =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRe.test(id)) {
        throw new HttpError(404, 'not_found', 'Пользователь не найден');
      }
      const user = await findActiveUserById(options.db, id);
      if (!user) {
        throw new HttpError(404, 'not_found', 'Пользователь не найден');
      }
      res.json(toUserPublic(user));
    } catch (err) {
      next(err);
    }
  });

  return router;
}
