import { Router, Response, NextFunction } from 'express';
import { pool } from '../db/pool';
import { authenticate, requireUser } from '../middleware/auth';
import { AuthedRequest, AppError } from '../types';
import { mapWishlist, mapCategory, mapGift, mapShareLink } from '../lib/mappers';
import {
  pathParam,
  requireWishlistAccess,
  validateDeadline,
  countActiveWishlists,
} from '../lib/access';
import { publishEvent } from '../kafka/publisher';
import { config } from '../config';

export const wishlistsRouter = Router();

wishlistsRouter.use(authenticate);

wishlistsRouter.get(
  '/wishlists',
  async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const user = requireUser(req);
      const includeDeleted = req.query.include_deleted === 'true';
      const { rows } = await pool.query(
        `
        SELECT w.*,
          COALESCE(gc.gifts_count, 0) AS gifts_count,
          COALESCE(cc.categories_count, 0) AS categories_count,
          COALESCE(sc.has_active_share_link, FALSE) AS has_active_share_link
        FROM wishlists w
        LEFT JOIN (
          SELECT wishlist_id, COUNT(*)::int AS gifts_count
          FROM gifts
          WHERE deleted_at IS NULL
          GROUP BY wishlist_id
        ) gc ON gc.wishlist_id = w.id
        LEFT JOIN (
          SELECT wishlist_id, COUNT(*)::int AS categories_count
          FROM categories
          GROUP BY wishlist_id
        ) cc ON cc.wishlist_id = w.id
        LEFT JOIN (
          SELECT DISTINCT wishlist_id, TRUE AS has_active_share_link
          FROM share_links
          WHERE is_active = TRUE
        ) sc ON sc.wishlist_id = w.id
        WHERE w.owner_id = $1
          ${includeDeleted ? '' : 'AND w.deleted_at IS NULL'}
        ORDER BY w.created_at DESC
        `,
        [user.id],
      );
      res.json({
        items: rows.map((r) => ({
          ...mapWishlist(r),
          gifts_count: Number(r.gifts_count),
          categories_count: Number(r.categories_count),
          has_active_share_link: Boolean(r.has_active_share_link),
        })),
      });
    } catch (err) {
      next(err);
    }
  },
);

