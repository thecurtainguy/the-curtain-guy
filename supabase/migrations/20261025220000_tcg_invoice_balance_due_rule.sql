-- Default balance due date rule for new invoices.
-- event_date: due on the invoice's event date
-- days_before_event: default_due_days before the event date
-- days_after_issue: default_due_days after the issue date
-- Event-based rules fall back to days_after_issue when an invoice has no event date.

alter table public.business_settings
  add column if not exists default_balance_due_rule text not null default 'event_date'
    check (default_balance_due_rule in ('event_date', 'days_before_event', 'days_after_issue'));
