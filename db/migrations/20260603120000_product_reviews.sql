-- Product reviews (verified purchase, admin-moderated).
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
