-- Admin inventory catalog (products + services) for quoting.
-- Project: xszhnecwhjcywhqjzfit only.

create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  name text not null,
  sku text,
  slug text not null,
  kind text not null default 'product'
    check (kind in ('product', 'service')),

  category text not null default 'custom',
  short_description text,
  description text,
  unit_label text not null default 'each',

  default_unit_price_cents integer not null default 0
    check (default_unit_price_cents >= 0),
  is_taxable boolean not null default true,

  image_url text,
  image_alt text,

  quantity_on_hand integer not null default 0
    check (quantity_on_hand >= 0),
  low_stock_threshold integer not null default 2
    check (low_stock_threshold >= 0),
  availability_status text not null default 'available'
    check (
      availability_status in (
        'available',
        'low_stock',
        'out_of_stock',
        'unavailable'
      )
    ),

  is_active boolean not null default true,
  is_public boolean not null default false,
  sort_order integer not null default 0
);

create unique index if not exists products_slug_key
  on public.products (slug);

create unique index if not exists products_sku_key
  on public.products (sku)
  where sku is not null and length(trim(sku)) > 0;

create index if not exists products_kind_idx
  on public.products (kind);

create index if not exists products_active_idx
  on public.products (is_active);

create index if not exists products_availability_idx
  on public.products (availability_status);

create index if not exists products_sort_idx
  on public.products (sort_order, name);

drop trigger if exists products_updated_at on public.products;
create trigger products_updated_at
  before update on public.products
  for each row
  execute function public.set_updated_at();

alter table public.products enable row level security;

drop policy if exists "Owners manage products" on public.products;
create policy "Owners manage products"
  on public.products
  for all
  to authenticated
  using (public.is_owner(auth.uid()))
  with check (public.is_owner(auth.uid()));

-- Snapshot product photo/link on quote lines
alter table public.quote_line_items
  add column if not exists product_id uuid
    references public.products (id) on delete set null;

alter table public.quote_line_items
  add column if not exists image_url text;

alter table public.quote_line_items
  add column if not exists image_alt text;

create index if not exists quote_line_items_product_id_idx
  on public.quote_line_items (product_id);

-- Public bucket so guest proposal + PDF can load product images
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array[
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif'
  ]
)
on conflict (id) do update
set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read product images" on storage.objects;
create policy "Public read product images"
  on storage.objects
  for select
  to public
  using (bucket_id = 'product-images');

drop policy if exists "Owners upload product images" on storage.objects;
create policy "Owners upload product images"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'product-images'
    and public.is_owner(auth.uid())
  );

drop policy if exists "Owners update product images" on storage.objects;
create policy "Owners update product images"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'product-images'
    and public.is_owner(auth.uid())
  )
  with check (
    bucket_id = 'product-images'
    and public.is_owner(auth.uid())
  );

drop policy if exists "Owners delete product images" on storage.objects;
create policy "Owners delete product images"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'product-images'
    and public.is_owner(auth.uid())
  );
