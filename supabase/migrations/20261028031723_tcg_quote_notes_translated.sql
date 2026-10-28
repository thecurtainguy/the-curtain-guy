alter table public.quotes add column if not exists customer_notes_translated text;
comment on column public.quotes.customer_notes_translated is 'Customer notes in the language other than quotes.language.';
