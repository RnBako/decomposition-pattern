# booking-service

Wishly **Booking** bounded context. Express + TypeScript + PostgreSQL (`wishly_booking`) + Kafka events.

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | — | Health check |
| POST | `/bookings` | JWT | Create active booking |
| GET | `/bookings?wishlist_id=` | JWT (owner/admin) | List bookings for wishlist |
| GET | `/bookings/me` | JWT | Current user's bookings |
| GET | `/bookings/status?gift_ids=` | optional | Public occupancy (no booker PII) |
| POST | `/bookings/:id/cancel` | JWT | Cancel (admin / owner / booker≤deadline) |
| GET | `/admin/bookings` | JWT admin | Admin list + search |
| POST | `/admin/bookings/:id/cancel` | JWT admin | Force cancel |

Upstream paths (gateway strips `/api`).

## Business rules

- At most one **active** booking per `gift_id` (partial unique index).
- Cannot book own gifts (`booker_id != wishlist_owner_id`).
- Create rejected if `now > booking_deadline` (snapshot) → 422.
- Cancel: Admin any; wishlist owner; booker only while `now ≤ booking_deadline`.

## Kafka (after DB commit)

- `wishly.booking.events`: `BookingCreated`, `BookingCancelled`
- `wishly.notification.commands`: `NotificationRequested`

Set `KAFKA_DISABLED=true` to skip publishing (tests/local without broker).

## Auth

Bearer JWT (`sub`, `email`, `role`, `display_name`) or gateway headers:
`X-User-Id`, `X-User-Role`, `X-User-Email`, `X-User-Display-Name`.

## Setup

```bash
cp .env.example .env
npm install
npm run migrate
npm run dev
```

Default port: **3003**.

```bash
npm run build
npm test
```

## Docker

```bash
docker build -t wishly-booking-service .
```
