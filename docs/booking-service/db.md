# booking-service — Database Schema

**Database:** `wishly_booking`  
**СУБД:** PostgreSQL 15+  
**Aggregate:** `Booking`

## Conventions

- UUID primary keys (`gen_random_uuid()`)
- `snake_case` for tables and columns
- `created_at`, `updated_at` TIMESTAMPTZ on entity tables
- Cross-service refs are logical UUID **without** FK to other databases
- Soft delete не применяется к брони: отмена через `status = cancelled`

---

## Tables

### `bookings`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK DEFAULT `gen_random_uuid()` | Aggregate root |
| gift_id | UUID | NOT NULL | Logical ref → wishlist-service.gifts.id |
| booker_id | UUID | NOT NULL | Logical ref → auth-service.users.id |
| status | VARCHAR(32) | NOT NULL, CHECK (`active` \| `cancelled`) | Только одно активное бронирование на gift |
| gift_title | VARCHAR(500) | NOT NULL | Snapshot названия подарка |
| wishlist_id | UUID | NOT NULL | Snapshot / logical ref → wishlists.id |
| wishlist_owner_id | UUID | NOT NULL | Snapshot / logical ref → users.id (owner) |
| booking_deadline | TIMESTAMPTZ | NOT NULL | Snapshot дедлайна вишлиста |
| booker_display_name | VARCHAR(255) | NOT NULL | Snapshot display name booker |
| booker_email | VARCHAR(320) | NOT NULL | Snapshot email (owner/admin; не в public status API) |
| cancelled_at | TIMESTAMPTZ | NULL | Момент отмены |
| cancelled_by_id | UUID | NULL | Logical ref → users.id (admin / owner / booker) |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

#### Indexes

| Name | Definition | Purpose |
|------|------------|---------|
| `uq_bookings_active_gift` | UNIQUE (`gift_id`) WHERE `status = 'active'` | Инвариант: одна активная бронь на подарок |
| `idx_bookings_booker_id` | (`booker_id`, `created_at` DESC) | Список «мои бронирования» |
| `idx_bookings_wishlist_id` | (`wishlist_id`, `status`) | Список броней вишлиста (owner/admin) |
| `idx_bookings_gift_id` | (`gift_id`) | Public status / lookup по gift |
| `idx_bookings_status_created` | (`status`, `created_at` DESC) | Admin list |

#### Business rules (enforced in DB + service)

1. Partial unique index `uq_bookings_active_gift` — не более одной строки `status = 'active'` на `gift_id`.
2. Отмена: `status → cancelled`, заполняются `cancelled_at`, `cancelled_by_id`; после отмены подарок снова может быть забронирован (новая строка или повторный create — предпочтительно **новая** запись booking history; MVP допускает только update status на cancelled и новый insert при повторной брони).
3. Повторная бронь после cancel: INSERT новой строки `active` (история сохраняется).

---

## Migrations

1. `001_init.sql` — extension `pgcrypto` (если нужно), table `bookings`, CHECK на status, partial unique index, secondary indexes.

Пример DDL (ориентир):

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE bookings (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_id              UUID NOT NULL,
  booker_id            UUID NOT NULL,
  status               VARCHAR(32) NOT NULL CHECK (status IN ('active', 'cancelled')),
  gift_title           VARCHAR(500) NOT NULL,
  wishlist_id          UUID NOT NULL,
  wishlist_owner_id    UUID NOT NULL,
  booking_deadline     TIMESTAMPTZ NOT NULL,
  booker_display_name  VARCHAR(255) NOT NULL,
  booker_email         VARCHAR(320) NOT NULL,
  cancelled_at         TIMESTAMPTZ NULL,
  cancelled_by_id      UUID NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX uq_bookings_active_gift
  ON bookings (gift_id)
  WHERE status = 'active';

CREATE INDEX idx_bookings_booker_id ON bookings (booker_id, created_at DESC);
CREATE INDEX idx_bookings_wishlist_id ON bookings (wishlist_id, status);
CREATE INDEX idx_bookings_gift_id ON bookings (gift_id);
CREATE INDEX idx_bookings_status_created ON bookings (status, created_at DESC);
```

---

## Cross-service references

| Column | Target (logical) | Notes |
|--------|------------------|-------|
| `gift_id` | wishlist-service.gifts.id | Без FK |
| `wishlist_id` | wishlist-service.wishlists.id | Snapshot + фильтр списков |
| `wishlist_owner_id` | auth-service.users.id | Проверка «не бронировать своё»; права owner cancel |
| `booker_id` | auth-service.users.id | |
| `cancelled_by_id` | auth-service.users.id | Опционально |

События wishlist (`GiftSoftDeleted`, `WishlistSoftDeleted`) обрабатываются consumer’ом booking-service (отмена/скрытие активных броней по политике) без JOIN к `wishly_wishlist`.
