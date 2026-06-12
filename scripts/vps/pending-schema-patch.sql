-- Sarjan Textiles — idempotent schema patch for Coolify Postgres.
-- Safe to run multiple times. Run after initial bootstrap if checkout/orders fail
-- with "column does not exist" errors.

-- ── Orders: pricing breakdown (mobile + web checkout) ──
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax numeric(12, 2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping numeric(12, 2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS platform_fee numeric(12, 2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS platform_fee_gst numeric(12, 2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS round_off numeric(12, 2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS total numeric(12, 2);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS placed_via text NOT NULL DEFAULT 'storefront';
CREATE INDEX IF NOT EXISTS orders_placed_via_idx ON orders (placed_via);

-- ── Clients: session invalidation + app analytics ──
ALTER TABLE clients ADD COLUMN IF NOT EXISTS session_version integer NOT NULL DEFAULT 0;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS last_login_at timestamptz;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS last_app_open_at timestamptz;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS last_purchase_at timestamptz;

-- ── Carts: abandoned-cart reminders (skip if table missing) ──
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'client_carts'
  ) THEN
    ALTER TABLE client_carts
      ADD COLUMN IF NOT EXISTS reminder_1_sent_at timestamptz,
      ADD COLUMN IF NOT EXISTS reminder_2_sent_at timestamptz;
    CREATE INDEX IF NOT EXISTS idx_client_carts_abandoned
      ON client_carts (updated_at DESC)
      WHERE jsonb_array_length(items) > 0;
  END IF;
END $$;

-- ── App engagement (mobile analytics) ──
CREATE TABLE IF NOT EXISTS app_engagement_events (
  id bigserial PRIMARY KEY,
  event text NOT NULL CHECK (event IN ('install', 'app_open', 'session_start')),
  platform text NOT NULL,
  client_id text,
  device_id text NOT NULL,
  app_version text,
  version_code integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS app_engagement_events_event_created_idx
  ON app_engagement_events (event, created_at DESC);

CREATE INDEX IF NOT EXISTS app_engagement_events_device_created_idx
  ON app_engagement_events (device_id, created_at DESC);

CREATE INDEX IF NOT EXISTS app_engagement_events_client_created_idx
  ON app_engagement_events (client_id, created_at DESC);

-- ── Promotion analytics (optional; file store works without this) ──
CREATE TABLE IF NOT EXISTS promotion_ads (
  id text PRIMARY KEY,
  payload jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS promotion_ad_events (
  id bigserial PRIMARY KEY,
  ad_id text NOT NULL,
  event text NOT NULL CHECK (event IN ('view', 'click')),
  client_id text,
  platform text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS promotion_ad_events_ad_id_idx
  ON promotion_ad_events (ad_id, created_at DESC);

-- ── Verify orders columns ──
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'orders'
  AND column_name IN (
    'tax', 'shipping', 'platform_fee', 'platform_fee_gst', 'round_off', 'total', 'placed_via'
  )
ORDER BY column_name;
