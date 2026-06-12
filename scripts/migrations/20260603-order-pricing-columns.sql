-- Optional Postgres migration for platform fee + round off on orders.
-- Safe to run multiple times.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax numeric(12, 2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS platform_fee numeric(12, 2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS platform_fee_gst numeric(12, 2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS round_off numeric(12, 2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS total numeric(12, 2);
