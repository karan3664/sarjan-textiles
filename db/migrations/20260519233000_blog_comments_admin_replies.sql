-- Multiple official replies per comment (storefront + admin). Legacy admin_reply / admin_replied_at kept in sync with last reply.
alter table public.blog_comments
  add column if not exists admin_replies jsonb not null default '[]'::jsonb;
