import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { healthRouter } from './routes/health';
import { createAuthRouter } from './routes/auth';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { pool, type Db } from './db/pool';
import { config } from './config';
import { createNoopPublisher, type EventPublisher } from './services/kafka';

export type AppDeps = {
  db?: Db;
  jwtSecret?: string;
  jwtExpiresIn?: number;
  events?: EventPublisher;
};

export function createApp(deps: AppDeps = {}): express.Application {
  const db = deps.db || pool;
  const jwtSecret = deps.jwtSecret || config.jwtSecret;
  const jwtExpiresIn = deps.jwtExpiresIn ?? config.jwtExpiresIn;
  const events = deps.events || createNoopPublisher();

  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(healthRouter);
  app.use(
    createAuthRouter({
      db,
      jwtSecret,
      jwtExpiresIn,
      events,
    }),
  );
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
