alter table public.invoices
  add column if not exists revision_number integer not null default 0 check (revision_number >= 0),
  add column if not exists replaces_invoice_id uuid references public.invoices(id) on delete set null,
  add column if not exists replaced_by_invoice_id uuid references public.invoices(id) on delete set null,
  add column if not exists replaced_at timestamptz,
  add column if not exists notes_translated text,
  add column if not exists terms_translated text,
  add column if not exists reminders_enabled boolean not null default true;

-- A revision shares the original's sequence; uniqueness now includes the revision.
alter table public.invoices drop constraint if exists invoices_opportunity_ref_sequence_key;
alter table public.invoices add constraint invoices_opportunity_ref_sequence_revision_key unique (opportunity_ref, sequence, revision_number);

comment on column public.invoices.revision_number is '0 for the original; n for INV-xxxxx-Rn, a corrected invoice that replaces an issued one.';
comment on column public.invoices.replaces_invoice_id is 'Issued invoice this revision replaces once sent.';
comment on column public.invoices.replaced_by_invoice_id is 'Revision that replaced this invoice (the invoice is void).';
comment on column public.invoices.replaced_at is 'When the replacing revision was sent.';
comment on column public.invoices.notes_translated is 'Customer notes in the language other than language.';
comment on column public.invoices.terms_translated is 'Custom terms in the language other than language.';
comment on column public.invoices.reminders_enabled is 'Automatic payment reminders to the customer; owner can pause per invoice.';
