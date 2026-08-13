import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { newDb, DataType } from 'pg-mem';
import { v4 as uuidv4 } from 'uuid';
import type { Pool } from 'pg';
import { createApp } from '../src/app';
import { runMigrations } from '../src/db/migrate';
import { createNoopPublisher } from '../src/services/kafka';

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

function createTestApp(pool: Pool) {
  return createApp({
    db: pool,
    jwtSecret: 'test-jwt-secret',
    jwtExpiresIn: 3600,
    events: createNoopPublisher(),
  });
}

describe('Health', () => {
  it('GET /health returns 200', async () => {
    const app = createApp({ events: createNoopPublisher() });
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('Auth register/login', () => {
  let pool: Pool;
  let app: ReturnType<typeof createApp>;

  beforeAll(async () => {
    pool = createTestPool();
    await runMigrations(pool);
    app = createTestApp(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  it('register then login happy path covers me, users/:id, logout', async () => {
    const email = 'user@example.com';
    const password = 'password123';
    const display_name = 'Test User';

    const reg = await request(app).post('/auth/register').send({
      email,
      password,
      display_name,
    });

    expect(reg.status).toBe(201);
    expect(reg.body.token_type).toBe('Bearer');
    expect(reg.body.access_token).toBeTruthy();
    expect(reg.body.user).toMatchObject({
      email,
      display_name,
      role: 'user',
    });
    expect(reg.body.user.id).toBeTruthy();
    expect(reg.body.user.created_at).toBeTruthy();
    expect(reg.body.expires_in).toBe(3600);

    const login = await request(app).post('/auth/login').send({ email, password });
    expect(login.status).toBe(200);
    expect(login.body.access_token).toBeTruthy();
    expect(login.body.token_type).toBe('Bearer');
    expect(login.body.user.id).toBe(reg.body.user.id);

    const me = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${login.body.access_token}`);
    expect(me.status).toBe(200);
    expect(me.body).toMatchObject({
      id: reg.body.user.id,
      email,
      display_name,
      role: 'user',
    });
    expect(me.body.created_at).toBeTruthy();

    const byId = await request(app)
      .get(`/auth/users/${reg.body.user.id}`)
      .set('Authorization', `Bearer ${login.body.access_token}`);
    expect(byId.status).toBe(200);
    expect(byId.body.id).toBe(reg.body.user.id);
    expect(byId.body.email).toBe(email);

    const logout = await request(app)
      .post('/auth/logout')
      .set('Authorization', `Bearer ${login.body.access_token}`);
    expect(logout.status).toBe(204);
  });

  it('duplicate email returns 409', async () => {
    const res = await request(app).post('/auth/register').send({
      email: 'user@example.com',
      password: 'password123',
      display_name: 'Another',
    });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('email_taken');
  });

  it('bad login returns 401', async () => {
    const res = await request(app).post('/auth/login').send({
      email: 'user@example.com',
      password: 'wrong-password',
    });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('invalid_credentials');
  });

  it('login unknown email returns 401', async () => {
    const res = await request(app).post('/auth/login').send({
      email: 'nobody@example.com',
      password: 'password123',
    });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('invalid_credentials');
  });
});

describe('Auth validation (400)', () => {
  let pool: Pool;
  let app: ReturnType<typeof createApp>;

  beforeAll(async () => {
    pool = createTestPool();
    await runMigrations(pool);
    app = createTestApp(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  it('register missing fields returns 400', async () => {
    const res = await request(app).post('/auth/register').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('validation_error');
  });

  it('register invalid email returns 400', async () => {
    const res = await request(app).post('/auth/register').send({
      email: 'not-an-email',
      password: 'password123',
      display_name: 'Valid Name',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('validation_error');
  });

  it('register short password returns 400', async () => {
    const res = await request(app).post('/auth/register').send({
      email: 'short@example.com',
      password: 'short',
      display_name: 'Valid Name',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('validation_error');
  });

  it('register empty display_name returns 400', async () => {
    const res = await request(app).post('/auth/register').send({
      email: 'emptyname@example.com',
      password: 'password123',
      display_name: '   ',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('validation_error');
  });

  it('register without body returns 400', async () => {
    const res = await request(app).post('/auth/register').send();
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('validation_error');
  });
});

describe('Auth 401 on protected routes', () => {
  let pool: Pool;
  let app: ReturnType<typeof createApp>;
  let token: string;
  let userId: string;

  beforeAll(async () => {
    pool = createTestPool();
    await runMigrations(pool);
    app = createTestApp(pool);

    const reg = await request(app).post('/auth/register').send({
      email: 'authz@example.com',
      password: 'password123',
      display_name: 'Authz User',
    });
    token = reg.body.access_token;
    userId = reg.body.user.id;
  });

  afterAll(async () => {
    await pool.end();
  });

  it('GET /auth/me without token returns 401', async () => {
    const res = await request(app).get('/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('unauthorized');
  });

  it('GET /auth/me with invalid token returns 401', async () => {
    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', 'Bearer not-a-valid-jwt');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('unauthorized');
  });

  it('POST /auth/logout without token returns 401', async () => {
    const res = await request(app).post('/auth/logout');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('unauthorized');
  });

  it('POST /auth/logout with invalid token returns 401', async () => {
    const res = await request(app)
      .post('/auth/logout')
      .set('Authorization', 'Bearer garbage');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('unauthorized');
  });

  it('GET /auth/users/:id without token returns 401', async () => {
    const res = await request(app).get(`/auth/users/${userId}`);
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('unauthorized');
  });

  it('GET /auth/users/:id with invalid token returns 401', async () => {
    const res = await request(app)
      .get(`/auth/users/${userId}`)
      .set('Authorization', 'Bearer garbage');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('unauthorized');
  });

  it('GET /auth/users/:id unknown uuid returns 404', async () => {
    const missingId = uuidv4();
    const res = await request(app)
      .get(`/auth/users/${missingId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('not_found');
  });

  it('GET /auth/users/:id invalid uuid returns 404', async () => {
    const res = await request(app)
      .get('/auth/users/not-a-uuid')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('not_found');
  });
});
