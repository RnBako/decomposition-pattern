# Wishly Frontend

SPA (React + Vite + Tailwind v4). **Phase B (integration):** all routes use live API via relative `/api` (Vite proxy → `http://localhost:8080` in dev; nginx in prod).

## Dev

```bash
cd frontend
npm install
npm run dev
```

Requires API Gateway on `:8080` (`cd backend && docker compose up --build`).

JWT: `localStorage` key `wishly_access_token`. Protected routes redirect to `/login` without token. `401` clears JWT and redirects to login.

Demo login: seeded admin `admin@wishly.local` / `admin-change-me` (compose `ADMIN_*`). Other users: register (password ≥ 8 chars).

## Route → API (live)

| Route | API | Status |
|-------|-----|--------|
| `/login` | `POST /api/auth/login` | live |
| `/register` | `POST /api/auth/register` | live |
| `/logout` | `POST /api/auth/logout` (+ clear JWT) | live |
| `/` | redirect → `/wishlists` | live |
| `/wishlists` | `GET /api/wishlists` (`?include_deleted=true` for trash tab) | live |
| `/wishlists/new` | `POST /api/wishlists` (+ optional share-link) | live |
| `/wishlists/:id` | `GET /api/wishlists/{id}`; categories/gifts/comments/share; bookings `GET /api/bookings?wishlist_id=` | live |
| `/wishlists/:id/edit` | `PATCH /api/wishlists/{id}` | live |
| `/wishlists/:id/gifts/new` | `POST /api/wishlists/{id}/gifts` (+ optional image upload) | live |
| `/wishlists/:id/gifts/:giftId/edit` | `PATCH /api/wishlists/{id}/gifts/{giftId}` | live |
| `/wishlists/:id/trash` | `GET …?include_deleted_gifts=true`; `POST …/restore` | live |
| `/notifications` | `GET /api/notifications`; read / read-all; unread-count in layout | live |
| `/my-bookings` | `GET /api/bookings/me`; `POST /api/bookings/{id}/cancel` | live |
| `/w/:token` | `GET /api/share/{token}`; `GET /api/bookings/status`; `POST /api/bookings` | live |
| `/admin` | `GET /api/admin/bookings`; `POST /api/admin/bookings/{id}/cancel` | live |
| `*` / `/404` | — | live |

Media: `GET /api/media/{storageKey}` (public). Session: `GET /api/auth/me`.

Mock fallbacks removed: on API failure pages show error UI (no silent `mock.ts`).

## Structure

```
frontend/src/
  api/           # client, types, auth, wishlists, bookings, notifications
  components/    # layout, RequireAuth, ui
  context/       # AuthProvider (JWT only)
  data/demo.ts   # seeded admin credentials hint
  data/mock.ts   # isolated stub (not used by pages)
  lib/format.ts
  pages/         # all routes — live API
```
