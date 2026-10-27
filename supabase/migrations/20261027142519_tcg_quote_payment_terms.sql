-- Quotes: optional payment terms shown on the proposal / PDF and used for the job's first invoice.
-- All null = no payment terms on the quote (existing quotes stay unchanged).
-- Project: xszhnecwhjcywhqjzfit only.

alter table public.quotes
  add column if not exists payment_deposit_mode text,
  add column if not exists payment_deposit_percent numeric(5, 2),
  add column if not exists payment_deposit_fixed_cents integer,
  add column if not exists payment_balance_due_rule text,
  add column if not exists payment_balance_due_days integer;

alter table public.quotes
  add constraint quotes_payment_deposit_mode_check
    check (payment_deposit_mode is null or payment_deposit_mode in ('none', 'percent', 'fixed')),
  add constraint quotes_payment_deposit_percent_check
    check (payment_deposit_percent is null or (payment_deposit_percent >= 0 and payment_deposit_percent <= 100)),
  add constraint quotes_payment_deposit_fixed_check
    check (payment_deposit_fixed_cents is null or payment_deposit_fixed_cents >= 0),
  add constraint quotes_payment_balance_due_rule_check
    check (payment_balance_due_rule is null or payment_balance_due_rule in ('event_date', 'days_before_event', 'days_after_issue')),
  add constraint quotes_payment_balance_due_days_check
    check (payment_balance_due_days is null or (payment_balance_due_days >= 0 and payment_balance_due_days <= 365)),
  add constraint quotes_payment_terms_complete_check
    check ((payment_deposit_mode is null) = (payment_balance_due_rule is null));

comment on column public.quotes.payment_deposit_mode is 'Null = no payment terms on this quote. The deposit is due on acceptance.';
comment on column public.quotes.payment_balance_due_rule is 'Copied to the job''s first invoice together with the deposit.';
