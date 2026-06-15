-- Backup store for review photos/videos when disk volume is empty after redeploy.
create table if not exists public.review_media_files (
  filename text primary key,
  mime text not null,
  content bytea not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_review_media_files_created
  on public.review_media_files (created_at desc);
