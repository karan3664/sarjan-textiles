-- In-app notification inbox (per client + broadcast marketing rows).

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
