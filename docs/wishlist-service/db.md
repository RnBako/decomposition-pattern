# wishlist-service — Database Schema

**Database:** `wishly_wishlist`  
**СУБД:** PostgreSQL 15+  
**Bounded context:** Wishlist Catalog

## Conventions

- UUID primary keys (`gen_random_uuid()`)
- `snake_case` for tables and columns
- `created_at`, `updated_at` TIMESTAMPTZ on all entity tables
- Soft delete via `deleted_at` where applicable
- Cross-service refs are **logical UUIDs without FK** to other databases
- Intra-service FKs allowed within `wishly_wishlist`

---

## Tables

### `wishlists`

Aggregate root for catalog ownership.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK DEFAULT gen_random_uuid() | |
| owner_id | UUID | NOT NULL | Logical ref → `auth-service.users.id` (no FK) |
| title | VARCHAR(255) | NOT NULL | |
| description | TEXT | NULL | |
| event_date | DATE | NOT NULL | Event day |
| booking_deadline | TIMESTAMPTZ | NOT NULL | Must be ≤ end of `event_date` (app validation) |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |
| deleted_at | TIMESTAMPTZ | NULL | Soft delete |

**Indexes**

| Name | Definition | Purpose |
|------|------------|---------|
| `idx_wishlists_owner_id` | `(owner_id)` | List by owner |
| `idx_wishlists_owner_active` | `(owner_id) WHERE deleted_at IS NULL` | Enforce/count ≤20 active wishlists per user |
| `idx_wishlists_deleted_at` | `(deleted_at) WHERE deleted_at IS NOT NULL` | Trash / admin restore lists |

**Notes**

- Limit: max **20** rows per `owner_id` with `deleted_at IS NULL` (enforced in application; optional partial unique not used because soft-deleted may restore).
- Publishing `WishlistSoftDeleted` when `deleted_at` is set.

---

### `categories`

Categories scoped to a wishlist.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK DEFAULT gen_random_uuid() | |
| wishlist_id | UUID | NOT NULL FK → wishlists(id) ON DELETE CASCADE | |
| name | VARCHAR(120) | NOT NULL | Unique per wishlist |
| sort_order | INT | NOT NULL DEFAULT 0 | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

**Indexes**

| Name | Definition | Purpose |
|------|------------|---------|
| `uq_categories_wishlist_name` | UNIQUE `(wishlist_id, name)` | Unique name in wishlist |
| `idx_categories_wishlist_sort` | `(wishlist_id, sort_order)` | Ordered list |

**Notes**

- No soft delete in MVP; hard delete nullifies `gifts.category_id`.

---

### `gifts`

Gift / item in a wishlist.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK DEFAULT gen_random_uuid() | |
| wishlist_id | UUID | NOT NULL FK → wishlists(id) ON DELETE CASCADE | |
| category_id | UUID | NULL FK → categories(id) ON DELETE SET NULL | Optional category |
| title | VARCHAR(255) | NOT NULL | |
| url | VARCHAR(2048) | NOT NULL | Product / description link |
| price | NUMERIC(12,2) | NOT NULL CHECK (price >= 0) | Amount |
| currency | CHAR(3) | NOT NULL DEFAULT 'RUB' CHECK (currency = 'RUB') | RUB only |
| image_url | VARCHAR(2048) | NULL | External image URL |
| image_storage_key | VARCHAR(512) | NULL | Local volume key; public via `/media/{key}` |
| notes | TEXT | NULL | Owner note |
| is_occupied | BOOLEAN | NOT NULL DEFAULT FALSE | Denormalized from booking events |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |
| deleted_at | TIMESTAMPTZ | NULL | Soft delete |

**Indexes**

| Name | Definition | Purpose |
|------|------------|---------|
| `idx_gifts_wishlist_id` | `(wishlist_id)` | List gifts |
| `idx_gifts_wishlist_active` | `(wishlist_id) WHERE deleted_at IS NULL` | Count ≤200 active gifts |
| `idx_gifts_category_id` | `(category_id) WHERE category_id IS NOT NULL` | Filter by category |
| `idx_gifts_deleted_at` | `(wishlist_id, deleted_at) WHERE deleted_at IS NOT NULL` | Trash page |
| `idx_gifts_storage_key` | `(image_storage_key) WHERE image_storage_key IS NOT NULL` | Media lookup / cleanup |

**Notes**

- Limit: max **200** rows per `wishlist_id` with `deleted_at IS NULL`.
- Image: either `image_url` and/or uploaded file (`image_storage_key`); upload ≤ **5 MB**, types jpeg/png/webp (app validation).
- Publishing `GiftSoftDeleted` when `deleted_at` is set.
- `is_occupied` updated by consumer of `BookingCreated` / `BookingCancelled` (no booker PII stored here).

