create table if not exists client_pricing (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  product_slug text not null,
  public_price numeric(12,2),
  custom_price numeric(12,2),
  discount_percentage numeric(5,2),
  effective_price numeric(12,2),
  valid_from date,
  valid_to date,
  active boolean not null default true,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists client_discounts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  category text,
  discount_percentage numeric(5,2) not null default 0,
  valid_from date,
  valid_to date,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists product_special_prices (
  id uuid primary key default gen_random_uuid(),
  product_slug text not null,
  public_price numeric(12,2),
  special_price numeric(12,2) not null,
  valid_from date,
  valid_to date,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_client_pricing_client_product on client_pricing(client_id, product_slug);
create index if not exists idx_client_discounts_client on client_discounts(client_id);
create index if not exists idx_product_special_prices_product on product_special_prices(product_slug);
