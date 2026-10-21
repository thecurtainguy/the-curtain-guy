-- Link event plan submissions to the estimate/quote pipeline.
-- Project: xszhnecwhjcywhqjzfit only.

alter table public.event_plan_submissions
  add column if not exists estimate_request_id uuid
    references public.estimate_requests (id) on delete set null;

create index if not exists event_plan_submissions_estimate_request_id_idx
  on public.event_plan_submissions (estimate_request_id);
