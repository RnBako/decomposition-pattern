import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import type { Pool } from 'pg';
import { healthRouter } from './routes/health';
import { createBookingsRouter } from './routes/bookings';
import { createAdminRouter } from './routes/admin';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { pool as defaultPool } from './db/pool';
import { getEventPublisher, type EventPublisher } from './services/kafka';

export type AppDeps = {
  db?: Pool;
  events?: EventPublisher;
};

export function createApp(deps: AppDeps = {}): express.Application {
  const db = deps.db || defaultPool;
  const events = deps.events || getEventPublisher();

  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(healthRouter);
  app.use(createBookingsRouter({ db, events }));
  app.use(createAdminRouter({ db, events }));
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
