import {
  customerLocaleTag,
  type CustomerLanguage,
} from "@/data/customer-language";

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

const QUOTE_CATEGORY_LABELS_FR: Record<QuoteLineCategory, string> = {
  drape_rental: "Location de draperie",
  hardware: "Quincaillerie",
  installation: "Installation",
  delivery: "Livraison",
  teardown: "Démontage",
  labor: "Main-d’œuvre",
  rush_special_handling: "Urgence / manutention spéciale",
  premium_fabric: "Tissu premium",
  backdrop: "Toile de fond",
  room_divider_masking: "Séparateur / masquage",
  custom: "Sur mesure",
};

/** Suggested line descriptions when picking a category in the admin quote builder. */
export const QUOTE_CATEGORY_DEFAULT_DESCRIPTIONS: Record<
  QuoteLineCategory,
  string
> = {
  drape_rental: "Event drape rental — fabric panels for the planned layout",
  hardware: "Pipe, bases, and mounting hardware for the drape setup",
  installation: "On-site installation of draping and hardware",
  delivery: "Delivery to venue",
  teardown: "Teardown and pickup after the event",
  labor: "Crew labor for install / event support",
  rush_special_handling: "Rush timing or special handling",
  premium_fabric: "Premium fabric upgrade",
  backdrop: "Backdrop / photo wall draping",
  room_divider_masking: "Room divider or masking drapes",
  custom: "Custom draping scope",
};

export function getQuoteCategoryDefaultDescription(category: string): string {
  return isQuoteLineCategory(category)
    ? QUOTE_CATEGORY_DEFAULT_DESCRIPTIONS[category]
    : "";
}

/** True when description is empty or still the previous category’s auto-fill. */
export function shouldAutofillQuoteDescription(
  description: string,
  previousCategory: string
): boolean {
  const trimmed = description.trim();
  if (!trimmed) return true;
  return trimmed === getQuoteCategoryDefaultDescription(previousCategory);
}

/** Display name for a quote line: saved snapshot, built-in type, or prettified slug. */
export function quoteLineCategoryLabel(
  item: {
    category: string;
    category_label?: string | null;
    category_label_fr?: string | null;
  },
  language: CustomerLanguage = "en"
): string {
  if (language === "fr") {
    const snapshotFr = item.category_label_fr?.trim();
    if (snapshotFr) return snapshotFr;
    if (isQuoteLineCategory(item.category)) {
      return QUOTE_CATEGORY_LABELS_FR[item.category];
    }
  }
  const snapshot = item.category_label?.trim();
  if (snapshot) return snapshot;
  if (isQuoteLineCategory(item.category)) {
    return language === "fr"
      ? QUOTE_CATEGORY_LABELS_FR[item.category]
      : QUOTE_CATEGORY_LABELS[item.category];
  }
  const pretty = item.category.replaceAll("_", " ").trim();
  if (pretty) return pretty.charAt(0).toUpperCase() + pretty.slice(1);
  return language === "fr" ? "Article" : "Item";
}

/** Short unit forms for quotes: [singular, plural]. Unknown units show as typed. */
const QUOTE_UNIT_SHORT: Record<
  CustomerLanguage,
  Record<string, [string, string]>
> = {
  en: {
    each: ["ea", "ea"],
    "linear ft": ["ft", "ft"],
    ft: ["ft", "ft"],
    panel: ["panel", "panels"],
    set: ["set", "sets"],
    hour: ["hr", "hrs"],
    day: ["day", "days"],
    event: ["event", "events"],
  },
  fr: {
    each: ["ch.", "ch."],
    "linear ft": ["pi", "pi"],
    ft: ["pi", "pi"],
    panel: ["panneau", "panneaux"],
    set: ["ensemble", "ensembles"],
    hour: ["h", "h"],
    day: ["jour", "jours"],
    event: ["événement", "événements"],
  },
};

function normalizeQuoteUnit(unit: string | null | undefined): string {
  return unit?.trim().toLowerCase() ?? "";
}

