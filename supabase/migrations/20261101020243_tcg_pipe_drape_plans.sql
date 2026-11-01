create table if not exists public.pipe_drape_plans (
  document_key text primary key
    check (document_key ~ '^(quote|invoice):[0-9a-f-]{36}$' or document_key = 'scratch'),
  plan jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

comment on table public.pipe_drape_plans is
  'Pipe & drape hardware calculator layouts: one per quote or invoice, plus the owner''s standalone scratch layout.';

alter table public.pipe_drape_plans enable row level security;
