-- Optional listing title override per color variant (e.g. "Navy drapes").
-- Project: xszhnecwhjcywhqjzfit only.

alter table public.product_color_variants
  add column if not exists display_title text;