function formatQuantityNumber(
  quantity: number,
  language: CustomerLanguage
): string {
  const rounded = Number.isInteger(quantity)
    ? quantity
    : Number(quantity.toFixed(2));
  return language === "fr"
    ? String(rounded).replace(".", ",")
    : String(rounded);
}

/** "40 ft", "2 sets", "1 event"; plain number for "each" or no unit. */
export function formatQuoteQuantity(
  quantity: number,
  unit: string | null | undefined,
  language: CustomerLanguage = "en"
): string {
  const qty = formatQuantityNumber(quantity, language);
  const key = normalizeQuoteUnit(unit);
  if (!key || key === "each") return qty;
  const short = QUOTE_UNIT_SHORT[language][key];
  const plural = language === "fr" ? quantity >= 2 : quantity !== 1;
  const label = short ? (plural ? short[1] : short[0]) : unit!.trim();
  return `${qty} ${label}`;
}

/** Suffix after a unit price: "/ ft", "/ set", "ea"; empty when no unit. */
export function formatQuoteUnitSuffix(
  unit: string | null | undefined,
  language: CustomerLanguage = "en"
): string {
  const key = normalizeQuoteUnit(unit);
  if (!key) return "";
  const units = QUOTE_UNIT_SHORT[language];
  if (key === "each") return units.each[0];
  return `/ ${units[key]?.[0] ?? unit!.trim()}`;
}

/** "$40.00 / ft" or "$20.00 ea"; plain price when no unit. */
export function formatQuoteUnitPrice(
  unitPriceCents: number,
  unit: string | null | undefined,
  language: CustomerLanguage = "en"
): string {
  const suffix = formatQuoteUnitSuffix(unit, language);
  const price = formatCadFromCents(unitPriceCents, language);
  return suffix ? `${price} ${suffix}` : price;
}

export function isValidQuoteLineCategorySlug(value: string): boolean {
  return /^[a-z0-9][a-z0-9_]*$/.test(value) && value.length <= 60;
}

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

const QUOTE_STATUS_LABELS_FR: Record<QuoteStatus, string> = {
  draft: "Brouillon",
  sent: "Envoyée",
  viewed: "Consultée",
  accepted: "Acceptée",
  declined: "Refusée",
  revision_requested: "Révision demandée",
  expired: "Expirée",
  cancelled: "Annulée",
};

const QUOTE_LINE_STATUS_LABELS_FR: Record<QuoteLineStatus, string> = {
  priced: "Tarifé",
  included: "Inclus",
  pending_owner_review: "En révision",
  not_priced_yet: "Prix à venir",
  requested_change: "Modification demandée",
  approved: "Approuvé",
  declined: "Refusé",
  needs_measurement: "Mesures requises",
  needs_venue_confirmation: "Confirmation du lieu requise",
};

const QUOTE_REQUEST_STATUS_LABELS_FR: Record<QuoteRequestStatus, string> = {
  pending_owner_review: "En révision",
  approved: "Approuvée",
  declined: "Refusée",
  converted_to_line_item: "Ajoutée à la soumission",
  needs_info: "Précisions requises",
};

export function quoteStatusLabel(
  status: QuoteStatus,
  language: CustomerLanguage = "en"
): string {
  return (language === "fr" ? QUOTE_STATUS_LABELS_FR : QUOTE_STATUS_LABELS)[
    status
  ];
}

export function quoteLineStatusLabel(
  status: QuoteLineStatus,
  language: CustomerLanguage = "en"
): string {
  return (
    language === "fr" ? QUOTE_LINE_STATUS_LABELS_FR : QUOTE_LINE_STATUS_LABELS
  )[status];
}

/**
 * A priced line at $0 reads as "Included" / "Inclus" to customers instead of
 * $0.00. Lines still awaiting a price keep their own status.
 */
