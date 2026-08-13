import { Router, Response, NextFunction } from 'express';
import { pool } from '../db/pool';
import { authenticate, requireUser } from '../middleware/auth';
import { AuthedRequest, AppError } from '../types';
import { mapComment } from '../lib/mappers';
import { pathParam, requireWishlistAccess, assertOwnerOnly } from '../lib/access';

export const commentsRouter = Router();

commentsRouter.use(authenticate);

commentsRouter.get(
  '/wishlists/:wishlistId/comments',
  async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const user = requireUser(req);
      await requireWishlistAccess(pool, pathParam(req.params.wishlistId), user, {
        allowDeleted: true,
      });
      const includeDeleted =
        req.query.include_deleted === 'true' && user.role === 'admin';

      const { rows } = await pool.query(
        `SELECT * FROM comments
         WHERE wishlist_id = $1 AND gift_id IS NULL
           AND ($2::boolean OR deleted_at IS NULL)
         ORDER BY created_at`,
        [req.params.wishlistId, includeDeleted],
      );
      res.json({ items: rows.map(mapComment) });
    } catch (err) {
      next(err);
    }
  },
);

commentsRouter.post(
  '/wishlists/:wishlistId/comments',
  async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const user = requireUser(req);
      const wishlist = await requireWishlistAccess(pool, pathParam(req.params.wishlistId),
        user,
        { allowDeleted: true },
      );
      assertOwnerOnly(wishlist, user);
      if (wishlist.deleted_at) {
        throw new AppError(409, 'Wishlist is soft-deleted');
      }

      const body = req.body?.body;
      if (!body || typeof body !== 'string' || body.trim().length === 0) {
        throw new AppError(400, 'body is required');
      }
      if (body.length > 4000) {
        throw new AppError(400, 'body too long');
      }

      const displayName =
        user.displayName || user.email || 'Owner';

      const { rows } = await pool.query(
        `INSERT INTO comments
          (author_id, author_display_name, wishlist_id, gift_id, body)
         VALUES ($1, $2, $3, NULL, $4)
         RETURNING *`,
        [user.id, displayName, wishlist.id, body.trim()],
      );
      res.status(201).json(mapComment(rows[0]));
    } catch (err) {
      next(err);
    }
  },
);

commentsRouter.get(
  '/wishlists/:wishlistId/gifts/:giftId/comments',
  async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const user = requireUser(req);
      await requireWishlistAccess(pool, pathParam(req.params.wishlistId), user, {
        allowDeleted: true,
      });

      const gift = await pool.query(
        `SELECT 1 FROM gifts WHERE id = $1 AND wishlist_id = $2`,
        [req.params.giftId, req.params.wishlistId],
      );
      if (!gift.rows[0]) throw new AppError(404, 'Gift not found');

      const includeDeleted =
        req.query.include_deleted === 'true' && user.role === 'admin';

      const { rows } = await pool.query(
        `SELECT * FROM comments
         WHERE wishlist_id = $1 AND gift_id = $2
           AND ($3::boolean OR deleted_at IS NULL)
         ORDER BY created_at`,
        [req.params.wishlistId, req.params.giftId, includeDeleted],
      );
      res.json({ items: rows.map(mapComment) });
    } catch (err) {
      next(err);
    }
  },
);

commentsRouter.post(
  '/wishlists/:wishlistId/gifts/:giftId/comments',
  async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const user = requireUser(req);
      const wishlist = await requireWishlistAccess(pool, pathParam(req.params.wishlistId),
        user,
        { allowDeleted: true },
      );
      assertOwnerOnly(wishlist, user);

      const gift = await pool.query(
        `SELECT * FROM gifts WHERE id = $1 AND wishlist_id = $2`,
        [req.params.giftId, req.params.wishlistId],
      );
      if (!gift.rows[0]) throw new AppError(404, 'Gift not found');

      const body = req.body?.body;
      if (!body || typeof body !== 'string' || body.trim().length === 0) {
        throw new AppError(400, 'body is required');
      }
      if (body.length > 4000) {
        throw new AppError(400, 'body too long');
      }

      const displayName = user.displayName || user.email || 'Owner';
      const { rows } = await pool.query(
        `INSERT INTO comments
          (author_id, author_display_name, wishlist_id, gift_id, body)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [user.id, displayName, wishlist.id, req.params.giftId, body.trim()],
      );
      res.status(201).json(mapComment(rows[0]));
    } catch (err) {
      next(err);
    }
  },
);

commentsRouter.delete(
  '/wishlists/:wishlistId/comments/:commentId',
  async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const user = requireUser(req);
      await requireWishlistAccess(pool, pathParam(req.params.wishlistId), user, {
        allowDeleted: true,
      });

      const { rows } = await pool.query(
        `SELECT * FROM comments WHERE id = $1 AND wishlist_id = $2`,
        [req.params.commentId, req.params.wishlistId],
      );
      if (!rows[0]) throw new AppError(404, 'Comment not found');

      const isAuthor = rows[0].author_id === user.id;
      if (!isAuthor && user.role !== 'admin') {
        throw new AppError(403, 'Forbidden');
      }

      await pool.query(
        `UPDATE comments SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1`,
        [req.params.commentId],
      );
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);
