-- Snapshot of how a quote line is priced (e.g. "linear ft", "set", "each").
-- Null on older lines; displays fall back to a plain quantity.
alter table public.quote_line_items add column if not exists unit_label text;
