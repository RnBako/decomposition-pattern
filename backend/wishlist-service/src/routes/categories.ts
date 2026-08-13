import { Router, Response, NextFunction } from 'express';
import { pool } from '../db/pool';
import { authenticate, requireUser } from '../middleware/auth';
import { AuthedRequest, AppError } from '../types';
import { mapCategory } from '../lib/mappers';
import { pathParam, requireWishlistAccess } from '../lib/access';

export const categoriesRouter = Router();

categoriesRouter.use(authenticate);

categoriesRouter.get(
  '/wishlists/:wishlistId/categories',
  async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const user = requireUser(req);
      await requireWishlistAccess(pool, pathParam(req.params.wishlistId), user, {
        allowDeleted: true,
      });
      const { rows } = await pool.query(
        `SELECT * FROM categories WHERE wishlist_id = $1
         ORDER BY sort_order, created_at`,
        [req.params.wishlistId],
      );
      res.json({ items: rows.map(mapCategory) });
    } catch (err) {
      next(err);
    }
  },
);

categoriesRouter.post(
  '/wishlists/:wishlistId/categories',
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

      const { name, sort_order } = req.body ?? {};
      if (!name || typeof name !== 'string' || name.length > 120) {
        throw new AppError(400, 'name is required (1..120)');
      }

      try {
        const { rows } = await pool.query(
          `INSERT INTO categories (wishlist_id, name, sort_order)
           VALUES ($1, $2, $3) RETURNING *`,
          [wishlist.id, name.trim(), sort_order ?? 0],
        );
        res.status(201).json(mapCategory(rows[0]));
      } catch (e: unknown) {
        if (
          e &&
          typeof e === 'object' &&
          'code' in e &&
          (e as { code: string }).code === '23505'
        ) {
          throw new AppError(409, 'Duplicate category name in wishlist');
        }
        throw e;
      }
    } catch (err) {
      next(err);
    }
  },
);

categoriesRouter.patch(
  '/wishlists/:wishlistId/categories/:categoryId',
  async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const user = requireUser(req);
      await requireWishlistAccess(pool, pathParam(req.params.wishlistId), user, {
        ownerOnly: true,
      });

      const { rows: existing } = await pool.query(
        `SELECT * FROM categories WHERE id = $1 AND wishlist_id = $2`,
        [req.params.categoryId, req.params.wishlistId],
      );
      if (!existing[0]) {
        throw new AppError(404, 'Category not found');
      }

      const body = req.body ?? {};
      const name =
        body.name !== undefined ? String(body.name).trim() : existing[0].name;
      const sort_order =
        body.sort_order !== undefined ? body.sort_order : existing[0].sort_order;
      if (!name || name.length > 120) {
        throw new AppError(400, 'Invalid name');
      }

      try {
        const { rows } = await pool.query(
          `UPDATE categories SET name = $1, sort_order = $2, updated_at = NOW()
           WHERE id = $3 RETURNING *`,
          [name, sort_order, req.params.categoryId],
        );
        res.json(mapCategory(rows[0]));
      } catch (e: unknown) {
        if (
          e &&
          typeof e === 'object' &&
          'code' in e &&
          (e as { code: string }).code === '23505'
        ) {
          throw new AppError(409, 'Duplicate category name');
        }
        throw e;
      }
    } catch (err) {
      next(err);
    }
  },
);

categoriesRouter.delete(
  '/wishlists/:wishlistId/categories/:categoryId',
  async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const user = requireUser(req);
      await requireWishlistAccess(pool, pathParam(req.params.wishlistId), user, {
        ownerOnly: true,
      });

      const { rowCount } = await pool.query(
        `DELETE FROM categories WHERE id = $1 AND wishlist_id = $2`,
        [req.params.categoryId, req.params.wishlistId],
      );
      if (!rowCount) {
        throw new AppError(404, 'Category not found');
      }
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);
