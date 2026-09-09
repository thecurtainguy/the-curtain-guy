-- Curated rental packages: kind + fixed kit components.
-- Project: xszhnecwhjcywhqjzfit only.

alter table public.products
  drop constraint if exists products_kind_check;

alter table public.products
  add constraint products_kind_check
  check (kind in ('product', 'service', 'package'));

create table if not exists public.product_package_components (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  package_product_id uuid not null references public.products (id) on delete cascade,
  component_product_id uuid not null references public.products (id) on delete restrict,
  quantity numeric not null default 1 check (quantity > 0),
  sort_order integer not null default 0,
  unique (package_product_id, component_product_id),
  check (package_product_id <> component_product_id)
);

create index if not exists product_package_components_package_id_idx
  on public.product_package_components (package_product_id);

create index if not exists product_package_components_component_id_idx
  on public.product_package_components (component_product_id);

alter table public.product_package_components enable row level security;

drop policy if exists "Owners manage product_package_components"
  on public.product_package_components;
create policy "Owners manage product_package_components"
  on public.product_package_components
  for all
  to authenticated
  using (public.is_owner(auth.uid()))
  with check (public.is_owner(auth.uid()));
