-- Store who declined a proposal (signature-style full name).
alter table public.quotes
  add column if not exists declined_by_name text;

comment on column public.quotes.declined_by_name is
  'Full name entered when the customer declined the proposal.';
