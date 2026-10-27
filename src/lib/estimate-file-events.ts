import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { fetchEstimateFiles, type EstimateFileRow } from "@/lib/estimate-access";
import {
  toFileActivityItem,
  type EstimateFileEventRow,
  type EstimateFileEventType,
  type FileActivityItem,
} from "@/data/estimate-file-events";

/** Everything the admin files panel needs: live files, restorable deletes, and the audit trail. */
export async function loadAdminOpportunityFiles(estimateRequestId: string): Promise<{
  files: EstimateFileRow[];
  deletedFiles: EstimateFileRow[];
  activity: FileActivityItem[];
}> {
  const [files, deleted, events] = await Promise.all([
    fetchEstimateFiles(estimateRequestId, ["uploaded", "pending"]),
    fetchEstimateFiles(estimateRequestId, ["deleted"]),
    listEstimateFileEvents(estimateRequestId),
  ]);
  const deletedFiles = deleted.sort(
    (a, b) =>
      new Date(b.deleted_at ?? b.created_at).getTime() -
      new Date(a.deleted_at ?? a.created_at).getTime()
  );
  return { files, deletedFiles, activity: events.map(toFileActivityItem) };
}

export async function logEstimateFileEvent(input: {
  fileId: string;
  estimateRequestId: string;
  fileName: string;
  actorType: EstimateFileEventRow["actor_type"];
  actorUserId?: string | null;
  actorEmail?: string | null;
  eventType: EstimateFileEventType;
  summary: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const admin = createAdminSupabaseClient();
  const { error } = await admin.from("estimate_file_events").insert({
    estimate_file_id: input.fileId,
    estimate_request_id: input.estimateRequestId,
    file_name: input.fileName,
    actor_type: input.actorType,
    actor_user_id: input.actorUserId ?? null,
    actor_email: input.actorEmail ?? null,
    event_type: input.eventType,
    summary: input.summary,
    metadata: input.metadata ?? {},
  });
  if (error) {
    console.error("[estimate-file-events] insert failed:", error.message);
  }
}

export async function listEstimateFileEvents(
  estimateRequestId: string,
  limit = 200
): Promise<EstimateFileEventRow[]> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("estimate_file_events")
    .select("*")
    .eq("estimate_request_id", estimateRequestId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data as EstimateFileEventRow[];
}
