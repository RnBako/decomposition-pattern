import { Router, Response, NextFunction } from 'express';
import { randomBytes } from 'crypto';
import { pool } from '../db/pool';
import { authenticate, requireUser } from '../middleware/auth';
import { AuthedRequest, AppError } from '../types';
import { mapShareLink, mapCategory, mapGift, toIso } from '../lib/mappers';
import { pathParam, requireWishlistAccess } from '../lib/access';
import { publishEvent } from '../kafka/publisher';
import { publicUrlForKey } from '../storage/media';

export const shareLinksRouter = Router();

shareLinksRouter.use(authenticate);

function newToken(): string {
  return randomBytes(24).toString('base64url');
}

shareLinksRouter.get(
  '/wishlists/:wishlistId/share-link',
  async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const user = requireUser(req);
      await requireWishlistAccess(pool, pathParam(req.params.wishlistId), user, {
        ownerOnly: true,
        allowDeleted: true,
      });
      const { rows } = await pool.query(
        `SELECT * FROM share_links
         WHERE wishlist_id = $1 AND is_active = TRUE
         LIMIT 1`,
        [req.params.wishlistId],
      );
      if (!rows[0]) throw new AppError(404, 'Share link not found');
      res.json(mapShareLink(rows[0]));
    } catch (err) {
      next(err);
    }
  },
);

shareLinksRouter.post(
  '/wishlists/:wishlistId/share-link',
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

      const rotate = req.query.rotate === 'true';
      const active = await pool.query(
        `SELECT * FROM share_links
         WHERE wishlist_id = $1 AND is_active = TRUE
         LIMIT 1`,
        [wishlist.id],
      );

      if (active.rows[0] && !rotate) {
        throw new AppError(409, 'Active link already exists (pass rotate=true)');
      }

      if (active.rows[0] && rotate) {
        await pool.query(
          `UPDATE share_links
           SET is_active = FALSE, revoked_at = NOW(), updated_at = NOW()
           WHERE id = $1`,
          [active.rows[0].id],
        );
        await publishEvent({
          type: 'ShareLinkRevoked',
          key: String(wishlist.id),
          payload: {
            wishlist_id: wishlist.id,
            share_link_id: active.rows[0].id,
            token: active.rows[0].token,
            owner_id: wishlist.owner_id,
            occurred_at: new Date().toISOString(),
          },
        });
      }

      const token = newToken();
      const { rows } = await pool.query(
        `INSERT INTO share_links (wishlist_id, token, is_active)
         VALUES ($1, $2, TRUE) RETURNING *`,
        [wishlist.id, token],
      );

      await publishEvent({
        type: 'WishlistShared',
        key: String(wishlist.id),
        payload: {
          wishlist_id: wishlist.id,
          share_link_id: rows[0].id,
          token: rows[0].token,
          owner_id: wishlist.owner_id,
          occurred_at: new Date().toISOString(),
        },
      });

      res.status(201).json(mapShareLink(rows[0]));
    } catch (err) {
      next(err);
    }
  },
);

shareLinksRouter.delete(
  '/wishlists/:wishlistId/share-link',
  async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const user = requireUser(req);
      const wishlist = await requireWishlistAccess(pool, pathParam(req.params.wishlistId),
        user,
        { allowDeleted: true },
      );

      const { rows } = await pool.query(
        `SELECT * FROM share_links
         WHERE wishlist_id = $1 AND is_active = TRUE
         LIMIT 1`,
        [wishlist.id],
      );
      if (!rows[0]) throw new AppError(404, 'Share link not found');

      await pool.query(
        `UPDATE share_links
         SET is_active = FALSE, revoked_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [rows[0].id],
      );

      await publishEvent({
        type: 'ShareLinkRevoked',
        key: String(wishlist.id),
        payload: {
          wishlist_id: wishlist.id,
          share_link_id: rows[0].id,
          token: rows[0].token,
          owner_id: wishlist.owner_id,
          occurred_at: new Date().toISOString(),
        },
      });

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

/** Public share — no auth */
export const publicShareRouter = Router();

publicShareRouter.get(
  '/share/:token',
  async (req, res: Response, next: NextFunction) => {
    try {
      const token = pathParam(req.params.token);
      if (token.length < 16 || token.length > 128) {
        throw new AppError(404, 'Not found');
      }

      const linkRes = await pool.query(
        `SELECT sl.wishlist_id, w.owner_id,
                w.title, w.description, w.event_date, w.booking_deadline
         FROM share_links sl
         JOIN wishlists w ON w.id = sl.wishlist_id
         WHERE sl.token = $1 AND sl.is_active = TRUE AND w.deleted_at IS NULL`,
        [token],
      );
      if (!linkRes.rows[0]) throw new AppError(404, 'Not found');

      const row = linkRes.rows[0];
      const wishlistId = row.wishlist_id as string;

      const [cats, gifts] = await Promise.all([
        pool.query(
          `SELECT * FROM categories WHERE wishlist_id = $1 ORDER BY sort_order, created_at`,
          [wishlistId],
        ),
        pool.query(
          `SELECT * FROM gifts WHERE wishlist_id = $1 AND deleted_at IS NULL
           ORDER BY created_at`,
          [wishlistId],
        ),
      ]);

      const deadline = new Date(row.booking_deadline);
      const bookingOpen = Date.now() < deadline.getTime();

      res.json({
        wishlist: {
          id: wishlistId,
          owner_id: String(row.owner_id),
          title: row.title,
          description: row.description ?? null,
          event_date:
            row.event_date instanceof Date
              ? row.event_date.toISOString().slice(0, 10)
              : String(row.event_date).slice(0, 10),
          booking_deadline: toIso(row.booking_deadline),
          booking_open: bookingOpen,
        },
        categories: cats.rows.map(mapCategory),
        gifts: gifts.rows.map((g) => {
          const mapped = mapGift(g);
          let imageUrl = mapped.image_url;
          if (!imageUrl && mapped.image_storage_key) {
            imageUrl = publicUrlForKey(String(mapped.image_storage_key));
          }
          return {
            id: mapped.id,
            category_id: mapped.category_id,
            title: mapped.title,
            url: mapped.url,
            price: mapped.price,
            currency: mapped.currency,
            image_url: imageUrl,
            notes: mapped.notes,
            is_occupied: mapped.is_occupied,
          };
        }),
      });
    } catch (err) {
      next(err);
    }
  },
);
