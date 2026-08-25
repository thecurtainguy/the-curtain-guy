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
  "Applicable sales tax is shown in the proposal total when included.",
  "Currency is CAD.",
].join("\n\n");

export const QUOTE_TAX_MODES = ["quebec_gst_qst", "none", "manual"] as const;
export type QuoteTaxMode = (typeof QUOTE_TAX_MODES)[number];

export const QUOTE_TAX_MODE_LABELS: Record<QuoteTaxMode, string> = {
  quebec_gst_qst: "Quebec GST/QST",
  none: "No tax",
  manual: "Manual tax",
};

export const QUOTE_TAX_CATEGORIES = ["standard", "exempt", "custom"] as const;
export type QuoteTaxCategory = (typeof QUOTE_TAX_CATEGORIES)[number];

export const DEFAULT_GST_RATE = 0.05;
export const DEFAULT_QST_RATE = 0.09975;

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
  tax_mode: QuoteTaxMode;
  gst_rate: number;
  qst_rate: number;
  taxable_subtotal_cents: number;
  nontaxable_subtotal_cents: number;
  gst_cents: number;
  qst_cents: number;
  manual_tax_label: string | null;
  manual_tax_cents: number;
  total_before_tax_cents: number;
  total_tax_cents: number;
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
  is_taxable: boolean;
  tax_category: QuoteTaxCategory;
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
  tax_mode: QuoteTaxMode;
  gst_rate: number;
  qst_rate: number;
  taxable_subtotal_cents: number;
  nontaxable_subtotal_cents: number;
  gst_cents: number;
  qst_cents: number;
  manual_tax_label: string | null;
  manual_tax_cents: number;
  total_before_tax_cents: number;
  total_tax_cents: number;
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

export type QuoteTaxTotalsInput = {
  tax_mode?: QuoteTaxMode | string | null;
  gst_rate?: number | null;
  qst_rate?: number | null;
  manual_tax_cents?: number | null;
};

export type QuoteTaxTotals = {
  subtotal_cents: number;
  taxable_subtotal_cents: number;
  nontaxable_subtotal_cents: number;
  gst_cents: number;
  qst_cents: number;
  manual_tax_cents: number;
  total_before_tax_cents: number;
  total_tax_cents: number;
  total_cents: number;
};

export type QuoteTaxBreakdownRow = {
  key: string;
  label: string;
  amountCents: number;
  emphasis?: "muted" | "total";
};

/**
 * Compute quote totals from priced line items + tax mode.
 * GST/QST round per-tax from taxable subtotal only.
 */
export function computeQuoteTaxTotals(
  items: Array<
    Pick<QuoteLineItemRow, "status" | "line_total_cents" | "is_taxable">
  >,
  quote: QuoteTaxTotalsInput = {}
): QuoteTaxTotals {
  const rawMode = quote.tax_mode || "quebec_gst_qst";
  const taxMode: QuoteTaxMode = isQuoteTaxMode(rawMode)
    ? rawMode
    : "quebec_gst_qst";
  const gstRate =
    Number.isFinite(Number(quote.gst_rate)) && Number(quote.gst_rate) >= 0
      ? Number(quote.gst_rate)
      : DEFAULT_GST_RATE;
  const qstRate =
    Number.isFinite(Number(quote.qst_rate)) && Number(quote.qst_rate) >= 0
      ? Number(quote.qst_rate)
      : DEFAULT_QST_RATE;
  const manualTaxCents = Math.max(
    0,
    Math.round(Number(quote.manual_tax_cents) || 0)
  );

  let subtotal = 0;
  let taxable = 0;
  let nontaxable = 0;

  for (const item of items) {
    if (item.status !== "priced" && item.status !== "included") continue;
    if (item.status === "included") continue;
    const lineTotal = Number(item.line_total_cents) || 0;
    subtotal += lineTotal;
    if (item.is_taxable !== false) {
      taxable += lineTotal;
    } else {
      nontaxable += lineTotal;
    }
  }

  let gstCents = 0;
  let qstCents = 0;
  let appliedManual = 0;
  let totalTax = 0;

  if (taxMode === "quebec_gst_qst") {
    gstCents = Math.round(taxable * gstRate);
    qstCents = Math.round(taxable * qstRate);
    totalTax = gstCents + qstCents;
  } else if (taxMode === "manual") {
    appliedManual = manualTaxCents;
    totalTax = appliedManual;
  }

  return {
    subtotal_cents: subtotal,
    taxable_subtotal_cents: taxable,
    nontaxable_subtotal_cents: nontaxable,
    gst_cents: gstCents,
    qst_cents: qstCents,
    manual_tax_cents: appliedManual,
    total_before_tax_cents: subtotal,
    total_tax_cents: totalTax,
    total_cents: subtotal + totalTax,
  };
}

