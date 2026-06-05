-- Persist wishlist + compare slugs per approved client (sync across devices).

create table if not exists client_saved_lists (
  client_id uuid primary key references clients (id) on delete cascade,
  wishlist_slugs jsonb not null default '[]'::jsonb,
  compare_slugs jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists idx_client_saved_lists_updated
  on client_saved_lists (updated_at desc);
