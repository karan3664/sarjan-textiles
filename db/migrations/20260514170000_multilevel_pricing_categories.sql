alter table client_pricing
  add column if not exists scope text not null default 'product',
  alter column product_slug drop not null,
  add column if not exists category_path jsonb default '[]'::jsonb;

create table if not exists product_category_master (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  path jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_client_pricing_client_scope on client_pricing(client_id, scope);
