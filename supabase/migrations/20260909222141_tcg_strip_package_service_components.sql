-- Public package Includes should not list logistics service SKUs.
-- Logistics prepaid in package price is controlled by included_logistics_*.

delete from public.product_package_components ppc
using public.products c
where ppc.component_product_id = c.id
  and c.kind = 'service'
  and exists (
    select 1
    from public.products p
    where p.id = ppc.package_product_id
      and p.kind = 'package'
  );
