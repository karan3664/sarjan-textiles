create table if not exists analytics_events (
  id uuid primary key default gen_random_uuid(),
  visitor_id text not null,
  path text not null,
  referrer text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_analytics_events_created_at on analytics_events(created_at desc);
create index if not exists idx_analytics_events_visitor_id on analytics_events(visitor_id);
create index if not exists idx_analytics_events_path on analytics_events(path);
