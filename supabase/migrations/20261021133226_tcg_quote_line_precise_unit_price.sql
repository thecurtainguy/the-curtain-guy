-- Quote line unit prices keep sub-cent precision (e.g. $10,000 / 600 ft =
-- 1666.666667¢) so quantity × unit price lands on the exact line total.
-- line_total_cents and all quote totals stay whole cents.
-- Project: xszhnecwhjcywhqjzfit only.
alter table public.quote_line_items
  alter column unit_price_cents type numeric(18,6)
  using unit_price_cents::numeric(18,6);
