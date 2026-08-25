export const QUOTE_STATUSES = [
  "draft",
  "sent",
  "viewed",
  "accepted",
  "declined",
  "revision_requested",
  "expired",
  "cancelled",
] as const;

export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

export const QUOTE_LINE_CATEGORIES = [
  "drape_rental",
  "hardware",
  "installation",
  "delivery",
  "teardown",
  "labor",
  "rush_special_handling",
  "premium_fabric",
  "backdrop",
  "room_divider_masking",
  "custom",
] as const;

export type QuoteLineCategory = (typeof QUOTE_LINE_CATEGORIES)[number];

export const QUOTE_LINE_STATUSES = [
  "priced",
  "included",
  "pending_owner_review",
  "not_priced_yet",
  "requested_change",
  "approved",
  "declined",
  "needs_measurement",
  "needs_venue_confirmation",
] as const;

export type QuoteLineStatus = (typeof QUOTE_LINE_STATUSES)[number];

export const QUOTE_REQUEST_TYPES = [
  "add_on",
  "revision",
  "question",
  "custom",
] as const;

export type QuoteRequestType = (typeof QUOTE_REQUEST_TYPES)[number];

export const QUOTE_REQUEST_STATUSES = [
  "pending_owner_review",
  "approved",
  "declined",
  "converted_to_line_item",
  "needs_info",
] as const;

export type QuoteRequestStatus = (typeof QUOTE_REQUEST_STATUSES)[number];

export const QUOTE_EVENT_TYPES = [
  "quote_created",
  "quote_sent",
  "quote_viewed",
  "quote_edited",
  "line_item_added",
  "line_item_updated",
  "line_item_removed",
  "customer_requested_add_on",
  "customer_requested_revision",
  "customer_question",
  "customer_accepted",
  "customer_declined",
  "pdf_downloaded",
  "request_reviewed",
  "revision_created",
] as const;

export type QuoteEventType = (typeof QUOTE_EVENT_TYPES)[number];

export const QUOTE_CATEGORY_LABELS: Record<QuoteLineCategory, string> = {
  drape_rental: "Drape rental",
  hardware: "Hardware",
  installation: "Installation",
  delivery: "Delivery",
  teardown: "Teardown",
  labor: "Labor",
  rush_special_handling: "Rush / special handling",
  premium_fabric: "Premium fabric",
  backdrop: "Backdrop",
  room_divider_masking: "Room divider / masking",
  custom: "Custom",
};

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  viewed: "Viewed",
  accepted: "Accepted",
  declined: "Declined",
  revision_requested: "Revision requested",
  expired: "Expired",
  cancelled: "Cancelled",
};

export const QUOTE_LINE_STATUS_LABELS: Record<QuoteLineStatus, string> = {
  priced: "Priced",
  included: "Included",
  pending_owner_review: "Pending owner review",
  not_priced_yet: "Not priced yet",
  requested_change: "Requested change",
  approved: "Approved",
  declined: "Declined",
  needs_measurement: "Needs measurement",
  needs_venue_confirmation: "Needs venue confirmation",
};

export const QUOTE_REQUEST_STATUS_LABELS: Record<QuoteRequestStatus, string> = {
  pending_owner_review: "Pending owner review",
  approved: "Approved",
  declined: "Declined",
  converted_to_line_item: "Converted to line item",
  needs_info: "Needs info",
};

export const DEFAULT_QUOTE_TERMS = [
  "This proposal is a planning quote based on the details shared so far.",
  "Final pricing may adjust after venue confirmation, measurements, access, and install window are verified.",
  "Availability is not guaranteed until The Curtain Guy confirms the booking.",
  "Setup, installation, and teardown are scheduled around your event timeline.",
  "Taxes or venue fees are only included when listed as line items.",
  "Currency is CAD.",
].join("\n\n");

export type QuoteRow = {
  id: string;
  estimate_request_id: string;
  opportunity_ref: string;
  revision_number: number;
  quote_display_ref: string;
  customer_name: string | null;
  customer_email: string;
  event_date: string | null;
  event_type: string | null;
  venue_name: string | null;
  city_area: string | null;
  status: QuoteStatus;
  currency: string;
  subtotal_cents: number;
  total_cents: number;
  valid_until: string | null;
  customer_notes: string | null;
  owner_notes: string | null;
  terms: string | null;
  public_token_hash: string | null;
  public_token_expires_at: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  accepted_at: string | null;
  declined_at: string | null;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
};

