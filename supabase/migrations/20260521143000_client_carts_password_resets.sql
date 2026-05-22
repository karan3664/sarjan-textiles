-- Persist cart + password reset flows when local-db.json is not writable (e.g. Vercel).

create table if not exists password_reset_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_password_reset_requests_email
  on password_reset_requests (email);

create index if not exists idx_password_reset_requests_created_at
  on password_reset_requests (created_at desc);

create table if not exists client_carts (
  client_id uuid primary key references clients (id) on delete cascade,
  items jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists idx_client_carts_updated_at
  on client_carts (updated_at desc);
