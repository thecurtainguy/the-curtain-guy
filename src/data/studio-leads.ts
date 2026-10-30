/** Event context a customer attaches to a studio room (studio_designs columns). */
export type StudioEventDetails = {
  eventName: string | null;
  /** Managed event type id (see `event_types`). */
  eventType: string | null;
  /** ISO date, YYYY-MM-DD. */
  eventDate: string | null;
  guestCount: number | null;
  venueName: string | null;
  cityArea: string | null;
};

/** Contact captured on Save for visitors without an account — all required. */
export type StudioLeadContact = {
  name: string;
  email: string;
  phone: string;
};

export const EMPTY_STUDIO_EVENT_DETAILS: StudioEventDetails = {
  eventName: null,
  eventType: null,
  eventDate: null,
  guestCount: null,
  venueName: null,
  cityArea: null,
};

export const STUDIO_GUEST_COUNT_MAX = 20000;
export const STUDIO_LEAD_TEXT_MAX = 160;

export const STUDIO_DESIGN_SOURCES = ["studio", "event_builder", "admin"] as const;
export type StudioDesignSource = (typeof STUDIO_DESIGN_SOURCES)[number];

/**
 * Funnel stage, derived (never stored) from a studio_designs row and its links.
 * browsing → details → contact → submitted → quoted → won.
 */
export const STUDIO_LEAD_STAGES = [
  "browsing",
  "details",
  "contact",
  "submitted",
  "quoted",
  "won",
] as const;
export type StudioLeadStage = (typeof STUDIO_LEAD_STAGES)[number];

export const STUDIO_LEAD_STAGE_LABELS: Record<StudioLeadStage, string> = {
  browsing: "Browsing",
  details: "Event details",
  contact: "Contact captured",
  submitted: "Submitted",
  quoted: "Quoted",
  won: "Won",
};

export type StudioLeadStageInput = {
  ownerUserId: string | null;
  contactEmail: string | null;
  details: Pick<StudioEventDetails, "eventName" | "eventType" | "eventDate" | "guestCount">;
  hasEventPlan: boolean;
  quoteId: string | null;
  jobId: string | null;
  quoteAccepted?: boolean;
};

export function getStudioLeadStage(input: StudioLeadStageInput): StudioLeadStage {
  if (input.jobId || input.quoteAccepted) return "won";
  if (input.quoteId) return "quoted";
  if (input.hasEventPlan) return "submitted";
  if (input.contactEmail || input.ownerUserId) return "contact";
  const { eventName, eventType, eventDate, guestCount } = input.details;
  if (eventName || eventType || eventDate || guestCount) return "details";
  return "browsing";
}