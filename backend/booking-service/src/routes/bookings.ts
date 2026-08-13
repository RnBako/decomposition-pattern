import { Router, Response, NextFunction } from 'express';
import type { Pool } from 'pg';
import {
  AuthenticatedRequest,
  requireAuth,
} from '../middleware/auth';
import { BookingService } from '../services/bookingService';
import { AppError, CreateBookingInput } from '../types';
import { pool as defaultPool } from '../db/pool';
import { getEventPublisher, type EventPublisher } from '../services/kafka';

export type BookingsRouterDeps = {
  db?: Pool;
  events?: EventPublisher;
};

export function createBookingsRouter(
  deps: BookingsRouterDeps = {},
): Router {
  const db = deps.db || defaultPool;
  const events = deps.events || getEventPublisher();
  const getService = () => new BookingService(db, events);

  const router = Router();

  router.post(
    '/bookings',
    requireAuth,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const body = req.body as Partial<CreateBookingInput>;
        const required = [
          'gift_id',
          'gift_title',
          'wishlist_id',
          'wishlist_owner_id',
          'booking_deadline',
        ] as const;
        for (const field of required) {
          if (!body[field]) {
            throw new AppError(400, `Missing field: ${field}`, 'BAD_REQUEST');
          }
        }
        const booking = await getService().create(req.user!, {
          gift_id: String(body.gift_id),
          gift_title: String(body.gift_title),
          wishlist_id: String(body.wishlist_id),
          wishlist_owner_id: String(body.wishlist_owner_id),
          booking_deadline: String(body.booking_deadline),
        });
        res.status(201).json(booking);
      } catch (err) {
        next(err);
      }
    },
  );

  router.get(
    '/bookings',
    requireAuth,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const wishlistId = String(req.query.wishlist_id || '');
        if (!wishlistId) {
          throw new AppError(400, 'wishlist_id is required', 'BAD_REQUEST');
        }
        const result = await getService().listByWishlist(req.user!, wishlistId, {
          page: req.query.page,
          page_size: req.query.page_size,
          status: req.query.status,
        });
        res.json(result);
      } catch (err) {
        next(err);
      }
    },
  );

  router.get(
    '/bookings/me',
    requireAuth,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const result = await getService().listMine(req.user!, {
          page: req.query.page,
          page_size: req.query.page_size,
          status: req.query.status,
        });
        res.json(result);
      } catch (err) {
        next(err);
      }
    },
  );

  router.get(
    '/bookings/status',
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const giftIds = String(req.query.gift_ids || '');
        const result = await getService().publicStatus(giftIds);
        res.json(result);
      } catch (err) {
        next(err);
      }
    },
  );

  router.post(
    '/bookings/:bookingId/cancel',
    requireAuth,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const bookingId = String(req.params.bookingId);
        const booking = await getService().cancel(req.user!, bookingId, false);
        res.json(booking);
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}

export const bookingsRouter = createBookingsRouter();
