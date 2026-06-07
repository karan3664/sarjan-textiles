-- GST breakdown persisted on orders (used by mobile checkout totals).
alter table orders
  add column if not exists tax numeric,
  add column if not exists total numeric;
