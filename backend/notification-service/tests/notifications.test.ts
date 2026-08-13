import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { newDb, DataType } from 'pg-mem';
import { v4 as uuidv4 } from 'uuid';
import type { Pool } from 'pg';
import { createApp } from '../src/app';
import { runMigrations } from '../src/db/migrate';
import { setPool } from '../src/db/pool';

const JWT_SECRET = 'test-secret';

const USER_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const USER_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const WISHLIST_ID = '11111111-1111-4111-8111-111111111111';
const GIFT_ID = '22222222-2222-4222-8222-222222222222';
const BOOKER_ID = '33333333-3333-4333-8333-333333333333';

function createTestPool(): Pool {
  const mem = newDb({ autoCreateForeignKeyIndices: true });
  mem.public.registerFunction({
    name: 'gen_random_uuid',
    returns: DataType.uuid,
    implementation: () => uuidv4(),
    impure: true,
  });
  mem.public.registerFunction({
    name: 'now',
    returns: DataType.timestamptz,
    implementation: () => new Date(),
    impure: true,
  });
  const { Pool: MemPool } = mem.adapters.createPg();
  return new MemPool() as unknown as Pool;
}

function authHeader(userId: string, extras: Record<string, unknown> = {}): string {
  const token = jwt.sign(
    {
      sub: userId,
      email: `${userId.slice(0, 8)}@example.com`,
      role: 'user',
      display_name: 'Test User',
      ...extras,
    },
    JWT_SECRET,
    { expiresIn: 3600 },
  );
  return `Bearer ${token}`;
}

async function seedNotification(
  pool: Pool,
  params: {
    recipientId: string;
    type?: string;
    readAt?: Date | null;
    bookingId?: string;
  },
): Promise<string> {
  const id = uuidv4();
  const payload = {
    wishlist_id: WISHLIST_ID,
    gift_id: GIFT_ID,
    booker_id: BOOKER_ID,
    booking_id: params.bookingId ?? uuidv4(),
    wishlist_title: 'Party',
    gift_title: 'Book',
    booker_display_name: 'Booker',
  };
  await pool.query(
    `INSERT INTO notifications (
       id, recipient_id, type, payload, read_at,
       in_app_delivered, email_sent, email_error
     ) VALUES ($1, $2, $3, $4::jsonb, $5, TRUE, FALSE, NULL)`,
    [
      id,
      params.recipientId,
      params.type ?? 'booking_created',
      JSON.stringify(payload),
      params.readAt ?? null,
    ],
  );
  return id;
}