wishlistsRouter.post(
  '/wishlists',
  async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const user = requireUser(req);
      const { title, description, event_date, booking_deadline } = req.body ?? {};
      if (
        !title ||
        typeof title !== 'string' ||
        title.length < 1 ||
        title.length > 255
      ) {
        throw new AppError(400, 'title is required (1..255)');
      }
      if (!event_date || !booking_deadline) {
        throw new AppError(400, 'event_date and booking_deadline are required');
      }
      validateDeadline(String(event_date), String(booking_deadline));

      const count = await countActiveWishlists(pool, user.id);
      if (count >= config.maxWishlistsPerUser) {
        throw new AppError(409, 'Wishlist limit reached (20)');
      }

      const { rows } = await pool.query(
        `INSERT INTO wishlists (owner_id, title, description, event_date, booking_deadline)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          user.id,
          title.trim(),
          description ?? null,
          event_date,
          booking_deadline,
        ],
      );
      res.status(201).json(mapWishlist(rows[0]));
    } catch (err) {
      next(err);
    }
  },
);

wishlistsRouter.get(
  '/wishlists/:wishlistId',
  async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const user = requireUser(req);
      const wishlist = await requireWishlistAccess(pool, pathParam(req.params.wishlistId),
        user,
        { allowDeleted: true },
      );
      const includeDeletedGifts = req.query.include_deleted_gifts === 'true';

      const [cats, gifts, share] = await Promise.all([
        pool.query(
          `SELECT * FROM categories WHERE wishlist_id = $1 ORDER BY sort_order, created_at`,
          [wishlist.id],
        ),
        pool.query(
          `SELECT * FROM gifts WHERE wishlist_id = $1
           AND ($2::boolean OR deleted_at IS NULL)
           ORDER BY created_at`,
          [wishlist.id, includeDeletedGifts],
        ),
        pool.query(
          `SELECT * FROM share_links
           WHERE wishlist_id = $1 AND is_active = TRUE
           LIMIT 1`,
          [wishlist.id],
        ),
      ]);

      res.json({
        ...mapWishlist(wishlist),
        categories: cats.rows.map(mapCategory),
        gifts: gifts.rows.map(mapGift),
        share_link: share.rows[0] ? mapShareLink(share.rows[0]) : null,
      });
    } catch (err) {
      next(err);
    }
  },
);

wishlistsRouter.patch(
  '/wishlists/:wishlistId',
  async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const user = requireUser(req);
      const wishlist = await requireWishlistAccess(pool, pathParam(req.params.wishlistId),
        user,
        { ownerOnly: true, allowDeleted: true },
      );
      if (wishlist.deleted_at) {
        throw new AppError(409, 'Wishlist is soft-deleted');
      }

      const body = req.body ?? {};
      const title = body.title !== undefined ? body.title : wishlist.title;
      const description =
        body.description !== undefined ? body.description : wishlist.description;
      const event_date =
        body.event_date !== undefined ? body.event_date : wishlist.event_date;
      const booking_deadline =
        body.booking_deadline !== undefined
          ? body.booking_deadline
          : wishlist.booking_deadline;

      if (
        typeof title !== 'string' ||
        title.length < 1 ||
        title.length > 255
      ) {
        throw new AppError(400, 'Invalid title');
      }
      const eventDateStr =
        event_date instanceof Date
          ? event_date.toISOString().slice(0, 10)
          : String(event_date).slice(0, 10);
      const deadlineStr =
        booking_deadline instanceof Date
          ? booking_deadline.toISOString()
          : String(booking_deadline);
      validateDeadline(eventDateStr, deadlineStr);

      const { rows } = await pool.query(
        `UPDATE wishlists
         SET title = $1, description = $2, event_date = $3,
             booking_deadline = $4, updated_at = NOW()
         WHERE id = $5
         RETURNING *`,
        [title.trim(), description ?? null, eventDateStr, deadlineStr, wishlist.id],
      );
      res.json(mapWishlist(rows[0]));
    } catch (err) {
      next(err);
    }
  },
);

wishlistsRouter.delete(
  '/wishlists/:wishlistId',
  async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const user = requireUser(req);
      const wishlist = await requireWishlistAccess(pool, pathParam(req.params.wishlistId),
        user,
        { allowDeleted: true },
      );
      if (wishlist.deleted_at) {
        res.status(204).send();
        return;
      }

      await pool.query(
        `UPDATE wishlists SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1`,
        [wishlist.id],
      );

      await publishEvent({
        type: 'WishlistSoftDeleted',
        key: String(wishlist.id),
        payload: {
          wishlist_id: wishlist.id,
          owner_id: wishlist.owner_id,
          deleted_by_id: user.id,
          occurred_at: new Date().toISOString(),
        },
      });

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

wishlistsRouter.post(
  '/wishlists/:wishlistId/restore',
  async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const user = requireUser(req);
      const wishlist = await requireWishlistAccess(pool, pathParam(req.params.wishlistId),
        user,
        { allowDeleted: true },
      );
      if (!wishlist.deleted_at) {
        throw new AppError(409, 'Wishlist is not deleted');
      }

      const count = await countActiveWishlists(pool, String(wishlist.owner_id));
      if (count >= config.maxWishlistsPerUser) {
        throw new AppError(409, 'Cannot restore: would exceed 20 wishlists');
      }

      const { rows } = await pool.query(
        `UPDATE wishlists SET deleted_at = NULL, updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [wishlist.id],
      );
      res.json(mapWishlist(rows[0]));
    } catch (err) {
      next(err);
    }
  },
);
