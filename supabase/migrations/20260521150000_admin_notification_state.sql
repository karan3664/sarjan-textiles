-- Persist admin bell read/clear state (Vercel cannot write data/*.json).

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
