-- Client profile photo URL (public path or Supabase Storage URL)
alter table if exists public.clients
  add column if not exists avatar_url text;
