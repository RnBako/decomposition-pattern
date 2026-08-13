import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { newDb, DataType } from 'pg-mem';
import { v4 as uuidv4 } from 'uuid';
import type { Pool } from 'pg';
import { createApp } from '../src/app';
import { runMigrations } from '../src/db/migrate';
import { setPoolForTests, resetPoolForTests } from '../src/db/pool';

const OWNER_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_ID = '22222222-2222-4222-8222-222222222222';
const ADMIN_ID = '33333333-3333-4333-8333-333333333333';

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

function auth(userId: string, role = 'user') {
  return {
    'X-User-Id': userId,
    'X-User-Role': role,
    'X-User-Display-Name': 'Test User',
  };
}

describe('Core wishlist/gift/share flows', () => {
  let pool: Pool;
  let app: ReturnType<typeof createApp>;

  beforeAll(async () => {
    pool = createTestPool();
    await runMigrations(pool);
    setPoolForTests(pool);
    app = createApp();
  });

  afterAll(async () => {
    resetPoolForTests();
    await pool.end();
  });

  beforeEach(async () => {
    await pool.query('DELETE FROM comments');
    await pool.query('DELETE FROM share_links');
    await pool.query('DELETE FROM gifts');
    await pool.query('DELETE FROM categories');
    await pool.query('DELETE FROM wishlists');
  });

  it('CRUD wishlist happy path', async () => {
    const create = await request(app)
      .post('/wishlists')
      .set(auth(OWNER_ID))
      .send({
        title: 'Birthday',
        description: 'Party list',
        event_date: '2030-06-15',
        booking_deadline: '2030-06-14T12:00:00.000Z',
      });

    expect(create.status).toBe(201);
    expect(create.body.title).toBe('Birthday');
    expect(create.body.owner_id).toBe(OWNER_ID);
    expect(create.body.deleted_at).toBeNull();
    const wishlistId = create.body.id as string;

    const list = await request(app).get('/wishlists').set(auth(OWNER_ID));
    expect(list.status).toBe(200);
    expect(list.body.items).toHaveLength(1);
    expect(list.body.items[0].id).toBe(wishlistId);

    const get = await request(app)
      .get(`/wishlists/${wishlistId}`)
      .set(auth(OWNER_ID));
    expect(get.status).toBe(200);
    expect(get.body.title).toBe('Birthday');
    expect(get.body.gifts).toEqual([]);
    expect(get.body.categories).toEqual([]);

    const patch = await request(app)
      .patch(`/wishlists/${wishlistId}`)
      .set(auth(OWNER_ID))
      .send({ title: 'Birthday Updated' });
    expect(patch.status).toBe(200);
    expect(patch.body.title).toBe('Birthday Updated');
  });

  it('CRUD gift happy path', async () => {
    const wl = await request(app)
      .post('/wishlists')
      .set(auth(OWNER_ID))
      .send({
        title: 'Gifts WL',
        event_date: '2030-12-01',
        booking_deadline: '2030-11-30T23:59:59.000Z',
      });
    expect(wl.status).toBe(201);
    const wishlistId = wl.body.id as string;

    const createGift = await request(app)
      .post(`/wishlists/${wishlistId}/gifts`)
      .set(auth(OWNER_ID))
      .send({
        title: 'Book',
        url: 'https://example.com/book',
        price: 499.5,
        currency: 'RUB',
        notes: 'hardcover',
      });
    expect(createGift.status).toBe(201);
    expect(createGift.body.title).toBe('Book');
    expect(createGift.body.price).toBe(499.5);
    expect(createGift.body.is_occupied).toBe(false);
    const giftId = createGift.body.id as string;

    const list = await request(app)
      .get(`/wishlists/${wishlistId}/gifts`)
      .set(auth(OWNER_ID));
    expect(list.status).toBe(200);
    expect(list.body.items).toHaveLength(1);
    expect(list.body.total).toBe(1);

    const get = await request(app)
      .get(`/wishlists/${wishlistId}/gifts/${giftId}`)
      .set(auth(OWNER_ID));
    expect(get.status).toBe(200);
    expect(get.body.id).toBe(giftId);

    const patch = await request(app)
      .patch(`/wishlists/${wishlistId}/gifts/${giftId}`)
      .set(auth(OWNER_ID))
      .send({ title: 'Book Updated', price: 599 });
    expect(patch.status).toBe(200);
    expect(patch.body.title).toBe('Book Updated');
    expect(patch.body.price).toBe(599);
  });

  it('public share returns catalog without requiring auth', async () => {
    const wl = await request(app)
      .post('/wishlists')
      .set(auth(OWNER_ID))
      .send({
        title: 'Shared',
        event_date: '2030-05-01',
        booking_deadline: '2030-04-30T12:00:00.000Z',
      });
    const wishlistId = wl.body.id as string;

    await request(app)
      .post(`/wishlists/${wishlistId}/gifts`)
      .set(auth(OWNER_ID))
      .send({
        title: 'Mug',
        url: 'https://example.com/mug',
        price: 100,
      });

    const share = await request(app)
      .post(`/wishlists/${wishlistId}/share-link`)
      .set(auth(OWNER_ID));
    expect(share.status).toBe(201);
    expect(share.body.token).toBeTruthy();
    expect(share.body.is_active).toBe(true);
    const token = share.body.token as string;

    const pub = await request(app).get(`/share/${token}`);
    expect(pub.status).toBe(200);
    expect(pub.body.wishlist.title).toBe('Shared');
    expect(pub.body.wishlist.booking_open).toBe(true);
    expect(pub.body.gifts).toHaveLength(1);
    expect(pub.body.gifts[0].title).toBe('Mug');
    expect(pub.body.gifts[0].is_occupied).toBe(false);
    expect(pub.body.gifts[0]).not.toHaveProperty('comments');
  });

  it('soft-delete wishlist hides from list and public share; restore works', async () => {
    const wl = await request(app)
      .post('/wishlists')
      .set(auth(OWNER_ID))
      .send({
        title: 'Trash me',
        event_date: '2030-08-01',
        booking_deadline: '2030-07-31T12:00:00.000Z',
      });
    const wishlistId = wl.body.id as string;

    const share = await request(app)
      .post(`/wishlists/${wishlistId}/share-link`)
      .set(auth(OWNER_ID));
    const token = share.body.token as string;

    const del = await request(app)
      .delete(`/wishlists/${wishlistId}`)
      .set(auth(OWNER_ID));
    expect(del.status).toBe(204);

    const list = await request(app).get('/wishlists').set(auth(OWNER_ID));
    expect(list.status).toBe(200);
    expect(list.body.items).toHaveLength(0);

    const listDeleted = await request(app)
      .get('/wishlists?include_deleted=true')
      .set(auth(OWNER_ID));
    expect(listDeleted.body.items).toHaveLength(1);
    expect(listDeleted.body.items[0].deleted_at).toBeTruthy();

    const pub = await request(app).get(`/share/${token}`);
    expect(pub.status).toBe(404);

    const restore = await request(app)
      .post(`/wishlists/${wishlistId}/restore`)
      .set(auth(OWNER_ID));
    expect(restore.status).toBe(200);
    expect(restore.body.deleted_at).toBeNull();
  });

  it('soft-delete gift hides from public share', async () => {
    const wl = await request(app)
      .post('/wishlists')
      .set(auth(OWNER_ID))
      .send({
        title: 'Gift trash',
        event_date: '2030-09-01',
        booking_deadline: '2030-08-31T12:00:00.000Z',
      });
    const wishlistId = wl.body.id as string;

    const gift = await request(app)
      .post(`/wishlists/${wishlistId}/gifts`)
      .set(auth(OWNER_ID))
      .send({
        title: 'Lamp',
        url: 'https://example.com/lamp',
        price: 50,
      });
    const giftId = gift.body.id as string;

    const share = await request(app)
      .post(`/wishlists/${wishlistId}/share-link`)
      .set(auth(OWNER_ID));
    const token = share.body.token as string;

    const del = await request(app)
      .delete(`/wishlists/${wishlistId}/gifts/${giftId}`)
      .set(auth(OWNER_ID));
    expect(del.status).toBe(204);

    const list = await request(app)
      .get(`/wishlists/${wishlistId}/gifts`)
      .set(auth(OWNER_ID));
    expect(list.body.items).toHaveLength(0);

    const pub = await request(app).get(`/share/${token}`);
    expect(pub.status).toBe(200);
    expect(pub.body.gifts).toHaveLength(0);

    const restore = await request(app)
      .post(`/wishlists/${wishlistId}/gifts/${giftId}/restore`)
      .set(auth(OWNER_ID));
    expect(restore.status).toBe(200);
    expect(restore.body.deleted_at).toBeNull();
  });

  it('auth: missing auth returns 401; stranger gets 403', async () => {
    const noAuth = await request(app).get('/wishlists');
    expect(noAuth.status).toBe(401);

    const wl = await request(app)
      .post('/wishlists')
      .set(auth(OWNER_ID))
      .send({
        title: 'Private',
        event_date: '2030-10-01',
        booking_deadline: '2030-09-30T12:00:00.000Z',
      });
    const wishlistId = wl.body.id as string;

    const forbidden = await request(app)
      .get(`/wishlists/${wishlistId}`)
      .set(auth(OTHER_ID));
    expect(forbidden.status).toBe(403);

    const adminOk = await request(app)
      .get(`/wishlists/${wishlistId}`)
      .set(auth(ADMIN_ID, 'admin'));
    expect(adminOk.status).toBe(200);

    const notFound = await request(app)
      .get('/wishlists/99999999-9999-4999-8999-999999999999')
      .set(auth(OWNER_ID));
    expect(notFound.status).toBe(404);
  });

  it('validation: missing title returns 400; deadline after event returns 400', async () => {
    const badTitle = await request(app)
      .post('/wishlists')
      .set(auth(OWNER_ID))
      .send({
        event_date: '2030-06-15',
        booking_deadline: '2030-06-14T12:00:00.000Z',
      });
    expect(badTitle.status).toBe(400);

    const badDeadline = await request(app)
      .post('/wishlists')
      .set(auth(OWNER_ID))
      .send({
        title: 'Bad deadline',
        event_date: '2030-06-15',
        booking_deadline: '2030-06-16T12:00:00.000Z',
      });
    expect(badDeadline.status).toBe(400);
  });
});
