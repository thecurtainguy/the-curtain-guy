-- The Curtain Guy — Studio sales pipeline.
-- Every studio room becomes a trackable lead: anonymous visitors are tied to a
-- browser visitor id, contact-captured saves get a private resume link, and
-- event details live next to the design. Studio options map onto existing
-- products so a design can be converted into a draft quote.
-- Additive only. Project: xszhnecwhjcywhqjzfit.

-- 1. studio_designs: lead + event context ---------------------------------
alter table public.studio_designs
  add column if not exists visitor_id uuid,
  add column if not exists source text not null default 'studio',
  add column if not exists contact_name text,
  add column if not exists contact_email text,
  add column if not exists contact_phone text,
  add column if not exists event_name text,
  add column if not exists event_type text,
  add column if not exists event_date date,
  add column if not exists guest_count integer,
  add column if not exists venue_name text,
  add column if not exists city_area text,
  add column if not exists language text not null default 'en',
  add column if not exists public_token_hash text,
  add column if not exists public_token_expires_at timestamptz,
  add column if not exists contact_captured_at timestamptz,
  add column if not exists last_activity_at timestamptz not null default now(),
  add column if not exists submitted_from_url text,
  add column if not exists user_agent text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'studio_designs_source_check') then
    alter table public.studio_designs
      add constraint studio_designs_source_check
      check (source in ('studio', 'event_builder', 'admin'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'studio_designs_language_check') then
    alter table public.studio_designs
      add constraint studio_designs_language_check
      check (language in ('en', 'fr'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'studio_designs_guest_count_check') then
    alter table public.studio_designs
      add constraint studio_designs_guest_count_check
      check (guest_count is null or guest_count between 1 and 20000);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'studio_designs_contact_lengths_check') then
    alter table public.studio_designs
      add constraint studio_designs_contact_lengths_check
      check (
        (contact_name is null or char_length(contact_name) <= 160)
        and (contact_email is null or char_length(contact_email) <= 254)
        and (contact_phone is null or char_length(contact_phone) <= 40)
        and (event_name is null or char_length(event_name) <= 160)
        and (event_type is null or char_length(event_type) <= 60)
        and (venue_name is null or char_length(venue_name) <= 160)
        and (city_area is null or char_length(city_area) <= 160)
      );
  end if;
  -- A row must belong to someone: an account, an anonymous browser, or staff.
  if not exists (select 1 from pg_constraint where conname = 'studio_designs_has_owner_check') then
    alter table public.studio_designs
      add constraint studio_designs_has_owner_check
      check (
        owner_user_id is not null
        or created_by_user_id is not null
        or visitor_id is not null
      );
  end if;
end $$;

create index if not exists studio_designs_visitor_id_idx
  on public.studio_designs (visitor_id)
  where visitor_id is not null;

create index if not exists studio_designs_contact_email_idx
  on public.studio_designs (lower(contact_email))
  where contact_email is not null;

create index if not exists studio_designs_last_activity_desc_idx
  on public.studio_designs (last_activity_at desc);

create unique index if not exists studio_designs_public_token_hash_key
  on public.studio_designs (public_token_hash)
  where public_token_hash is not null;

-- Anonymous rows are written only by server routes with the service role;
-- no anon RLS policies are added.

-- 2. event_plan_submissions: event name + guests --------------------------
alter table public.event_plan_submissions
  add column if not exists event_name text,
  add column if not exists guest_count integer;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'event_plan_submissions_guest_count_check') then
    alter table public.event_plan_submissions
      add constraint event_plan_submissions_guest_count_check
      check (guest_count is null or guest_count between 1 and 20000);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'event_plan_submissions_event_name_check') then
    alter table public.event_plan_submissions
      add constraint event_plan_submissions_event_name_check
      check (event_name is null or char_length(event_name) <= 160);
  end if;
end $$;

create index if not exists event_plan_submissions_studio_design_id_idx
  on public.event_plan_submissions (studio_design_id)
  where studio_design_id is not null;

-- 3. studio_product_mappings: studio option -> catalog product ------------
-- mapping_key examples: 'drape_fabric:velvet', 'drape_hardware:pipe_and_drape',
-- 'treatment:top_swag_valance', 'ceiling_style:starburst', 'object:round_table',
-- 'service:installation'. Prices always come from the linked product.
create table if not exists public.studio_product_mappings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  mapping_key text not null unique
    check (mapping_key ~ '^[a-z_]+:[a-z0-9_]+$' and char_length(mapping_key) <= 120),
  product_id uuid references public.products (id) on delete set null,
  notes text check (notes is null or char_length(notes) <= 500),
  is_active boolean not null default true
);

create index if not exists studio_product_mappings_product_id_idx
  on public.studio_product_mappings (product_id);

drop trigger if exists studio_product_mappings_updated_at on public.studio_product_mappings;
create trigger studio_product_mappings_updated_at
  before update on public.studio_product_mappings
  for each row
  execute function public.set_updated_at();

alter table public.studio_product_mappings enable row level security;

drop policy if exists "Owners manage studio_product_mappings" on public.studio_product_mappings;
create policy "Owners manage studio_product_mappings"
  on public.studio_product_mappings
  for all
  to authenticated
  using (public.is_owner(auth.uid()))
  with check (public.is_owner(auth.uid()));
