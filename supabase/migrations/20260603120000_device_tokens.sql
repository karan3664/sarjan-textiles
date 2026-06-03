-- Mobile-app FCM device tokens for push notifications (order updates, etc.).
-- One row per device token, linked to the owning client.

create table if not exists public.device_tokens (
  token text primary key,
  client_id text not null,
  platform text not null default 'android',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists device_tokens_client_id_idx
  on public.device_tokens (client_id);
