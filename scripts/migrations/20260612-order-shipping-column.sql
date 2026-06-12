-- Shipping charges on orders (GST-taxable, slab-based at placement).
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping numeric(12, 2) DEFAULT 0;
