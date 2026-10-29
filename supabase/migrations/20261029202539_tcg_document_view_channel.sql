alter table public.document_views
  add column if not exists channel text
  check (channel in ('email', 'pdf', 'portal', 'direct'));

comment on column public.document_views.channel is
  'Where the visitor came from: email link, PDF link, customer portal, or a direct/shared link. Null for rows logged before channel tracking.';
