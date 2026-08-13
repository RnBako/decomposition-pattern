import { Router, Response, NextFunction } from 'express';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import {
  AppError,
  isUuid,
  toNotificationDto,
} from '../types';
import {
  getById,
  getUnreadCount,
  listNotifications,
  markAllRead,
  markRead,
} from '../services/notifications';

export const notificationsRouter = Router();

function parseBool(value: unknown, defaultValue: boolean): boolean {
  if (value === undefined || value === null || value === '') return defaultValue;
  if (typeof value === 'boolean') return value;
  const s = String(value).toLowerCase();
  if (s === 'true' || s === '1') return true;
  if (s === 'false' || s === '0') return false;
  return defaultValue;
}

function parseIntParam(
  value: unknown,
  defaultValue: number,
  min: number,
  max?: number,
): number {
  const n =
    value === undefined || value === null || value === ''
      ? defaultValue
      : parseInt(String(value), 10);
  if (Number.isNaN(n) || n < min) return defaultValue;
  if (max !== undefined && n > max) return max;
  return n;
}

notificationsRouter.get(
  '/notifications',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const unreadOnly = parseBool(req.query.unread_only, false);
      const limit = parseIntParam(req.query.limit, 50, 1, 100);
      const offset = parseIntParam(req.query.offset, 0, 0);

      const { items, total } = await listNotifications({
        recipientId: user.id,
        unreadOnly,
        limit,
        offset,
      });

      res.json({
        items: items.map(toNotificationDto),
        total,
      });
    } catch (err) {
      next(err);
    }
  },
);

notificationsRouter.get(
  '/notifications/unread-count',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const count = await getUnreadCount(req.user!.id);
      res.json({ count });
    } catch (err) {
      next(err);
    }
  },
);

notificationsRouter.post(
  '/notifications/read-all',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const updated = await markAllRead(req.user!.id);
      res.json({ updated });
    } catch (err) {
      next(err);
    }
  },
);

notificationsRouter.post(
  '/notifications/:notificationId/read',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const notificationId = String(req.params.notificationId);
      if (!isUuid(notificationId)) {
        throw new AppError(404, 'Notification not found', 'NOT_FOUND');
      }

      const result = await markRead(notificationId, req.user!.id);
      if (result === 'not_found') {
        throw new AppError(404, 'Notification not found', 'NOT_FOUND');
      }
      if (result === 'forbidden') {
        throw new AppError(403, 'Forbidden', 'FORBIDDEN');
      }

      const row = await getById(notificationId);
      if (!row) {
        throw new AppError(404, 'Notification not found', 'NOT_FOUND');
      }
      res.json(toNotificationDto(row));
    } catch (err) {
      next(err);
    }
  },
);
