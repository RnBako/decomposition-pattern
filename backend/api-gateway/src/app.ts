import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { createEdgeAuthMiddleware } from './middleware/auth';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { createHealthRouter } from './routes/health';
import { createProxyRouter } from './routes/proxy';

export type AppDeps = {
  jwtSecret?: string;
  jwtValidateAtEdge?: boolean;
};

export function createApp(deps: AppDeps = {}): express.Application {
  const jwtSecret = deps.jwtSecret ?? config.jwtSecret;
  const jwtValidateAtEdge = deps.jwtValidateAtEdge ?? config.jwtValidateAtEdge;

  const app = express();

  app.use(
    helmet({
      // Allow SPA to embed proxied images from same gateway origin.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.use(
    cors({
      origin: config.corsOrigins,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Authorization', 'Content-Type', 'Accept'],
      credentials: false,
    }),
  );

  // Local health only — no body parser needed for JSON health responses.
  app.use(createHealthRouter());

  app.use(
    createEdgeAuthMiddleware({
      jwtSecret,
      validateAtEdge: jwtValidateAtEdge,
    }),
  );

  app.use(createProxyRouter());

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
