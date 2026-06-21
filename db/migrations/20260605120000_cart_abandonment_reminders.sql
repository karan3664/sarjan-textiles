-- Track abandoned-cart reminder sends (push + email cron).

alter table client_carts
  add column if not exists reminder_1_sent_at timestamptz,
  add column if not exists reminder_2_sent_at timestamptz;

create index if not exists idx_client_carts_abandoned
  on client_carts (updated_at desc)
  where jsonb_array_length(items) > 0;
