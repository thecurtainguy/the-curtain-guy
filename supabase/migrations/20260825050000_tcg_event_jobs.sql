-- The Curtain Guy — Phase 7 booked event / job management
-- Safe / idempotent where possible. Does not drop existing data.
-- Project: xszhnecwhjcywhqjzfit only.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- event_jobs
-- ---------------------------------------------------------------------------

create table if not exists public.event_jobs (
  id uuid primary key default gen_random_uuid(),
  opportunity_ref text not null,
  estimate_request_id uuid references public.estimate_requests (id) on delete set null,
  quote_id uuid references public.quotes (id) on delete set null,
  customer_user_id uuid references auth.users (id) on delete set null,
  created_by_user_id uuid references auth.users (id) on delete set null,

  customer_name text,
  customer_email text,
  customer_phone text,
  company_name text,

  event_name text,
  event_type text,
  event_date date,
  event_start_time text,
  event_end_time text,
  guest_count integer,
  venue_name text,
  venue_address text,
  venue_city text,
  venue_region text,
  venue_postal_code text,
  venue_country text default 'Canada',

  install_date date,
  install_start_time text,
  install_end_time text,
  teardown_date date,
  teardown_start_time text,
  teardown_end_time text,
  access_notes text,
  loading_notes text,
  parking_notes text,
  elevator_notes text,
  room_notes text,
  production_notes text,
  customer_visible_notes text,
  internal_notes text,

  status text not null default 'draft'
    check (status in (
      'draft',
      'confirmed',
      'details_needed',
      'venue_confirmed',
      'production_planning',
      'install_scheduled',
      'installed',
      'event_completed',
      'teardown_scheduled',
      'teardown_completed',
      'closed',
      'cancelled'
    )),

  currency text not null default 'CAD',
  accepted_quote_total_cents integer,
  accepted_quote_subtotal_cents integer,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  confirmed_at timestamptz,
  install_scheduled_at timestamptz,
  installed_at timestamptz,
  event_completed_at timestamptz,
  teardown_completed_at timestamptz,
  closed_at timestamptz,
  cancelled_at timestamptz
);

create unique index if not exists event_jobs_quote_id_key
  on public.event_jobs (quote_id)
  where quote_id is not null;

create index if not exists event_jobs_opportunity_ref_idx
  on public.event_jobs (opportunity_ref);

create index if not exists event_jobs_estimate_request_id_idx
  on public.event_jobs (estimate_request_id);

create index if not exists event_jobs_customer_user_id_idx
  on public.event_jobs (customer_user_id);

create index if not exists event_jobs_status_idx
  on public.event_jobs (status);

create index if not exists event_jobs_event_date_idx
  on public.event_jobs (event_date);

drop trigger if exists event_jobs_updated_at on public.event_jobs;
create trigger event_jobs_updated_at
  before update on public.event_jobs
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- event_job_checklist_items
-- ---------------------------------------------------------------------------

create table if not exists public.event_job_checklist_items (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.event_jobs (id) on delete cascade,
  label text not null,
  description text,
  category text not null default 'planning'
    check (category in (
      'planning',
      'venue',
      'measurements',
      'install',
      'teardown',
      'customer',
      'files',
      'production'
    )),
  is_required boolean not null default false,
  is_completed boolean not null default false,
  completed_at timestamptz,
  completed_by_user_id uuid references auth.users (id) on delete set null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists event_job_checklist_items_job_id_idx
  on public.event_job_checklist_items (job_id);

drop trigger if exists event_job_checklist_items_updated_at
  on public.event_job_checklist_items;
create trigger event_job_checklist_items_updated_at
  before update on public.event_job_checklist_items
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- event_job_events (activity timeline)
-- ---------------------------------------------------------------------------

create table if not exists public.event_job_events (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.event_jobs (id) on delete cascade,
  actor_user_id uuid references auth.users (id) on delete set null,
  actor_role text,
  event_type text not null,
  title text not null,
  body text,
  metadata jsonb not null default '{}'::jsonb,
  customer_visible boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists event_job_events_job_id_idx
  on public.event_job_events (job_id);

create index if not exists event_job_events_created_at_idx
  on public.event_job_events (created_at desc);

-- ---------------------------------------------------------------------------
-- event_job_messages
-- ---------------------------------------------------------------------------

create table if not exists public.event_job_messages (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.event_jobs (id) on delete cascade,
  sender_user_id uuid references auth.users (id) on delete set null,
  sender_name text,
  sender_email text,
  sender_role text not null,
  message text not null,
  is_internal boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists event_job_messages_job_id_idx
  on public.event_job_messages (job_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.event_jobs enable row level security;
alter table public.event_job_checklist_items enable row level security;
alter table public.event_job_events enable row level security;
alter table public.event_job_messages enable row level security;

-- Owner: full access
create policy "Owners manage event_jobs"
  on public.event_jobs
  for all
  to authenticated
  using (public.is_owner(auth.uid()))
  with check (public.is_owner(auth.uid()));

create policy "Owners manage event_job_checklist_items"
  on public.event_job_checklist_items
  for all
  to authenticated
  using (public.is_owner(auth.uid()))
  with check (public.is_owner(auth.uid()));

create policy "Owners manage event_job_events"
  on public.event_job_events
  for all
  to authenticated
  using (public.is_owner(auth.uid()))
  with check (public.is_owner(auth.uid()));

create policy "Owners manage event_job_messages"
  on public.event_job_messages
  for all
  to authenticated
  using (public.is_owner(auth.uid()))
  with check (public.is_owner(auth.uid()));

-- Customer: read own jobs
create policy "Customers select own event_jobs"
  on public.event_jobs
  for select
  to authenticated
  using (customer_user_id = auth.uid());

-- Customer: read customer-visible timeline events on own jobs
create policy "Customers select visible event_job_events"
  on public.event_job_events
  for select
  to authenticated
  using (
    customer_visible = true
    and exists (
      select 1
      from public.event_jobs j
      where j.id = event_job_events.job_id
        and j.customer_user_id = auth.uid()
    )
  );

-- Customer: read non-internal messages on own jobs
create policy "Customers select event_job_messages"
  on public.event_job_messages
  for select
  to authenticated
  using (
    is_internal = false
    and exists (
      select 1
      from public.event_jobs j
      where j.id = event_job_messages.job_id
        and j.customer_user_id = auth.uid()
    )
  );

-- Customer: insert non-internal messages on own jobs
create policy "Customers insert event_job_messages"
  on public.event_job_messages
  for insert
  to authenticated
  with check (
    is_internal = false
    and sender_role = 'customer'
    and exists (
      select 1
      from public.event_jobs j
      where j.id = event_job_messages.job_id
        and j.customer_user_id = auth.uid()
    )
  );

-- Server routes use service role; policies are defense-in-depth for direct client access.
