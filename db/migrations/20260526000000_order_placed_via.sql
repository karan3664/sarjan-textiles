alter table orders
  add column if not exists placed_via text not null default 'storefront'
  check (placed_via in ('storefront', 'ai_bot'));

create index if not exists orders_placed_via_idx on orders (placed_via);
