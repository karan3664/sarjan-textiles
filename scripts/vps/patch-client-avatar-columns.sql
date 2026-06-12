-- Idempotent: client profile photo + session invalidation (mobile app).
ALTER TABLE clients ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS session_version integer NOT NULL DEFAULT 0;

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'clients'
  AND column_name IN ('avatar_url', 'session_version')
ORDER BY column_name;
