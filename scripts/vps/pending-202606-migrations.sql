-- Pending VPS migrations (Jun 2026). Idempotent — safe to re-run.
-- Apply: docker exec -i sarjan-postgres psql -v ON_ERROR_STOP=1 -U sarjan -d sarjan_textiles < pending-202606-migrations.sql

-- 20260603000000_orders_tax_total.sql
alter table orders
  add column if not exists tax numeric,
  add column if not exists total numeric;

-- 20260603120000_device_tokens.sql
create table if not exists public.device_tokens (
  token text primary key,
  client_id text not null,
  platform text not null default 'android',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists device_tokens_client_id_idx
  on public.device_tokens (client_id);

-- 20260604120000_device_tokens_anonymous.sql
comment on column public.device_tokens.client_id is
  'Client id, or __anonymous__ for logged-out app installs';

-- 20260604140000_client_notifications.sql
create table if not exists public.client_notifications (
  id text primary key,
  client_id text not null,
  title text not null,
  body text not null,
  type text not null,
  image text,
  data jsonb not null default '{}'::jsonb,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists client_notifications_client_created_idx
  on public.client_notifications (client_id, created_at desc);

-- 20260605120000_address_ground_floor.sql
update cms_snapshots
set
  data = replace(
    replace(data::text, 'First Floor, Jyoti Chambers', 'Ground Floor, Jyoti Chambers'),
    'First%20Floor%2C%20Jyoti%20Chambers',
    'Ground%20Floor%2C%20Jyoti%20Chambers'
  )::jsonb,
  updated_at = now()
where data::text like '%First Floor, Jyoti Chambers%';

-- 20260605120000_cart_abandonment_reminders.sql
alter table client_carts
  add column if not exists reminder_1_sent_at timestamptz,
  add column if not exists reminder_2_sent_at timestamptz;
create index if not exists idx_client_carts_abandoned
  on client_carts (updated_at desc)
  where jsonb_array_length(items) > 0;

-- 20260606120000_client_saved_lists.sql
create table if not exists client_saved_lists (
  client_id uuid primary key references clients (id) on delete cascade,
  wishlist_slugs jsonb not null default '[]'::jsonb,
  compare_slugs jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);
create index if not exists idx_client_saved_lists_updated
  on client_saved_lists (updated_at desc);

-- 20260603120000_product_reviews.sql
create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_slug text not null,
  order_id text not null,
  client_id uuid not null references clients(id) on delete cascade,
  client_name text not null,
  rating smallint not null check (rating >= 1 and rating <= 5),
  title text not null,
  body text not null,
  images jsonb not null default '[]'::jsonb,
  videos jsonb not null default '[]'::jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'hidden')),
  helpful_count integer not null default 0,
  approved_by text,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_reviews_unique_order_product_client
    unique (order_id, product_slug, client_id)
);
create index if not exists idx_product_reviews_slug on public.product_reviews (product_slug);
create index if not exists idx_product_reviews_status on public.product_reviews (status);
create index if not exists idx_product_reviews_client on public.product_reviews (client_id);
create index if not exists idx_product_reviews_order on public.product_reviews (order_id);
create index if not exists idx_product_reviews_created on public.product_reviews (created_at desc);
create index if not exists idx_product_reviews_rating on public.product_reviews (rating);

create table if not exists public.review_helpful_votes (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references product_reviews(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint review_helpful_votes_unique unique (review_id, client_id)
);
create index if not exists idx_review_helpful_review on public.review_helpful_votes (review_id);

create table if not exists public.review_reminder_log (
  id uuid primary key default gen_random_uuid(),
  order_id text not null,
  client_id uuid not null references clients(id) on delete cascade,
  reminder_count integer not null default 0,
  first_sent_at timestamptz,
  last_sent_at timestamptz,
  created_at timestamptz not null default now(),
  constraint review_reminder_log_unique_order_client unique (order_id, client_id)
);
create index if not exists idx_review_reminder_client on public.review_reminder_log (client_id);
