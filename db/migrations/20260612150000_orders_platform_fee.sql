-- Platform fee + GST breakdown on orders (checkout totals).
alter table orders
  add column if not exists platform_fee numeric(12, 2) default 0,
  add column if not exists platform_fee_gst numeric(12, 2) default 0,
  add column if not exists round_off numeric(12, 2) default 0;
