-- Sarjan AI 3.0 — persisted chat sessions, messages, preferences, analytics

create table if not exists ai_user_preferences (
  client_id uuid primary key references clients (id) on delete cascade,
  language text not null default 'en' check (language in ('en', 'hi', 'hinglish')),
  updated_at timestamptz not null default now()
);

create table if not exists ai_chat_sessions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients (id) on delete cascade,
  language text not null default 'en' check (language in ('en', 'hi', 'hinglish')),
  source text not null default 'web' check (source in ('web', 'app')),
  status text not null default 'active' check (status in ('active', 'closing', 'closed')),
  state jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  last_activity_at timestamptz not null default now(),
  session_duration_seconds integer,
  rating smallint check (rating >= 1 and rating <= 5),
  feedback text,
  products_viewed integer not null default 0,
  products_recommended integer not null default 0,
  add_to_cart_count integer not null default 0,
  orders_placed integer not null default 0
);

create index if not exists idx_ai_chat_sessions_client_started
  on ai_chat_sessions (client_id, started_at desc);

create index if not exists idx_ai_chat_sessions_status
  on ai_chat_sessions (status, last_activity_at desc);

create table if not exists ai_chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references ai_chat_sessions (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_chat_messages_session_created
  on ai_chat_messages (session_id, created_at asc);

create table if not exists ai_session_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references ai_chat_sessions (id) on delete cascade,
  client_id uuid not null references clients (id) on delete cascade,
  event_type text not null,
  product_slug text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_session_events_session
  on ai_session_events (session_id, created_at asc);

create index if not exists idx_ai_session_events_type_created
  on ai_session_events (event_type, created_at desc);
