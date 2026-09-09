-- Admin-editable copy for generated documents (quotes, emails).
-- Project: xszhnecwhjcywhqjzfit only.

create table if not exists public.document_texts (
  slug text primary key,
  body text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

drop trigger if exists document_texts_updated_at on public.document_texts;
create trigger document_texts_updated_at
  before update on public.document_texts
  for each row
  execute function public.set_updated_at();

alter table public.document_texts enable row level security;

drop policy if exists "Owners manage document texts" on public.document_texts;
create policy "Owners manage document texts"
  on public.document_texts
  for all
  to authenticated
  using (public.is_owner(auth.uid()))
  with check (public.is_owner(auth.uid()));

insert into public.document_texts (slug, body)
values
  (
    'quote.terms',
    $body$This document is a planning proposal based on details shared to date; it is not a final invoice or confirmed booking.
Final pricing may change after venue confirmation, on-site measurements, access constraints, and install/teardown windows are verified.
Inventory and scheduling are reserved only after The Curtain Guy confirms the booking in writing.
Delivery, installation, and teardown are scheduled around the event timeline and may require agreed venue access windows.
Applicable sales taxes (including GST/QST when shown) are included in the proposal total unless noted otherwise.
A deposit or written booking confirmation may be required before production begins.
The client is responsible for accurate venue details, load-in access, and any venue rules affecting installation.$body$
  ),
  (
    'quote.pdf_footer',
    'Planning proposal only. Booking confirmed separately in writing.'
  ),
  (
    'quote.email_note',
    'Availability is not guaranteed until confirmed. Setup, installation, and teardown are planned around your event timeline. No payment is requested in this email.'
  ),
  (
    'quote.email_footer',
    'Montreal event drape rental · thecurtainguy.com'
  ),
  (
    'estimate.email_disclaimer',
    'This is a planning brief, not final pricing. The Curtain Guy team will review measurements, availability, labor, delivery, installation, and teardown before confirming a final rental estimate.'
  )
on conflict (slug) do nothing;
