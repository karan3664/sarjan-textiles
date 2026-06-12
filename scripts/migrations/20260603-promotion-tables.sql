-- Optional PostgreSQL tables for promotion analytics at scale.
-- File-based store (data/promotions.json) works without this migration.

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
