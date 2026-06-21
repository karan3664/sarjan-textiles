-- Shipping charges on orders (GST-taxable, slab-based at checkout).
alter table orders
  add column if not exists shipping numeric(12, 2) default 0;
