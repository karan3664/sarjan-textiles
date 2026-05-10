create table if not exists app_backups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  source text not null default 'manual' check (source in ('manual', 'daily')),
  created_by text not null,
  size_bytes integer not null default 0,
  data jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_app_backups_created_at on app_backups(created_at desc);
create index if not exists idx_app_backups_source on app_backups(source);
