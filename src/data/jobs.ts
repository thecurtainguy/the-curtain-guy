export const JOB_STATUSES = [
  "draft",
  "confirmed",
  "details_needed",
  "venue_confirmed",
  "production_planning",
  "install_scheduled",
  "installed",
  "event_completed",
  "teardown_scheduled",
  "teardown_completed",
  "closed",
  "cancelled",
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

export const JOB_CHECKLIST_CATEGORIES = [
  "planning",
  "venue",
  "measurements",
  "install",
  "teardown",
  "customer",
  "files",
  "production",
] as const;

export type JobChecklistCategory = (typeof JOB_CHECKLIST_CATEGORIES)[number];

export const JOB_EVENT_TYPES = [
  "job_created",
  "status_changed",
  "checklist_completed",
  "checklist_reopened",
  "schedule_updated",
  "notes_updated",
  "customer_message",
  "file_uploaded",
  "quote_linked",
] as const;

export type JobEventType = (typeof JOB_EVENT_TYPES)[number];

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  draft: "Draft",
  confirmed: "Confirmed",
  details_needed: "Details Needed",
  venue_confirmed: "Venue Confirmed",
  production_planning: "Production Planning",
  install_scheduled: "Installation Scheduled",
  installed: "Installed",
  event_completed: "Event Completed",
  teardown_scheduled: "Teardown Scheduled",
  teardown_completed: "Teardown Completed",
  closed: "Closed",
  cancelled: "Cancelled",
};

export const JOB_CHECKLIST_CATEGORY_LABELS: Record<
  JobChecklistCategory,
  string
> = {
  planning: "Planning",
  venue: "Venue",
  measurements: "Measurements",
  install: "Install",
  teardown: "Teardown",
  customer: "Customer",
  files: "Files",
  production: "Production",
};

export const DEFAULT_JOB_CHECKLIST: Array<{
  label: string;
  category: JobChecklistCategory;
  is_required: boolean;
  sort_order: number;
}> = [
  {
    label: "Customer contact confirmed",
    category: "customer",
    is_required: true,
    sort_order: 0,
  },
  {
    label: "Event date confirmed",
    category: "planning",
    is_required: true,
    sort_order: 1,
  },
  {
    label: "Venue name and address confirmed",
    category: "venue",
    is_required: true,
    sort_order: 2,
  },
  {
    label: "Install date/time confirmed",
    category: "install",
    is_required: true,
    sort_order: 3,
  },
  {
    label: "Teardown date/time confirmed",
    category: "teardown",
    is_required: true,
    sort_order: 4,
  },
  {
    label: "Room/area requirements confirmed",
    category: "venue",
    is_required: false,
    sort_order: 5,
  },
  {
    label: "Draping colors/style confirmed",
    category: "production",
    is_required: false,
    sort_order: 6,
  },
  {
    label: "Height/measurement requirements confirmed",
    category: "measurements",
    is_required: false,
    sort_order: 7,
  },
  {
    label: "Loading/access details confirmed",
    category: "venue",
    is_required: false,
    sort_order: 8,
  },
  {
    label: "Parking/elevator details confirmed",
    category: "venue",
    is_required: false,
    sort_order: 9,
  },
  {
    label: "Customer uploads reviewed",
    category: "files",
    is_required: false,
    sort_order: 10,
  },
  {
    label: "Production notes prepared",
    category: "production",
    is_required: false,
    sort_order: 11,
  },
  {
    label: "Installation plan reviewed",
    category: "install",
    is_required: false,
    sort_order: 12,
  },
  {
    label: "Teardown plan reviewed",
    category: "teardown",
    is_required: false,
    sort_order: 13,
  },
];

export type EventJobRow = {
  id: string;
  opportunity_ref: string;
  estimate_request_id: string | null;
  quote_id: string | null;
  customer_user_id: string | null;
  created_by_user_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  company_name: string | null;
  event_name: string | null;
  event_type: string | null;
  event_date: string | null;
  event_start_time: string | null;
  event_end_time: string | null;
  guest_count: number | null;
  venue_name: string | null;
  venue_address: string | null;
  venue_city: string | null;
  venue_region: string | null;
  venue_postal_code: string | null;
  venue_country: string | null;
  install_date: string | null;
  install_start_time: string | null;
  install_end_time: string | null;
  teardown_date: string | null;
  teardown_start_time: string | null;
  teardown_end_time: string | null;
  access_notes: string | null;
  loading_notes: string | null;
  parking_notes: string | null;
  elevator_notes: string | null;
  room_notes: string | null;
  production_notes: string | null;
  customer_visible_notes: string | null;
  internal_notes: string | null;
  status: JobStatus;
  currency: string;
  accepted_quote_total_cents: number | null;
  accepted_quote_subtotal_cents: number | null;
  created_at: string;
  updated_at: string;
  confirmed_at: string | null;
  install_scheduled_at: string | null;
  installed_at: string | null;
  event_completed_at: string | null;
  teardown_completed_at: string | null;
  closed_at: string | null;
  cancelled_at: string | null;
};

