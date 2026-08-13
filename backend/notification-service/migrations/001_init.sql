CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL,
  type VARCHAR(64) NOT NULL,
  payload JSONB NOT NULL,
  read_at TIMESTAMPTZ NULL,
  in_app_delivered BOOLEAN NOT NULL DEFAULT TRUE,
  email_sent BOOLEAN NOT NULL DEFAULT FALSE,
  email_error TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created
  ON notifications (recipient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread
  ON notifications (recipient_id)
  WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_payload_gift
  ON notifications ((payload->>'gift_id'));
