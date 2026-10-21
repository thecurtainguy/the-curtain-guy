-- Public Rentals catalog: formulas, includes, addons, service links.
-- Project: xszhnecwhjcywhqjzfit only.

alter table public.products
  add column if not exists configurator_mode text not null default 'simple';

alter table public.products
  drop constraint if exists products_configurator_mode_check;

alter table public.products
  add constraint products_configurator_mode_check
  check (configurator_mode in ('simple', 'linear_ft'));

alter table public.products
  add column if not exists formula_segment_feet numeric;

alter table public.products
  drop constraint if exists products_formula_segment_feet_check;

alter table public.products
  add constraint products_formula_segment_feet_check
  check (formula_segment_feet is null or formula_segment_feet > 0);

alter table public.products
  add column if not exists full_service_product_id uuid
    references public.products (id) on delete set null;

alter table public.products
  add column if not exists transport_only_product_id uuid
    references public.products (id) on delete set null;

create table if not exists public.product_formula_includes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  product_id uuid not null references public.products (id) on delete cascade,
  included_product_id uuid not null references public.products (id) on delete restrict,
  qty_per_segment numeric not null default 1 check (qty_per_segment > 0),
  sort_order integer not null default 0,
  unique (product_id, included_product_id)
);

create index if not exists product_formula_includes_product_id_idx
  on public.product_formula_includes (product_id);

create table if not exists public.product_addons (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  product_id uuid not null references public.products (id) on delete cascade,
  addon_product_id uuid not null references public.products (id) on delete restrict,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  unique (product_id, addon_product_id)
);

create index if not exists product_addons_product_id_idx
  on public.product_addons (product_id);

alter table public.product_formula_includes enable row level security;
alter table public.product_addons enable row level security;

drop policy if exists "Owners manage product_formula_includes" on public.product_formula_includes;
create policy "Owners manage product_formula_includes"
  on public.product_formula_includes
  for all
  to authenticated
  using (public.is_owner(auth.uid()))
  with check (public.is_owner(auth.uid()));

drop policy if exists "Owners manage product_addons" on public.product_addons;
create policy "Owners manage product_addons"
  on public.product_addons
  for all
  to authenticated
  using (public.is_owner(auth.uid()))
  with check (public.is_owner(auth.uid()));

alter table public.estimate_requests
  add column if not exists cart_snapshot jsonb;
