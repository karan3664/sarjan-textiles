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

ALTER TABLE clients ADD COLUMN IF NOT EXISTS last_login_at timestamptz;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS last_app_open_at timestamptz;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS last_purchase_at timestamptz;
