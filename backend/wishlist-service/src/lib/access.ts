import { Pool } from 'pg';
import { AppError, AuthUser } from '../types';
import { assertDeadlineVsEvent } from '../lib/mappers';

export { assertDeadlineVsEvent };

export function pathParam(value: string | string[] | undefined): string {
  const v = Array.isArray(value) ? value[0] : value;
  if (!v) throw new AppError(400, 'Missing path parameter');
  return v;
}

export async function getWishlistRow(
  pool: Pool,
  wishlistId: string,
): Promise<Record<string, unknown> | null> {
  const { rows } = await pool.query('SELECT * FROM wishlists WHERE id = $1', [
    wishlistId,
  ]);
  return rows[0] ?? null;
}

export function assertOwnerOrAdmin(
  wishlist: Record<string, unknown>,
  user: AuthUser,
): void {
  if (user.role === 'admin') return;
  if (wishlist.owner_id !== user.id) {
    throw new AppError(403, 'Forbidden');
  }
}

export function assertOwnerOnly(
  wishlist: Record<string, unknown>,
  user: AuthUser,
): void {
  if (wishlist.owner_id !== user.id) {
    throw new AppError(403, 'Forbidden');
  }
}

export async function requireWishlistAccess(
  pool: Pool,
  wishlistId: string,
  user: AuthUser,
  opts: { ownerOnly?: boolean; allowDeleted?: boolean } = {},
): Promise<Record<string, unknown>> {
  const wishlist = await getWishlistRow(pool, wishlistId);
  if (!wishlist) {
    throw new AppError(404, 'Wishlist not found');
  }
  if (opts.ownerOnly) {
    assertOwnerOnly(wishlist, user);
  } else {
    assertOwnerOrAdmin(wishlist, user);
  }
  if (!opts.allowDeleted && wishlist.deleted_at) {
    // owner/admin can still fetch for restore/trash flows when allowDeleted
    // for ordinary mutations we treat soft-deleted as conflict or not found depending on endpoint
  }
  return wishlist;
}

export function validateDeadline(eventDate: string, bookingDeadline: string): void {
  try {
    assertDeadlineVsEvent(eventDate, bookingDeadline);
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : 'booking_deadline must be ≤ event_date';
    throw new AppError(400, msg);
  }
}

export async function countActiveWishlists(
  pool: Pool,
  ownerId: string,
): Promise<number> {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS c FROM wishlists
     WHERE owner_id = $1 AND deleted_at IS NULL`,
    [ownerId],
  );
  return Number(rows[0].c);
}

export async function countActiveGifts(
  pool: Pool,
  wishlistId: string,
): Promise<number> {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS c FROM gifts
     WHERE wishlist_id = $1 AND deleted_at IS NULL`,
    [wishlistId],
  );
  return Number(rows[0].c);
}
