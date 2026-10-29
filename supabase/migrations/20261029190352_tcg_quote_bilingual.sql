alter table public.quotes
  add column if not exists bilingual boolean not null default true;

comment on column public.quotes.bilingual is
  'True: email, PDFs, quote page and signing in French and English (French first). False: only the quote language.';
