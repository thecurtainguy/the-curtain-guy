-- The Curtain Guy — client review submissions from /reviews share form
-- Project: xszhnecwhjcywhqjzfit only.

create extension if not exists pgcrypto;

create table if not exists public.review_submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  status text not null default 'new'
    check (status in (
      'new',
      'reviewed',
      'approved',
      'published',
      'declined',
      'spam'
    )),

  source text not null default 'website_reviews',

  name text not null,
  email text not null,
  phone text,
  role text,
  organization text,

  event_category text
    check (event_category is null or event_category in (
      'wedding',
      'corporate',
      'gala',
      'mitzvah',
      'venue',
      'production'
    )),
  event_label text,
  event_date date,
  venue text,
  location text,

  rating smallint not null
    check (rating >= 1 and rating <= 5),
  experience text not null,
  services_used text,
  highlights text,
  would_recommend text not null
    check (would_recommend in ('yes', 'maybe', 'no')),

  publish_on_website boolean not null default false,
  ok_to_contact boolean not null default false,

  raw_payload jsonb not null default '{}'::jsonb,
  submitted_from_url text,
  user_agent text,

  internal_notes text,
  last_viewed_by_owner_at timestamptz,
  reviewed_at timestamptz,
  published_at timestamptz
);

create index if not exists review_submissions_created_at_idx
  on public.review_submissions (created_at desc);

create index if not exists review_submissions_status_idx
  on public.review_submissions (status);

create index if not exists review_submissions_email_idx
  on public.review_submissions (lower(email));

create index if not exists review_submissions_event_category_idx
  on public.review_submissions (event_category);

create index if not exists review_submissions_rating_idx
  on public.review_submissions (rating);

drop trigger if exists review_submissions_updated_at on public.review_submissions;
create trigger review_submissions_updated_at
  before update on public.review_submissions
  for each row
  execute function public.set_updated_at();

alter table public.review_submissions enable row level security;

drop policy if exists "Owners manage review_submissions" on public.review_submissions;
create policy "Owners manage review_submissions"
  on public.review_submissions
  for all
  to authenticated
  using (public.is_owner(auth.uid()))
  with check (public.is_owner(auth.uid()));

-- Public inserts use service role from /api/reviews/submit.
