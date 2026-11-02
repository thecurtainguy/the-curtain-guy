alter table public.quotes add column if not exists authorized_signers jsonb not null default '[]'::jsonb;
comment on column public.quotes.authorized_signers is 'Extra people who may sign this quote, besides the quote contact. Each item is {name, title, email}. The public signing page lets the customer choose one of them.';
