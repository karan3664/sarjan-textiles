create extension if not exists "pgcrypto";

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  company_name text not null,
  gst text,
  city text,
  phone text,
  address jsonb default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'inactive')),
  created_at timestamptz not null default now()
);

create table if not exists orders (
  id text primary key,
  client_id uuid references clients(id) on delete cascade,
  client_email text not null,
  status text not null default 'Pending approval',
  approval_remark text,
  payment_mode text not null default 'cheque',
  payment_status text not null default 'Pending',
  credit_days integer not null default 90,
  paid_amount numeric not null default 0,
  cheque_number text,
  cheque_date date,
  bank_details text,
  deposit_status text not null default 'Not deposited',
  payment_received_at date,
  subtotal numeric not null default 0,
  items jsonb not null default '[]'::jsonb,
  dispatch_address text,
  dispatch_date date,
  transport_details text,
  lr_number text,
  courier_details text,
  vehicle_details text,
  tracking_notes text,
  dispatch_history jsonb not null default '[]'::jsonb,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists feedbacks (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  email text not null,
  contact_person text,
  phone text,
  requirement text,
  order_id text,
  message text not null,
  status text not null default 'new' check (status in ('new', 'replied')),
  reply_subject text,
  reply_message text,
  replied_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists cms_snapshots (
  id integer primary key default 1,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  constraint cms_singleton check (id = 1)
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_email text,
  actor_role text,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_orders_client_id on orders(client_id);
create index if not exists idx_orders_status on orders(status);
create index if not exists idx_feedbacks_status on feedbacks(status);
