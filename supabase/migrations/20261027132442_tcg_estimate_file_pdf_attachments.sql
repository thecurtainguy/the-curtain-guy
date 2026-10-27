alter table public.estimate_files
  add column if not exists file_kind text not null default 'document',
  add column if not exists caption text,
  add column if not exists include_in_quote boolean not null default false,
  add column if not exists include_in_invoice boolean not null default false;

alter table public.estimate_files
  add constraint estimate_files_file_kind_check
    check (file_kind in ('concept', 'floor_plan', 'reference_photo', 'document'));

-- Internal files can never be attached to customer-facing quotes or invoices.
alter table public.estimate_files
  add constraint estimate_files_include_requires_shared_check
    check (customer_visible or (not include_in_quote and not include_in_invoice));

alter table public.estimate_files
  add constraint estimate_files_caption_length_check
    check (caption is null or char_length(caption) <= 200);

comment on column public.estimate_files.file_kind is 'concept | floor_plan | reference_photo | document. Concepts carry an AI/illustration disclaimer on customer documents.';
comment on column public.estimate_files.include_in_quote is 'Attach to the quote PDF and show on the proposal page. Requires customer_visible.';
comment on column public.estimate_files.include_in_invoice is 'Attach to the invoice PDF. Requires customer_visible.';
