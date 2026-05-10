create extension if not exists "uuid-ossp";

create type client_status as enum ('pending', 'approved', 'rejected', 'suspended');
create type order_status as enum ('pending', 'approved', 'rejected', 'modified', 'in_production', 'packed', 'ready_for_dispatch', 'dispatched', 'delivered');

create table site_settings (
  id uuid primary key default uuid_generate_v4(),
  key text not null unique,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table clients (
  id uuid primary key default uuid_generate_v4(),
  company_name text not null,
  contact_name text not null,
  email text not null unique,
  phone text,
  city text,
  gst_number text,
  status client_status not null default 'pending',
  credit_limit numeric(12,2) default 0,
  credit_days integer not null default 90,
  created_at timestamptz not null default now()
);

create table categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  image_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true
);

create table products (
  id uuid primary key default uuid_generate_v4(),
  category_id uuid references categories(id),
  name text not null,
  slug text not null unique,
  sku text not null unique,
  fabric text,
  description text,
  care text,
  price numeric(12,2) not null,
  moq integer not null default 1,
  colors text[] not null default '{}',
  sizes text[] not null default '{}',
  images text[] not null default '{}',
  is_featured boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table inventory (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id) on delete cascade,
  available_stock integer not null default 0,
  reserved_stock integer not null default 0,
  sold_stock integer not null default 0,
  returned_stock integer not null default 0,
  updated_at timestamptz not null default now()
);

create table orders (
  id uuid primary key default uuid_generate_v4(),
  order_number text not null unique,
  client_id uuid not null references clients(id),
  status order_status not null default 'pending',
  subtotal numeric(12,2) not null default 0,
  note text,
  dispatch_address text,
  placed_at timestamptz not null default now(),
  approved_at timestamptz,
  credit_due_at timestamptz
);

create table order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid not null references products(id),
  sku text not null,
  product_name text not null,
  color text,
  size text,
  quantity integer not null,
  unit_price numeric(12,2) not null,
  line_total numeric(12,2) not null
);

create table order_status_history (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  status order_status not null,
  note text,
  created_at timestamptz not null default now()
);

create table cms_pages (
  id uuid primary key default uuid_generate_v4(),
  slug text not null unique,
  title text not null,
  body text,
  seo_title text,
  seo_description text,
  hero_image_url text,
  updated_at timestamptz not null default now()
);

create table blog_posts (
  id uuid primary key default uuid_generate_v4(),
  slug text not null unique,
  title text not null,
  excerpt text,
  content text,
  image_url text,
  published_at timestamptz,
  is_published boolean not null default false
);

create table if not exists app_backups (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  source text not null default 'manual' check (source in ('manual', 'daily')),
  created_by text not null,
  size_bytes integer not null default 0,
  data jsonb not null,
  created_at timestamptz not null default now()
);
