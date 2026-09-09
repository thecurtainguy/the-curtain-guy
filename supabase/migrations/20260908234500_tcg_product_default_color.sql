-- Parent/base color for products that also have color variants.
-- Project: xszhnecwhjcywhqjzfit only.

alter table public.products
  add column if not exists default_color_name text,
  add column if not exists default_color_hex text;
