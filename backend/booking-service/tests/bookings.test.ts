import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { newDb, DataType } from 'pg-mem';
import { v4 as uuidv4 } from 'uuid';
import type { Pool } from 'pg';
import { createApp } from '../src/app';
import { runMigrations } from '../src/db/migrate';

const OWNER_ID = '55555555-5555-4555-8555-555555555555';
const BOOKER_ID = '33333333-3333-4333-8333-333333333333';
const ADMIN_ID = '66666666-6666-4666-8666-666666666666';
const STRANGER_ID = '77777777-7777-4777-8777-777777777777';
const WISHLIST_ID = '44444444-4444-4444-8444-444444444444';
const GIFT_ID = '22222222-2222-4222-8222-222222222222';
const GIFT_ID_2 = '22222222-2222-4222-8222-222222222223';

const FUTURE_DEADLINE = '2030-06-01T00:00:00.000Z';
const PAST_DEADLINE = '2020-01-01T00:00:00.000Z';

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

function authHeaders(
  user: { id: string; email: string; role: string; displayName: string },
) {
  return {
    'x-user-id': user.id,
    'x-user-email': user.email,
    'x-user-role': user.role,
    'x-user-display-name': user.displayName,
  };
}

const booker = {
  id: BOOKER_ID,
  email: 'booker@example.com',
  role: 'user',
  displayName: 'Booker',
};

const owner = {
  id: OWNER_ID,
  email: 'owner@example.com',
  role: 'user',
  displayName: 'Owner',
};

const admin = {
  id: ADMIN_ID,
  email: 'admin@example.com',
  role: 'admin',
  displayName: 'Admin',
};

const stranger = {
  id: STRANGER_ID,
  email: 'stranger@example.com',
  role: 'user',
  displayName: 'Stranger',
};

function createBody(overrides: Record<string, string> = {}) {
  return {
    gift_id: GIFT_ID,
    gift_title: 'Test Gift',
    wishlist_id: WISHLIST_ID,
    wishlist_owner_id: OWNER_ID,
    booking_deadline: FUTURE_DEADLINE,
    ...overrides,
  };
}

