-- The Curtain Guy — invoices, deposits, payments, and owner-editable
-- business / payment settings.
-- Project: xszhnecwhjcywhqjzfit only.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- business_settings (single row, id = 1)
-- ---------------------------------------------------------------------------

create table if not exists public.business_settings (
  id smallint primary key default 1 check (id = 1),

  legal_name text not null default '9395-2521 Québec Inc.',
  trade_name text not null default 'The Curtain Guy',
  address_line1 text not null default '',
  address_line2 text not null default '',
  city text not null default 'Montréal',
  province text not null default 'QC',
  postal_code text not null default '',
  country text not null default 'Canada',
  phone text not null default '514-963-3193',
  email text not null default 'info@thecurtainguy.com',
  website text not null default 'thecurtainguy.com',
  gst_number text not null default '',
  qst_number text not null default '',
  neq text not null default '',

  invoice_prefix text not null default 'INV'
    check (invoice_prefix ~ '^[A-Za-z0-9]{1,12}$'),
  default_deposit_percent numeric(5, 2) not null default 50
    check (default_deposit_percent >= 0 and default_deposit_percent <= 100),
  default_due_days integer not null default 14
    check (default_due_days >= 0 and default_due_days <= 365),
  default_deposit_due_days integer not null default 0
    check (default_deposit_due_days >= 0 and default_deposit_due_days <= 365),

  invoice_notes text not null default '',
  invoice_notes_fr text not null default '',
  invoice_terms text not null default '',
  invoice_terms_fr text not null default '',
  invoice_footer text not null default '',
  invoice_footer_fr text not null default '',
  payment_page_title text not null default '',
  payment_page_title_fr text not null default '',
  payment_page_intro text not null default '',
  payment_page_intro_fr text not null default '',

  -- [{ id, kind, enabled, label, fields: [{ label, value }], instructions }]
  payment_methods jsonb not null default '[]'::jsonb
    check (jsonb_typeof(payment_methods) = 'array'),

  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

drop trigger if exists business_settings_updated_at on public.business_settings;
create trigger business_settings_updated_at
  before update on public.business_settings
  for each row
  execute function public.set_updated_at();

alter table public.business_settings enable row level security;

drop policy if exists "Owners manage business_settings" on public.business_settings;
create policy "Owners manage business_settings"
  on public.business_settings
  for all
  to authenticated
  using (public.is_owner(auth.uid()))
  with check (public.is_owner(auth.uid()));

insert into public.business_settings (
  id,
  invoice_terms,
  invoice_terms_fr,
  invoice_footer,
  invoice_footer_fr,
  payment_page_title,
  payment_page_title_fr,
  payment_page_intro,
  payment_page_intro_fr,
  payment_methods
)
values (
  1,
  $t$A deposit is required to reserve your event date. The booking is confirmed once the deposit is received.
The remaining balance is due on or before the due date shown on this invoice.
Please include the invoice number with every payment.
Deposits are applied to the invoice total. Cancellation terms are as agreed in your accepted quote.
Rental items remain the property of The Curtain Guy and must be available for teardown at the agreed time.$t$,
  $t$Un dépôt est requis pour réserver la date de votre événement. La réservation est confirmée à la réception du dépôt.
Le solde est payable au plus tard à la date d'échéance indiquée sur cette facture.
Veuillez indiquer le numéro de facture avec chaque paiement.
Les dépôts sont appliqués au total de la facture. Les conditions d'annulation sont celles prévues dans la soumission acceptée.
Les articles loués demeurent la propriété de The Curtain Guy et doivent être disponibles pour le démontage à l'heure convenue.$t$,
  'Thank you for choosing The Curtain Guy.',
  'Merci d''avoir choisi The Curtain Guy.',
  'How to pay',
  'Modes de paiement',
  'Choose the payment method that works best for you. Please use your invoice number as the payment reference so we can apply it to your booking.',
  'Choisissez le mode de paiement qui vous convient. Veuillez indiquer votre numéro de facture comme référence afin que nous puissions l''appliquer à votre réservation.',
  $pm$[
    {
      "id": "etransfer",
      "kind": "etransfer",
      "enabled": true,
      "label": "Interac e-Transfer",
      "fields": [
        { "label": "Send to", "value": "info@thecurtainguy.com" },
        { "label": "Message", "value": "Your invoice number" }
      ],
      "instructions": "Include your invoice number in the transfer message."
    },
    {
      "id": "cheque",
      "kind": "cheque",
      "enabled": true,
      "label": "Cheque",
      "fields": [
        { "label": "Payable to", "value": "9395-2521 Québec Inc." },
        { "label": "Mail to", "value": "" }
      ],
      "instructions": "Write your invoice number on the memo line."
    },
    {
      "id": "wire",
      "kind": "wire",
      "enabled": false,
      "label": "Bank wire / direct deposit",
      "fields": [
        { "label": "Account name", "value": "9395-2521 Québec Inc." },
        { "label": "Bank", "value": "" },
        { "label": "Institution #", "value": "" },
        { "label": "Transit #", "value": "" },
        { "label": "Account #", "value": "" },
        { "label": "SWIFT / BIC", "value": "" }
      ],
      "instructions": "Use your invoice number as the payment reference."
    },
    {
      "id": "cash",
      "kind": "cash",
      "enabled": true,
      "label": "Cash",
      "fields": [],
      "instructions": "Cash is accepted in person. A receipt is provided with every cash payment."
    }
  ]$pm$::jsonb
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- invoices
-- ---------------------------------------------------------------------------

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  opportunity_ref text not null,
  sequence integer not null default 0 check (sequence >= 0),
  job_id uuid references public.event_jobs (id) on delete set null,
  quote_id uuid references public.quotes (id) on delete set null,
  estimate_request_id uuid references public.estimate_requests (id) on delete set null,

  status text not null default 'draft'
    check (status in ('draft', 'sent', 'partially_paid', 'paid', 'void')),
  language text not null default 'en' check (language in ('en', 'fr')),

  customer_name text,
  customer_email text,
  customer_phone text,
  company_name text,
  billing_address text,
  event_date date,
  event_type text,
  venue_name text,

  issue_date date not null default current_date,
  due_date date,
  currency text not null default 'CAD',

  tax_mode text not null default 'quebec_gst_qst'
    check (tax_mode in ('none', 'quebec_gst_qst', 'manual')),
  gst_rate numeric(7, 5) not null default 0.05,
  qst_rate numeric(7, 5) not null default 0.09975,
  manual_tax_lines jsonb not null default '[]'::jsonb,
  subtotal_cents integer not null default 0,
  taxable_subtotal_cents integer not null default 0,
  nontaxable_subtotal_cents integer not null default 0,
  gst_cents integer not null default 0,
  qst_cents integer not null default 0,
  manual_tax_cents integer not null default 0,
  total_tax_cents integer not null default 0,
  total_cents integer not null default 0,

  deposit_mode text not null default 'percent'
    check (deposit_mode in ('none', 'percent', 'fixed')),
  deposit_percent numeric(5, 2) not null default 50
    check (deposit_percent >= 0 and deposit_percent <= 100),
  deposit_cents integer not null default 0 check (deposit_cents >= 0),
  deposit_due_date date,

  amount_paid_cents integer not null default 0,
  balance_due_cents integer not null default 0,

  notes text,
  terms text,
  internal_notes text,

  public_token_hash text unique,
  public_token_expires_at timestamptz,

  sent_at timestamptz,
  viewed_at timestamptz,
  paid_at timestamptz,
  voided_at timestamptz,
  created_by_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (opportunity_ref, sequence)
);

create index if not exists invoices_job_id_idx on public.invoices (job_id);
create index if not exists invoices_quote_id_idx on public.invoices (quote_id);
create index if not exists invoices_status_idx on public.invoices (status);

drop trigger if exists invoices_updated_at on public.invoices;
create trigger invoices_updated_at
  before update on public.invoices
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- invoice_line_items
-- ---------------------------------------------------------------------------

create table if not exists public.invoice_line_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  description text not null default '',
  quantity numeric(12, 3) not null default 1,
  unit_label text,
  unit_price_cents numeric(18, 6) not null default 0,
  line_total_cents integer not null default 0,
  is_taxable boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists invoice_line_items_invoice_id_idx
  on public.invoice_line_items (invoice_id, sort_order);

drop trigger if exists invoice_line_items_updated_at on public.invoice_line_items;
create trigger invoice_line_items_updated_at
  before update on public.invoice_line_items
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- invoice_payments
-- ---------------------------------------------------------------------------

create table if not exists public.invoice_payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  kind text not null default 'payment'
    check (kind in ('deposit', 'payment', 'refund')),
  amount_cents integer not null check (amount_cents > 0),
  paid_on date not null default current_date,
  method text not null default '',
  reference text,
  note text,
  recorded_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists invoice_payments_invoice_id_idx
  on public.invoice_payments (invoice_id, paid_on);

-- ---------------------------------------------------------------------------
-- invoice_events (activity log; owner only)
-- ---------------------------------------------------------------------------

create table if not exists public.invoice_events (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  actor_type text not null default 'owner'
    check (actor_type in ('owner', 'customer', 'system', 'public_link')),
  actor_user_id uuid references auth.users (id) on delete set null,
  event_type text not null,
  summary text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists invoice_events_invoice_id_idx
  on public.invoice_events (invoice_id, created_at desc);

-- ---------------------------------------------------------------------------
-- RLS — owners only; customer access goes through server routes.
-- ---------------------------------------------------------------------------

alter table public.invoices enable row level security;
alter table public.invoice_line_items enable row level security;
alter table public.invoice_payments enable row level security;
alter table public.invoice_events enable row level security;

drop policy if exists "Owners manage invoices" on public.invoices;
create policy "Owners manage invoices"
  on public.invoices for all to authenticated
  using (public.is_owner(auth.uid()))
  with check (public.is_owner(auth.uid()));

drop policy if exists "Owners manage invoice_line_items" on public.invoice_line_items;
create policy "Owners manage invoice_line_items"
  on public.invoice_line_items for all to authenticated
  using (public.is_owner(auth.uid()))
  with check (public.is_owner(auth.uid()));

drop policy if exists "Owners manage invoice_payments" on public.invoice_payments;
create policy "Owners manage invoice_payments"
  on public.invoice_payments for all to authenticated
  using (public.is_owner(auth.uid()))
  with check (public.is_owner(auth.uid()));

drop policy if exists "Owners manage invoice_events" on public.invoice_events;
create policy "Owners manage invoice_events"
  on public.invoice_events for all to authenticated
  using (public.is_owner(auth.uid()))
  with check (public.is_owner(auth.uid()));
