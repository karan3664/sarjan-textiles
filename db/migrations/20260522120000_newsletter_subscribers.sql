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
