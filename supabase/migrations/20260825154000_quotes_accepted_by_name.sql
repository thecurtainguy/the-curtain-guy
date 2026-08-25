-- Store who accepted a proposal (signature-style full name).
alter table public.quotes
  add column if not exists accepted_by_name text;

comment on column public.quotes.accepted_by_name is
  'Full name entered when the customer accepted the proposal.';
