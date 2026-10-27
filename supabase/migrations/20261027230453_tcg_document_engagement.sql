create table public.document_views (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid references public.quotes(id) on delete cascade,
  invoice_id uuid references public.invoices(id) on delete cascade,
  kind text not null default 'link_hit' check (kind in ('link_hit', 'view', 'owner', 'pdf')),
  source text not null default 'public_link' check (source in ('public_link', 'account', 'owner_copy', 'admin_session')),
  visitor_id text,
  user_agent text,
  browser text,
  os text,
  device text,
  city text,
  region text,
  country text,
  is_bot boolean not null default false,
  active_seconds integer not null default 0 check (active_seconds >= 0),
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  last_seen_at timestamptz,
  constraint document_views_one_target check ((quote_id is not null) <> (invoice_id is not null))
);
create index document_views_quote_idx on public.document_views (quote_id, created_at desc) where quote_id is not null;
create index document_views_invoice_idx on public.document_views (invoice_id, created_at desc) where invoice_id is not null;
alter table public.document_views enable row level security;
comment on table public.document_views is 'Each open of a quote/invoice link. link_hit = page requested, view = confirmed real browser, owner = The Curtain Guy, pdf = PDF download.';

create table public.email_messages (
  id uuid primary key default gen_random_uuid(),
  resend_id text unique,
  quote_id uuid references public.quotes(id) on delete cascade,
  invoice_id uuid references public.invoices(id) on delete cascade,
  audience text not null default 'customer' check (audience in ('customer', 'owner_copy')),
  to_emails text[] not null default '{}',
  cc_emails text[] not null default '{}',
  bcc_emails text[] not null default '{}',
  subject text,
  sent_at timestamptz not null default now(),
  delivered_at timestamptz,
  delayed_at timestamptz,
  bounced_at timestamptz,
  bounce_message text,
  complained_at timestamptz,
  failed_at timestamptz,
  first_opened_at timestamptz,
  last_opened_at timestamptz,
  open_count integer not null default 0,
  first_clicked_at timestamptz,
  click_count integer not null default 0,
  last_event text,
  last_event_at timestamptz,
  constraint email_messages_one_target check ((quote_id is not null) <> (invoice_id is not null))
);
create index email_messages_quote_idx on public.email_messages (quote_id, sent_at desc) where quote_id is not null;
create index email_messages_invoice_idx on public.email_messages (invoice_id, sent_at desc) where invoice_id is not null;
alter table public.email_messages enable row level security;

create table public.email_message_events (
  id uuid primary key default gen_random_uuid(),
  webhook_id text unique,
  resend_id text not null,
  email_message_id uuid references public.email_messages(id) on delete cascade,
  event_type text not null,
  occurred_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index email_message_events_message_idx on public.email_message_events (email_message_id, occurred_at desc);
create index email_message_events_resend_idx on public.email_message_events (resend_id);
alter table public.email_message_events enable row level security;

alter table public.quotes
  add column view_count integer not null default 0,
  add column last_viewed_at timestamptz;
alter table public.invoices
  add column view_count integer not null default 0,
  add column last_viewed_at timestamptz;

-- Promotes a link hit to a confirmed customer view (once) and bumps the document counters.
create or replace function public.tcg_confirm_document_view(p_view_id uuid, p_active_seconds integer)
returns text
language plpgsql
set search_path = public
as $$
declare
  v_row public.document_views;
  v_now timestamptz := now();
begin
  select * into v_row from public.document_views where id = p_view_id for update;
  if not found or v_row.kind not in ('link_hit', 'view') or v_row.created_at < v_now - interval '12 hours' then
    return 'ignored';
  end if;
  update public.document_views
    set kind = 'view',
        confirmed_at = coalesce(confirmed_at, v_now),
        last_seen_at = v_now,
        active_seconds = greatest(active_seconds, least(coalesce(p_active_seconds, 0), 43200))
    where id = p_view_id;
  if v_row.kind = 'view' then
    return 'updated';
  end if;
  if v_row.quote_id is not null then
    update public.quotes set view_count = view_count + 1, last_viewed_at = v_now where id = v_row.quote_id;
  else
    update public.invoices set view_count = view_count + 1, last_viewed_at = v_now where id = v_row.invoice_id;
  end if;
  return 'confirmed';
end;
$$;

-- Idempotent Resend webhook event: stores it once and rolls it up onto the message.
create or replace function public.tcg_record_email_event(
  p_webhook_id text,
  p_resend_id text,
  p_event_type text,
  p_occurred_at timestamptz,
  p_payload jsonb
)
returns text
language plpgsql
set search_path = public
as $$
declare
  v_message_id uuid;
  v_at timestamptz := coalesce(p_occurred_at, now());
begin
  select id into v_message_id from public.email_messages where resend_id = p_resend_id;
  insert into public.email_message_events (webhook_id, resend_id, email_message_id, event_type, occurred_at, payload)
    values (p_webhook_id, p_resend_id, v_message_id, p_event_type, v_at, coalesce(p_payload, '{}'::jsonb))
    on conflict (webhook_id) do nothing;
  if not found then
    return 'duplicate';
  end if;
  if v_message_id is null then
    return 'unknown_message';
  end if;
  update public.email_messages set
    delivered_at = case when p_event_type = 'email.delivered' then coalesce(delivered_at, v_at) else delivered_at end,
    delayed_at = case when p_event_type = 'email.delivery_delayed' then v_at else delayed_at end,
    bounced_at = case when p_event_type = 'email.bounced' then v_at else bounced_at end,
    bounce_message = case when p_event_type = 'email.bounced' then coalesce(p_payload #>> '{data,bounce,message}', bounce_message) else bounce_message end,
    complained_at = case when p_event_type = 'email.complained' then v_at else complained_at end,
    failed_at = case when p_event_type = 'email.failed' then v_at else failed_at end,
    first_opened_at = case when p_event_type = 'email.opened' then least(coalesce(first_opened_at, v_at), v_at) else first_opened_at end,
    last_opened_at = case when p_event_type = 'email.opened' then greatest(coalesce(last_opened_at, v_at), v_at) else last_opened_at end,
    open_count = open_count + case when p_event_type = 'email.opened' then 1 else 0 end,
    first_clicked_at = case when p_event_type = 'email.clicked' then least(coalesce(first_clicked_at, v_at), v_at) else first_clicked_at end,
    click_count = click_count + case when p_event_type = 'email.clicked' then 1 else 0 end,
    last_event = p_event_type,
    last_event_at = greatest(coalesce(last_event_at, v_at), v_at)
  where id = v_message_id;
  return 'recorded';
end;
$$;

revoke all on function public.tcg_confirm_document_view(uuid, integer) from public, anon, authenticated;
revoke all on function public.tcg_record_email_event(text, text, text, timestamptz, jsonb) from public, anon, authenticated;
