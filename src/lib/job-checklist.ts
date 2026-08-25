import {
  DEFAULT_JOB_CHECKLIST,
  type EventJobChecklistItemRow,
} from "@/data/jobs";
import { recordJobEvent } from "@/lib/job-events";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function createDefaultChecklist(jobId: string): Promise<void> {
  const admin = createAdminSupabaseClient();
  const rows = DEFAULT_JOB_CHECKLIST.map((item) => ({
    job_id: jobId,
    label: item.label,
    category: item.category,
    is_required: item.is_required,
    sort_order: item.sort_order,
  }));

  const { error } = await admin.from("event_job_checklist_items").insert(rows);
  if (error) {
    console.error("[jobs] createDefaultChecklist failed", error);
    throw new Error("Could not create default checklist.");
  }
}

export async function listChecklistItems(
  jobId: string
): Promise<EventJobChecklistItemRow[]> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("event_job_checklist_items")
    .select("*")
    .eq("job_id", jobId)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[jobs] listChecklistItems failed", error);
    return [];
  }
  return (data || []) as EventJobChecklistItemRow[];
}

export async function completeChecklistItem(
  itemId: string,
  ownerUserId: string
): Promise<EventJobChecklistItemRow | null> {
  const admin = createAdminSupabaseClient();
  const { data: item, error: loadError } = await admin
    .from("event_job_checklist_items")
    .select("*")
    .eq("id", itemId)
    .maybeSingle();

  if (loadError || !item) {
    console.error("[jobs] completeChecklistItem load failed", loadError);
    return null;
  }

  const now = new Date().toISOString();
  const { data: updated, error } = await admin
    .from("event_job_checklist_items")
    .update({
      is_completed: true,
      completed_at: now,
      completed_by_user_id: ownerUserId,
    })
    .eq("id", itemId)
    .select("*")
    .single();

  if (error || !updated) {
    console.error("[jobs] completeChecklistItem update failed", error);
    return null;
  }

  await recordJobEvent({
    jobId: item.job_id as string,
    actorUserId: ownerUserId,
    actorRole: "owner",
    eventType: "checklist_completed",
    title: `Checklist: ${item.label}`,
    body: "Marked complete.",
    customerVisible: false,
    metadata: { checklist_item_id: itemId },
  });

  return updated as EventJobChecklistItemRow;
}

export async function reopenChecklistItem(
  itemId: string,
  ownerUserId: string
): Promise<EventJobChecklistItemRow | null> {
  const admin = createAdminSupabaseClient();
  const { data: item, error: loadError } = await admin
    .from("event_job_checklist_items")
    .select("*")
    .eq("id", itemId)
    .maybeSingle();

  if (loadError || !item) {
    console.error("[jobs] reopenChecklistItem load failed", loadError);
    return null;
  }

  const { data: updated, error } = await admin
    .from("event_job_checklist_items")
    .update({
      is_completed: false,
      completed_at: null,
      completed_by_user_id: null,
    })
    .eq("id", itemId)
    .select("*")
    .single();

  if (error || !updated) {
    console.error("[jobs] reopenChecklistItem update failed", error);
    return null;
  }

  await recordJobEvent({
    jobId: item.job_id as string,
    actorUserId: ownerUserId,
    actorRole: "owner",
    eventType: "checklist_reopened",
    title: `Checklist reopened: ${item.label}`,
    customerVisible: false,
    metadata: { checklist_item_id: itemId },
  });

  return updated as EventJobChecklistItemRow;
}
