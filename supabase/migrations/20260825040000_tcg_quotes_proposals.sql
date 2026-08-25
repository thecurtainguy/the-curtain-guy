-- The Curtain Guy — Phase 6 quotes / proposals
-- Safe / idempotent where possible. Does not drop estimate data.
-- Project: xszhnecwhjcywhqjzfit only.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Opportunity reference sequence + columns on estimate_requests
-- ---------------------------------------------------------------------------

create sequence if not exists public.tcg_opportunity_number_seq
  as integer
  start with 10000
  increment by 1
  minvalue 10000
  no maxvalue
  cache 1;

alter table public.estimate_requests
  add column if not exists opportunity_number integer;

alter table public.estimate_requests
  add column if not exists opportunity_ref text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'estimate_requests_opportunity_number_key'
  ) then
    alter table public.estimate_requests
      add constraint estimate_requests_opportunity_number_key
      unique (opportunity_number);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'estimate_requests_opportunity_ref_key'
  ) then
    alter table public.estimate_requests
      add constraint estimate_requests_opportunity_ref_key
      unique (opportunity_ref);
  end if;
end $$;

create or replace function public.format_tcg_opportunity_ref(num integer)
returns text
language sql
immutable
as $$
  select 'TCG-' || num::text;
$$;

create or replace function public.assign_estimate_opportunity_ref(p_estimate_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ref text;
  v_num integer;
begin
  select opportunity_ref into v_ref
  from public.estimate_requests
  where id = p_estimate_id
  for update;

  if v_ref is not null and length(trim(v_ref)) > 0 then
    return v_ref;
  end if;

  v_num := nextval('public.tcg_opportunity_number_seq');
  v_ref := public.format_tcg_opportunity_ref(v_num);

  update public.estimate_requests
  set
    opportunity_number = v_num,
    opportunity_ref = v_ref,
    updated_at = now()
  where id = p_estimate_id;

  return v_ref;
end;
$$;

create or replace function public.estimate_requests_assign_opportunity_ref()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_num integer;
begin
  if new.opportunity_ref is null or length(trim(new.opportunity_ref)) = 0 then
    v_num := nextval('public.tcg_opportunity_number_seq');
    new.opportunity_number := v_num;
    new.opportunity_ref := public.format_tcg_opportunity_ref(v_num);
  elsif new.opportunity_number is null then
    -- Keep number/ref aligned if only ref provided (manual rare case)
    new.opportunity_number := nullif(
      regexp_replace(new.opportunity_ref, '^TCG-', ''),
      ''
    )::integer;
  end if;
  return new;
end;
$$;

drop trigger if exists estimate_requests_assign_opportunity_ref
  on public.estimate_requests;
create trigger estimate_requests_assign_opportunity_ref
  before insert on public.estimate_requests
  for each row
  execute function public.estimate_requests_assign_opportunity_ref();

-- ---------------------------------------------------------------------------
-- quotes
-- ---------------------------------------------------------------------------

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  estimate_request_id uuid not null
    references public.estimate_requests (id) on delete cascade,
  opportunity_ref text not null,
  revision_number integer not null default 1,
  quote_display_ref text not null,
  customer_name text,
  customer_email text not null,
  event_date date,
  event_type text,
  venue_name text,
  city_area text,
  status text not null default 'draft'
    check (status in (
      'draft',
      'sent',
      'viewed',
      'accepted',
      'declined',
      'revision_requested',
      'expired',
      'cancelled'
    )),
  currency text not null default 'CAD',
  subtotal_cents integer not null default 0,
  total_cents integer not null default 0,
  valid_until date,
  customer_notes text,
  owner_notes text,
  terms text,
  public_token_hash text,
  public_token_expires_at timestamptz,
  sent_at timestamptz,
  viewed_at timestamptz,
  accepted_at timestamptz,
  declined_at timestamptz,
  created_by_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quotes_opportunity_revision_key unique (opportunity_ref, revision_number),
  constraint quotes_estimate_revision_key unique (estimate_request_id, revision_number)
);

