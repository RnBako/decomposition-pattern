CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  event_date DATE NOT NULL,
  booking_deadline TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_wishlists_owner_id ON wishlists (owner_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_owner_active ON wishlists (owner_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_wishlists_deleted_at ON wishlists (deleted_at) WHERE deleted_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wishlist_id UUID NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_categories_wishlist_name UNIQUE (wishlist_id, name)
);

CREATE INDEX IF NOT EXISTS idx_categories_wishlist_sort ON categories (wishlist_id, sort_order);

CREATE TABLE IF NOT EXISTS gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wishlist_id UUID NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
  category_id UUID NULL REFERENCES categories(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  url VARCHAR(2048) NOT NULL,
  price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'RUB' CHECK (currency = 'RUB'),
  image_url VARCHAR(2048) NULL,
  image_storage_key VARCHAR(512) NULL,
  notes TEXT NULL,
  is_occupied BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_gifts_wishlist_id ON gifts (wishlist_id);
CREATE INDEX IF NOT EXISTS idx_gifts_wishlist_active ON gifts (wishlist_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_gifts_category_id ON gifts (category_id) WHERE category_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gifts_deleted_at ON gifts (wishlist_id, deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gifts_storage_key ON gifts (image_storage_key) WHERE image_storage_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wishlist_id UUID NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
  token VARCHAR(128) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ NULL,
  CONSTRAINT uq_share_links_token UNIQUE (token)
);

CREATE INDEX IF NOT EXISTS idx_share_links_wishlist ON share_links (wishlist_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_share_links_one_active ON share_links (wishlist_id) WHERE is_active = TRUE;

CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL,
  author_display_name VARCHAR(255) NOT NULL,
  wishlist_id UUID NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
  gift_id UUID NULL REFERENCES gifts(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_comments_wishlist ON comments (wishlist_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_comments_gift ON comments (gift_id) WHERE gift_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_comments_author ON comments (author_id);
