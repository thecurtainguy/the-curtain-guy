import {
  type EventJobEventRow,
  type JobEventType,
  getJobStatusLabel,
  isCustomerVisibleStatus,
  type JobStatus,
} from "@/data/jobs";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function recordJobEvent(input: {
  jobId: string;
  actorUserId?: string | null;
  actorRole?: string | null;
  eventType: JobEventType | string;
  title: string;
  body?: string | null;
  metadata?: Record<string, unknown>;
  customerVisible?: boolean;
}): Promise<void> {
  const admin = createAdminSupabaseClient();
  const { error } = await admin.from("event_job_events").insert({
    job_id: input.jobId,
    actor_user_id: input.actorUserId ?? null,
    actor_role: input.actorRole ?? null,
    event_type: input.eventType,
    title: input.title,
    body: input.body ?? null,
    metadata: input.metadata ?? {},
    customer_visible: input.customerVisible ?? false,
  });

  if (error) {
    console.error("[jobs] recordJobEvent failed", error);
  }
}

export async function listJobEvents(
  jobId: string,
  options?: { customerVisibleOnly?: boolean }
): Promise<EventJobEventRow[]> {
  const admin = createAdminSupabaseClient();
  let query = admin
    .from("event_job_events")
    .select("*")
    .eq("job_id", jobId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (options?.customerVisibleOnly) {
    query = query.eq("customer_visible", true);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[jobs] listJobEvents failed", error);
    return [];
  }
  return (data || []) as EventJobEventRow[];
}

export function buildStatusChangeEvent(input: {
  fromStatus: JobStatus;
  toStatus: JobStatus;
}): {
  title: string;
  body: string;
  customerVisible: boolean;
} {
  const fromLabel = getJobStatusLabel(input.fromStatus);
  const toLabel = getJobStatusLabel(input.toStatus);
  return {
    title: `Status updated to ${toLabel}`,
    body: `Changed from ${fromLabel} to ${toLabel}.`,
    customerVisible: isCustomerVisibleStatus(input.toStatus),
  };
}
