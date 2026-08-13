import { Router, Response, NextFunction } from 'express';
import type { Pool } from 'pg';
import {
  AuthenticatedRequest,
  requireAuth,
  requireAdmin,
} from '../middleware/auth';
import { BookingService } from '../services/bookingService';
import { pool as defaultPool } from '../db/pool';
import { getEventPublisher, type EventPublisher } from '../services/kafka';

export type AdminRouterDeps = {
  db?: Pool;
  events?: EventPublisher;
};

export function createAdminRouter(deps: AdminRouterDeps = {}): Router {
  const db = deps.db || defaultPool;
  const events = deps.events || getEventPublisher();
  const getService = () => new BookingService(db, events);

  const router = Router();

  router.get(
    '/admin/bookings',
    requireAuth,
    requireAdmin,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const result = await getService().adminList({
          page: req.query.page,
          page_size: req.query.page_size,
          status: req.query.status,
          q: req.query.q,
          wishlist_id: req.query.wishlist_id,
        });
        res.json(result);
      } catch (err) {
        next(err);
      }
    },
  );

  router.post(
    '/admin/bookings/:bookingId/cancel',
    requireAuth,
    requireAdmin,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const bookingId = String(req.params.bookingId);
        const booking = await getService().cancel(req.user!, bookingId, true);
        res.json(booking);
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}

export const adminRouter = createAdminRouter();
