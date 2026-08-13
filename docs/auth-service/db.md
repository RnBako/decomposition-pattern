# auth-service — Database Schema

**Database:** `wishly_auth`  
**СУБД:** PostgreSQL 15+  
**Bounded context:** Identity & Access  
**Aggregate:** `User`

## Conventions

- UUID primary keys (`gen_random_uuid()`)
- `snake_case` for tables and columns
- `created_at`, `updated_at` TIMESTAMPTZ on entity tables
- Soft delete: optional `deleted_at` on `users`
- Cross-service refs from other DBs point to `users.id` as **logical UUID only** (no FK across services)

---

## Tables

### `users`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT `gen_random_uuid()` | Идентификатор пользователя |
| email | VARCHAR(320) | NOT NULL, UNIQUE | Логин и адрес для уведомлений |
| password_hash | VARCHAR(255) | NOT NULL | Хеш пароля (bcrypt/argon2); plaintext не хранить |
| display_name | VARCHAR(120) | NOT NULL | Отображаемое имя |
| role | VARCHAR(16) | NOT NULL, CHECK (`role` IN (`'user'`, `'admin'`)) | Платформенная роль; регистрация всегда `user` |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |
| deleted_at | TIMESTAMPTZ | NULL | Soft delete аккаунта (опционально в MVP) |

**Правила:**

- Уникальность `email` — среди активных и удалённых (глобальный UNIQUE); при soft-delete повторная регистрация тем же email — 409 или политика restore (MVP: UNIQUE без переиспользования).
- Роль `admin` **не** выставляется через API регистрации — только seed при старте из env (`ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_DISPLAY_NAME`): upsert по email с `role=admin`.
- Логин / `GET /auth/me` / `GET /auth/users/{id}` игнорируют или отдают 401/404 для строк с `deleted_at IS NOT NULL` (политика MVP: скрыть soft-deleted).

---

## Indexes

| Name | Table | Definition | Purpose |
|------|-------|------------|---------|
| `users_pkey` | users | PRIMARY KEY (`id`) | PK |
| `users_email_key` | users | UNIQUE (`email`) | Вход и регистрация |
| `idx_users_role` | users | (`role`) WHERE `deleted_at IS NULL` | Операционные выборки (admin seed / списки) |
| `idx_users_deleted_at` | users | (`deleted_at`) WHERE `deleted_at IS NOT NULL` | Soft-deleted (если включено) |

---

## Migrations

1. `001_init.sql` — расширение `pgcrypto` (или `uuid-ossp`); таблица `users`; UNIQUE на `email`; CHECK на `role`; индексы выше.
2. `002_admin_seed_note.md` — не SQL-миграция: документирует bootstrap admin из env при старте приложения (идемпотентный upsert). Опционально отдельный SQL seed только для локальной разработки — не коммитить прод-пароли.

Пример фрагмента `001_init.sql` (outline):

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(320) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(120) NOT NULL,
  role VARCHAR(16) NOT NULL CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  CONSTRAINT users_email_key UNIQUE (email)
);

CREATE INDEX idx_users_role ON users (role) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_deleted_at ON users (deleted_at) WHERE deleted_at IS NOT NULL;
```

---

## Cross-service references

Другие сервисы хранят только UUID пользователя **без FK** на `wishly_auth`:

| Consumer | Field | Logical ref |
|----------|-------|-------------|
| wishlist-service | `wishlists.owner_id`, `comments.author_id` | `users.id` |
| booking-service | `bookings.booker_id`, `bookings.cancelled_by_id` | `users.id` |
| notification-service | `notifications.recipient_id` | `users.id` |

Snapshot-поля (`display_name`, `email`) копируются в consumer при необходимости; актуальный профиль — через `GET /auth/users/{id}` (gateway/internal) или claims JWT.
