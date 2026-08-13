# wishlist-service

Wishly **Wishlist Catalog** microservice: wishlists, categories, gifts (images), share links, comments.

## Stack

- Express + TypeScript
- PostgreSQL (`wishly_wishlist`)
- JWT auth (`JWT_SECRET`, shared with gateway/auth)
- Kafka publisher → `wishly.wishlist.events` (no-op if broker unavailable)
- Local volume uploads (`UPLOAD_DIR`, max 5 MB jpeg/png/webp)

## Limits

- ≤20 active wishlists per user
- ≤200 active gifts per wishlist
- Image upload ≤5 MB

## Endpoints (direct, no `/api` prefix)

| Method | Path | Auth |
|--------|------|------|
| GET | `/health` | no |
| GET/POST | `/wishlists` | JWT |
| GET/PATCH/DELETE | `/wishlists/:id` | JWT |
| POST | `/wishlists/:id/restore` | JWT |
| GET/POST | `/wishlists/:id/categories` | JWT |
| PATCH/DELETE | `/wishlists/:id/categories/:categoryId` | JWT |
| GET/POST | `/wishlists/:id/gifts` | JWT |
| GET/PATCH/DELETE | `/wishlists/:id/gifts/:giftId` | JWT |
| POST | `/wishlists/:id/gifts/:giftId/restore` | JWT |
| POST/DELETE | `/wishlists/:id/gifts/:giftId/image` | JWT |
| GET/POST/DELETE | `/wishlists/:id/share-link` | JWT |
| GET | `/share/:token` | public |
| GET/POST | `/wishlists/:id/comments` | JWT |
| GET/POST | `/wishlists/:id/gifts/:giftId/comments` | JWT |
| DELETE | `/wishlists/:id/comments/:commentId` | JWT |
| GET | `/media/:storageKey` | public |

Gateway mounts these under `/api/*`.

## Kafka events

- `WishlistShared`
- `ShareLinkRevoked`
- `GiftSoftDeleted`
- `WishlistSoftDeleted`

## Run locally

```bash
cp .env.example .env
npm install
npm run migrate
npm run dev
```

Default port: **3002**.

## Docker

```bash
docker build -t wishlist-service .
docker run --env-file .env -p 3002:3002 -v wishly_uploads:/data/uploads wishlist-service
```

## Test / build

```bash
npm run build
npm test
```
