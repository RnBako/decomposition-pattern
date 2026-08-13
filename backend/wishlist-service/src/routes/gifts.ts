import { Router, Response, NextFunction } from 'express';
import multer from 'multer';
import { pool } from '../db/pool';
import { authenticate, requireUser } from '../middleware/auth';
import { AuthedRequest, AppError } from '../types';
import { mapGift } from '../lib/mappers';
import {
  pathParam,
  requireWishlistAccess,
  countActiveGifts,
} from '../lib/access';
import { publishEvent } from '../kafka/publisher';
import { config } from '../config';
import {
  assertAllowedMime,
  buildStorageKey,
  writeUpload,
  deleteUpload,
  publicUrlForKey,
} from '../storage/media';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxImageBytes },
});

export const giftsRouter = Router();

giftsRouter.use(authenticate);

giftsRouter.get(
  '/wishlists/:wishlistId/gifts',
  async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const user = requireUser(req);
      await requireWishlistAccess(pool, pathParam(req.params.wishlistId), user, {
        allowDeleted: true,
      });

      const includeDeleted = req.query.include_deleted === 'true';
      const uncategorized = req.query.uncategorized === 'true';
      const categoryId = req.query.category_id
        ? String(req.query.category_id)
        : null;
      const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
      const pageSize = Math.min(
        100,
        Math.max(1, parseInt(String(req.query.page_size || '50'), 10) || 50),
      );
      const offset = (page - 1) * pageSize;

      const conditions = ['wishlist_id = $1'];
      const params: unknown[] = [req.params.wishlistId];
      let i = 2;

      if (!includeDeleted) {
        conditions.push('deleted_at IS NULL');
      }
      if (uncategorized) {
        conditions.push('category_id IS NULL');
      } else if (categoryId) {
        conditions.push(`category_id = $${i++}`);
        params.push(categoryId);
      }

      const where = conditions.join(' AND ');
      const countRes = await pool.query(
        `SELECT COUNT(*)::int AS total FROM gifts WHERE ${where}`,
        params,
      );
      const { rows } = await pool.query(
        `SELECT * FROM gifts WHERE ${where}
         ORDER BY created_at
         LIMIT $${i++} OFFSET $${i}`,
        [...params, pageSize, offset],
      );

      res.json({
        items: rows.map(mapGift),
        page,
        page_size: pageSize,
        total: Number(countRes.rows[0].total),
      });
    } catch (err) {
      next(err);
    }
  },
);

giftsRouter.post(
  '/wishlists/:wishlistId/gifts',
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
      const { title, url, price, currency, category_id, image_url, notes } = body;
      if (!title || typeof title !== 'string' || title.length > 255) {
        throw new AppError(400, 'title is required');
      }
      if (!url || typeof url !== 'string') {
        throw new AppError(400, 'url is required');
      }
      if (price == null || Number(price) < 0) {
        throw new AppError(400, 'price must be >= 0');
      }
      const cur = currency ?? 'RUB';
      if (cur !== 'RUB') {
        throw new AppError(400, 'currency must be RUB');
      }

      const count = await countActiveGifts(pool, String(wishlist.id));
      if (count >= config.maxGiftsPerWishlist) {
        throw new AppError(409, 'Gift limit reached (200)');
      }

      if (category_id) {
        const cat = await pool.query(
          `SELECT 1 FROM categories WHERE id = $1 AND wishlist_id = $2`,
          [category_id, wishlist.id],
        );
        if (!cat.rows[0]) {
          throw new AppError(400, 'Invalid category_id');
        }
      }

      const { rows } = await pool.query(
        `INSERT INTO gifts
          (wishlist_id, category_id, title, url, price, currency, image_url, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         RETURNING *`,
        [
          wishlist.id,
          category_id ?? null,
          title.trim(),
          url,
          price,
          cur,
          image_url ?? null,
          notes ?? null,
        ],
      );
      res.status(201).json(mapGift(rows[0]));
    } catch (err) {
      next(err);
    }
  },
);

giftsRouter.get(
  '/wishlists/:wishlistId/gifts/:giftId',
  async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const user = requireUser(req);
      await requireWishlistAccess(pool, pathParam(req.params.wishlistId), user, {
        allowDeleted: true,
      });
      const { rows } = await pool.query(
        `SELECT * FROM gifts WHERE id = $1 AND wishlist_id = $2`,
        [req.params.giftId, req.params.wishlistId],
      );
      if (!rows[0]) throw new AppError(404, 'Gift not found');
      res.json(mapGift(rows[0]));
    } catch (err) {
      next(err);
    }
  },
);

giftsRouter.patch(
  '/wishlists/:wishlistId/gifts/:giftId',
  async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const user = requireUser(req);
      await requireWishlistAccess(pool, pathParam(req.params.wishlistId), user, {
        ownerOnly: true,
      });

      const { rows: existing } = await pool.query(
        `SELECT * FROM gifts WHERE id = $1 AND wishlist_id = $2`,
        [req.params.giftId, req.params.wishlistId],
      );
      if (!existing[0]) throw new AppError(404, 'Gift not found');
      if (existing[0].deleted_at) {
        throw new AppError(409, 'Gift is soft-deleted');
      }

      const body = req.body ?? {};
      const g = existing[0];
      const title = body.title !== undefined ? body.title : g.title;
      const url = body.url !== undefined ? body.url : g.url;
      const price = body.price !== undefined ? body.price : g.price;
      const currency = body.currency !== undefined ? body.currency : g.currency;
      const category_id =
        body.category_id !== undefined ? body.category_id : g.category_id;
      const image_url =
        body.image_url !== undefined ? body.image_url : g.image_url;
      const notes = body.notes !== undefined ? body.notes : g.notes;

      if (!title || String(title).length > 255) {
        throw new AppError(400, 'Invalid title');
      }
      if (Number(price) < 0) throw new AppError(400, 'price must be >= 0');
      if (currency !== 'RUB') throw new AppError(400, 'currency must be RUB');

      const { rows } = await pool.query(
        `UPDATE gifts SET
           title = $1, url = $2, price = $3, currency = $4,
           category_id = $5, image_url = $6, notes = $7, updated_at = NOW()
         WHERE id = $8 RETURNING *`,
        [
          String(title).trim(),
          url,
          price,
          currency,
          category_id ?? null,
          image_url ?? null,
          notes ?? null,
          req.params.giftId,
        ],
      );
      res.json(mapGift(rows[0]));
    } catch (err) {
      next(err);
    }
  },
);

