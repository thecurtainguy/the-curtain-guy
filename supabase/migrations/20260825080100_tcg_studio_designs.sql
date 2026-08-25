-- The Curtain Guy — Phase 8A room design Studio
-- Additive only. Project: xszhnecwhjcywhqjzfit.

create extension if not exists pgcrypto;

create table if not exists public.studio_designs (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users (id) on delete set null,
  created_by_user_id uuid references auth.users (id) on delete set null,
  estimate_request_id uuid references public.estimate_requests (id) on delete set null,
  quote_id uuid references public.quotes (id) on delete set null,
  job_id uuid references public.event_jobs (id) on delete set null,
  opportunity_ref text
    check (opportunity_ref is null or char_length(opportunity_ref) <= 100),
  title text not null default 'Untitled room design'
    check (char_length(trim(title)) between 1 and 160),
  status text not null default 'draft'
    check (status in ('draft', 'saved', 'archived')),
  design_json jsonb not null
    check (
      jsonb_typeof(design_json) = 'object'
      and octet_length(design_json::text) <= 262144
      and coalesce(design_json->>'version' = '1', false)
      and coalesce(design_json->>'units' = 'inches', false)
      and coalesce(jsonb_typeof(design_json->'room') = 'object', false)
      and coalesce(
        jsonb_typeof(design_json->'room'->'floor') = 'array',
        false
      )
      and coalesce(jsonb_typeof(design_json->'openings') = 'array', false)
      and coalesce(jsonb_typeof(design_json->'objects') = 'array', false)
      and coalesce(jsonb_typeof(design_json->'drapeRuns') = 'array', false)
    ),
  preview_image_url text,
  thumbnail_data_url text
    check (
      thumbnail_data_url is null
      or octet_length(thumbnail_data_url) <= 131072
    ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists studio_designs_owner_user_id_idx
  on public.studio_designs (owner_user_id);

create index if not exists studio_designs_estimate_request_id_idx
  on public.studio_designs (estimate_request_id);

create index if not exists studio_designs_quote_id_idx
  on public.studio_designs (quote_id);

create index if not exists studio_designs_job_id_idx
  on public.studio_designs (job_id);

create index if not exists studio_designs_opportunity_ref_idx
  on public.studio_designs (opportunity_ref);

create index if not exists studio_designs_status_idx
  on public.studio_designs (status);

create index if not exists studio_designs_created_at_desc_idx
  on public.studio_designs (created_at desc);

drop trigger if exists studio_designs_updated_at on public.studio_designs;
create trigger studio_designs_updated_at
  before update on public.studio_designs
  for each row
  execute function public.set_updated_at();

alter table public.studio_designs enable row level security;

create or replace function public.customer_can_link_studio_design(
  check_user_id uuid,
  check_estimate_id uuid,
  check_quote_id uuid,
  check_job_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    (
      check_estimate_id is null
      or exists (
        select 1
        from public.estimate_requests e
        where e.id = check_estimate_id
          and e.user_id = check_user_id
      )
    )
    and (
      check_quote_id is null
      or exists (
        select 1
        from public.quotes q
        join public.estimate_requests e on e.id = q.estimate_request_id
        where q.id = check_quote_id
          and e.user_id = check_user_id
          and (
            check_estimate_id is null
            or q.estimate_request_id = check_estimate_id
          )
      )
    )
    and (
      check_job_id is null
      or exists (
        select 1
        from public.event_jobs j
        where j.id = check_job_id
          and j.customer_user_id = check_user_id
          and (
            check_estimate_id is null
            or j.estimate_request_id = check_estimate_id
          )
          and (
            check_quote_id is null
            or j.quote_id = check_quote_id
          )
      )
    );
$$;

revoke all on function public.customer_can_link_studio_design(
  uuid,
  uuid,
  uuid,
  uuid
) from public, anon;
grant execute on function public.customer_can_link_studio_design(
  uuid,
  uuid,
  uuid,
  uuid
) to authenticated;

-- Owners may manage every design.
create policy "Owners manage studio_designs"
  on public.studio_designs
  for all
  to authenticated
  using (public.is_owner(auth.uid()))
  with check (public.is_owner(auth.uid()));

-- Customers can only read designs owned by their authenticated account.
create policy "Customers select own studio_designs"
  on public.studio_designs
  for select
  to authenticated
  using (owner_user_id = auth.uid());

-- The authenticated user must remain the owner on direct inserts.
create policy "Customers insert own studio_designs"
  on public.studio_designs
  for insert
  to authenticated
  with check (
    owner_user_id = auth.uid()
    and (created_by_user_id is null or created_by_user_id = auth.uid())
    and public.customer_can_link_studio_design(
      auth.uid(),
      estimate_request_id,
      quote_id,
      job_id
    )
  );

-- Ownership cannot be reassigned through a customer update.
create policy "Customers update own studio_designs"
  on public.studio_designs
  for update
  to authenticated
  using (owner_user_id = auth.uid())
  with check (
    owner_user_id = auth.uid()
    and public.customer_can_link_studio_design(
      auth.uid(),
      estimate_request_id,
      quote_id,
      job_id
    )
  );

-- V1 customers may remove only their own non-archived work.
create policy "Customers delete own active studio_designs"
  on public.studio_designs
  for delete
  to authenticated
  using (
    owner_user_id = auth.uid()
    and status in ('draft', 'saved')
  );

-- No anon policies. Server routes perform strict role and ownership checks;
-- RLS remains defense in depth for authenticated direct-client access.
