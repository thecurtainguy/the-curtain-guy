-- Invoice audit trail hardening.
-- * Events survive invoice deletion (invoice_id -> null, invoice_number kept).
-- * actor_email / invoice_number are filled automatically on insert.
-- * invoice_events is append-only: no deletes, no edits.

alter table public.invoice_events
  add column if not exists actor_email text,
  add column if not exists invoice_number text;

alter table public.invoice_events
  alter column invoice_id drop not null;

alter table public.invoice_events
  drop constraint if exists invoice_events_invoice_id_fkey;

alter table public.invoice_events
  add constraint invoice_events_invoice_id_fkey
  foreign key (invoice_id) references public.invoices (id) on delete set null;

create index if not exists invoice_events_created_at_idx
  on public.invoice_events (created_at desc);

update public.invoice_events e
set invoice_number = i.invoice_number
from public.invoices i
where e.invoice_id = i.id and e.invoice_number is null;

update public.invoice_events e
set actor_email = p.email
from public.user_profiles p
where e.actor_user_id = p.id and e.actor_email is null;

create or replace function public.invoice_events_fill()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.invoice_number is null and new.invoice_id is not null then
    select invoice_number into new.invoice_number
    from public.invoices where id = new.invoice_id;
  end if;
  if new.actor_email is null and new.actor_user_id is not null then
    select email into new.actor_email
    from public.user_profiles where id = new.actor_user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists invoice_events_fill on public.invoice_events;
create trigger invoice_events_fill
  before insert on public.invoice_events
  for each row
  execute function public.invoice_events_fill();

create or replace function public.invoice_events_append_only()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'invoice_events is append-only';
  end if;
  -- Only allowed updates: FK cascades nulling invoice_id (invoice deleted)
  -- or actor_user_id (auth user deleted). Everything else is immutable.
  if (new.invoice_id is not distinct from old.invoice_id or new.invoice_id is null)
     and (new.actor_user_id is not distinct from old.actor_user_id or new.actor_user_id is null)
     and new.id = old.id
     and new.event_type = old.event_type
     and new.summary = old.summary
     and new.metadata = old.metadata
     and new.created_at = old.created_at
     and new.actor_type = old.actor_type
     and new.actor_email is not distinct from old.actor_email
     and new.invoice_number is not distinct from old.invoice_number then
    return new;
  end if;
  raise exception 'invoice_events is append-only';
end;
$$;

drop trigger if exists invoice_events_append_only on public.invoice_events;
create trigger invoice_events_append_only
  before update or delete on public.invoice_events
  for each row
  execute function public.invoice_events_append_only();

-- Billing settings print on every invoice, so their changes are audited too.
create table if not exists public.business_settings_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid,
  actor_email text,
  summary text not null default '',
  changes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists business_settings_events_created_at_idx
  on public.business_settings_events (created_at desc);

alter table public.business_settings_events enable row level security;

drop policy if exists "Owners read business_settings_events" on public.business_settings_events;
create policy "Owners read business_settings_events"
  on public.business_settings_events for select to authenticated
  using (public.is_owner(auth.uid()));

create or replace function public.audit_rows_append_only()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception '% is append-only', tg_table_name;
end;
$$;

drop trigger if exists business_settings_events_append_only on public.business_settings_events;
create trigger business_settings_events_append_only
  before update or delete on public.business_settings_events
  for each row
  execute function public.audit_rows_append_only();
