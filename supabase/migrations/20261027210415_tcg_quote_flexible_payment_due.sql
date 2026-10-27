alter table public.quotes
  add column payment_deposit_due_rule text,
  add column payment_deposit_due_date date,
  add column payment_balance_due_date date;

alter table public.quotes drop constraint quotes_payment_balance_due_rule_check;
alter table public.quotes add constraint quotes_payment_balance_due_rule_check check (
  payment_balance_due_rule is null or payment_balance_due_rule = any (array[
    'event_date', 'days_before_event', 'days_after_issue', 'on_acceptance', 'fixed_date', 'quote_expiry'
  ]::text[])
);

alter table public.quotes add constraint quotes_payment_deposit_due_rule_check check (
  payment_deposit_due_rule is null or payment_deposit_due_rule = any (array[
    'on_acceptance', 'fixed_date', 'quote_expiry'
  ]::text[])
);

alter table public.quotes add constraint quotes_payment_fixed_due_dates_check check (
  (payment_balance_due_rule is distinct from 'fixed_date' or payment_balance_due_date is not null)
  and (payment_deposit_due_rule is distinct from 'fixed_date' or payment_deposit_due_date is not null)
);

comment on column public.quotes.payment_deposit_due_rule is 'When the deposit is due; null means on acceptance.';
comment on column public.quotes.payment_deposit_due_date is 'Deposit due date when payment_deposit_due_rule = fixed_date.';
comment on column public.quotes.payment_balance_due_date is 'Balance (or payment in full) due date when payment_balance_due_rule = fixed_date.';
