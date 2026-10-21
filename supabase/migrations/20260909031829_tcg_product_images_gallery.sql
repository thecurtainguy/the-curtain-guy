-- Multi-photo galleries for parent products and color variants.
-- Project: xszhnecwhjcywhqjzfit only.

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  product_id uuid not null references public.products (id) on delete cascade,
  color_variant_id uuid references public.product_color_variants (id) on delete cascade,
  image_url text not null,
  image_alt text,
  sort_order integer not null default 0
);

create index if not exists product_images_product_idx
  on public.product_images (product_id, sort_order);

create index if not exists product_images_variant_idx
  on public.product_images (color_variant_id, sort_order)
  where color_variant_id is not null;

create index if not exists product_images_parent_idx
  on public.product_images (product_id, sort_order)
  where color_variant_id is null;

drop trigger if exists product_images_updated_at on public.product_images;
create trigger product_images_updated_at
  before update on public.product_images
  for each row
  execute function public.set_updated_at();

alter table public.product_images enable row level security;

drop policy if exists "Owners manage product images" on public.product_images;
create policy "Owners manage product images"
  on public.product_images
  for all
  to authenticated
  using (public.is_owner(auth.uid()))
  with check (public.is_owner(auth.uid()));

-- Backfill parent galleries from products.image_url
insert into public.product_images (product_id, color_variant_id, image_url, image_alt, sort_order)
select p.id, null, p.image_url, p.image_alt, 0
from public.products p
where p.image_url is not null
  and length(trim(p.image_url)) > 0
  and not exists (
    select 1 from public.product_images pi
    where pi.product_id = p.id and pi.color_variant_id is null
  );

-- Backfill variant galleries from product_color_variants.image_url
insert into public.product_images (product_id, color_variant_id, image_url, image_alt, sort_order)
select v.product_id, v.id, v.image_url, v.image_alt, 0
from public.product_color_variants v
where v.image_url is not null
  and length(trim(v.image_url)) > 0
  and not exists (
    select 1 from public.product_images pi
    where pi.color_variant_id = v.id
  );
