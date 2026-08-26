-- Event plan submissions: use shared TCG opportunity ref (same sequence as estimates)
-- Project: xszhnecwhjcywhqjzfit only.

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
     or new.reference like 'EP-%' then
    v_num := nextval('public.tcg_opportunity_number_seq');
    new.reference := public.format_tcg_opportunity_ref(v_num);
  end if;
  return new;
end;
$$;

drop trigger if exists event_plan_submissions_assign_reference
  on public.event_plan_submissions;
create trigger event_plan_submissions_assign_reference
  before insert on public.event_plan_submissions
  for each row
  execute function public.event_plan_submissions_assign_reference();
