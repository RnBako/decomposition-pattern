import { Pool } from 'pg';
import {
  AppError,
  AuthUser,
  BookingRow,
  BookingStatus,
  CreateBookingInput,
  isUuid,
  toBookingDto,
} from '../types';
import { EventPublisher, getEventPublisher } from './kafka';

function parsePagination(query: {
  page?: unknown;
  page_size?: unknown;
}): { page: number; pageSize: number } {
  const page = Math.max(1, parseInt(String(query.page ?? '1'), 10) || 1);
  let pageSize = parseInt(String(query.page_size ?? '50'), 10) || 50;
  if (pageSize < 1) pageSize = 50;
  if (pageSize > 100) pageSize = 100;
  return { page, pageSize };
}

function mapRow(row: Record<string, unknown>): BookingRow {
  return {
    id: String(row.id),
    gift_id: String(row.gift_id),
    booker_id: String(row.booker_id),
    status: row.status as BookingStatus,
    gift_title: String(row.gift_title),
    wishlist_id: String(row.wishlist_id),
    wishlist_owner_id: String(row.wishlist_owner_id),
    booking_deadline: new Date(row.booking_deadline as string | Date),
    booker_display_name: String(row.booker_display_name),
    booker_email: String(row.booker_email),
    cancelled_at: row.cancelled_at
      ? new Date(row.cancelled_at as string | Date)
      : null,
    cancelled_by_id: row.cancelled_by_id ? String(row.cancelled_by_id) : null,
    created_at: new Date(row.created_at as string | Date),
    updated_at: new Date(row.updated_at as string | Date),
  };
}

export function canCancelBooking(
  booking: BookingRow,
  user: AuthUser,
  now: Date = new Date(),
): { allowed: boolean; reason?: string } {
  if (booking.status !== 'active') {
    return { allowed: false, reason: 'ALREADY_CANCELLED' };
  }
  if (user.role === 'admin') {
    return { allowed: true };
  }
  if (user.id === booking.wishlist_owner_id) {
    return { allowed: true };
  }
  if (user.id === booking.booker_id) {
    if (now.getTime() > booking.booking_deadline.getTime()) {
      return { allowed: false, reason: 'DEADLINE_PASSED' };
    }
    return { allowed: true };
  }
  return { allowed: false, reason: 'FORBIDDEN' };
}

export class BookingService {
  constructor(
    private pool: Pool,
    private events: EventPublisher = getEventPublisher(),
  ) {}

  async create(user: AuthUser, input: CreateBookingInput) {
    if (
      !isUuid(input.gift_id) ||
      !isUuid(input.wishlist_id) ||
      !isUuid(input.wishlist_owner_id)
    ) {
      throw new AppError(400, 'Invalid UUID fields', 'BAD_REQUEST');
    }
    if (!input.gift_title || input.gift_title.length > 500) {
      throw new AppError(400, 'Invalid gift_title', 'BAD_REQUEST');
    }
    const deadline = new Date(input.booking_deadline);
    if (Number.isNaN(deadline.getTime())) {
      throw new AppError(400, 'Invalid booking_deadline', 'BAD_REQUEST');
    }
    if (user.id === input.wishlist_owner_id) {
      throw new AppError(
        403,
        'Cannot book own gift',
        'CANNOT_BOOK_OWN_GIFT',
      );
    }
    const now = new Date();
    if (now.getTime() > deadline.getTime()) {
      throw new AppError(422, 'Booking deadline passed', 'DEADLINE_PASSED');
    }
    const bookerDisplayName = user.displayName || 'User';
    const bookerEmail = user.email || `${user.id}@users.local`;

    const client = await this.pool.connect();
    let booking: BookingRow;
    try {
      await client.query('BEGIN');
      const insert = await client.query(
        `INSERT INTO bookings (
          gift_id, booker_id, status, gift_title, wishlist_id, wishlist_owner_id,
          booking_deadline, booker_display_name, booker_email
        ) VALUES ($1,$2,'active',$3,$4,$5,$6,$7,$8)
        RETURNING *`,
        [
          input.gift_id,
          user.id,
          input.gift_title,
          input.wishlist_id,
          input.wishlist_owner_id,
          deadline.toISOString(),
          bookerDisplayName,
          bookerEmail,
        ],
      );
      await client.query('COMMIT');
      booking = mapRow(insert.rows[0]);
    } catch (err: unknown) {
      try {
        await client.query('ROLLBACK');
      } catch {
        /* ignore */
      }
      const pgErr = err as { code?: string };
      if (pgErr.code === '23505') {
        throw new AppError(
          409,
          'Gift already has an active booking',
          'GIFT_ALREADY_BOOKED',
        );
      }
      throw err;
    } finally {
      client.release();
    }
    await this.events.publishBookingCreated(booking);
    return toBookingDto(booking);
  }

