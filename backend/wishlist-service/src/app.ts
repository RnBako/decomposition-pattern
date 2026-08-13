import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { healthRouter } from './routes/health';
import { wishlistsRouter } from './routes/wishlists';
import { categoriesRouter } from './routes/categories';
import { giftsRouter } from './routes/gifts';
import { shareLinksRouter, publicShareRouter } from './routes/shareLinks';
import { commentsRouter } from './routes/comments';
import { mediaRouter } from './routes/media';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { ensureUploadDir } from './storage/media';

export function createApp(): express.Application {
  ensureUploadDir();

  const app = express();
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  app.use(healthRouter);
  app.use(publicShareRouter);
  app.use(mediaRouter);
  app.use(wishlistsRouter);
  app.use(categoriesRouter);
  app.use(giftsRouter);
  app.use(shareLinksRouter);
  app.use(commentsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
