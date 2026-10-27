export const ESTIMATE_FILE_EVENT_TYPES = [
  "file_uploaded",
  "file_shared",
  "file_made_internal",
  "file_kind_changed",
  "file_caption_changed",
  "file_attached_quote",
  "file_detached_quote",
  "file_attached_invoice",
  "file_detached_invoice",
  "file_deleted",
  "file_restored",
] as const;

export type EstimateFileEventType = (typeof ESTIMATE_FILE_EVENT_TYPES)[number];

export type EstimateFileEventRow = {
  id: string;
  estimate_file_id: string | null;
  estimate_request_id: string | null;
  file_name: string;
  actor_type: "owner" | "customer" | "system";
  actor_user_id: string | null;
  actor_email: string | null;
  event_type: EstimateFileEventType;
  summary: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

/** Row shape shared by the quote change log and the files panel activity list. */
export type FileActivityItem = Pick<
  EstimateFileEventRow,
  "id" | "file_name" | "actor_type" | "actor_email" | "event_type" | "summary" | "created_at"
>;

export function toFileActivityItem(row: EstimateFileEventRow): FileActivityItem {
  return {
    id: row.id,
    file_name: row.file_name,
    actor_type: row.actor_type,
    actor_email: row.actor_email,
    event_type: row.event_type,
    summary: row.summary,
    created_at: row.created_at,
  };
}
