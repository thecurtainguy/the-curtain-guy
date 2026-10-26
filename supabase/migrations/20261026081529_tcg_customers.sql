-- The Curtain Guy — customers module.
-- * customers: one record per client (individual, company, planner, venue, corporate).
-- * customer_contacts: extra people at a company, with roles and auto-Cc flags.
-- * customer_venues: saved venues with install / access notes.
-- * customer_events: append-only audit trail.
-- * customer_id on estimates, quotes, jobs, invoices, event plans, studio designs,
--   linked automatically by email on insert.
-- * invoices.po_number; next_tcg_opportunity_ref() for direct invoices.
-- Project: xszhnecwhjcywhqjzfit only.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- customers
-- ---------------------------------------------------------------------------

create sequence if not exists public.tcg_customer_number_seq
  as integer
  start with 1001
  increment by 1
  minvalue 1001
  no maxvalue
  cache 1;

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  customer_number integer not null unique default nextval('public.tcg_customer_number_seq'),
  kind text not null default 'individual'
    check (kind in ('individual', 'company', 'planner', 'venue', 'corporate')),
  status text not null default 'active' check (status in ('active', 'archived')),

  display_name text not null,
  company_name text,
  legal_name text,
  primary_email text not null
    check (primary_email = lower(btrim(primary_email)) and position('@' in primary_email) > 1),
  phone text,
  website text,
  preferred_language text not null default 'en' check (preferred_language in ('en', 'fr')),
  user_id uuid references auth.users (id) on delete set null,
  portal_invited_at timestamptz,

  billing_address_line1 text,
  billing_address_line2 text,
  billing_city text,
  billing_province text,
  billing_postal_code text,
  billing_country text not null default 'Canada',

  tax_exempt boolean not null default false,
  tax_exempt_reason text,
  gst_number text,
  qst_number text,
  po_required boolean not null default false,
  default_po_number text,
  currency text not null default 'CAD' check (currency in ('CAD', 'USD')),
  preferred_payment_method text,
  default_deposit_percent numeric(5, 2)
    check (default_deposit_percent is null or (default_deposit_percent >= 0 and default_deposit_percent <= 100)),
  balance_due_rule text
    check (balance_due_rule is null or balance_due_rule in ('event_date', 'days_before_event', 'days_after_issue')),
  balance_due_days integer
    check (balance_due_days is null or (balance_due_days >= 0 and balance_due_days <= 365)),

  tags text[] not null default '{}',
  source text,
  internal_notes text,

  created_by_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists customers_primary_email_key on public.customers (primary_email);
create index if not exists customers_user_id_idx on public.customers (user_id);
create index if not exists customers_display_name_idx on public.customers (lower(display_name));

drop trigger if exists customers_updated_at on public.customers;
create trigger customers_updated_at
  before update on public.customers
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- customer_contacts
-- ---------------------------------------------------------------------------

create table if not exists public.customer_contacts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  name text not null default '',
  email text check (email is null or email = lower(btrim(email))),
  phone text,
  title text,
  role text not null default 'other'
    check (role in ('billing', 'event_day', 'planner', 'decision_maker', 'assistant', 'other')),
  cc_invoices boolean not null default false,
  cc_quotes boolean not null default false,
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customer_contacts_customer_idx
  on public.customer_contacts (customer_id, sort_order);
create index if not exists customer_contacts_email_idx on public.customer_contacts (email);

drop trigger if exists customer_contacts_updated_at on public.customer_contacts;
create trigger customer_contacts_updated_at
  before update on public.customer_contacts
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- customer_venues
-- ---------------------------------------------------------------------------

