create extension if not exists pgcrypto;

create table if not exists public.estimate_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  status text not null default 'new'
    check (status in ('new', 'reviewed', 'quoted', 'closed', 'spam')),

  source text not null default 'website_get_estimate',

  customer_name text not null,
  customer_email text not null,
  customer_phone text,

  event_type text,
  event_date date,
  venue_name text,
  city_area text,
  venue_setting text,
  guest_count integer,

  drape_goals jsonb not null default '[]'::jsonb,
  measurements jsonb not null default '{}'::jsonb,
  look_and_fabric jsonb not null default '{}'::jsonb,
  add_ons jsonb not null default '[]'::jsonb,

  notes text,
  estimate_brief text not null,
  raw_payload jsonb not null,

  submitted_from_url text,
  user_agent text
);

create index if not exists estimate_requests_created_at_idx
  on public.estimate_requests (created_at desc);

create index if not exists estimate_requests_status_idx
  on public.estimate_requests (status);

create index if not exists estimate_requests_customer_email_idx
  on public.estimate_requests (customer_email);

alter table public.estimate_requests enable row level security;

create or replace function public.set_estimate_requests_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists estimate_requests_updated_at on public.estimate_requests;

create trigger estimate_requests_updated_at
  before update on public.estimate_requests
  for each row
  execute function public.set_estimate_requests_updated_at();
