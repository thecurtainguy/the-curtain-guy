-- The Curtain Guy — public marketing image slots
-- Schema tracked in repo. Table may already exist in production (applied via MCP).
-- Seed data lives in scripts/seed-site-image-slots.sql (do not seed here).
-- Shape matches live Supabase: id uuid PK + key unique.

create table if not exists public.site_image_slots (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  page text not null,
  section text not null,
  title text,
  image_url text not null,
  alt_text text not null,
  caption text,
  notes text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists site_image_slots_page_idx
  on public.site_image_slots (page);

create index if not exists site_image_slots_active_idx
  on public.site_image_slots (is_active)
  where is_active = true;

-- Shared helper from tcg_auth_owner_customer_uploads (create if missing)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists site_image_slots_updated_at on public.site_image_slots;
create trigger site_image_slots_updated_at
  before update on public.site_image_slots
  for each row
  execute function public.set_updated_at();

alter table public.site_image_slots enable row level security;

-- Public read of active marketing media only
drop policy if exists "Public can read active site image slots" on public.site_image_slots;
create policy "Public can read active site image slots"
  on public.site_image_slots
  for select
  to anon, authenticated
  using (is_active = true);

-- Owners manage slots (uses existing is_owner helper when present)
drop policy if exists "Owners can manage site image slots" on public.site_image_slots;
create policy "Owners can manage site image slots"
  on public.site_image_slots
  for all
  to authenticated
  using (public.is_owner(auth.uid()))
  with check (public.is_owner(auth.uid()));

comment on table public.site_image_slots is
  'Marketing image slots. Keys match src/data/site-media.ts. Seed via scripts/seed-site-image-slots.sql.';
