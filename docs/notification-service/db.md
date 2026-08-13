# notification-service — Database Schema

**Database:** `wishly_notification`  
**СУБД:** PostgreSQL 15+  
**Bounded context:** Notifications

## Conventions

- UUID primary keys (`gen_random_uuid()`)
- `snake_case` for tables and columns
- `created_at`, `updated_at` TIMESTAMPTZ on entity tables
- Cross-service refs are UUID **without** FK to other databases

---

## Tables

### `notifications`

In-app notification for a recipient. Rows are created by Kafka consumers
(`BookingCreated` / `BookingCancelled` / `NotificationRequested`), not by
public write APIs. Email via SMTP updates channel flags as a side-effect.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT `gen_random_uuid()` | |
| recipient_id | UUID | NOT NULL | Logical ref → `auth-service.users.id` |
| type | VARCHAR(64) | NOT NULL | `booking_created` \| `booking_cancelled` (MVP) |
| payload | JSONB | NOT NULL | JSON: `wishlist_id`, `gift_id`, `booker_id`; optional `booking_id`, snapshot titles/names |
| read_at | TIMESTAMPTZ | NULL | Null = unread; set on mark-read / mark-all-read |
| in_app_delivered | BOOLEAN | NOT NULL DEFAULT TRUE | Channel flag: in-app row available to UI |
| email_sent | BOOLEAN | NOT NULL DEFAULT FALSE | Channel flag: SMTP send succeeded |
| email_error | TEXT | NULL | Last SMTP error if email failed (best-effort) |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

**API mapping:** `channel_flags.in_app` ← `in_app_delivered`; `channel_flags.email` ← `email_sent`; `channel_flags.email_error` ← `email_error`.

#### Indexes

| Name | Definition | Purpose |
|------|------------|---------|
| `idx_notifications_recipient_created` | `(recipient_id, created_at DESC)` | List for current user, newest first |
| `idx_notifications_recipient_unread` | `(recipient_id) WHERE read_at IS NULL` | Unread count / badge; mark-all-read |
| `idx_notifications_payload_gift` | `((payload->>'gift_id'))` | Optional lookup by gift (ops/debug) |

#### Example `payload` shape

```json
{
  "wishlist_id": "uuid",
  "gift_id": "uuid",
  "booker_id": "uuid",
  "booking_id": "uuid",
  "wishlist_title": "День рождения Анны",
  "gift_title": "Наушники",
  "booker_display_name": "Иван"
}
```

---

## Migrations

1. `001_init.sql` — create database extensions (`pgcrypto` if needed), table `notifications`, indexes above

## Cross-service references

| Column / JSON field | Logical target | FK? |
|---------------------|----------------|-----|
| `recipient_id` | `auth-service.users.id` | No |
| `payload.wishlist_id` | `wishlist-service.wishlists.id` | No |
| `payload.gift_id` | `wishlist-service.gifts.id` | No |
| `payload.booker_id` | `auth-service.users.id` | No |
| `payload.booking_id` | `booking-service.bookings.id` | No |

Recipient email for SMTP is taken from the Kafka event payload (snapshot), not stored as a required column on `notifications` (optional denormalization later if needed for retries).
