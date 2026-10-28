alter table public.invoices
  add column if not exists reminder_to text[],
  add column if not exists reminder_cc text[],
  add column if not exists reminder_stages text[] not null default array['upcoming_3','overdue_1','overdue_7','overdue_14']::text[],
  add column if not exists reminder_repeat_weekly boolean not null default false;

alter table public.invoices
  add constraint invoices_reminder_stages_check
  check (reminder_stages <@ array['upcoming_3','overdue_1','overdue_7','overdue_14']::text[]);

comment on column public.invoices.reminder_to is 'Payment reminder To list; null = whoever received the latest invoice email.';
comment on column public.invoices.reminder_cc is 'Payment reminder Cc list; null = Cc of the latest invoice email.';
comment on column public.invoices.reminder_stages is 'Enabled automatic reminder steps: upcoming_3, overdue_1, overdue_7, overdue_14.';
comment on column public.invoices.reminder_repeat_weekly is 'Keep emailing weekly from 21 days overdue until paid (owner is still flagged to call).';
