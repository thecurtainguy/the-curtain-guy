-- Package all-in price can include base logistics for a home zone (usually Montreal Island).
-- Farther zones charge a surcharge = zone price − included zone price.

alter table public.products
  add column if not exists included_logistics_mode text,
  add column if not exists included_logistics_zone_id text;

alter table public.products
  drop constraint if exists products_included_logistics_mode_check;

alter table public.products
  add constraint products_included_logistics_mode_check
  check (
    included_logistics_mode is null
    or included_logistics_mode in ('full_service', 'transport_only')
  );

comment on column public.products.included_logistics_mode is
  'Package only: base logistics baked into package price (full_service or transport_only).';

comment on column public.products.included_logistics_zone_id is
  'Package only: zone id whose logistics price is prepaid in the package (usually montreal-island).';

update public.products p
set
  included_logistics_mode = coalesce(p.included_logistics_mode, 'full_service'),
  included_logistics_zone_id = coalesce(p.included_logistics_zone_id, 'montreal-island')
where p.kind = 'package'
  and exists (
    select 1
    from public.product_package_components ppc
    join public.products c on c.id = ppc.component_product_id
    where ppc.package_product_id = p.id
      and c.kind = 'service'
  );