export function isZeroPricedQuoteLine(item: {
  status: QuoteLineStatus | string;
  unit_price_cents: number | null | undefined;
}): boolean {
  return (
    (item.status === "priced" || item.status === "approved") &&
    (item.unit_price_cents ?? 0) === 0
  );
}

export function customerQuoteLineStatus<
  T extends { status: QuoteLineStatus; unit_price_cents: number | null | undefined },
>(item: T): QuoteLineStatus {
  return isZeroPricedQuoteLine(item) ? "included" : item.status;
}

export function quoteRequestStatusLabel(
  status: QuoteRequestStatus,
  language: CustomerLanguage = "en"
): string {
  return (
    language === "fr"
      ? QUOTE_REQUEST_STATUS_LABELS_FR
      : QUOTE_REQUEST_STATUS_LABELS
  )[status];
}

export const DEFAULT_QUOTE_TERMS_FR = [
  "Ce document est une proposition de planification fondée sur les renseignements fournis à ce jour; il ne constitue ni une facture finale ni une réservation confirmée.",
  "Le prix final peut changer après la confirmation du lieu, la prise de mesures sur place, les contraintes d’accès et la vérification des plages d’installation et de démontage.",
  "L’inventaire et l’horaire ne sont réservés qu’après la confirmation écrite de la réservation par The Curtain Guy.",
  "La livraison, l’installation et le démontage sont planifiés selon l’horaire de l’événement et peuvent nécessiter des plages d’accès convenues avec le lieu.",
  "Les taxes de vente applicables (y compris la TPS et la TVQ lorsqu’elles sont indiquées) sont incluses dans le total de la soumission, sauf indication contraire.",
  "Un dépôt ou une confirmation écrite de réservation peut être exigé avant le début de la production.",
  "Le client est responsable de l’exactitude des renseignements sur le lieu, de l’accès au débarquement et de toute règle du lieu touchant l’installation.",
].join("\n");

export const DEFAULT_QUOTE_TERMS = [
  "This document is a planning proposal based on details shared to date; it is not a final invoice or confirmed booking.",
  "Final pricing may change after venue confirmation, on-site measurements, access constraints, and install/teardown windows are verified.",
  "Inventory and scheduling are reserved only after The Curtain Guy confirms the booking in writing.",
  "Delivery, installation, and teardown are scheduled around the event timeline and may require agreed venue access windows.",
  "Applicable sales taxes (including GST/QST when shown) are included in the proposal total unless noted otherwise.",
  "A deposit or written booking confirmation may be required before production begins.",
  "The client is responsible for accurate venue details, load-in access, and any venue rules affecting installation.",
].join("\n");

/** One term per line. Numbered bullets/dashes are stripped so PDF and web match. */
export function splitQuoteTerms(
  terms: string | null | undefined,
  fallback?: string | null
): string[] {
  const raw = (terms?.trim() || fallback?.trim() || "").trim();
  if (!raw) return [];
  return raw
    .split(/\n+/)
    .map((line) => line.replace(/^[-•\d.)\s]+/, "").trim())
    .filter((line) => line.length > 0)
    .filter((line) => !/^currency is cad\.?$/i.test(line));
}
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

/** One manual tax line — rate is a decimal fraction of taxable subtotal. */
export type QuoteManualTaxLine = {
  label: string;
  rate: number;
};

export function normalizeManualTaxLines(
  value: unknown
): QuoteManualTaxLine[] {
  if (!Array.isArray(value)) return [];
  const lines: QuoteManualTaxLine[] = [];
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const record = row as Record<string, unknown>;
    const label =
      typeof record.label === "string" ? record.label.trim() : "";
    const rate = Number(record.rate);
    if (!Number.isFinite(rate) || rate < 0) continue;
    lines.push({
      label: label || "Tax",
      rate: Math.min(rate, 5), // hard cap 500%
    });
  }
  return lines;
}

/** Parse UI percent string ("13" / "9.975") into decimal rate. */
export function percentInputToRate(value: string): number {
  const n = Number.parseFloat(value.replace("%", "").trim());
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n / 100, 5);
}

