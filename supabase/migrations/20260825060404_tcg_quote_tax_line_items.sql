-- Quote tax system: per-line taxable + Quebec GST/QST modes
-- Additive only. Preserves totals on non-draft quotes by setting tax_mode = none.

-- ---------------------------------------------------------------------------
-- quote_line_items: taxable flags
-- ---------------------------------------------------------------------------

alter table public.quote_line_items
  add column if not exists is_taxable boolean not null default true;

alter table public.quote_line_items
  add column if not exists tax_category text not null default 'standard';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'quote_line_items_tax_category_check'
  ) then
    alter table public.quote_line_items
      add constraint quote_line_items_tax_category_check
      check (tax_category in ('standard', 'exempt', 'custom'));
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- quotes: tax mode + breakdown fields
-- ---------------------------------------------------------------------------

alter table public.quotes
  add column if not exists tax_mode text not null default 'quebec_gst_qst';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'quotes_tax_mode_check'
  ) then
    alter table public.quotes
      add constraint quotes_tax_mode_check
      check (tax_mode in ('none', 'quebec_gst_qst', 'manual'));
  end if;
end $$;

alter table public.quotes
  add column if not exists gst_rate numeric(7, 5) not null default 0.05000;

alter table public.quotes
  add column if not exists qst_rate numeric(7, 5) not null default 0.09975;

alter table public.quotes
  add column if not exists taxable_subtotal_cents integer not null default 0;

alter table public.quotes
  add column if not exists nontaxable_subtotal_cents integer not null default 0;

alter table public.quotes
  add column if not exists gst_cents integer not null default 0;

alter table public.quotes
  add column if not exists qst_cents integer not null default 0;

alter table public.quotes
  add column if not exists manual_tax_label text;

alter table public.quotes
  add column if not exists manual_tax_cents integer not null default 0;

alter table public.quotes
  add column if not exists total_before_tax_cents integer not null default 0;

alter table public.quotes
  add column if not exists total_tax_cents integer not null default 0;

-- ---------------------------------------------------------------------------
-- Existing quotes safety
-- ---------------------------------------------------------------------------
-- Line items default is_taxable = true (column default).
-- Non-draft quotes keep historical totals (subtotal == total today) by forcing
-- tax_mode = none. Draft quotes keep quebec_gst_qst and recalculate below.

update public.quotes
set tax_mode = 'none'
where status <> 'draft';

-- Backfill subtotal splits from line items; apply Quebec tax only on drafts.
with line_sums as (
  select
    quote_id,
    coalesce(
      sum(line_total_cents) filter (
        where status = 'priced'
      ),
      0
    )::integer as subtotal_cents,
    coalesce(
      sum(line_total_cents) filter (
        where status = 'priced' and is_taxable = true
      ),
      0
    )::integer as taxable_subtotal_cents,
    coalesce(
      sum(line_total_cents) filter (
        where status = 'priced' and is_taxable = false
      ),
      0
    )::integer as nontaxable_subtotal_cents
  from public.quote_line_items
  group by quote_id
)
update public.quotes q
set
  subtotal_cents = coalesce(ls.subtotal_cents, q.subtotal_cents),
  taxable_subtotal_cents = coalesce(ls.taxable_subtotal_cents, 0),
  nontaxable_subtotal_cents = coalesce(ls.nontaxable_subtotal_cents, 0),
  total_before_tax_cents = coalesce(ls.subtotal_cents, q.subtotal_cents),
  gst_cents = case
    when q.status = 'draft' and q.tax_mode = 'quebec_gst_qst'
      then round(coalesce(ls.taxable_subtotal_cents, 0) * 0.05)::integer
    else 0
  end,
  qst_cents = case
    when q.status = 'draft' and q.tax_mode = 'quebec_gst_qst'
      then round(coalesce(ls.taxable_subtotal_cents, 0) * 0.09975)::integer
    else 0
  end,
  manual_tax_cents = 0,
  total_tax_cents = case
    when q.status = 'draft' and q.tax_mode = 'quebec_gst_qst'
      then (
        round(coalesce(ls.taxable_subtotal_cents, 0) * 0.05)::integer
        + round(coalesce(ls.taxable_subtotal_cents, 0) * 0.09975)::integer
      )
    else 0
  end,
  total_cents = case
    when q.status = 'draft' and q.tax_mode = 'quebec_gst_qst'
      then (
        coalesce(ls.subtotal_cents, q.subtotal_cents)
        + round(coalesce(ls.taxable_subtotal_cents, 0) * 0.05)::integer
        + round(coalesce(ls.taxable_subtotal_cents, 0) * 0.09975)::integer
      )
    else coalesce(ls.subtotal_cents, q.subtotal_cents)
  end
from line_sums ls
where ls.quote_id = q.id;

-- Quotes with no line items still need total_before_tax synced.
update public.quotes
set
  total_before_tax_cents = subtotal_cents,
  total_tax_cents = coalesce(gst_cents, 0) + coalesce(qst_cents, 0) + coalesce(manual_tax_cents, 0)
where total_before_tax_cents = 0
  and subtotal_cents >= 0;
