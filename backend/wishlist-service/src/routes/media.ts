import { Router, Response, NextFunction } from 'express';
import fs from 'fs';
import { AppError } from '../types';
import { pathParam } from '../lib/access';
import {
  absolutePathForKey,
  mimeFromKey,
} from '../storage/media';

export const mediaRouter = Router();

mediaRouter.get(
  '/media/:storageKey',
  async (req, res: Response, next: NextFunction) => {
    try {
      const storageKey = pathParam(req.params.storageKey);
      if (storageKey.length > 512) {
        throw new AppError(404, 'Not found');
      }
      const filePath = absolutePathForKey(storageKey);
      if (!fs.existsSync(filePath)) {
        throw new AppError(404, 'Not found');
      }
      res.setHeader('Content-Type', mimeFromKey(storageKey));
      res.setHeader('Cache-Control', 'public, max-age=86400');
      fs.createReadStream(filePath).pipe(res);
    } catch (err) {
      next(err);
    }
  },
);
