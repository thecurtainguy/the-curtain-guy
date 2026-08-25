import type { User } from "@supabase/supabase-js";
import {
  type CustomerSafeJob,
  type EventJobChecklistItemRow,
  type EventJobEventRow,
  type EventJobMessageRow,
  type EventJobRow,
  type JobStatus,
  getChecklistProgress,
  isJobStatus,
  statusTimestampField,
} from "@/data/jobs";
import type { QuoteLineItemRow, QuoteRow } from "@/data/quotes";
import { formatQuoteDisplayRef } from "@/data/quotes";
import { isEmailVerified } from "@/lib/auth";
import type { EstimateRequestRow } from "@/lib/estimate-access";
import { fetchEstimateById } from "@/lib/estimate-access";
import {
  createDefaultChecklist,
  listChecklistItems,
} from "@/lib/job-checklist";
import {
  buildStatusChangeEvent,
  listJobEvents,
  recordJobEvent,
} from "@/lib/job-events";
import { fetchQuoteById } from "@/lib/quotes";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export type JobWithRelations = EventJobRow & {
  checklist_items: EventJobChecklistItemRow[];
  events: EventJobEventRow[];
  messages: EventJobMessageRow[];
  quote?: QuoteRow | null;
  quote_line_items?: QuoteLineItemRow[];
};

export type JobListRow = EventJobRow & {
  checklist_completed: number;
  checklist_total: number;
  quote_display_ref: string | null;
};

function normalizeEmail(email: string | null | undefined): string {
  return (email || "").trim().toLowerCase();
}

export function customerCanAccessJob(
  job: Pick<EventJobRow, "customer_user_id" | "customer_email">,
  user: User,
  estimate?: Pick<EstimateRequestRow, "user_id" | "customer_email"> | null
): boolean {
  if (job.customer_user_id && job.customer_user_id === user.id) {
    return true;
  }

  if (estimate?.user_id && estimate.user_id === user.id) {
    return true;
  }

  const userEmail = normalizeEmail(user.email);
  const jobEmail = normalizeEmail(job.customer_email);

  if (userEmail && jobEmail && userEmail === jobEmail && isEmailVerified(user)) {
    return true;
  }

  if (
    estimate &&
    userEmail &&
    normalizeEmail(estimate.customer_email) === userEmail &&
    isEmailVerified(user)
  ) {
    return true;
  }

  return false;
}

export function toCustomerSafeJob(
  job: JobWithRelations
): CustomerSafeJob {
  const { internal_notes: _internal, production_notes: _production, ...rest } = job;
  void _internal;
  void _production;
  const progress = getChecklistProgress(job.checklist_items || []);
  return {
    ...rest,
    checklist_progress: {
      completed: progress.completed,
      total: progress.total,
    },
  };
}

export async function fetchJobByQuoteId(
  quoteId: string
): Promise<EventJobRow | null> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("event_jobs")
    .select("*")
    .eq("quote_id", quoteId)
    .maybeSingle();

  if (error) {
    console.error("[jobs] fetchJobByQuoteId failed", error);
    return null;
  }
  return data as EventJobRow | null;
}

export async function fetchJobByEstimateId(
  estimateId: string
): Promise<EventJobRow | null> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("event_jobs")
    .select("*")
    .eq("estimate_request_id", estimateId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[jobs] fetchJobByEstimateId failed", error);
    return null;
  }
  return data as EventJobRow | null;
}