function formatTaxPercent(rate: number): string {
  const pct = Number((Number(rate) * 100).toFixed(3));
  const label = Number.isInteger(pct) ? String(pct) : String(pct);
  return `${label}%`;
}

export function isQuoteTaxMode(value: string): value is QuoteTaxMode {
  return (QUOTE_TAX_MODES as readonly string[]).includes(value);
}

export function isQuoteTaxCategory(value: string): value is QuoteTaxCategory {
  return (QUOTE_TAX_CATEGORIES as readonly string[]).includes(value);
}

/** Shared tax rows for admin, customer proposal, PDF, and email. */
export function getQuoteTaxBreakdownRows(
  quote: Pick<
    QuoteRow,
    | "tax_mode"
    | "subtotal_cents"
    | "taxable_subtotal_cents"
    | "nontaxable_subtotal_cents"
    | "gst_cents"
    | "qst_cents"
    | "gst_rate"
    | "qst_rate"
    | "manual_tax_label"
    | "manual_tax_cents"
    | "total_cents"
  >,
  options?: { variant?: "admin" | "customer" }
): QuoteTaxBreakdownRow[] {
  const variant = options?.variant ?? "customer";
  const taxMode = isQuoteTaxMode(quote.tax_mode || "")
    ? quote.tax_mode
    : "none";
  const rows: QuoteTaxBreakdownRow[] = [
    {
      key: "subtotal",
      label: "Subtotal",
      amountCents: quote.subtotal_cents || 0,
    },
  ];

  if (taxMode === "quebec_gst_qst") {
    const showSplit =
      variant === "admin" || (quote.nontaxable_subtotal_cents || 0) > 0;
    if (showSplit) {
      rows.push({
        key: "taxable",
        label: "Taxable subtotal",
        amountCents: quote.taxable_subtotal_cents || 0,
        emphasis: "muted",
      });
      if ((quote.nontaxable_subtotal_cents || 0) > 0) {
        rows.push({
          key: "nontaxable",
          label: "Non-taxable subtotal",
          amountCents: quote.nontaxable_subtotal_cents || 0,
          emphasis: "muted",
        });
      }
    }
    rows.push(
      {
        key: "gst",
        label: `GST ${formatTaxPercent(Number(quote.gst_rate) || DEFAULT_GST_RATE)}`,
        amountCents: quote.gst_cents || 0,
      },
      {
        key: "qst",
        label: `QST ${formatTaxPercent(Number(quote.qst_rate) || DEFAULT_QST_RATE)}`,
        amountCents: quote.qst_cents || 0,
      }
    );
  } else if (taxMode === "manual") {
    rows.push({
      key: "manual",
      label: (quote.manual_tax_label || "Tax").trim() || "Tax",
      amountCents: quote.manual_tax_cents || 0,
    });
  }

  rows.push({
    key: "total",
    label: "Total CAD",
    amountCents: quote.total_cents || 0,
    emphasis: "total",
  });

  return rows;
}

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
