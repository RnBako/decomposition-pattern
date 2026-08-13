# Deploy log — Wishly

**Target:** local Docker Compose  
**Date:** 2026-08-13  

## Stack

| Component | URL / note |
|-----------|------------|
| API Gateway | http://localhost:18080 (host 8080 занят другим процессом) |
| Mailpit UI | http://localhost:8025 |
| Frontend (Vite) | http://localhost:5173 (proxy `/api` → `:18080`) |
| Kafka | apache/kafka:3.8.1 (internal) |
| Postgres | 4 DBs in one container |

## Health

All compose services: healthy (api-gateway, auth, wishlist, booking, notification, postgres, kafka, mailpit).

## API smoke (gateway)

| Check | Result |
|-------|--------|
| `GET /health` | 200 `{ status: ok }` |
| `POST /api/auth/register` | 200 + JWT |
| `GET /api/wishlists` без токена | **401** (не 404) |
| `GET /api/bookings/me` без токена | **401** |
| `GET /api/notifications` без токена | **401** |

## Admin seed

`ADMIN_EMAIL=admin@wishly.local` / `ADMIN_PASSWORD=admin-change-me`

## E2E (Playwright)

| Check | Result |
|-------|--------|
| `PLAYWRIGHT_BASE_URL` | http://localhost:5173 |
| Exit code | 0 |
| Status | passed |

Covered: login, register, wishlists+create, notifications, my-bookings, share `/w/:token`, admin, 404.

