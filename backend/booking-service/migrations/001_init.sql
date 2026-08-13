CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS bookings (
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

CREATE UNIQUE INDEX IF NOT EXISTS uq_bookings_active_gift
  ON bookings (gift_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_bookings_booker_id ON bookings (booker_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_wishlist_id ON bookings (wishlist_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_gift_id ON bookings (gift_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status_created ON bookings (status, created_at DESC);
