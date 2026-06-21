-- Client profile photo URL (public path on site uploads volume)
alter table if exists public.clients
  add column if not exists avatar_url text;