export async function getAdminJob(jobId: string): Promise<JobWithRelations | null> {
  const admin = createAdminSupabaseClient();
  const { data: job, error } = await admin
    .from("event_jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();

  if (error || !job) {
    if (error) console.error("[jobs] getAdminJob failed", error);
    return null;
  }

  const [checklist, events, messages, quoteData] = await Promise.all([
    listChecklistItems(jobId),
    listJobEvents(jobId),
    listJobMessages(jobId, { includeInternal: true }),
    job.quote_id ? fetchQuoteById(job.quote_id as string) : Promise.resolve(null),
  ]);

  return {
    ...(job as EventJobRow),
    checklist_items: checklist,
    events,
    messages,
    quote: quoteData,
    quote_line_items: quoteData?.line_items ?? [],
  };
}

export async function listAdminJobs(filters?: {
  status?: JobStatus | null;
  search?: string;
  upcoming?: boolean;
  past?: boolean;
  limit?: number;
}): Promise<JobListRow[]> {
  const admin = createAdminSupabaseClient();
  let query = admin
    .from("event_jobs")
    .select("*")
    .order("event_date", { ascending: true, nullsFirst: false })
    .limit(filters?.limit ?? 200);

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  const today = new Date().toISOString().slice(0, 10);
  if (filters?.upcoming) {
    query = query.gte("event_date", today);
  }
  if (filters?.past) {
    query = query.lt("event_date", today);
  }

  const { data: jobs, error } = await query;
  if (error) {
    console.error("[jobs] listAdminJobs failed", error);
    return [];
  }

  const rows = (jobs || []) as EventJobRow[];
  const quoteIds = rows
    .map((j) => j.quote_id)
    .filter((id): id is string => Boolean(id));

  const quoteRefMap = new Map<string, string>();
  if (quoteIds.length > 0) {
    const { data: quotes } = await admin
      .from("quotes")
      .select("id, quote_display_ref, opportunity_ref, revision_number")
      .in("id", quoteIds);
    for (const q of quotes || []) {
      quoteRefMap.set(
        q.id as string,
        formatQuoteDisplayRef(
          q.opportunity_ref as string,
          q.revision_number as number
        )
      );
    }
  }

  const jobIds = rows.map((j) => j.id);
  const checklistMap = new Map<string, { completed: number; total: number }>();

  if (jobIds.length > 0) {
    const { data: checklistRows } = await admin
      .from("event_job_checklist_items")
      .select("job_id, is_completed")
      .in("job_id", jobIds);

    for (const jobId of jobIds) {
      const items = (checklistRows || []).filter(
        (r) => r.job_id === jobId
      ) as Array<{ is_completed: boolean }>;
      const progress = getChecklistProgress(
        items.map((i) => ({ is_completed: i.is_completed, is_required: false }))
      );
      checklistMap.set(jobId, {
        completed: progress.completed,
        total: progress.total,
      });
    }
  }

  let result: JobListRow[] = rows.map((job) => {
    const progress = checklistMap.get(job.id) ?? { completed: 0, total: 0 };
    return {
      ...job,
      checklist_completed: progress.completed,
      checklist_total: progress.total,
      quote_display_ref: job.quote_id
        ? quoteRefMap.get(job.quote_id) ?? null
        : null,
    };
  });

  const search = filters?.search?.trim().toLowerCase();
  if (search) {
    result = result.filter((row) => {
      return (
        row.opportunity_ref.toLowerCase().includes(search) ||
        (row.customer_name || "").toLowerCase().includes(search) ||
        (row.customer_email || "").toLowerCase().includes(search) ||
        (row.venue_name || "").toLowerCase().includes(search) ||
        (row.event_name || "").toLowerCase().includes(search) ||
        (row.quote_display_ref || "").toLowerCase().includes(search)
      );
    });
  }

  return result;
}

export async function listCustomerJobs(user: User): Promise<EventJobRow[]> {
  const admin = createAdminSupabaseClient();
  const userEmail = normalizeEmail(user.email);

  const { data: byUserId, error: userError } = await admin
    .from("event_jobs")
    .select("*")
    .eq("customer_user_id", user.id)
    .order("event_date", { ascending: true, nullsFirst: false });

  if (userError) {
    console.error("[jobs] listCustomerJobs by user failed", userError);
  }

  let byEmail: EventJobRow[] = [];
  if (userEmail && isEmailVerified(user)) {
    const { data, error } = await admin
      .from("event_jobs")
      .select("*")
      .ilike("customer_email", userEmail)
      .order("event_date", { ascending: true, nullsFirst: false });

    if (error) {
      console.error("[jobs] listCustomerJobs by email failed", error);
    } else {
      byEmail = (data || []) as EventJobRow[];
    }
  }

  const merged = new Map<string, EventJobRow>();
  for (const row of [...(byUserId || []), ...byEmail] as EventJobRow[]) {
    merged.set(row.id, row);
  }
  return [...merged.values()];
}

export async function getCustomerJob(
  jobId: string,
  user: User
): Promise<JobWithRelations | null> {
  const job = await getAdminJob(jobId);
  if (!job) return null;

  const estimate = job.estimate_request_id
    ? await fetchEstimateById(job.estimate_request_id)
    : null;

  if (!customerCanAccessJob(job, user, estimate)) {
    return null;
  }

  return {
    ...job,
    events: job.events.filter((e) => e.customer_visible),
    messages: job.messages.filter((m) => !m.is_internal),
    internal_notes: null,
    production_notes: null,
  };
}

export async function createJobFromQuote(
  quoteId: string,
  ownerUserId: string,
  options?: { allowNonAccepted?: boolean }
): Promise<{ jobId: string; created: boolean; message?: string }> {
  const existing = await fetchJobByQuoteId(quoteId);
  if (existing) {
    return { jobId: existing.id, created: false };
  }

  const quote = await fetchQuoteById(quoteId);
  if (!quote) {
    throw new Error("Quote not found.");
  }

  if (quote.status !== "accepted" && !options?.allowNonAccepted) {
    throw new Error("Quote must be accepted before creating a job.");
  }

  const estimate = await fetchEstimateById(quote.estimate_request_id);

  const admin = createAdminSupabaseClient();
  const insertPayload = {
    opportunity_ref: quote.opportunity_ref,
    estimate_request_id: quote.estimate_request_id,
    quote_id: quote.id,
    customer_user_id: estimate?.user_id ?? null,
    created_by_user_id: ownerUserId,
    customer_name: quote.customer_name ?? estimate?.customer_name ?? null,
    customer_email: quote.customer_email ?? estimate?.customer_email ?? null,
    customer_phone: estimate?.customer_phone ?? null,
    company_name: null,
    event_name: null,
    event_type: quote.event_type ?? estimate?.event_type ?? null,
    event_date: quote.event_date ?? estimate?.event_date ?? null,
    guest_count: estimate?.guest_count ?? null,
    venue_name: quote.venue_name ?? estimate?.venue_name ?? null,
    venue_city: quote.city_area ?? estimate?.city_area ?? null,
    venue_country: "Canada",
    status: "draft" as JobStatus,
    currency: quote.currency,
    accepted_quote_total_cents: quote.total_cents,
    accepted_quote_subtotal_cents: quote.subtotal_cents,
  };

  const { data: job, error } = await admin
    .from("event_jobs")
    .insert(insertPayload)
    .select("id")
    .single();

  if (error || !job) {
    console.error("[jobs] createJobFromQuote insert failed", error);
    throw new Error("Could not create job.");
  }

  const jobId = job.id as string;

  await createDefaultChecklist(jobId);

  await recordJobEvent({
    jobId,
    actorUserId: ownerUserId,
    actorRole: "owner",
    eventType: "job_created",
    title: "Event job created",
    body: `Booked event created from ${formatQuoteDisplayRef(quote.opportunity_ref, quote.revision_number)}.`,
    customerVisible: true,
    metadata: { quote_id: quoteId },
  });

  await recordJobEvent({
    jobId,
    actorUserId: ownerUserId,
    actorRole: "owner",
    eventType: "quote_linked",
    title: "Quote linked",
    body: formatQuoteDisplayRef(quote.opportunity_ref, quote.revision_number),
    customerVisible: false,
    metadata: { quote_id: quoteId },
  });

  return { jobId, created: true };
}

export type JobUpdatePayload = Partial<
  Pick<
    EventJobRow,
    | "event_name"
    | "event_type"
    | "event_date"
    | "event_start_time"
    | "event_end_time"
    | "guest_count"
    | "venue_name"
    | "venue_address"
    | "venue_city"
    | "venue_region"
    | "venue_postal_code"
    | "venue_country"
    | "install_date"
    | "install_start_time"
    | "install_end_time"
    | "teardown_date"
    | "teardown_start_time"
    | "teardown_end_time"
    | "access_notes"
    | "loading_notes"
    | "parking_notes"
    | "elevator_notes"
    | "room_notes"
    | "production_notes"
    | "customer_visible_notes"
    | "internal_notes"
    | "customer_name"
    | "customer_email"
    | "customer_phone"
    | "company_name"
  >
>;

export async function updateJob(
  jobId: string,
  payload: JobUpdatePayload,
  ownerUserId: string
): Promise<EventJobRow | null> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("event_jobs")
    .update(payload)
    .eq("id", jobId)
    .select("*")
    .single();

  if (error || !data) {
    console.error("[jobs] updateJob failed", error);
    return null;
  }

  await recordJobEvent({
    jobId,
    actorUserId: ownerUserId,
    actorRole: "owner",
    eventType: "notes_updated",
    title: "Job details updated",
    customerVisible: false,
  });

  return data as EventJobRow;
}

