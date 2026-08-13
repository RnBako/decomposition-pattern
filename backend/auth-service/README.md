# auth-service

Wishly Identity & Access: registration, login, JWT, current user, internal user lookup.

## Stack

- Express + TypeScript + `pg`
- JWT (`jsonwebtoken`) + bcrypt password hashes
- Kafka (`kafkajs`) — publishes `UserRegistered` to `wishly.auth.events` when `KAFKA_BROKERS` is set
- Vitest + supertest (+ pg-mem in unit tests)

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | — | Health check |
| POST | `/auth/register` | — | Register (`role=user`), returns JWT |
| POST | `/auth/login` | — | Login, returns JWT |
| POST | `/auth/logout` | Bearer | Best-effort logout (204) |
| GET | `/auth/me` | Bearer | Current user |
| GET | `/auth/users/:id` | Bearer | User by UUID (gateway/internal) |

## Local run

```bash
cp .env.example .env
# start PostgreSQL with DB wishly_auth
npm install
npm run migrate
npm run dev
```

Admin is seeded on startup from `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_DISPLAY_NAME`.

## Scripts

```bash
npm run build
npm start
npm test
npm run migrate
```

## Env

See `.env.example`. Database: `wishly_auth`. Default port: `3001`.