export type QuoteLineItemRow = {
  id: string;
  quote_id: string;
  category: QuoteLineCategory;
  description: string;
  quantity: number;
  unit_price_cents: number;
  line_total_cents: number;
  status: QuoteLineStatus;
  customer_visible: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type QuoteCustomerRequestRow = {
  id: string;
  quote_id: string;
  estimate_request_id: string;
  request_type: QuoteRequestType;
  source_key: string | null;
  title: string;
  message: string | null;
  status: QuoteRequestStatus;
  owner_response: string | null;
  created_by_email: string | null;
  created_by_user_id: string | null;
  reviewed_by_user_id: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type QuoteEventRow = {
  id: string;
  quote_id: string;
  actor_type: "owner" | "customer" | "system" | "public_link";
  actor_user_id: string | null;
  actor_email: string | null;
  event_type: QuoteEventType;
  summary: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

/** Customer-safe quote payload — never includes owner_notes, events, or token hash. */
export type CustomerSafeQuote = {
  id: string;
  estimate_request_id: string;
  opportunity_ref: string;
  revision_number: number;
  quote_display_ref: string;
  customer_name: string | null;
  customer_email: string;
  event_date: string | null;
  event_type: string | null;
  venue_name: string | null;
  city_area: string | null;
  status: QuoteStatus;
  currency: string;
  subtotal_cents: number;
  total_cents: number;
  valid_until: string | null;
  customer_notes: string | null;
  terms: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  accepted_at: string | null;
  declined_at: string | null;
  created_at: string;
  updated_at: string;
  line_items: QuoteLineItemRow[];
  requests: QuoteCustomerRequestRow[];
  share_url?: string | null;
};

export function formatCadFromCents(cents: number): string {
  const value = (Number(cents) || 0) / 100;
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(value);
}

/**
 * Customer-facing quote reference.
 * Internal revision_number 1 = original (no -R suffix).
 * revision_number 2 = first revision → Quote TCG-10004-R1
 */
export function formatQuoteDisplayRef(
  opportunityRef: string,
  revisionNumber: number
): string {
  const ref = opportunityRef.trim() || "TCG-PENDING";
  if (!Number.isFinite(revisionNumber) || revisionNumber <= 1) {
    return `Quote ${ref}`;
  }
  return `Quote ${ref}-R${revisionNumber - 1}`;
}

/** Draft admin heading — never includes -R1 for the original quote. */
export function formatDraftQuoteHeading(opportunityRef: string): string {
  const ref = opportunityRef.trim() || "TCG-PENDING";
  return `Draft Quote — ${ref}`;
}

/**
 * Resolve display ref from live opportunity + revision.
 * Prefer this over stored quote_display_ref so older "-R1" originals display correctly.
 */
export function resolveQuoteDisplayRef(quote: {
  opportunity_ref: string;
  revision_number: number;
  status?: QuoteStatus | string | null;
}): string {
  if (quote.status === "draft" && quote.revision_number <= 1) {
    return formatDraftQuoteHeading(quote.opportunity_ref);
  }
  return formatQuoteDisplayRef(quote.opportunity_ref, quote.revision_number);
}

/**
 * Metadata label: Original (or null) for first quote; Rev 1 for second version, etc.
 */
export function formatQuoteRevisionLabel(
  revisionNumber: number,
  options?: { hideOriginal?: boolean }
): string | null {
  if (!Number.isFinite(revisionNumber) || revisionNumber <= 1) {
    return options?.hideOriginal ? null : "Original";
  }
  return `Rev ${revisionNumber - 1}`;
}

/** Customer-visible revision index, or null for the original quote. */
export function getCustomerRevisionNumber(
  revisionNumber: number
): number | null {
  if (!Number.isFinite(revisionNumber) || revisionNumber <= 1) return null;
  return revisionNumber - 1;
}

/** PDF / download filename stem without the "Quote " prefix. */
export function formatQuoteFilenameStem(
  opportunityRef: string,
  revisionNumber: number
): string {
  const ref = opportunityRef.trim() || "TCG-PENDING";
  if (!Number.isFinite(revisionNumber) || revisionNumber <= 1) {
    return ref;
  }
  return `${ref}-R${revisionNumber - 1}`;
}

export function computeLineTotalCents(
  quantity: number,
  unitPriceCents: number
): number {
  const qty = Number.isFinite(quantity) ? quantity : 0;
  const unit = Number.isFinite(unitPriceCents) ? unitPriceCents : 0;
  return Math.round(qty * unit);
}

export function sumPricedSubtotalCents(items: QuoteLineItemRow[]): number {
  return items
    .filter((item) => item.status === "priced" || item.status === "included")
    .reduce((sum, item) => {
      if (item.status === "included") return sum;
      return sum + (item.line_total_cents || 0);
    }, 0);
}

export function isQuoteStatus(value: string): value is QuoteStatus {
  return (QUOTE_STATUSES as readonly string[]).includes(value);
}

export function isQuoteLineCategory(value: string): value is QuoteLineCategory {
  return (QUOTE_LINE_CATEGORIES as readonly string[]).includes(value);
}

export function isQuoteLineStatus(value: string): value is QuoteLineStatus {
  return (QUOTE_LINE_STATUSES as readonly string[]).includes(value);
}
