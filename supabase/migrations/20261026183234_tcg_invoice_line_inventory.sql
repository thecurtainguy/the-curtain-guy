-- Invoice lines keep the inventory link from the quote (or the invoice editor picker):
-- product, category snapshot, photo, and the quote line they were copied from.
-- Project: xszhnecwhjcywhqjzfit only.

alter table public.invoice_line_items
  add column if not exists product_id uuid references public.products (id) on delete set null,
  add column if not exists category text,
  add column if not exists category_label text,
  add column if not exists category_label_fr text,
  add column if not exists image_url text,
  add column if not exists image_alt text,
  add column if not exists source_quote_line_id uuid references public.quote_line_items (id) on delete set null;

alter table public.invoice_line_items
  drop constraint if exists invoice_line_items_category_format_check;

alter table public.invoice_line_items
  add constraint invoice_line_items_category_format_check
  check (category is null or (category ~ '^[a-z0-9][a-z0-9_]*$' and length(category) <= 60));

create index if not exists invoice_line_items_product_id_idx
  on public.invoice_line_items (product_id);

create index if not exists invoice_line_items_source_quote_line_id_idx
  on public.invoice_line_items (source_quote_line_id);

-- Backfill: match existing invoice lines to the invoice's quote lines by position + description.
with ranked_invoice as (
  select il.id, il.description, i.quote_id,
         row_number() over (partition by il.invoice_id, il.description order by il.sort_order) as rn
  from public.invoice_line_items il
  join public.invoices i on i.id = il.invoice_id
  where i.quote_id is not null and il.source_quote_line_id is null
),
ranked_quote as (
  select ql.*, row_number() over (partition by ql.quote_id, ql.description order by ql.sort_order) as rn
  from public.quote_line_items ql
)
update public.invoice_line_items il
set product_id = rq.product_id,
    category = rq.category,
    category_label = rq.category_label,
    category_label_fr = rq.category_label_fr,
    image_url = rq.image_url,
    image_alt = rq.image_alt,
    source_quote_line_id = rq.id
from ranked_invoice ri
join ranked_quote rq
  on rq.quote_id = ri.quote_id and rq.description = ri.description and rq.rn = ri.rn
where il.id = ri.id;
