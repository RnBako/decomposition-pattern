# api-gateway

Wishly edge BFF: single entry for the SPA (`:8080`). Routes `/api/*` to domain services, optional JWT validation at the edge, CORS for Vite/nginx, forwards `Authorization` (+ `X-User-*` when JWT is verified).

No database. No Kafka.

## Route map (path rewrite)

Gateway strips the `/api` prefix before proxying (`/api/auth/login` → upstream `/auth/login`).

| Gateway path | Upstream env | Upstream path |
|--------------|--------------|---------------|
| `GET /health` | local | — |
| `GET /api/health` | local (+ pings upstreams `/health`) | — |
| `/api/auth/*` | `AUTH_SERVICE_URL` (default `http://auth-service:3001`) | `/auth/*` |
| `/api/wishlists`, `/api/wishlists/*` | `WISHLIST_SERVICE_URL` | `/wishlists`, `/wishlists/*` |
| `/api/share/*` | `WISHLIST_SERVICE_URL` | `/share/*` |
| `/api/media/*` | `WISHLIST_SERVICE_URL` | `/media/*` |
| `/api/bookings`, `/api/bookings/*` | `BOOKING_SERVICE_URL` | `/bookings`, `/bookings/*` |
| `/api/admin/bookings`, `/api/admin/bookings/*` | `BOOKING_SERVICE_URL` | `/admin/bookings`, `/admin/bookings/*` |
| `/api/notifications`, `/api/notifications/*` | `NOTIFICATION_SERVICE_URL` | `/notifications`, `/notifications/*` |

### Public (no JWT)

- `GET /health`, `GET /api/health`
- `POST /api/auth/register`, `POST /api/auth/login`
- `GET /api/share/*`, `GET /api/media/*`
- `GET /api/bookings/status`
- `OPTIONS /*` (CORS preflight)

### Auth

When `JWT_VALIDATE_AT_EDGE=true` (default), protected `/api/*` require a valid Bearer JWT signed with `JWT_SECRET`. Gateway injects:

- `X-User-Id`, `X-User-Role`, `X-User-Email`, `X-User-Display-Name`

and keeps `Authorization`. Admin routes under `/api/admin/*` require `role=admin`.

Set `JWT_VALIDATE_AT_EDGE=false` to only forward the header (upstream validates).

## CORS

Default origins: `http://localhost:5173`, `http://localhost:4173`, `http://localhost:3000`, `http://localhost`  
Override with `CORS_ORIGINS` (comma-separated).

## Local run

```bash
cp .env.example .env
# For local upstreams, point *_SERVICE_URL at localhost:3001–3004
npm install
npm run dev
```

Default port: **8080**.

## Scripts

```bash
npm run build
npm start
npm test
```

## Env

See `.env.example`.
