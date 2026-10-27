-- Opportunity files: soft delete + append-only audit trail.
-- Quotes: optional event / install / teardown schedule (mirrors event_jobs).
-- Project: xszhnecwhjcywhqjzfit only.

-- ---------------------------------------------------------------------------
-- estimate_files soft delete
-- ---------------------------------------------------------------------------

alter table public.estimate_files
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by_user_id uuid references auth.users (id) on delete set null;

-- Deleted files are never attached to customer documents.
alter table public.estimate_files
  add constraint estimate_files_deleted_not_included_check
    check (upload_status <> 'deleted' or (not include_in_quote and not include_in_invoice));

comment on column public.estimate_files.deleted_at is 'Soft delete (upload_status = deleted). The storage object is kept so the file can be restored.';

-- ---------------------------------------------------------------------------
-- estimate_file_events (append-only audit trail)
-- ---------------------------------------------------------------------------

create table if not exists public.estimate_file_events (
  id uuid primary key default gen_random_uuid(),
  estimate_file_id uuid references public.estimate_files (id) on delete set null,
  estimate_request_id uuid references public.estimate_requests (id) on delete set null,
  file_name text not null default '',
  actor_type text not null default 'owner'
    check (actor_type in ('owner', 'customer', 'system')),
  actor_user_id uuid references auth.users (id) on delete set null,
  actor_email text,
  event_type text not null check (event_type in (
    'file_uploaded',
    'file_shared',
    'file_made_internal',
    'file_kind_changed',
    'file_caption_changed',
    'file_attached_quote',
    'file_detached_quote',
    'file_attached_invoice',
    'file_detached_invoice',
    'file_deleted',
    'file_restored'
  )),
  summary text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists estimate_file_events_estimate_idx
  on public.estimate_file_events (estimate_request_id, created_at desc);
create index if not exists estimate_file_events_file_idx
  on public.estimate_file_events (estimate_file_id, created_at desc);

create or replace function public.estimate_file_events_fill()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.estimate_file_id is not null and (new.estimate_request_id is null or new.file_name = '') then
    select coalesce(new.estimate_request_id, estimate_request_id),
           case when new.file_name = '' then original_file_name else new.file_name end
    into new.estimate_request_id, new.file_name
    from public.estimate_files where id = new.estimate_file_id;
  end if;
  if new.actor_email is null and new.actor_user_id is not null then
    select email into new.actor_email
    from public.user_profiles where id = new.actor_user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists estimate_file_events_fill on public.estimate_file_events;
create trigger estimate_file_events_fill
  before insert on public.estimate_file_events
  for each row
  execute function public.estimate_file_events_fill();

create or replace function public.estimate_file_events_append_only()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'estimate_file_events is append-only';
  end if;
  -- Only FK cascades nulling the referenced ids are allowed.
  if (new.estimate_file_id is not distinct from old.estimate_file_id or new.estimate_file_id is null)
     and (new.estimate_request_id is not distinct from old.estimate_request_id or new.estimate_request_id is null)
     and (new.actor_user_id is not distinct from old.actor_user_id or new.actor_user_id is null)
     and new.id = old.id
     and new.file_name = old.file_name
     and new.actor_type = old.actor_type
     and new.actor_email is not distinct from old.actor_email
     and new.event_type = old.event_type
     and new.summary = old.summary
     and new.metadata = old.metadata
     and new.created_at = old.created_at then
    return new;
  end if;
  raise exception 'estimate_file_events is append-only';
end;
$$;

drop trigger if exists estimate_file_events_append_only on public.estimate_file_events;
create trigger estimate_file_events_append_only
  before update or delete on public.estimate_file_events
  for each row
  execute function public.estimate_file_events_append_only();

alter table public.estimate_file_events enable row level security;

drop policy if exists "Owners read estimate_file_events" on public.estimate_file_events;
create policy "Owners read estimate_file_events"
  on public.estimate_file_events for select to authenticated
  using (public.is_owner(auth.uid()));

-- Start the trail with the uploads that already exist.
insert into public.estimate_file_events (
  estimate_file_id, estimate_request_id, file_name, actor_type, actor_user_id,
  actor_email, event_type, summary, metadata, created_at
)
select f.id, f.estimate_request_id, f.original_file_name,
  case when f.uploaded_by_user_id is not null and public.is_owner(f.uploaded_by_user_id)
    then 'owner' else 'customer' end,
  f.uploaded_by_user_id, f.uploader_email, 'file_uploaded',
  case when f.customer_visible then 'Uploaded (shared)' else 'Uploaded (internal)' end,
  jsonb_build_object('backfill', true, 'customer_visible', f.customer_visible),
  coalesce(f.uploaded_at, f.created_at)
from public.estimate_files f
where f.upload_status = 'uploaded'
  and not exists (
    select 1 from public.estimate_file_events e where e.estimate_file_id = f.id
  );

-- ---------------------------------------------------------------------------
-- quotes schedule (all optional; times use the same display text as event_jobs)
-- ---------------------------------------------------------------------------

alter table public.quotes
  add column if not exists event_start_time text,
  add column if not exists event_end_time text,
  add column if not exists install_date date,
  add column if not exists install_start_time text,
  add column if not exists install_end_time text,
  add column if not exists teardown_date date,
  add column if not exists teardown_start_time text,
  add column if not exists teardown_end_time text;

comment on column public.quotes.install_date is 'Optional. Copied to event_jobs when the job is created from the quote.';
comment on column public.quotes.teardown_date is 'Optional. Copied to event_jobs when the job is created from the quote.';
