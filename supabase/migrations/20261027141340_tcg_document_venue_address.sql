-- Quotes & invoices: venue address snapshot (pre-filled from a saved customer venue, editable).
-- Project: xszhnecwhjcywhqjzfit only.

alter table public.quotes
  add column if not exists venue_address text,
  add column if not exists customer_venue_id uuid references public.customer_venues (id) on delete set null;

alter table public.invoices
  add column if not exists venue_address text,
  add column if not exists customer_venue_id uuid references public.customer_venues (id) on delete set null;

alter table public.quotes
  add constraint quotes_venue_address_length_check
    check (venue_address is null or char_length(venue_address) <= 400);
alter table public.invoices
  add constraint invoices_venue_address_length_check
    check (venue_address is null or char_length(venue_address) <= 400);

create index if not exists quotes_customer_venue_idx on public.quotes (customer_venue_id) where customer_venue_id is not null;
create index if not exists invoices_customer_venue_idx on public.invoices (customer_venue_id) where customer_venue_id is not null;

comment on column public.quotes.venue_address is 'Snapshot shown on the proposal and PDF. Editing the saved venue later does not change it.';
comment on column public.invoices.venue_address is 'Snapshot shown on the invoice and PDF. Editing the saved venue later does not change it.';
