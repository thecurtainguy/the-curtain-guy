-- Customer-facing language for estimates, event plans, quotes (PDF, emails, proposal page).

alter table public.estimate_requests
  add column if not exists language text not null default 'en';

alter table public.event_plan_submissions
  add column if not exists language text not null default 'en';

alter table public.quotes
  add column if not exists language text not null default 'en';

alter table public.user_profiles
  add column if not exists preferred_language text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'estimate_requests_language_check'
  ) then
    alter table public.estimate_requests
      add constraint estimate_requests_language_check
      check (language in ('en', 'fr'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'event_plan_submissions_language_check'
  ) then
    alter table public.event_plan_submissions
      add constraint event_plan_submissions_language_check
      check (language in ('en', 'fr'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'quotes_language_check'
  ) then
    alter table public.quotes
      add constraint quotes_language_check
      check (language in ('en', 'fr'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'user_profiles_preferred_language_check'
  ) then
    alter table public.user_profiles
      add constraint user_profiles_preferred_language_check
      check (preferred_language is null or preferred_language in ('en', 'fr'));
  end if;
end $$;
