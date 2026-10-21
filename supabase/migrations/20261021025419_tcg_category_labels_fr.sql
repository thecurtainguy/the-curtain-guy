-- French names for inventory categories, snapshotted onto quote lines so
-- French proposals, PDFs and public pages show "Éclairage" instead of "Lighting".
-- Project: xszhnecwhjcywhqjzfit only.

alter table public.product_categories add column if not exists label_fr text;
alter table public.quote_line_items add column if not exists category_label_fr text;

update public.product_categories as c
set label_fr = v.label_fr
from (values
  ('drape_rental', 'Draperie et structures'),
  ('hardware', 'Quincaillerie'),
  ('installation', 'Installation'),
  ('custom', 'Autre'),
  ('lighting', 'Éclairage'),
  ('technician', 'Technicien')
) as v(slug, label_fr)
where c.slug = v.slug
  and (c.label_fr is null or length(trim(c.label_fr)) = 0);

update public.quote_line_items as li
set category_label_fr = c.label_fr
from public.product_categories as c
where li.category = c.slug
  and li.category_label is not null
  and li.category_label_fr is null
  and c.label_fr is not null;
