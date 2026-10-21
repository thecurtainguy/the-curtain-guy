-- Quote lines show the inventory category itself (e.g. "Lighting") instead of
-- mapping to a fixed list of quote line types.
-- category: product_categories.slug or a built-in service type slug.
-- category_label: display name snapshot at the time the line was saved.
-- Project: xszhnecwhjcywhqjzfit only.

alter table public.quote_line_items
  drop constraint if exists quote_line_items_category_check;

alter table public.quote_line_items
  drop constraint if exists quote_line_items_category_format_check;

alter table public.quote_line_items
  add constraint quote_line_items_category_format_check
  check (category ~ '^[a-z0-9][a-z0-9_]*$' and length(category) <= 60);

alter table public.quote_line_items
  add column if not exists category_label text;

alter table public.product_categories
  drop column if exists quote_line_category;
