-- Owner-managed inventory categories, separate from fixed quote line types.
-- products.category stores a product_categories.slug; each category maps to the
-- quote line type its items bill as (quote_line_items.category stays fixed).
-- Project: xszhnecwhjcywhqjzfit only.

create table if not exists public.product_categories (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  slug text not null,
  label text not null
    check (length(trim(label)) > 0),
  description text,
  quote_line_category text not null default 'custom'
    check (quote_line_category in (
      'drape_rental',
      'hardware',
      'installation',
      'delivery',
      'teardown',
      'labor',
      'rush_special_handling',
      'premium_fabric',
      'backdrop',
      'room_divider_masking',
      'custom'
    )),

  sort_order integer not null default 0,
  is_active boolean not null default true
);

create unique index if not exists product_categories_slug_key
  on public.product_categories (slug);

create index if not exists product_categories_sort_idx
  on public.product_categories (sort_order, label);

drop trigger if exists product_categories_updated_at on public.product_categories;
create trigger product_categories_updated_at
  before update on public.product_categories
  for each row
  execute function public.set_updated_at();

alter table public.product_categories enable row level security;

drop policy if exists "Owners manage product categories" on public.product_categories;
create policy "Owners manage product categories"
  on public.product_categories
  for all
  to authenticated
  using (public.is_owner(auth.uid()))
  with check (public.is_owner(auth.uid()));

-- Seed from slugs already used by products so no product rows change.
insert into public.product_categories (slug, label, quote_line_category, sort_order)
values
  ('drape_rental', 'Pipe & drape', 'drape_rental', 10),
  ('hardware', 'Hardware', 'hardware', 20),
  ('installation', 'Installation', 'installation', 30),
  ('custom', 'Other', 'custom', 90)
on conflict (slug) do nothing;

insert into public.product_categories (slug, label, quote_line_category, sort_order)
select distinct
  p.category,
  initcap(replace(p.category, '_', ' ')),
  case
    when p.category in (
      'drape_rental', 'hardware', 'installation', 'delivery', 'teardown',
      'labor', 'rush_special_handling', 'premium_fabric', 'backdrop',
      'room_divider_masking', 'custom'
    ) then p.category
    else 'custom'
  end,
  80
from public.products p
where p.category is not null
  and length(trim(p.category)) > 0
on conflict (slug) do nothing;
