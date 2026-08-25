-- The Curtain Guy — Auth (owner/customer), estimate linking, private uploads
-- Apply safely. Does not drop existing estimate_requests data.
-- First estimate_requests migration may have been applied via SQL Editor;
-- apply this file the same way if CLI migration history is misaligned.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- user_profiles
-- ---------------------------------------------------------------------------

create table if not exists public.user_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  phone text,
  role text not null default 'customer'
    check (role in ('owner', 'customer')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_profiles_email_idx
  on public.user_profiles (lower(email));

create index if not exists user_profiles_role_idx
  on public.user_profiles (role);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists user_profiles_updated_at on public.user_profiles;
create trigger user_profiles_updated_at
  before update on public.user_profiles
  for each row
  execute function public.set_updated_at();

-- Keep existing estimate_requests updated_at trigger (may already use
-- set_estimate_requests_updated_at). Also bind to shared helper if present.
drop trigger if exists estimate_requests_updated_at on public.estimate_requests;
create trigger estimate_requests_updated_at
  before update on public.estimate_requests
  for each row
  execute function public.set_updated_at();

-- Auto-create customer profile on auth signup (never owner)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, email, full_name, phone, role, is_active)
  values (
    new.id,
    coalesce(new.email, ''),
    nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data->>'phone', '')), ''),
    'customer',
    true
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

create or replace function public.is_owner(check_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_profiles
    where id = check_user_id
      and role = 'owner'
      and is_active = true
  );
$$;

alter table public.user_profiles enable row level security;

-- No public policies: app uses service role / server routes after auth checks.

-- ---------------------------------------------------------------------------
-- estimate_requests extensions
-- ---------------------------------------------------------------------------

alter table public.estimate_requests
  add column if not exists user_id uuid references auth.users (id) on delete set null;

alter table public.estimate_requests
  add column if not exists internal_notes text;

alter table public.estimate_requests
  add column if not exists last_viewed_by_owner_at timestamptz;

alter table public.estimate_requests
  add column if not exists upload_token_hash text;

alter table public.estimate_requests
  add column if not exists upload_token_expires_at timestamptz;

-- updated_at already exists from phase 3 migration

create index if not exists estimate_requests_user_id_idx
  on public.estimate_requests (user_id);

create index if not exists estimate_requests_upload_token_hash_idx
  on public.estimate_requests (upload_token_hash)
  where upload_token_hash is not null;

-- ---------------------------------------------------------------------------
-- estimate_files
-- ---------------------------------------------------------------------------

create table if not exists public.estimate_files (
  id uuid primary key default gen_random_uuid(),
  estimate_request_id uuid not null
    references public.estimate_requests (id) on delete cascade,
  uploaded_by_user_id uuid null
    references auth.users (id) on delete set null,
  uploader_email text,
  bucket text not null default 'estimate-files',
  object_path text not null unique,
  original_file_name text not null,
  content_type text not null,
  file_size_bytes bigint not null,
  upload_status text not null default 'pending'
    check (upload_status in ('pending', 'uploaded', 'rejected', 'deleted')),
  created_at timestamptz not null default now(),
  uploaded_at timestamptz null
);

create index if not exists estimate_files_estimate_request_id_idx
  on public.estimate_files (estimate_request_id);

create index if not exists estimate_files_upload_status_idx
  on public.estimate_files (upload_status);

alter table public.estimate_files enable row level security;

-- ---------------------------------------------------------------------------
-- Private storage bucket: estimate-files
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'estimate-files',
  'estimate-files',
  false,
  10485760,
  array[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp'
  ]
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- No public storage policies. Uploads/downloads use signed URLs via service role.

-- ---------------------------------------------------------------------------
-- MANUAL OWNER SETUP (run after creating admin@thecurtainguy.com in Auth)
-- ---------------------------------------------------------------------------
-- Prefer docs/owner-auth-setup.md. Example:
--
-- update public.user_profiles
-- set role = 'owner', is_active = true, updated_at = now()
-- where lower(email) = 'admin@thecurtainguy.com';
--
-- Fallback upsert if profile row is missing (replace USER_UUID):
--
-- insert into public.user_profiles (id, email, role, is_active)
-- values ('USER_UUID', 'admin@thecurtainguy.com', 'owner', true)
-- on conflict (id) do update
-- set role = 'owner', is_active = true, email = excluded.email, updated_at = now();
