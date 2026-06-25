create table if not exists admin_device_tokens (
  token text primary key,
  admin_email text not null,
  admin_role text not null default 'admin',
  platform text not null default 'android',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists admin_device_tokens_email_idx on admin_device_tokens (admin_email);