---

### `share_links`

Public access tokens for a wishlist.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK DEFAULT gen_random_uuid() | |
| wishlist_id | UUID | NOT NULL FK → wishlists(id) ON DELETE CASCADE | |
| token | VARCHAR(128) | NOT NULL | Cryptographically random, unguessable |
| is_active | BOOLEAN | NOT NULL DEFAULT TRUE | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |
| revoked_at | TIMESTAMPTZ | NULL | Set on revoke |

**Indexes**

| Name | Definition | Purpose |
|------|------------|---------|
| `uq_share_links_token` | UNIQUE `(token)` | Resolve public `/share/{token}` |
| `idx_share_links_wishlist` | `(wishlist_id)` | Owner get/revoke |
| `uq_share_links_one_active` | UNIQUE `(wishlist_id) WHERE is_active = TRUE` | At most one active link per wishlist |

**Notes**

- Create/activate → Kafka **`WishlistShared`**.
- Revoke → Kafka **`ShareLinkRevoked`**.
- Public view ignores revoked / inactive tokens and soft-deleted wishlists.

---

### `comments`

Owner (and Admin moderation) comments on wishlist and/or gift. Not exposed on public share.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK DEFAULT gen_random_uuid() | |
| author_id | UUID | NOT NULL | Logical ref → `auth-service.users.id` (no FK) |
| author_display_name | VARCHAR(255) | NOT NULL | Snapshot at create |
| wishlist_id | UUID | NOT NULL FK → wishlists(id) ON DELETE CASCADE | Always set for scoping |
| gift_id | UUID | NULL FK → gifts(id) ON DELETE CASCADE | NULL = wishlist-level comment |
| body | TEXT | NOT NULL | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |
| deleted_at | TIMESTAMPTZ | NULL | Soft delete |

**Indexes**

| Name | Definition | Purpose |
|------|------------|---------|
| `idx_comments_wishlist` | `(wishlist_id) WHERE deleted_at IS NULL` | Wishlist-level list |
| `idx_comments_gift` | `(gift_id) WHERE gift_id IS NOT NULL AND deleted_at IS NULL` | Gift-level list |
| `idx_comments_author` | `(author_id)` | Author lookups |

**Check constraint**

- `wishlist_id IS NOT NULL` (always scoped).
- App rule: create allowed only for wishlist **owner** (`author_id` = wishlist `owner_id`); Admin may soft-delete.

---

## Entity relationship (intra-service)

```text
wishlists 1──N categories
    │
    1──N gifts  N──1 categories (optional)
    │
    1──N share_links
    │
    1──N comments
         └── optional gift_id → gifts
```

---

## Soft delete columns

| Table | Column | Restorable by |
|-------|--------|---------------|
| `wishlists` | `deleted_at` | Owner (own), Admin |
| `gifts` | `deleted_at` | Owner (own wishlist), Admin |
| `comments` | `deleted_at` | Author / Admin (moderation) |
| `categories` | — | Hard delete only |
| `share_links` | `revoked_at` + `is_active` | New link via create/rotate (not “restore” of same token) |

---

## Cross-service references (logical UUID, no FK)

| Column | Logical target | Notes |
|--------|----------------|-------|
| `wishlists.owner_id` | `auth-service.users.id` | Ownership / limits |
| `comments.author_id` | `auth-service.users.id` | + `author_display_name` snapshot |
| `gifts.image_storage_key` | local Docker volume file | Public URL via gateway `/api/media/...` |

Booking references `gifts.id` from **booking-service** (no reverse FK here).

---

## Migrations

1. `001_init.sql` — extensions (`pgcrypto`), tables `wishlists`, `categories`, `gifts`, `share_links`, `comments`, indexes, checks
2. `002_gifts_is_occupied.sql` — optional if denormalized occupancy added after initial deploy

---

## Alignment with api.yaml

| API concept | Tables / columns |
|-------------|------------------|
| Wishlist CRUD + soft delete/restore | `wishlists` |
| Categories CRUD | `categories` |
| Gifts CRUD + image URL + multipart | `gifts.image_url`, `gifts.image_storage_key` |
| Share create/revoke/get by token | `share_links` |
| Public share without booker names | `share_links` + `wishlists`/`gifts`/`categories`; `is_occupied` only |
| Comments (owner only) | `comments` |
| Limits 20 / 200 / 5MB | app + indexes on active rows; upload validated in API |