describe('Booking API', () => {
  let pool: Pool;
  let app: ReturnType<typeof createApp>;

  beforeAll(async () => {
    pool = createTestPool();
    await runMigrations(pool);
    app = createApp({ db: pool });
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await pool.query('DELETE FROM bookings');
  });

  describe('POST /bookings (create)', () => {
    it('creates booking 201', async () => {
      const res = await request(app)
        .post('/bookings')
        .set(authHeaders(booker))
        .send(createBody());

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('active');
      expect(res.body.gift_id).toBe(GIFT_ID);
      expect(res.body.booker_id).toBe(BOOKER_ID);
      expect(res.body.booker_display_name).toBe('Booker');
      expect(res.body.booker_email).toBe('booker@example.com');
      expect(res.body.gift_title).toBe('Test Gift');
      expect(res.body.id).toBeTruthy();
    });

    it('returns 401 without auth', async () => {
      const res = await request(app).post('/bookings').send(createBody());
      expect(res.status).toBe(401);
    });

    it('returns 400 on missing fields', async () => {
      const res = await request(app)
        .post('/bookings')
        .set(authHeaders(booker))
        .send({ gift_id: GIFT_ID });
      expect(res.status).toBe(400);
    });

    it('returns 403 when owner books own gift', async () => {
      const res = await request(app)
        .post('/bookings')
        .set(authHeaders(owner))
        .send(createBody());
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('CANNOT_BOOK_OWN_GIFT');
    });

    it('returns 422 when deadline passed', async () => {
      const res = await request(app)
        .post('/bookings')
        .set(authHeaders(booker))
        .send(createBody({ booking_deadline: PAST_DEADLINE }));
      expect(res.status).toBe(422);
      expect(res.body.code).toBe('DEADLINE_PASSED');
    });

    it('returns 409 when gift already booked', async () => {
      const first = await request(app)
        .post('/bookings')
        .set(authHeaders(booker))
        .send(createBody());
      expect(first.status).toBe(201);

      const second = await request(app)
        .post('/bookings')
        .set(authHeaders(stranger))
        .send(createBody());
      expect(second.status).toBe(409);
      expect(second.body.code).toBe('GIFT_ALREADY_BOOKED');
    });
  });

  describe('GET /bookings/me', () => {
    it('lists my bookings', async () => {
      await request(app)
        .post('/bookings')
        .set(authHeaders(booker))
        .send(createBody());

      const res = await request(app)
        .get('/bookings/me')
        .set(authHeaders(booker));

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].booker_id).toBe(BOOKER_ID);
      expect(res.body.page).toBe(1);
      expect(res.body.page_size).toBe(50);
    });

    it('returns 401 without auth', async () => {
      const res = await request(app).get('/bookings/me');
      expect(res.status).toBe(401);
    });

    it('filters by status', async () => {
      const created = await request(app)
        .post('/bookings')
        .set(authHeaders(booker))
        .send(createBody());

      await request(app)
        .post(`/bookings/${created.body.id}/cancel`)
        .set(authHeaders(booker));

      const active = await request(app)
        .get('/bookings/me')
        .query({ status: 'active' })
        .set(authHeaders(booker));
      expect(active.status).toBe(200);
      expect(active.body.total).toBe(0);

      const cancelled = await request(app)
        .get('/bookings/me')
        .query({ status: 'cancelled' })
        .set(authHeaders(booker));
      expect(cancelled.status).toBe(200);
      expect(cancelled.body.total).toBe(1);
    });
  });

  describe('GET /bookings (list by wishlist)', () => {
    it('allows owner to list with booker names', async () => {
      await request(app)
        .post('/bookings')
        .set(authHeaders(booker))
        .send(createBody());

      const res = await request(app)
        .get('/bookings')
        .query({ wishlist_id: WISHLIST_ID })
        .set(authHeaders(owner));

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
      expect(res.body.items[0].booker_display_name).toBe('Booker');
      expect(res.body.items[0].booker_email).toBe('booker@example.com');
    });

    it('allows admin', async () => {
      await request(app)
        .post('/bookings')
        .set(authHeaders(booker))
        .send(createBody());

      const res = await request(app)
        .get('/bookings')
        .query({ wishlist_id: WISHLIST_ID })
        .set(authHeaders(admin));
      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
    });

    it('returns 403 for stranger', async () => {
      await request(app)
        .post('/bookings')
        .set(authHeaders(booker))
        .send(createBody());

      const res = await request(app)
        .get('/bookings')
        .query({ wishlist_id: WISHLIST_ID })
        .set(authHeaders(stranger));
      expect(res.status).toBe(403);
    });

    it('returns 401 without auth', async () => {
      const res = await request(app)
        .get('/bookings')
        .query({ wishlist_id: WISHLIST_ID });
      expect(res.status).toBe(401);
    });

    it('returns 400 without wishlist_id', async () => {
      const res = await request(app)
        .get('/bookings')
        .set(authHeaders(owner));
      expect(res.status).toBe(400);
    });
  });

  describe('GET /bookings/status (public)', () => {
    it('returns status without booker PII', async () => {
      const created = await request(app)
        .post('/bookings')
        .set(authHeaders(booker))
        .send(createBody());
      expect(created.status).toBe(201);

      const res = await request(app)
        .get('/bookings/status')
        .query({ gift_ids: `${GIFT_ID},${GIFT_ID_2}` });

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(2);

      const booked = res.body.items.find(
        (i: { gift_id: string }) => i.gift_id === GIFT_ID,
      );
      const free = res.body.items.find(
        (i: { gift_id: string }) => i.gift_id === GIFT_ID_2,
      );

      expect(booked.is_booked).toBe(true);
      expect(booked.status).toBe('booked');
      expect(booked.booking_id).toBe(created.body.id);
      expect(booked.booker_id).toBeUndefined();
      expect(booked.booker_display_name).toBeUndefined();
      expect(booked.booker_email).toBeUndefined();

      expect(free.is_booked).toBe(false);
      expect(free.status).toBe('available');
      expect(free.booking_id).toBeNull();
    });

    it('returns 400 without gift_ids', async () => {
      const res = await request(app).get('/bookings/status');
      expect(res.status).toBe(400);
    });
  });

  describe('POST /bookings/:id/cancel', () => {
    async function createBooking() {
      const res = await request(app)
        .post('/bookings')
        .set(authHeaders(booker))
        .send(createBody());
      expect(res.status).toBe(201);
      return res.body;
    }

    it('booker can cancel before deadline', async () => {
      const booking = await createBooking();
      const res = await request(app)
        .post(`/bookings/${booking.id}/cancel`)
        .set(authHeaders(booker));
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('cancelled');
      expect(res.body.cancelled_by_id).toBe(BOOKER_ID);
    });

    it('owner can cancel', async () => {
      const booking = await createBooking();
      const res = await request(app)
        .post(`/bookings/${booking.id}/cancel`)
        .set(authHeaders(owner));
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('cancelled');
      expect(res.body.cancelled_by_id).toBe(OWNER_ID);
    });

    it('admin can cancel', async () => {
      const booking = await createBooking();
      const res = await request(app)
        .post(`/bookings/${booking.id}/cancel`)
        .set(authHeaders(admin));
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('cancelled');
    });

    it('stranger gets 403', async () => {
      const booking = await createBooking();
      const res = await request(app)
        .post(`/bookings/${booking.id}/cancel`)
        .set(authHeaders(stranger));
      expect(res.status).toBe(403);
    });

    it('returns 404 for unknown id', async () => {
      const res = await request(app)
        .post('/bookings/11111111-1111-4111-8111-111111111111/cancel')
        .set(authHeaders(admin));
      expect(res.status).toBe(404);
    });

    it('returns 409 when already cancelled', async () => {
      const booking = await createBooking();
      await request(app)
        .post(`/bookings/${booking.id}/cancel`)
        .set(authHeaders(booker));

      const res = await request(app)
        .post(`/bookings/${booking.id}/cancel`)
        .set(authHeaders(admin));
      expect(res.status).toBe(409);
      expect(res.body.code).toBe('ALREADY_CANCELLED');
    });

    it('returns 401 without auth', async () => {
      const booking = await createBooking();
      const res = await request(app).post(
        `/bookings/${booking.id}/cancel`,
      );
      expect(res.status).toBe(401);
    });
  });

  describe('Admin endpoints', () => {
    it('GET /admin/bookings lists bookings', async () => {
      await request(app)
        .post('/bookings')
        .set(authHeaders(booker))
        .send(createBody());

      const res = await request(app)
        .get('/admin/bookings')
        .set(authHeaders(admin));

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
      expect(res.body.items[0].booker_display_name).toBe('Booker');
    });

    it('GET /admin/bookings supports q filter', async () => {
      await request(app)
        .post('/bookings')
        .set(authHeaders(booker))
        .send(createBody({ gift_title: 'Unique Gift Name' }));

      const hit = await request(app)
        .get('/admin/bookings')
        .query({ q: 'Unique Gift' })
        .set(authHeaders(admin));
      expect(hit.status).toBe(200);
      expect(hit.body.total).toBe(1);

      const miss = await request(app)
        .get('/admin/bookings')
        .query({ q: 'NoSuchThing' })
        .set(authHeaders(admin));
      expect(miss.status).toBe(200);
      expect(miss.body.total).toBe(0);
    });

    it('GET /admin/bookings returns 403 for non-admin', async () => {
      const res = await request(app)
        .get('/admin/bookings')
        .set(authHeaders(booker));
      expect(res.status).toBe(403);
    });

    it('GET /admin/bookings returns 401 without auth', async () => {
      const res = await request(app).get('/admin/bookings');
      expect(res.status).toBe(401);
    });

    it('POST /admin/bookings/:id/cancel cancels', async () => {
      const created = await request(app)
        .post('/bookings')
        .set(authHeaders(booker))
        .send(createBody());

      const res = await request(app)
        .post(`/admin/bookings/${created.body.id}/cancel`)
        .set(authHeaders(admin));

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('cancelled');
      expect(res.body.cancelled_by_id).toBe(ADMIN_ID);
    });

    it('POST /admin/bookings/:id/cancel returns 403 for non-admin', async () => {
      const created = await request(app)
        .post('/bookings')
        .set(authHeaders(booker))
        .send(createBody());

      const res = await request(app)
        .post(`/admin/bookings/${created.body.id}/cancel`)
        .set(authHeaders(owner));
      expect(res.status).toBe(403);
    });

    it('POST /admin/bookings/:id/cancel returns 404', async () => {
      const res = await request(app)
        .post('/admin/bookings/11111111-1111-4111-8111-111111111111/cancel')
        .set(authHeaders(admin));
      expect(res.status).toBe(404);
    });
  });
});
