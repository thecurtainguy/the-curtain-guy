alter table public.quotes drop constraint quotes_status_check;
alter table public.quotes add constraint quotes_status_check check (status = any (array['draft','sent','viewed','accepted','declined','revision_requested','expired','cancelled','superseded']::text[]));

alter table public.quotes add column if not exists superseded_by_quote_id uuid references public.quotes(id) on delete set null;
alter table public.quotes add column if not exists superseded_at timestamptz;

comment on column public.quotes.superseded_by_quote_id is 'Later revision that replaced this quote (sent or accepted). Signatures on this quote stay as the historical record.';
comment on column public.quotes.superseded_at is 'When a later revision replaced this quote.';
