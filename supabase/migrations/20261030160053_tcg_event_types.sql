create table if not exists public.event_types (
  id text primary key
    check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(id) <= 60),
  label text not null check (char_length(btrim(label)) between 1 and 60),
  label_fr text not null default '' check (char_length(label_fr) <= 60),
  icon text not null default 'sparkles' check (char_length(icon) <= 40),
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists event_types_updated_at on public.event_types;
create trigger event_types_updated_at
  before update on public.event_types
  for each row
  execute function public.set_updated_at();

alter table public.event_types enable row level security;

drop policy if exists "Owners manage event_types" on public.event_types;
create policy "Owners manage event_types"
  on public.event_types
  for all
  to authenticated
  using (public.is_owner(auth.uid()))
  with check (public.is_owner(auth.uid()));

insert into public.event_types (id, label, label_fr, icon, sort_order) values
  ('wedding', 'Wedding', 'Mariage', 'layers', 10),
  ('corporate', 'Corporate Event', 'Événement corporatif', 'building', 20),
  ('gala', 'Gala', 'Gala', 'crown', 30),
  ('mitzvah', 'Bar/Bat Mitzvah', 'Bar/Bat Mitzvah', 'party', 40),
  ('stage-show', 'Stage/Show', 'Scène/Show', 'theater', 50),
  ('trade-show', 'Trade Show', 'Salon professionnel', 'grid', 60),
  ('private', 'Private Event', 'Événement privé', 'sparkles', 70),
  ('other', 'Other', 'Autre', 'wand', 80)
on conflict (id) do nothing;

-- Every record that stores an event type id, counted per id.
create or replace function public.event_type_usage()
returns table (
  event_type_id text,
  estimates bigint,
  event_plans bigint,
  quotes bigint,
  invoices bigint,
  jobs bigint,
  studio_designs bigint,
  products bigint
)
language sql
stable
set search_path = public
as $$
  select
    t.id,
    (select count(*) from public.estimate_requests r where r.event_type = t.id),
    (select count(*) from public.event_plan_submissions r where r.event_type = t.id),
    (select count(*) from public.quotes r where r.event_type = t.id),
    (select count(*) from public.invoices r where r.event_type = t.id),
    (select count(*) from public.event_jobs r where r.event_type = t.id),
    (select count(*) from public.studio_designs r where r.event_type = t.id),
    (select count(*) from public.products r where t.id = any(r.event_type_ids))
  from public.event_types t;
$$;

revoke all on function public.event_type_usage() from public, anon, authenticated;

create or replace function public.event_types_block_used_delete()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if exists (select 1 from public.estimate_requests where event_type = old.id)
    or exists (select 1 from public.event_plan_submissions where event_type = old.id)
    or exists (select 1 from public.quotes where event_type = old.id)
    or exists (select 1 from public.invoices where event_type = old.id)
    or exists (select 1 from public.event_jobs where event_type = old.id)
    or exists (select 1 from public.studio_designs where event_type = old.id)
    or exists (select 1 from public.products where old.id = any(event_type_ids))
  then
    raise exception 'Event type "%" is used by existing records and cannot be deleted. Hide it instead.', old.id
      using errcode = 'P0001';
  end if;
  return old;
end;
$$;

drop trigger if exists event_types_block_used_delete on public.event_types;
create trigger event_types_block_used_delete
  before delete on public.event_types
  for each row
  execute function public.event_types_block_used_delete();