export type EventJobChecklistItemRow = {
  id: string;
  job_id: string;
  label: string;
  description: string | null;
  category: JobChecklistCategory;
  is_required: boolean;
  is_completed: boolean;
  completed_at: string | null;
  completed_by_user_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type EventJobEventRow = {
  id: string;
  job_id: string;
  actor_user_id: string | null;
  actor_role: string | null;
  event_type: string;
  title: string;
  body: string | null;
  metadata: Record<string, unknown>;
  customer_visible: boolean;
  created_at: string;
};

export type EventJobMessageRow = {
  id: string;
  job_id: string;
  sender_user_id: string | null;
  sender_name: string | null;
  sender_email: string | null;
  sender_role: string;
  message: string;
  is_internal: boolean;
  created_at: string;
};

export type CustomerSafeJob = Omit<
  EventJobRow,
  "internal_notes" | "production_notes"
> & {
  checklist_progress: { completed: number; total: number };
};

export function isJobStatus(value: string): value is JobStatus {
  return (JOB_STATUSES as readonly string[]).includes(value);
}

export function formatJobRef(opportunityRef: string): string {
  return `Event ${opportunityRef}`;
}

export function getJobStatusLabel(status: JobStatus): string {
  return JOB_STATUS_LABELS[status] ?? status;
}

export function getNextJobStatuses(current: JobStatus): JobStatus[] {
  const order = JOB_STATUSES.filter((s) => s !== "cancelled") as JobStatus[];
  const idx = order.indexOf(current);
  if (idx === -1) return [];
  const next: JobStatus[] = [];
  if (idx + 1 < order.length) {
    next.push(order[idx + 1]!);
  }
  if (current !== "cancelled" && current !== "closed") {
    next.push("cancelled");
  }
  return [...new Set(next)];
}

export function getChecklistProgress(
  items: Pick<EventJobChecklistItemRow, "is_completed" | "is_required">[]
): { completed: number; total: number; requiredRemaining: number } {
  const total = items.length;
  const completed = items.filter((i) => i.is_completed).length;
  const requiredRemaining = items.filter(
    (i) => !i.is_completed && i.is_required
  ).length;
  return { completed, total, requiredRemaining };
}

export function statusTimestampField(
  status: JobStatus
): keyof EventJobRow | null {
  switch (status) {
    case "confirmed":
      return "confirmed_at";
    case "install_scheduled":
      return "install_scheduled_at";
    case "installed":
      return "installed_at";
    case "event_completed":
      return "event_completed_at";
    case "teardown_completed":
      return "teardown_completed_at";
    case "closed":
      return "closed_at";
    case "cancelled":
      return "cancelled_at";
    default:
      return null;
  }
}

export function isCustomerVisibleStatus(status: JobStatus): boolean {
  return [
    "confirmed",
    "install_scheduled",
    "installed",
    "event_completed",
    "teardown_scheduled",
    "teardown_completed",
    "closed",
  ].includes(status);
}

export function buildJobSummaryText(
  job: Pick<
    EventJobRow,
    | "opportunity_ref"
    | "status"
    | "customer_name"
    | "event_date"
    | "venue_name"
    | "install_date"
    | "install_start_time"
    | "teardown_date"
    | "teardown_start_time"
  >
): string {
  const lines = [
    formatJobRef(job.opportunity_ref),
    `Status: ${getJobStatusLabel(job.status)}`,
    job.customer_name ? `Customer: ${job.customer_name}` : null,
    job.event_date ? `Event date: ${job.event_date}` : null,
    job.venue_name ? `Venue: ${job.venue_name}` : null,
    job.install_date
      ? `Install: ${job.install_date}${job.install_start_time ? ` ${job.install_start_time}` : ""}`
      : null,
    job.teardown_date
      ? `Teardown: ${job.teardown_date}${job.teardown_start_time ? ` ${job.teardown_start_time}` : ""}`
      : null,
  ].filter(Boolean);
  return lines.join("\n");
}
