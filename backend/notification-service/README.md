# notification-service

Wishly **Notifications** bounded context. Express + TypeScript + PostgreSQL (`wishly_notification`) + Kafka consumers + SMTP (Nodemailer).

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | — | Health check |
| GET | `/notifications` | JWT | List notifications (`unread_only`, `limit`, `offset`) |
| GET | `/notifications/unread-count` | JWT | Unread badge count |
| POST | `/notifications/read-all` | JWT | Mark all unread as read |
| POST | `/notifications/:id/read` | JWT | Mark one notification as read |

Upstream paths (gateway strips `/api`; mounts under `/api/notifications/*`).

## Kafka consumers

| Topic | Events |
|-------|--------|
| `wishly.booking.events` | `BookingCreated`, `BookingCancelled` |
| `wishly.notification.commands` | `NotificationRequested` |

On each message the service creates an in-app `notifications` row (deduped by `recipient_id` + `type` + `payload.booking_id`) and best-effort SMTP email. If SMTP is missing or send fails, the row is still created with `email_sent=false` and `email_error` set.

Set `KAFKA_DISABLED=true` to skip the consumer (tests / local without broker).

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

Default port: **3004**.

```bash
npm run build
npm test
```

## Docker

```bash
docker build -t wishly-notification-service .
```

Local email: Mailpit SMTP (`SMTP_HOST` / `SMTP_PORT=1025`).