create unique index if not exists quotes_public_token_hash_key
  on public.quotes (public_token_hash)
  where public_token_hash is not null;

create index if not exists quotes_estimate_request_id_idx
  on public.quotes (estimate_request_id);

create index if not exists quotes_status_idx
  on public.quotes (status);

create index if not exists quotes_customer_email_idx
  on public.quotes (lower(customer_email));

create index if not exists quotes_created_at_idx
  on public.quotes (created_at desc);

drop trigger if exists quotes_updated_at on public.quotes;
create trigger quotes_updated_at
  before update on public.quotes
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- quote_line_items
-- ---------------------------------------------------------------------------

create table if not exists public.quote_line_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null
    references public.quotes (id) on delete cascade,
  category text not null
    check (category in (
      'drape_rental',
      'hardware',
      'installation',
      'delivery',
      'teardown',
      'labor',
      'rush_special_handling',
      'premium_fabric',
      'backdrop',
      'room_divider_masking',
      'custom'
    )),
  description text not null,
  quantity numeric not null default 1,
  unit_price_cents integer not null default 0,
  line_total_cents integer not null default 0,
  status text not null default 'priced'
    check (status in (
      'priced',
      'included',
      'pending_owner_review',
      'not_priced_yet',
      'requested_change',
      'approved',
      'declined',
      'needs_measurement',
      'needs_venue_confirmation'
    )),
  customer_visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists quote_line_items_quote_id_idx
  on public.quote_line_items (quote_id, sort_order);

drop trigger if exists quote_line_items_updated_at on public.quote_line_items;
create trigger quote_line_items_updated_at
  before update on public.quote_line_items
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- quote_customer_requests
-- ---------------------------------------------------------------------------

create table if not exists public.quote_customer_requests (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null
    references public.quotes (id) on delete cascade,
  estimate_request_id uuid not null
    references public.estimate_requests (id) on delete cascade,
  request_type text not null
    check (request_type in ('add_on', 'revision', 'question', 'custom')),
  source_key text,
  title text not null,
  message text,
  status text not null default 'pending_owner_review'
    check (status in (
      'pending_owner_review',
      'approved',
      'declined',
      'converted_to_line_item',
      'needs_info'
    )),
  owner_response text,
  created_by_email text,
  created_by_user_id uuid references auth.users (id) on delete set null,
  reviewed_by_user_id uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists quote_customer_requests_quote_id_idx
  on public.quote_customer_requests (quote_id, created_at desc);

create index if not exists quote_customer_requests_status_idx
  on public.quote_customer_requests (status);

drop trigger if exists quote_customer_requests_updated_at
  on public.quote_customer_requests;
create trigger quote_customer_requests_updated_at
  before update on public.quote_customer_requests
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- quote_events (admin-only change / activity log)
-- ---------------------------------------------------------------------------

create table if not exists public.quote_events (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null
    references public.quotes (id) on delete cascade,
  actor_type text not null
    check (actor_type in ('owner', 'customer', 'system', 'public_link')),
  actor_user_id uuid references auth.users (id) on delete set null,
  actor_email text,
  event_type text not null
    check (event_type in (
      'quote_created',
      'quote_sent',
      'quote_viewed',
      'quote_edited',
      'line_item_added',
      'line_item_updated',
      'line_item_removed',
      'customer_requested_add_on',
      'customer_requested_revision',
      'customer_question',
      'customer_accepted',
      'customer_declined',
      'pdf_downloaded',
      'request_reviewed',
      'revision_created'
    )),
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists quote_events_quote_id_idx
  on public.quote_events (quote_id, created_at desc);

-- ---------------------------------------------------------------------------
-- RLS — service-role / server routes only (no broad public policies)
-- ---------------------------------------------------------------------------

alter table public.quotes enable row level security;
alter table public.quote_line_items enable row level security;
alter table public.quote_customer_requests enable row level security;
alter table public.quote_events enable row level security;

-- Intentionally no anon/authenticated policies.
-- All access goes through Next.js server routes with requireOwner /
-- customer access checks / public token verification + service role.
