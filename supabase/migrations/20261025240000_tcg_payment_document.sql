-- Payment document (void cheque) appended to every invoice PDF.
-- Files live in a private bucket; only the server (service role) reads them.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('billing-documents', 'billing-documents', false, 10485760, array['application/pdf'])
on conflict (id) do nothing;

alter table public.business_settings
  add column if not exists payment_document_path text,
  add column if not exists payment_document_name text,
  add column if not exists payment_document_label text not null default 'Void cheque — direct deposit / EFT',
  add column if not exists payment_document_label_fr text not null default 'Chèque annulé — dépôt direct / TEF',
  add column if not exists payment_document_enabled boolean not null default true,
  add column if not exists payment_document_uploaded_at timestamptz;