describe('Notifications API', () => {
  let pool: Pool;
  let app: ReturnType<typeof createApp>;

  beforeAll(async () => {
    process.env.JWT_SECRET = JWT_SECRET;
    pool = createTestPool();
    setPool(pool);
    await runMigrations(pool);
    app = createApp();
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await pool.query('DELETE FROM notifications');
  });

  describe('auth', () => {
    it('GET /notifications without auth returns 401', async () => {
      const res = await request(app).get('/notifications');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
    });

    it('GET /notifications/unread-count without auth returns 401', async () => {
      const res = await request(app).get('/notifications/unread-count');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
    });

    it('POST /notifications/read-all without auth returns 401', async () => {
      const res = await request(app).post('/notifications/read-all');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
    });

    it('POST /notifications/:id/read without auth returns 401', async () => {
      const id = uuidv4();
      const res = await request(app).post(`/notifications/${id}/read`);
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
    });

    it('invalid JWT returns 401', async () => {
      const res = await request(app)
        .get('/notifications')
        .set('Authorization', 'Bearer not-a-valid-token');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
    });

    it('accepts gateway identity headers', async () => {
      const res = await request(app)
        .get('/notifications')
        .set('x-user-id', USER_A)
        .set('x-user-email', 'a@example.com')
        .set('x-user-role', 'user');
      expect(res.status).toBe(200);
      expect(res.body.items).toEqual([]);
      expect(res.body.total).toBe(0);
    });
  });

  describe('list', () => {
    it('returns empty list for user with no notifications', async () => {
      const res = await request(app)
        .get('/notifications')
        .set('Authorization', authHeader(USER_A));
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ items: [], total: 0 });
    });

    it('lists only current user notifications newest first', async () => {
      const older = await seedNotification(pool, { recipientId: USER_A });
      await new Promise((r) => setTimeout(r, 5));
      const newer = await seedNotification(pool, { recipientId: USER_A });
      await seedNotification(pool, { recipientId: USER_B });

      const res = await request(app)
        .get('/notifications')
        .set('Authorization', authHeader(USER_A));

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(2);
      expect(res.body.items).toHaveLength(2);
      expect(res.body.items[0].id).toBe(newer);
      expect(res.body.items[1].id).toBe(older);
      expect(res.body.items[0]).toMatchObject({
        recipient_id: USER_A,
        type: 'booking_created',
        channel_flags: {
          in_app: true,
          email: false,
          email_error: null,
        },
        read_at: null,
      });
      expect(res.body.items[0].payload.wishlist_id).toBe(WISHLIST_ID);
      expect(res.body.items[0].created_at).toBeTruthy();
      expect(res.body.items[0].updated_at).toBeTruthy();
    });

    it('filters unread_only=true', async () => {
      await seedNotification(pool, {
        recipientId: USER_A,
        readAt: new Date(),
      });
      const unreadId = await seedNotification(pool, {
        recipientId: USER_A,
        readAt: null,
      });

      const res = await request(app)
        .get('/notifications')
        .query({ unread_only: true })
        .set('Authorization', authHeader(USER_A));

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].id).toBe(unreadId);
      expect(res.body.items[0].read_at).toBeNull();
    });

    it('respects limit and offset', async () => {
      const ids: string[] = [];
      for (let i = 0; i < 3; i++) {
        ids.push(await seedNotification(pool, { recipientId: USER_A }));
        await new Promise((r) => setTimeout(r, 5));
      }

      const res = await request(app)
        .get('/notifications')
        .query({ limit: 1, offset: 1 })
        .set('Authorization', authHeader(USER_A));

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(3);
      expect(res.body.items).toHaveLength(1);
      // newest first: ids[2], ids[1], ids[0] → offset 1 → ids[1]
      expect(res.body.items[0].id).toBe(ids[1]);
    });
  });

  describe('unread-count', () => {
    it('returns unread count for current user', async () => {
      await seedNotification(pool, { recipientId: USER_A, readAt: null });
      await seedNotification(pool, { recipientId: USER_A, readAt: null });
      await seedNotification(pool, {
        recipientId: USER_A,
        readAt: new Date(),
      });
      await seedNotification(pool, { recipientId: USER_B, readAt: null });

      const res = await request(app)
        .get('/notifications/unread-count')
        .set('Authorization', authHeader(USER_A));

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ count: 2 });
    });
  });

  describe('mark read', () => {
    it('marks notification as read', async () => {
      const id = await seedNotification(pool, {
        recipientId: USER_A,
        readAt: null,
      });

      const res = await request(app)
        .post(`/notifications/${id}/read`)
        .set('Authorization', authHeader(USER_A));

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(id);
      expect(res.body.read_at).toBeTruthy();

      const count = await request(app)
        .get('/notifications/unread-count')
        .set('Authorization', authHeader(USER_A));
      expect(count.body.count).toBe(0);
    });

    it('is idempotent when already read', async () => {
      const id = await seedNotification(pool, {
        recipientId: USER_A,
        readAt: new Date('2024-01-01T00:00:00.000Z'),
      });

      const res = await request(app)
        .post(`/notifications/${id}/read`)
        .set('Authorization', authHeader(USER_A));

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(id);
      expect(res.body.read_at).toBeTruthy();
    });

    it('returns 404 for missing notification', async () => {
      const res = await request(app)
        .post(`/notifications/${uuidv4()}/read`)
        .set('Authorization', authHeader(USER_A));
      expect(res.status).toBe(404);
      expect(res.body.error).toBeTruthy();
    });

    it('returns 404 for invalid uuid', async () => {
      const res = await request(app)
        .post('/notifications/not-a-uuid/read')
        .set('Authorization', authHeader(USER_A));
      expect(res.status).toBe(404);
    });

    it('returns 403 when notification belongs to another user', async () => {
      const id = await seedNotification(pool, {
        recipientId: USER_B,
        readAt: null,
      });

      const res = await request(app)
        .post(`/notifications/${id}/read`)
        .set('Authorization', authHeader(USER_A));

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Forbidden');
    });
  });

  describe('read-all', () => {
    it('marks all unread notifications as read', async () => {
      await seedNotification(pool, { recipientId: USER_A, readAt: null });
      await seedNotification(pool, { recipientId: USER_A, readAt: null });
      await seedNotification(pool, {
        recipientId: USER_A,
        readAt: new Date(),
      });
      await seedNotification(pool, { recipientId: USER_B, readAt: null });

      const res = await request(app)
        .post('/notifications/read-all')
        .set('Authorization', authHeader(USER_A));

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ updated: 2 });

      const count = await request(app)
        .get('/notifications/unread-count')
        .set('Authorization', authHeader(USER_A));
      expect(count.body.count).toBe(0);

      const other = await request(app)
        .get('/notifications/unread-count')
        .set('Authorization', authHeader(USER_B));
      expect(other.body.count).toBe(1);
    });

    it('returns updated 0 when nothing unread', async () => {
      const res = await request(app)
        .post('/notifications/read-all')
        .set('Authorization', authHeader(USER_A));
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ updated: 0 });
    });
  });
});