export async function updateJobStatus(
  jobId: string,
  status: JobStatus,
  ownerUserId: string
): Promise<EventJobRow | null> {
  if (!isJobStatus(status)) {
    throw new Error("Invalid status.");
  }

  const admin = createAdminSupabaseClient();
  const { data: current, error: loadError } = await admin
    .from("event_jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();

  if (loadError || !current) {
    console.error("[jobs] updateJobStatus load failed", loadError);
    return null;
  }

  const fromStatus = current.status as JobStatus;
  const updatePayload: Record<string, unknown> = { status };

  const tsField = statusTimestampField(status);
  if (tsField) {
    updatePayload[tsField] = new Date().toISOString();
  }

  const { data, error } = await admin
    .from("event_jobs")
    .update(updatePayload)
    .eq("id", jobId)
    .select("*")
    .single();

  if (error || !data) {
    console.error("[jobs] updateJobStatus update failed", error);
    return null;
  }

  const eventInfo = buildStatusChangeEvent({
    fromStatus,
    toStatus: status,
  });

  await recordJobEvent({
    jobId,
    actorUserId: ownerUserId,
    actorRole: "owner",
    eventType: "status_changed",
    title: eventInfo.title,
    body: eventInfo.body,
    customerVisible: eventInfo.customerVisible,
    metadata: { from: fromStatus, to: status },
  });

  return data as EventJobRow;
}

export async function listJobMessages(
  jobId: string,
  options?: { includeInternal?: boolean }
): Promise<EventJobMessageRow[]> {
  const admin = createAdminSupabaseClient();
  let query = admin
    .from("event_job_messages")
    .select("*")
    .eq("job_id", jobId)
    .order("created_at", { ascending: true });

  if (!options?.includeInternal) {
    query = query.eq("is_internal", false);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[jobs] listJobMessages failed", error);
    return [];
  }
  return (data || []) as EventJobMessageRow[];
}

export async function addJobMessage(
  jobId: string,
  input: {
    message: string;
    senderUserId?: string | null;
    senderName?: string | null;
    senderEmail?: string | null;
    senderRole: string;
    isInternal?: boolean;
  }
): Promise<EventJobMessageRow | null> {
  const trimmed = input.message.trim();
  if (!trimmed || trimmed.length > 5000) {
    throw new Error("Message must be between 1 and 5000 characters.");
  }

  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("event_job_messages")
    .insert({
      job_id: jobId,
      sender_user_id: input.senderUserId ?? null,
      sender_name: input.senderName ?? null,
      sender_email: input.senderEmail ?? null,
      sender_role: input.senderRole,
      message: trimmed,
      is_internal: input.isInternal ?? false,
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("[jobs] addJobMessage failed", error);
    return null;
  }

  if (!input.isInternal) {
    await recordJobEvent({
      jobId,
      actorUserId: input.senderUserId ?? null,
      actorRole: input.senderRole,
      eventType: "customer_message",
      title:
        input.senderRole === "customer"
          ? "Customer message"
          : "Message from The Curtain Guy",
      body: trimmed.slice(0, 200),
      customerVisible: true,
    });
  }

  return data as EventJobMessageRow;
}
