-- Sarjan AI Phase 2 — Sales leads and conversion tracking

create table if not exists ai_leads (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients (id) on delete cascade,
  session_id uuid references ai_chat_sessions (id) on delete set null,
  status text not null default 'new' check (status in ('new', 'qualified', 'converted', 'lost')),
  product_interest text,
  product_slugs jsonb not null default '[]'::jsonb,
  quantity_interest integer,
  budget_inr numeric(12, 2),
  source text not null default 'web' check (source in ('web', 'app')),
  notes text,
  converted_order_id text,
  revenue_inr numeric(12, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ai_leads_client_created
  on ai_leads (client_id, created_at desc);

create index if not exists idx_ai_leads_status_created
  on ai_leads (status, created_at desc);

create index if not exists idx_ai_leads_session
  on ai_leads (session_id);