create table if not exists public.customer_venues (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  name text not null,
  address text,
  city text,
  region text,
  postal_code text,
  country text not null default 'Canada',
  access_notes text,
  loading_notes text,
  parking_notes text,
  elevator_notes text,
  room_notes text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customer_venues_customer_idx
  on public.customer_venues (customer_id, lower(name));

drop trigger if exists customer_venues_updated_at on public.customer_venues;
create trigger customer_venues_updated_at
  before update on public.customer_venues
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- customer_events (append-only audit trail)
-- ---------------------------------------------------------------------------

create table if not exists public.customer_events (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers (id) on delete set null,
  customer_number integer,
  customer_name text,
  actor_type text not null default 'owner'
    check (actor_type in ('owner', 'customer', 'system')),
  actor_user_id uuid references auth.users (id) on delete set null,
  actor_email text,
  event_type text not null,
  summary text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists customer_events_customer_idx
  on public.customer_events (customer_id, created_at desc);
create index if not exists customer_events_created_at_idx
  on public.customer_events (created_at desc);

create or replace function public.customer_events_fill()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.customer_id is not null and (new.customer_number is null or new.customer_name is null) then
    select coalesce(new.customer_number, customer_number), coalesce(new.customer_name, display_name)
    into new.customer_number, new.customer_name
    from public.customers where id = new.customer_id;
  end if;
  if new.actor_email is null and new.actor_user_id is not null then
    select email into new.actor_email
    from public.user_profiles where id = new.actor_user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists customer_events_fill on public.customer_events;
create trigger customer_events_fill
  before insert on public.customer_events
  for each row
  execute function public.customer_events_fill();

create or replace function public.customer_events_append_only()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'customer_events is append-only';
  end if;
  -- Only FK cascades nulling customer_id / actor_user_id are allowed.
  if (new.customer_id is not distinct from old.customer_id or new.customer_id is null)
     and (new.actor_user_id is not distinct from old.actor_user_id or new.actor_user_id is null)
     and new.id = old.id
     and new.event_type = old.event_type
     and new.summary = old.summary
     and new.metadata = old.metadata
     and new.created_at = old.created_at
     and new.actor_type = old.actor_type
     and new.actor_email is not distinct from old.actor_email
     and new.customer_number is not distinct from old.customer_number
     and new.customer_name is not distinct from old.customer_name then
    return new;
  end if;
  raise exception 'customer_events is append-only';
end;
$$;

drop trigger if exists customer_events_append_only on public.customer_events;
create trigger customer_events_append_only
  before update or delete on public.customer_events
  for each row
  execute function public.customer_events_append_only();

-- ---------------------------------------------------------------------------
-- customer_id on every customer-facing record + invoice PO number
-- ---------------------------------------------------------------------------

alter table public.estimate_requests
  add column if not exists customer_id uuid references public.customers (id) on delete set null;
alter table public.quotes
  add column if not exists customer_id uuid references public.customers (id) on delete set null;
alter table public.event_jobs
  add column if not exists customer_id uuid references public.customers (id) on delete set null;
alter table public.invoices
  add column if not exists customer_id uuid references public.customers (id) on delete set null;
alter table public.event_plan_submissions
  add column if not exists customer_id uuid references public.customers (id) on delete set null;
alter table public.studio_designs
  add column if not exists customer_id uuid references public.customers (id) on delete set null;

alter table public.invoices add column if not exists po_number text;

create index if not exists estimate_requests_customer_id_idx on public.estimate_requests (customer_id);
create index if not exists quotes_customer_id_idx on public.quotes (customer_id);
create index if not exists event_jobs_customer_id_idx on public.event_jobs (customer_id);
create index if not exists invoices_customer_id_idx on public.invoices (customer_id);
create index if not exists event_plan_submissions_customer_id_idx on public.event_plan_submissions (customer_id);
create index if not exists studio_designs_customer_id_idx on public.studio_designs (customer_id);

-- ---------------------------------------------------------------------------
-- Backfill: one customer per distinct email across all existing records
-- ---------------------------------------------------------------------------

with src as (
  select lower(btrim(customer_email)) as email, customer_name as name, customer_phone as phone,
         null::text as company, language, created_at, source as origin, 3 as lang_rank
  from public.estimate_requests
  union all
  select lower(btrim(customer_email)), customer_name, null, null, language, created_at, 'quote', 2
  from public.quotes
  union all
  select lower(btrim(customer_email)), customer_name, customer_phone, company_name, null, created_at, 'job', 9
  from public.event_jobs
  union all
  select lower(btrim(customer_email)), customer_name, customer_phone, company_name, language, created_at, 'invoice', 1
  from public.invoices
  union all
  select lower(btrim(contact_email)), contact_name, contact_phone, null, language, created_at, 'event_plan', 4
  from public.event_plan_submissions
  union all
  select lower(btrim(contact_email)), contact_name, contact_phone, null, language, created_at, 'studio', 5
  from public.studio_designs
),
clean as (
  select * from src where email is not null and position('@' in email) > 1
),
grouped as (
  select
    email,
    (array_agg(btrim(name) order by created_at desc) filter (where nullif(btrim(name), '') is not null))[1] as name,
    (array_agg(btrim(phone) order by created_at desc) filter (where nullif(btrim(phone), '') is not null))[1] as phone,
    (array_agg(btrim(company) order by created_at desc) filter (where nullif(btrim(company), '') is not null))[1] as company,
    (array_agg(language order by lang_rank, created_at desc) filter (where language in ('en', 'fr')))[1] as language,
    (array_agg(origin order by created_at asc))[1] as origin,
    min(created_at) as first_seen
  from clean
  group by email
)
insert into public.customers (
  kind, display_name, company_name, primary_email, phone, preferred_language,
  user_id, source, created_at
)
select
  case when g.company is not null then 'company' else 'individual' end,
  coalesce(g.name, g.company, split_part(g.email, '@', 1)),
  g.company,
  g.email,
  g.phone,
  coalesce(
    (select p.preferred_language from public.user_profiles p
      where lower(p.email) = g.email and p.preferred_language in ('en', 'fr') limit 1),
    g.language,
    'en'
  ),
  (select p.id from public.user_profiles p
    where lower(p.email) = g.email and p.role = 'customer' limit 1),
  g.origin,
  g.first_seen
from grouped g
order by g.first_seen
on conflict (primary_email) do nothing;

update public.estimate_requests t set customer_id = c.id
from public.customers c
where t.customer_id is null and c.primary_email = lower(btrim(t.customer_email));

update public.quotes t set customer_id = c.id
from public.customers c
where t.customer_id is null and c.primary_email = lower(btrim(t.customer_email));

update public.event_jobs t set customer_id = c.id
from public.customers c
where t.customer_id is null and c.primary_email = lower(btrim(t.customer_email));

update public.invoices t set customer_id = c.id
from public.customers c
where t.customer_id is null and c.primary_email = lower(btrim(t.customer_email));

update public.event_plan_submissions t set customer_id = c.id
from public.customers c
where t.customer_id is null and c.primary_email = lower(btrim(t.contact_email));

update public.studio_designs t set customer_id = c.id
from public.customers c
where t.customer_id is null and c.primary_email = lower(btrim(t.contact_email));

insert into public.customer_events (customer_id, actor_type, event_type, summary, metadata)
select c.id, 'system', 'customer_created',
  'Created from existing records (' || coalesce(c.source, 'import') || ')',
  jsonb_build_object('backfill', true, 'source', c.source)
from public.customers c
where not exists (select 1 from public.customer_events e where e.customer_id = c.id);

-- ---------------------------------------------------------------------------
-- Auto-link new records to a customer by email (creates one when new)
-- ---------------------------------------------------------------------------

create or replace function public.tcg_find_or_create_customer(
  p_email text,
  p_name text,
  p_phone text,
  p_company text,
  p_language text,
  p_source text,
  p_source_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_id uuid;
begin
  if v_email = '' or position('@' in v_email) < 2 then
    return null;
  end if;

  select id into v_id from public.customers where primary_email = v_email;
  if v_id is not null then
    return v_id;
  end if;

  select customer_id into v_id from public.customer_contacts
  where email = v_email order by created_at limit 1;
  if v_id is not null then
    return v_id;
  end if;

  insert into public.customers (
    kind, display_name, company_name, primary_email, phone, preferred_language, user_id, source
  )
  values (
    case when nullif(btrim(p_company), '') is not null then 'company' else 'individual' end,
    coalesce(nullif(btrim(p_name), ''), nullif(btrim(p_company), ''), split_part(v_email, '@', 1)),
    nullif(btrim(p_company), ''),
    v_email,
    nullif(btrim(p_phone), ''),
    case when p_language in ('en', 'fr') then p_language else 'en' end,
    (select p.id from public.user_profiles p
      where lower(p.email) = v_email and p.role = 'customer' limit 1),
    p_source
  )
  on conflict (primary_email) do nothing
  returning id into v_id;

  if v_id is null then
    select id into v_id from public.customers where primary_email = v_email;
  else
    insert into public.customer_events (customer_id, actor_type, event_type, summary, metadata)
    values (v_id, 'system', 'customer_created',
      'Created automatically from a new ' || replace(p_source, '_', ' '),
      jsonb_build_object('source', p_source, 'source_id', p_source_id));
  end if;
  return v_id;
end;
$$;

revoke all on function public.tcg_find_or_create_customer(text, text, text, text, text, text, uuid) from public, anon, authenticated;

create or replace function public.tcg_link_customer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row jsonb;
begin
  if new.customer_id is not null then
    return new;
  end if;
  v_row := to_jsonb(new);
  new.customer_id := public.tcg_find_or_create_customer(
    coalesce(v_row ->> 'customer_email', v_row ->> 'contact_email'),
    coalesce(v_row ->> 'customer_name', v_row ->> 'contact_name'),
    coalesce(v_row ->> 'customer_phone', v_row ->> 'contact_phone'),
    v_row ->> 'company_name',
    v_row ->> 'language',
    case tg_table_name
      when 'estimate_requests' then 'estimate'
      when 'quotes' then 'quote'
      when 'event_jobs' then 'job'
      when 'invoices' then 'invoice'
      when 'event_plan_submissions' then 'event_plan'
      when 'studio_designs' then 'studio_design'
      else tg_table_name
    end,
    (v_row ->> 'id')::uuid
  );
  return new;
end;
$$;

drop trigger if exists estimate_requests_link_customer on public.estimate_requests;
create trigger estimate_requests_link_customer
  before insert or update on public.estimate_requests
  for each row execute function public.tcg_link_customer();

drop trigger if exists quotes_link_customer on public.quotes;
create trigger quotes_link_customer
  before insert or update on public.quotes
  for each row execute function public.tcg_link_customer();

drop trigger if exists event_jobs_link_customer on public.event_jobs;
create trigger event_jobs_link_customer
  before insert or update on public.event_jobs
  for each row execute function public.tcg_link_customer();

drop trigger if exists invoices_link_customer on public.invoices;
create trigger invoices_link_customer
  before insert or update on public.invoices
  for each row execute function public.tcg_link_customer();

drop trigger if exists event_plan_submissions_link_customer on public.event_plan_submissions;
create trigger event_plan_submissions_link_customer
  before insert or update on public.event_plan_submissions
  for each row execute function public.tcg_link_customer();

drop trigger if exists studio_designs_link_customer on public.studio_designs;
create trigger studio_designs_link_customer
  before insert or update on public.studio_designs
  for each row execute function public.tcg_link_customer();

-- Portal sign-ups attach to their customer record by email.
create or replace function public.user_profiles_link_customer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if new.role <> 'customer' or new.email is null then
    return new;
  end if;
  update public.customers
  set user_id = new.id
  where primary_email = lower(btrim(new.email)) and user_id is null
  returning id into v_id;
  if v_id is not null then
    insert into public.customer_events (customer_id, actor_type, actor_user_id, event_type, summary, metadata)
    values (v_id, 'customer', new.id, 'portal_linked', 'Client portal account connected',
      jsonb_build_object('user_id', new.id));
  end if;
  return new;
end;
$$;

drop trigger if exists user_profiles_link_customer on public.user_profiles;
create trigger user_profiles_link_customer
  after insert or update of email, role on public.user_profiles
  for each row execute function public.user_profiles_link_customer();

-- ---------------------------------------------------------------------------
-- Opportunity numbers for invoices that don't come from an estimate
-- ---------------------------------------------------------------------------

create or replace function public.next_tcg_opportunity_ref()
returns text
language sql
security definer
set search_path = public
as $$
  select public.format_tcg_opportunity_ref(nextval('public.tcg_opportunity_number_seq')::integer);
$$;

revoke all on function public.next_tcg_opportunity_ref() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- RLS — owners only; customers reach their data through server routes.
-- ---------------------------------------------------------------------------

alter table public.customers enable row level security;
alter table public.customer_contacts enable row level security;
alter table public.customer_venues enable row level security;
alter table public.customer_events enable row level security;

drop policy if exists "Owners manage customers" on public.customers;
create policy "Owners manage customers"
  on public.customers for all to authenticated
  using (public.is_owner(auth.uid()))
  with check (public.is_owner(auth.uid()));

drop policy if exists "Owners manage customer_contacts" on public.customer_contacts;
create policy "Owners manage customer_contacts"
  on public.customer_contacts for all to authenticated
  using (public.is_owner(auth.uid()))
  with check (public.is_owner(auth.uid()));

drop policy if exists "Owners manage customer_venues" on public.customer_venues;
create policy "Owners manage customer_venues"
  on public.customer_venues for all to authenticated
  using (public.is_owner(auth.uid()))
  with check (public.is_owner(auth.uid()));

drop policy if exists "Owners read customer_events" on public.customer_events;
create policy "Owners read customer_events"
  on public.customer_events for select to authenticated
  using (public.is_owner(auth.uid()));