  async listByWishlist(
    user: AuthUser,
    wishlistId: string,
    query: { page?: unknown; page_size?: unknown; status?: unknown },
  ) {
    if (!isUuid(wishlistId)) {
      throw new AppError(400, 'Invalid wishlist_id', 'BAD_REQUEST');
    }
    const { page, pageSize } = parsePagination(query);
    const status = this.parseStatus(query.status);

    const access = await this.pool.query(
      `SELECT wishlist_owner_id FROM bookings WHERE wishlist_id = $1 LIMIT 1`,
      [wishlistId],
    );
    if (access.rows.length > 0) {
      const ownerId = String(access.rows[0].wishlist_owner_id);
      if (user.role !== 'admin' && user.id !== ownerId) {
        throw new AppError(403, 'Forbidden', 'FORBIDDEN');
      }
    }

    const params: unknown[] = [wishlistId];
    let where = 'wishlist_id = $1';
    if (status) {
      params.push(status);
      where += ` AND status = $${params.length}`;
    }
    const countRes = await this.pool.query(
      `SELECT COUNT(*)::int AS total FROM bookings WHERE ${where}`,
      params,
    );
    const total = countRes.rows[0].total as number;
    params.push(pageSize, (page - 1) * pageSize);
    const listRes = await this.pool.query(
      `SELECT * FROM bookings WHERE ${where}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    return {
      items: listRes.rows.map((r) => toBookingDto(mapRow(r))),
      page,
      page_size: pageSize,
      total,
    };
  }

  async listMine(
    user: AuthUser,
    query: { page?: unknown; page_size?: unknown; status?: unknown },
  ) {
    const { page, pageSize } = parsePagination(query);
    const status = this.parseStatus(query.status);
    const params: unknown[] = [user.id];
    let where = 'booker_id = $1';
    if (status) {
      params.push(status);
      where += ` AND status = $${params.length}`;
    }
    const countRes = await this.pool.query(
      `SELECT COUNT(*)::int AS total FROM bookings WHERE ${where}`,
      params,
    );
    const total = countRes.rows[0].total as number;
    params.push(pageSize, (page - 1) * pageSize);
    const listRes = await this.pool.query(
      `SELECT * FROM bookings WHERE ${where}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    return {
      items: listRes.rows.map((r) => toBookingDto(mapRow(r))),
      page,
      page_size: pageSize,
      total,
    };
  }

  async publicStatus(giftIdsRaw: string) {
    if (!giftIdsRaw || !giftIdsRaw.trim()) {
      throw new AppError(400, 'gift_ids is required', 'BAD_REQUEST');
    }
    const giftIds = giftIdsRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (giftIds.length === 0) {
      throw new AppError(400, 'gift_ids is required', 'BAD_REQUEST');
    }
    if (giftIds.length > 200) {
      throw new AppError(400, 'Too many gift_ids (max 200)', 'BAD_REQUEST');
    }
    for (const id of giftIds) {
      if (!isUuid(id)) {
        throw new AppError(400, `Invalid gift_id: ${id}`, 'BAD_REQUEST');
      }
    }

    const placeholders = giftIds.map((_, i) => `$${i + 1}`).join(', ');
    const { rows } = await this.pool.query(
      `SELECT id, gift_id FROM bookings
       WHERE status = 'active' AND gift_id IN (${placeholders})`,
      giftIds,
    );
    const byGift = new Map<string, string>();
    for (const row of rows) {
      byGift.set(String(row.gift_id), String(row.id));
    }

    return {
      items: giftIds.map((gift_id) => {
        const bookingId = byGift.get(gift_id) || null;
        const isBooked = Boolean(bookingId);
        return {
          gift_id,
          is_booked: isBooked,
          booking_id: bookingId,
          status: isBooked ? 'booked' : 'available',
        };
      }),
    };
  }

  async cancel(user: AuthUser, bookingId: string, forceAdmin = false) {
    if (!isUuid(bookingId)) {
      throw new AppError(400, 'Invalid bookingId', 'BAD_REQUEST');
    }
    if (forceAdmin && user.role !== 'admin') {
      throw new AppError(403, 'Forbidden', 'FORBIDDEN');
    }

    const client = await this.pool.connect();
    let cancelled: BookingRow;
    try {
      await client.query('BEGIN');
      const found = await client.query(
        `SELECT * FROM bookings WHERE id = $1 FOR UPDATE`,
        [bookingId],
      );
      if (found.rows.length === 0) {
        throw new AppError(404, 'Booking not found', 'NOT_FOUND');
      }
      const booking = mapRow(found.rows[0]);
      if (booking.status === 'cancelled') {
        throw new AppError(409, 'Already cancelled', 'ALREADY_CANCELLED');
      }

      const decision = forceAdmin
        ? { allowed: true as const }
        : canCancelBooking(booking, user);

      if (!decision.allowed) {
        if (decision.reason === 'ALREADY_CANCELLED') {
          throw new AppError(409, 'Already cancelled', 'ALREADY_CANCELLED');
        }
        if (decision.reason === 'DEADLINE_PASSED') {
          throw new AppError(
            403,
            'Cannot cancel after booking deadline',
            'DEADLINE_PASSED',
          );
        }
        throw new AppError(403, 'Forbidden', 'FORBIDDEN');
      }

      const updated = await client.query(
        `UPDATE bookings
         SET status = 'cancelled',
             cancelled_at = NOW(),
             cancelled_by_id = $2,
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [bookingId, user.id],
      );
      await client.query('COMMIT');
      cancelled = mapRow(updated.rows[0]);
    } catch (err) {
      try {
        await client.query('ROLLBACK');
      } catch {
        /* ignore */
      }
      throw err;
    } finally {
      client.release();
    }
    await this.events.publishBookingCancelled(cancelled);
    return toBookingDto(cancelled);
  }

  async adminList(query: {
    page?: unknown;
    page_size?: unknown;
    status?: unknown;
    q?: unknown;
    wishlist_id?: unknown;
  }) {
    const { page, pageSize } = parsePagination(query);
    const status = this.parseStatus(query.status);
    const params: unknown[] = [];
    const clauses: string[] = [];

    if (status) {
      params.push(status);
      clauses.push(`status = $${params.length}`);
    }
    if (query.wishlist_id) {
      const wid = String(query.wishlist_id);
      if (!isUuid(wid)) {
        throw new AppError(400, 'Invalid wishlist_id', 'BAD_REQUEST');
      }
      params.push(wid);
      clauses.push(`wishlist_id = $${params.length}`);
    }
    if (query.q) {
      const q = `%${String(query.q)}%`;
      params.push(q);
      clauses.push(
        `(booker_display_name ILIKE $${params.length} OR booker_email ILIKE $${params.length} OR gift_title ILIKE $${params.length})`,
      );
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const countRes = await this.pool.query(
      `SELECT COUNT(*)::int AS total FROM bookings ${where}`,
      params,
    );
    const total = countRes.rows[0].total as number;
    params.push(pageSize, (page - 1) * pageSize);
    const listRes = await this.pool.query(
      `SELECT * FROM bookings ${where}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    return {
      items: listRes.rows.map((r) => toBookingDto(mapRow(r))),
      page,
      page_size: pageSize,
      total,
    };
  }

  private parseStatus(value: unknown): BookingStatus | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    if (value === 'active' || value === 'cancelled') return value;
    throw new AppError(400, 'Invalid status', 'BAD_REQUEST');
  }
}
