-- Sarjan AI 3.1 — Memory engine (cross-device interests + cached recommendations)

create table if not exists ai_user_interests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients (id) on delete cascade,
  interest_key text not null,
  interest_type text not null check (
    interest_type in ('search', 'product_view', 'add_to_cart', 'order', 'category')
  ),
  product_slug text,
  category text,
  search_query text,
  quantity_total integer not null default 0,
  order_count integer not null default 0,
  score integer not null default 1,
  sources jsonb not null default '[]'::jsonb,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (client_id, interest_key)
);

create index if not exists ai_user_interests_client_score_idx
  on ai_user_interests (client_id, score desc, last_seen_at desc);

create table if not exists ai_user_recommendations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients (id) on delete cascade,
  kind text not null check (
    kind in (
      'recommended_products',
      'continue_shopping',
      'similar_products',
      'best_sellers',
      'frequently_bought_together',
      'premium_alternatives'
    )
  ),
  product_slugs jsonb not null default '[]'::jsonb,
  context jsonb not null default '{}'::jsonb,
  source text not null default 'web' check (source in ('web', 'app')),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, kind)
);

create index if not exists ai_user_recommendations_client_idx
  on ai_user_recommendations (client_id, updated_at desc);

-- Abandoned purchase intent on leads
alter table ai_leads
  add column if not exists intent_type text not null default 'purchase_intent'
  check (intent_type in ('purchase_intent', 'abandoned_cart', 'general'));

alter table ai_leads
  add column if not exists interested_product text;

create index if not exists ai_leads_intent_status_idx
  on ai_leads (intent_type, status, created_at desc);
