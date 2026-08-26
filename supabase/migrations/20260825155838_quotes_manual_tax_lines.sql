-- Multiple percentage-based manual tax lines on quotes.
-- Shape: [{ "label": "Sales tax", "rate": 0.13 }, ...]
-- rate is a decimal fraction (0.13 = 13%).

alter table public.quotes
  add column if not exists manual_tax_lines jsonb not null default '[]'::jsonb;

comment on column public.quotes.manual_tax_lines is
  'Manual tax mode lines: array of { label: string, rate: number } where rate is a decimal fraction of taxable subtotal.';

alter table public.quotes
  drop constraint if exists quotes_manual_tax_lines_is_array;

alter table public.quotes
  add constraint quotes_manual_tax_lines_is_array
  check (jsonb_typeof(manual_tax_lines) = 'array');
