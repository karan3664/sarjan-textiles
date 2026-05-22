-- Persist admin display name / password hash (Vercel cannot write data/*.json).

create table if not exists admin_profile_overrides (
  email text primary key,
  name text,
  password_hash text,
  updated_at timestamptz not null default now()
);
