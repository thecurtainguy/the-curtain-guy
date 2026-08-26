-- Event plan references: EP-10000+ (separate sequence from TCG estimates)
-- Project: xszhnecwhjcywhqjzfit only.

create sequence if not exists public.tcg_event_plan_number_seq
  as integer
  start with 10000
  increment by 1
  minvalue 10000
  no maxvalue
  cache 1;

create or replace function public.format_ep_plan_ref(num integer)
returns text
language sql
immutable
as $$
  select 'EP-' || num::text;
$$;

alter table public.event_plan_submissions
  add column if not exists plan_number integer;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'event_plan_submissions_plan_number_key'
  ) then
    alter table public.event_plan_submissions
      add constraint event_plan_submissions_plan_number_key
      unique (plan_number);
  end if;
end $$;

create or replace function public.event_plan_submissions_assign_reference()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_num integer;
begin
  if new.reference is null
     or length(trim(new.reference)) = 0
     or new.reference ~ '^EP-[0-9]{8}-'
     or new.reference like 'TCG-%' then
    v_num := nextval('public.tcg_event_plan_number_seq');
    new.plan_number := v_num;
    new.reference := public.format_ep_plan_ref(v_num);
  elsif new.plan_number is null and new.reference ~ '^EP-[0-9]+$' then
    new.plan_number := nullif(
      regexp_replace(new.reference, '^EP-', ''),
      ''
    )::integer;
  end if;
  return new;
end;
$$;

-- Customers: read/update own submissions (linked account or verified email match)
drop policy if exists "Customers select own event_plan_submissions"
  on public.event_plan_submissions;
create policy "Customers select own event_plan_submissions"
  on public.event_plan_submissions
  for select
  to authenticated
  using (
    owner_user_id = auth.uid()
    or lower(contact_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

drop policy if exists "Customers update own event_plan_submissions"
  on public.event_plan_submissions;
create policy "Customers update own event_plan_submissions"
  on public.event_plan_submissions
  for update
  to authenticated
  using (
    owner_user_id = auth.uid()
    or lower(contact_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
  with check (
    owner_user_id = auth.uid()
    or lower(contact_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
