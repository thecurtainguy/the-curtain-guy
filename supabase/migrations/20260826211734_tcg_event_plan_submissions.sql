-- The Curtain Guy — event plan submissions from Studio Event Builder
-- Project: xszhnecwhjcywhqjzfit only.

create extension if not exists pgcrypto;

create table if not exists public.event_plan_submissions (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  contact_name text not null,
  contact_email text not null,
  contact_phone text,

  event_type text,
  event_date date,
  venue_name text,
  city_area text,

  brief_json jsonb not null default '{}'::jsonb,
  design_json jsonb not null default '{}'::jsonb,

  owner_user_id uuid references auth.users (id) on delete set null,
  studio_design_id uuid references public.studio_designs (id) on delete set null,

  status text not null default 'new'
    check (status in ('new', 'reviewed', 'quoted', 'archived')),

  submitted_from_url text,
  user_agent text,
  notes text
);

create index if not exists event_plan_submissions_created_at_idx
  on public.event_plan_submissions (created_at desc);

create index if not exists event_plan_submissions_status_idx
  on public.event_plan_submissions (status);

create index if not exists event_plan_submissions_email_idx
  on public.event_plan_submissions (lower(contact_email));

create index if not exists event_plan_submissions_reference_idx
  on public.event_plan_submissions (reference);

drop trigger if exists event_plan_submissions_updated_at on public.event_plan_submissions;
create trigger event_plan_submissions_updated_at
  before update on public.event_plan_submissions
  for each row
  execute function public.set_updated_at();

alter table public.event_plan_submissions enable row level security;

drop policy if exists "Owners manage event_plan_submissions" on public.event_plan_submissions;
create policy "Owners manage event_plan_submissions"
  on public.event_plan_submissions
  for all
  to authenticated
  using (public.is_owner(auth.uid()))
  with check (public.is_owner(auth.uid()));

-- Public inserts use service role from /api/event-plan/submit.
