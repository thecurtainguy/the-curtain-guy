export const EVENT_PLAN_STATUSES = [
  "new",
  "reviewed",
  "quoted",
  "archived",
] as const;

export type EventPlanStatus = (typeof EVENT_PLAN_STATUSES)[number];

export type EventPlanSubmissionRow = {
  id: string;
  reference: string;
  plan_number: number | null;
  created_at: string;
  updated_at: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  event_type: string | null;
  event_date: string | null;
  venue_name: string | null;
  city_area: string | null;
  brief_json: Record<string, unknown>;
  design_json: Record<string, unknown>;
  owner_user_id: string | null;
  studio_design_id: string | null;
  status: EventPlanStatus;
  submitted_from_url: string | null;
  user_agent: string | null;
  notes: string | null;
};

/**
 * Display reference for event plan submissions (EP-10000+).
 * Falls back to legacy EP-{uuid8} if reference missing.
 */
export function formatEventPlanReference(
  id: string,
  reference?: string | null
): string {
  const ref = reference?.trim();
  if (ref) return ref;
  return `EP-${id.slice(0, 8).toUpperCase()}`;
}

export function getEventPlanStatusLabel(status: EventPlanStatus): string {
  switch (status) {
    case "new":
      return "New";
    case "reviewed":
      return "Reviewed";
    case "quoted":
      return "Quoted";
    case "archived":
      return "Archived";
    default:
      return status;
  }
}