/** Format decimal rate for percent inputs. */
export function rateToPercentInput(rate: number): string {
  const pct = Number((Number(rate) * 100).toFixed(4));
  if (!Number.isFinite(pct) || pct < 0) return "0";
  return Number.isInteger(pct) ? String(pct) : String(pct);
}

export function computeManualTaxLineCents(
  taxableSubtotalCents: number,
  rate: number
): number {
  const safeRate =
    Number.isFinite(rate) && rate > 0 ? Math.min(rate, 5) : 0;
  return Math.max(0, Math.round(taxableSubtotalCents * safeRate));
}

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
  /** Customer-facing language for proposal page, PDF, and emails. */
  language?: CustomerLanguage | null;
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
  /** Percentage lines for tax_mode = manual. rate is a decimal (0.13 = 13%). */
  manual_tax_lines: QuoteManualTaxLine[];
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
  accepted_by_name: string | null;
  declined_at: string | null;
  declined_by_name: string | null;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
};

export type QuoteLineItemRow = {
  id: string;
  quote_id: string;
  /** product_categories.slug or a built-in QuoteLineCategory. */
  category: string;
  category_label?: string | null;
  category_label_fr?: string | null;
  description: string;
  quantity: number;
  /** How the line is priced, e.g. "linear ft", "set". Null on older lines. */
  unit_label?: string | null;
  unit_price_cents: number;
  line_total_cents: number;
  status: QuoteLineStatus;
  customer_visible: boolean;
  is_taxable: boolean;
  tax_category: QuoteTaxCategory;
  sort_order: number;
  product_id: string | null;
  image_url: string | null;
  image_alt: string | null;
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
  language: CustomerLanguage;
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
  /** Percentage lines for tax_mode = manual. rate is a decimal (0.13 = 13%). */
  manual_tax_lines: QuoteManualTaxLine[];
  total_before_tax_cents: number;
  total_tax_cents: number;
  valid_until: string | null;
  customer_notes: string | null;
  terms: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  accepted_at: string | null;
  accepted_by_name: string | null;
  declined_at: string | null;
  declined_by_name: string | null;
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
  manual_tax_lines?: QuoteManualTaxLine[] | null;
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
  const manualLines = normalizeManualTaxLines(quote.manual_tax_lines);
  const legacyManualTaxCents = Math.max(
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
    if (manualLines.length > 0) {
      appliedManual = manualLines.reduce(
        (sum, line) =>
          sum + computeManualTaxLineCents(taxable, line.rate),
        0
      );
    } else {
      // Legacy fixed-dollar manual tax
      appliedManual = legacyManualTaxCents;
    }
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

function formatTaxPercent(
  rate: number,
  language: CustomerLanguage = "en"
): string {
  const pct = Number((Number(rate) * 100).toFixed(3));
  return language === "fr"
    ? `${String(pct).replace(".", ",")} %`
    : `${pct}%`;
}

const TAX_ROW_LABELS: Record<
  CustomerLanguage,
  {
    subtotal: string;
    taxable: string;
    nontaxable: string;
    gst: string;
    qst: string;
    tax: string;
    total: string;
  }
> = {
  en: {
    subtotal: "Subtotal",
    taxable: "Taxable subtotal",
    nontaxable: "Non-taxable subtotal",
    gst: "GST",
    qst: "QST",
    tax: "Tax",
    total: "Total CAD",
  },
  fr: {
    subtotal: "Sous-total",
    taxable: "Sous-total taxable",
    nontaxable: "Sous-total non taxable",
    gst: "TPS",
    qst: "TVQ",
    tax: "Taxe",
    total: "Total ($ CA)",
  },
};

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
    | "manual_tax_lines"
    | "total_cents"
  >,
  options?: { variant?: "admin" | "customer"; language?: CustomerLanguage }
): QuoteTaxBreakdownRow[] {
  const variant = options?.variant ?? "customer";
  const language = options?.language ?? "en";
  const labels = TAX_ROW_LABELS[language];
  const taxMode = isQuoteTaxMode(quote.tax_mode || "")
    ? quote.tax_mode
    : "none";
  const rows: QuoteTaxBreakdownRow[] = [
    {
      key: "subtotal",
      label: labels.subtotal,
      amountCents: quote.subtotal_cents || 0,
    },
  ];

  if (taxMode === "quebec_gst_qst") {
    const showSplit =
      variant === "admin" || (quote.nontaxable_subtotal_cents || 0) > 0;
    if (showSplit) {
      rows.push({
        key: "taxable",
        label: labels.taxable,
        amountCents: quote.taxable_subtotal_cents || 0,
        emphasis: "muted",
      });
      if ((quote.nontaxable_subtotal_cents || 0) > 0) {
        rows.push({
          key: "nontaxable",
          label: labels.nontaxable,
          amountCents: quote.nontaxable_subtotal_cents || 0,
          emphasis: "muted",
        });
      }
    }
    rows.push(
      {
        key: "gst",
        label: `${labels.gst} ${formatTaxPercent(Number(quote.gst_rate) || DEFAULT_GST_RATE, language)}`,
        amountCents: quote.gst_cents || 0,
      },
      {
        key: "qst",
        label: `${labels.qst} ${formatTaxPercent(Number(quote.qst_rate) || DEFAULT_QST_RATE, language)}`,
        amountCents: quote.qst_cents || 0,
      }
    );
  } else if (taxMode === "manual") {
    const taxable = quote.taxable_subtotal_cents || 0;
    const manualLines = normalizeManualTaxLines(quote.manual_tax_lines);
    if (manualLines.length > 0) {
      if (variant === "admin" || (quote.nontaxable_subtotal_cents || 0) > 0) {
        rows.push({
          key: "taxable",
          label: labels.taxable,
          amountCents: taxable,
          emphasis: "muted",
        });
      }
      manualLines.forEach((line, index) => {
        rows.push({
          key: `manual-${index}`,
          label: `${line.label} ${formatTaxPercent(line.rate, language)}`,
          amountCents: computeManualTaxLineCents(taxable, line.rate),
        });
      });
    } else {
      rows.push({
        key: "manual",
        label: (quote.manual_tax_label || labels.tax).trim() || labels.tax,
        amountCents: quote.manual_tax_cents || 0,
      });
    }
  }

  rows.push({
    key: "total",
    label: labels.total,
    amountCents: quote.total_cents || 0,
    emphasis: "total",
  });

  return rows;
}

export function formatCadFromCents(
  cents: number,
  language: CustomerLanguage = "en"
): string {
  const value = (Number(cents) || 0) / 100;
  return new Intl.NumberFormat(customerLocaleTag(language), {
    style: "currency",
    currency: "CAD",
  }).format(value);
}

/**
 * Customer-facing quote reference.
 * Internal revision_number 1 = original (no -R suffix).
 * revision_number 2 = first revision → Quote TCG-10004-R1 / Soumission TCG-10004-R1
 */
export function formatQuoteDisplayRef(
  opportunityRef: string,
  revisionNumber: number,
  language: CustomerLanguage = "en"
): string {
  const ref = opportunityRef.trim() || "TCG-PENDING";
  const word = language === "fr" ? "Soumission" : "Quote";
  if (!Number.isFinite(revisionNumber) || revisionNumber <= 1) {
    return `${word} ${ref}`;
  }
  return `${word} ${ref}-R${revisionNumber - 1}`;
}

/** Reference the customer sees — never the admin "Draft Quote" heading. */
export function customerQuoteDisplayRef(quote: {
  opportunity_ref: string;
  revision_number: number;
  language?: CustomerLanguage | null;
}): string {
  return formatQuoteDisplayRef(
    quote.opportunity_ref,
    quote.revision_number,
    quote.language ?? "en"
  );
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
