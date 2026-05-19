-- Public blog comments (moderated); used when SUPABASE_ENABLED on serverless hosts.
create table if not exists public.blog_comments (
  id uuid primary key default gen_random_uuid(),
  blog_slug text not null,
  author_name text not null,
  author_email text not null,
  body text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_reply text,
  admin_replied_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_blog_comments_slug on public.blog_comments (blog_slug);
create index if not exists idx_blog_comments_status on public.blog_comments (status);
create index if not exists idx_blog_comments_created on public.blog_comments (created_at desc);
