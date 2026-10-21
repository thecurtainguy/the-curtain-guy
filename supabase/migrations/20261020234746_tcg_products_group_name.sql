-- Optional color-free family name for products with color variants
-- (e.g. "Velvet Drapes" for "Black Velvet Drapes"). Admin lists only.
alter table public.products add column if not exists group_name text;
