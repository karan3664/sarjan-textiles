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
  placed_via text not null default 'storefront' check (placed_via in ('storefront', 'ai_bot')),
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

create table if not exists client_pricing (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  scope text not null default 'product',
  product_slug text,
  category_path jsonb default '[]'::jsonb,
  public_price numeric(12,2),
  custom_price numeric(12,2),
  discount_percentage numeric(5,2),
  effective_price numeric(12,2),
  valid_from date,
  valid_to date,
  active boolean not null default true,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists product_category_master (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  path jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists client_discounts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  category text,
  discount_percentage numeric(5,2) not null default 0,
  valid_from date,
  valid_to date,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists product_special_prices (
  id uuid primary key default gen_random_uuid(),
  product_slug text not null,
  public_price numeric(12,2),
  special_price numeric(12,2) not null,
  valid_from date,
  valid_to date,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists app_backups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  source text not null default 'manual' check (source in ('manual', 'daily')),
  created_by text not null,
  size_bytes integer not null default 0,
  data jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists analytics_events (
  id uuid primary key default gen_random_uuid(),
  visitor_id text not null,
  path text not null,
  referrer text,
  user_agent text,
  created_at timestamptz not null default now()
);

-- Cart + forgot-password (production when local-db.json is read-only)
create table if not exists password_reset_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  created_at timestamptz not null default now()
);

create table if not exists client_carts (
  client_id uuid primary key references clients(id) on delete cascade,
  items jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  reminder_1_sent_at timestamptz,
  reminder_2_sent_at timestamptz
);

-- Admin bell read/clear state (singleton)
create table if not exists admin_notification_state (
  id integer primary key default 1,
  read_ids jsonb not null default '[]'::jsonb,
  list_cleared_before timestamptz,
  updated_at timestamptz not null default now(),
  constraint admin_notification_state_singleton check (id = 1)
);

insert into admin_notification_state (id, read_ids, list_cleared_before)
values (1, '[]'::jsonb, null)
on conflict (id) do nothing;

create table if not exists admin_profile_overrides (
  email text primary key,
  name text,
  password_hash text,
  updated_at timestamptz not null default now()
);

create index if not exists idx_orders_client_id on orders(client_id);
create index if not exists idx_orders_status on orders(status);
create index if not exists idx_feedbacks_status on feedbacks(status);
create index if not exists idx_client_pricing_client_product on client_pricing(client_id, product_slug);
create index if not exists idx_client_discounts_client on client_discounts(client_id);
create index if not exists idx_product_special_prices_product on product_special_prices(product_slug);
create index if not exists idx_app_backups_created_at on app_backups(created_at desc);
create index if not exists idx_app_backups_source on app_backups(source);
create index if not exists idx_analytics_events_created_at on analytics_events(created_at desc);
create index if not exists idx_analytics_events_visitor_id on analytics_events(visitor_id);
create index if not exists idx_analytics_events_path on analytics_events(path);
create index if not exists idx_password_reset_requests_email on password_reset_requests(email);
create index if not exists idx_password_reset_requests_created_at on password_reset_requests(created_at desc);
create index if not exists idx_client_carts_updated_at on client_carts(updated_at desc);

-- Newsletter subscribers + campaign log
create table if not exists newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  status text not null default 'active' check (status in ('active', 'unsubscribed')),
  unsubscribe_token text not null unique,
  source text not null default 'footer',
  subscribed_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  constraint newsletter_subscribers_email_unique unique (email)
);

create index if not exists idx_newsletter_subscribers_status
  on newsletter_subscribers (status);

create index if not exists idx_newsletter_subscribers_email
  on newsletter_subscribers (email);

create table if not exists newsletter_campaigns (
  id uuid primary key default gen_random_uuid(),
  template_id text not null,
  subject text not null,
  fields jsonb not null default '{}'::jsonb,
  sent_by text,
  recipient_count integer not null default 0,
  sent_count integer not null default 0,
  failed_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_newsletter_campaigns_created_at
  on newsletter_campaigns (created_at desc);
