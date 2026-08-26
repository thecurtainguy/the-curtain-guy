-- Shared opportunity file pool: admin can mark files internal or customer-visible.
-- Existing rows default to customer_visible = true (customer uploads / prior behavior).

alter table public.estimate_files
  add column if not exists customer_visible boolean not null default true;

comment on column public.estimate_files.customer_visible is
  'When true, customers with estimate access can view/download. Admin-only when false.';

create index if not exists estimate_files_customer_visible_idx
  on public.estimate_files (estimate_request_id, customer_visible)
  where upload_status in ('uploaded', 'pending');