giftsRouter.delete(
  '/wishlists/:wishlistId/gifts/:giftId',
  async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const user = requireUser(req);
      const wishlist = await requireWishlistAccess(pool, pathParam(req.params.wishlistId),
        user,
        { allowDeleted: true },
      );

      const { rows } = await pool.query(
        `SELECT * FROM gifts WHERE id = $1 AND wishlist_id = $2`,
        [req.params.giftId, req.params.wishlistId],
      );
      if (!rows[0]) throw new AppError(404, 'Gift not found');
      if (rows[0].deleted_at) {
        res.status(204).send();
        return;
      }

      await pool.query(
        `UPDATE gifts SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1`,
        [req.params.giftId],
      );

      await publishEvent({
        type: 'GiftSoftDeleted',
        key: String(req.params.giftId),
        payload: {
          gift_id: req.params.giftId,
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

giftsRouter.post(
  '/wishlists/:wishlistId/gifts/:giftId/restore',
  async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const user = requireUser(req);
      await requireWishlistAccess(pool, pathParam(req.params.wishlistId), user, {
        allowDeleted: true,
      });

      const { rows: existing } = await pool.query(
        `SELECT * FROM gifts WHERE id = $1 AND wishlist_id = $2`,
        [req.params.giftId, req.params.wishlistId],
      );
      if (!existing[0]) throw new AppError(404, 'Gift not found');
      if (!existing[0].deleted_at) {
        throw new AppError(409, 'Gift is not deleted');
      }

      const count = await countActiveGifts(pool, pathParam(req.params.wishlistId));
      if (count >= config.maxGiftsPerWishlist) {
        throw new AppError(409, 'Cannot restore: would exceed 200 gifts');
      }

      const { rows } = await pool.query(
        `UPDATE gifts SET deleted_at = NULL, updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [req.params.giftId],
      );
      res.json(mapGift(rows[0]));
    } catch (err) {
      next(err);
    }
  },
);

giftsRouter.post(
  '/wishlists/:wishlistId/gifts/:giftId/image',
  upload.single('file'),
  async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const user = requireUser(req);
      await requireWishlistAccess(pool, pathParam(req.params.wishlistId), user, {
        ownerOnly: true,
      });

      const { rows: existing } = await pool.query(
        `SELECT * FROM gifts WHERE id = $1 AND wishlist_id = $2`,
        [req.params.giftId, req.params.wishlistId],
      );
      if (!existing[0]) throw new AppError(404, 'Gift not found');
      if (existing[0].deleted_at) {
        throw new AppError(409, 'Gift is soft-deleted');
      }

      const file = req.file;
      if (!file) throw new AppError(400, 'file is required');
      if (file.size > config.maxImageBytes) {
        throw new AppError(400, 'Image exceeds 5MB limit');
      }
      assertAllowedMime(file.mimetype);

      const clearExternal =
        req.body?.clear_external_url !== 'false' &&
        req.body?.clear_external_url !== false;

      const storageKey = buildStorageKey(pathParam(req.params.giftId), file.mimetype);
      writeUpload(storageKey, file.buffer);
      deleteUpload(existing[0].image_storage_key);

      const imageUrl = clearExternal ? publicUrlForKey(storageKey) : existing[0].image_url;

      const { rows } = await pool.query(
        `UPDATE gifts SET
           image_storage_key = $1,
           image_url = $2,
           updated_at = NOW()
         WHERE id = $3 RETURNING *`,
        [
          storageKey,
          clearExternal ? publicUrlForKey(storageKey) : imageUrl,
          req.params.giftId,
        ],
      );
      res.json(mapGift(rows[0]));
    } catch (err) {
      next(err);
    }
  },
);

giftsRouter.delete(
  '/wishlists/:wishlistId/gifts/:giftId/image',
  async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const user = requireUser(req);
      await requireWishlistAccess(pool, pathParam(req.params.wishlistId), user, {
        ownerOnly: true,
      });

      const { rows: existing } = await pool.query(
        `SELECT * FROM gifts WHERE id = $1 AND wishlist_id = $2`,
        [req.params.giftId, req.params.wishlistId],
      );
      if (!existing[0]) throw new AppError(404, 'Gift not found');

      const clearExternal = req.query.clear_external_url === 'true';
      deleteUpload(existing[0].image_storage_key);

      const { rows } = await pool.query(
        `UPDATE gifts SET
           image_storage_key = NULL,
           image_url = CASE WHEN $1::boolean THEN NULL ELSE image_url END,
           updated_at = NOW()
         WHERE id = $2 RETURNING *`,
        [clearExternal, req.params.giftId],
      );
      res.json(mapGift(rows[0]));
    } catch (err) {
      next(err);
    }
  },
);
