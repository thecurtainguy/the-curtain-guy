-- Admin-editable rental delivery / install zone pricing.
-- Project: xszhnecwhjcywhqjzfit only.

create table if not exists public.rental_delivery_zones (
  id text primary key,
  label text not null,
  short_label text not null,
  priced boolean not null default true,
  full_service_cents integer not null default 0
    check (full_service_cents >= 0),
  transport_only_cents integer not null default 0
    check (transport_only_cents >= 0),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

drop trigger if exists rental_delivery_zones_updated_at on public.rental_delivery_zones;
create trigger rental_delivery_zones_updated_at
  before update on public.rental_delivery_zones
  for each row
  execute function public.set_updated_at();

create index if not exists rental_delivery_zones_sort_idx
  on public.rental_delivery_zones (sort_order, id);

alter table public.rental_delivery_zones enable row level security;

drop policy if exists "Public read active rental delivery zones" on public.rental_delivery_zones;
create policy "Public read active rental delivery zones"
  on public.rental_delivery_zones
  for select
  to anon, authenticated
  using (is_active = true);

drop policy if exists "Owners manage rental delivery zones" on public.rental_delivery_zones;
create policy "Owners manage rental delivery zones"
  on public.rental_delivery_zones
  for all
  to authenticated
  using (public.is_owner(auth.uid()))
  with check (public.is_owner(auth.uid()));

insert into public.rental_delivery_zones (
  id, label, short_label, priced, full_service_cents, transport_only_cents, sort_order, is_active
)
values
  ('montreal-island', 'Montreal Island', 'Montreal Island', true, 45000, 17500, 10, true),
  ('laval', 'Laval', 'Laval', true, 47500, 19000, 20, true),
  (
    'greater-montreal',
    'Greater Montreal (South Shore / West Island / North Shore excl. Laval)',
    'Greater Montreal',
    true,
    52500,
    22500,
    30,
    true
  ),
  ('other', 'Outside these areas — quote only', 'Outside / other', false, 0, 0, 40, true)
on conflict (id) do nothing;
