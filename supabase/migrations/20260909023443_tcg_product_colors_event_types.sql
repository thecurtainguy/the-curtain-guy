-- Product event tags + hybrid color variants for Rentals catalog.
-- Project: xszhnecwhjcywhqjzfit only.

alter table public.products
  add column if not exists event_type_ids text[] not null default '{}'::text[];

create index if not exists products_event_type_ids_gin
  on public.products using gin (event_type_ids);

create table if not exists public.product_color_variants (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  product_id uuid not null references public.products (id) on delete cascade,
  name text not null,
  slug text not null,
  hex text not null default '#8b909a',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  image_url text,
  image_alt text,
  has_own_pricing boolean not null default false,
  unit_price_cents integer check (unit_price_cents is null or unit_price_cents >= 0),
  quantity_on_hand integer check (quantity_on_hand is null or quantity_on_hand >= 0),
  availability_status text
    check (
      availability_status is null
      or availability_status in (
        'available',
        'low_stock',
        'out_of_stock',
        'unavailable'
      )
    ),
  unique (product_id, slug)
);

create index if not exists product_color_variants_product_idx
  on public.product_color_variants (product_id, sort_order, name);

drop trigger if exists product_color_variants_updated_at on public.product_color_variants;
create trigger product_color_variants_updated_at
  before update on public.product_color_variants
  for each row
  execute function public.set_updated_at();

alter table public.product_color_variants enable row level security;

drop policy if exists "Owners manage product color variants" on public.product_color_variants;
create policy "Owners manage product color variants"
  on public.product_color_variants
  for all
  to authenticated
  using (public.is_owner(auth.uid()))
  with check (public.is_owner(auth.uid()));
