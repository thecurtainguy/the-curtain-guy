import type { CustomerLanguage } from "@/data/customer-language";
import type { BalanceDueRule } from "@/data/invoices";

export const CUSTOMER_KINDS = ["individual", "company", "planner", "venue", "corporate"] as const;
export type CustomerKind = (typeof CUSTOMER_KINDS)[number];

export const CUSTOMER_KIND_LABELS: Record<CustomerKind, string> = {
  individual: "Individual",
  company: "Company",
  planner: "Event planner",
  venue: "Venue partner",
  corporate: "Corporate",
};

export const CUSTOMER_KIND_DESCRIPTIONS: Record<CustomerKind, string> = {
  individual: "Couples, families, private hosts",
  company: "Businesses booking their own events",
  planner: "Planners booking for their clients",
  venue: "Halls and venues that refer or rebook",
  corporate: "Large accounts, POs and AP departments",
};

export const CONTACT_ROLES = [
  "billing",
  "event_day",
  "planner",
  "decision_maker",
  "assistant",
  "other",
] as const;
export type ContactRole = (typeof CONTACT_ROLES)[number];

export const CONTACT_ROLE_LABELS: Record<ContactRole, string> = {
  billing: "Billing / accounting",
  event_day: "Event-day contact",
  planner: "Planner",
  decision_maker: "Decision maker",
  assistant: "Assistant",
  other: "Other",
};

export const CUSTOMER_CURRENCIES = ["CAD", "USD"] as const;
export type CustomerCurrency = (typeof CUSTOMER_CURRENCIES)[number];

export type CustomerStatus = "active" | "archived";

export type CustomerRow = {
  id: string;
  customer_number: number;
  kind: CustomerKind;
  status: CustomerStatus;
  display_name: string;
  company_name: string | null;
  legal_name: string | null;
  primary_email: string;
  phone: string | null;
  website: string | null;
  preferred_language: CustomerLanguage;
  user_id: string | null;
  portal_invited_at: string | null;
  billing_address_line1: string | null;
  billing_address_line2: string | null;
  billing_city: string | null;
  billing_province: string | null;
  billing_postal_code: string | null;
  billing_country: string;
  tax_exempt: boolean;
  tax_exempt_reason: string | null;
  gst_number: string | null;
  qst_number: string | null;
  po_required: boolean;
  default_po_number: string | null;
  currency: CustomerCurrency;
  preferred_payment_method: string | null;
  default_deposit_percent: number | null;
  balance_due_rule: BalanceDueRule | null;
  balance_due_days: number | null;
  tags: string[];
  source: string | null;
  internal_notes: string | null;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
};

export type CustomerContactRow = {
  id: string;
  customer_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  role: ContactRole;
  cc_invoices: boolean;
  cc_quotes: boolean;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type CustomerVenueRow = {
  id: string;
  customer_id: string;
  name: string;
  address: string | null;
  city: string | null;
  region: string | null;
  postal_code: string | null;
  country: string;
  access_notes: string | null;
  loading_notes: string | null;
  parking_notes: string | null;
  elevator_notes: string | null;
  room_notes: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type VenueAddressParts = {
  address?: string | null;
  city?: string | null;
  region?: string | null;
  postal_code?: string | null;
  country?: string | null;
};

/** One-line venue address for documents, e.g. "1234 Rue Sherbrooke O, Montréal, QC H3A 1B1". */
export function formatVenueAddress(parts: VenueAddressParts): string {
  const street = parts.address?.trim() || "";
  const city = parts.city?.trim() || "";
  const regionPostal = [parts.region?.trim(), parts.postal_code?.trim()].filter(Boolean).join(" ");
  const country = parts.country?.trim() || "";
  const streetLower = street.toLowerCase();
  return [
    street,
    city && !streetLower.includes(city.toLowerCase()) ? city : "",
    regionPostal && !streetLower.includes(regionPostal.toLowerCase()) ? regionPostal : "",
    country && country.toLowerCase() !== "canada" ? country : "",
  ]
    .filter(Boolean)
    .join(", ");
}

export type CustomerEventRow = {
  id: string;
  customer_id: string | null;
  customer_number: number | null;
  customer_name: string | null;
  actor_type: "owner" | "customer" | "system";
  actor_user_id: string | null;
  actor_email: string | null;
  event_type: string;
  summary: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type CustomerFieldChange = {
  field: string;
  label: string;
  from: string | null;
  to: string | null;
};

/** Money + activity rollup shown on the list and detail header. */
export type CustomerStats = {
  estimates: number;
  quotes: number;
  jobs: number;
  invoices: number;
  lifetimePaidCents: number;
  outstandingCents: number;
  overdueCents: number;
  overdueInvoices: number;
  nextEventDate: string | null;
  lastEventDate: string | null;
  lastActivityAt: string | null;
  isClient: boolean;
};

export const EMPTY_CUSTOMER_STATS: CustomerStats = {
  estimates: 0,
  quotes: 0,
  jobs: 0,
  invoices: 0,
  lifetimePaidCents: 0,
  outstandingCents: 0,
  overdueCents: 0,
  overdueInvoices: 0,
  nextEventDate: null,
  lastEventDate: null,
  lastActivityAt: null,
  isClient: false,
};

export function formatCustomerNumber(value: number | null | undefined): string {
  return value ? `C-${value}` : "C-—";
}

export function isCustomerKind(value: unknown): value is CustomerKind {
  return typeof value === "string" && (CUSTOMER_KINDS as readonly string[]).includes(value);
}

export function isContactRole(value: unknown): value is ContactRole {
  return typeof value === "string" && (CONTACT_ROLES as readonly string[]).includes(value);
}

export function isCustomerCurrency(value: unknown): value is CustomerCurrency {
  return value === "CAD" || value === "USD";
}

/** Multi-line billing address for invoices ("Bill to"). */
export function formatCustomerBillingAddress(
  customer: Pick<
    CustomerRow,
    | "billing_address_line1"
    | "billing_address_line2"
    | "billing_city"
    | "billing_province"
    | "billing_postal_code"
    | "billing_country"
  >
): string {
  const cityLine = [
    [customer.billing_city, customer.billing_province].filter((part) => part?.trim()).join(", "),
    customer.billing_postal_code?.trim(),
  ]
    .filter(Boolean)
    .join("  ");
  const country = customer.billing_country?.trim();
  return [
    customer.billing_address_line1?.trim(),
    customer.billing_address_line2?.trim(),
    cityLine,
    country && country.toLowerCase() !== "canada" ? country : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export function customerHasBillingAddress(customer: Parameters<typeof formatCustomerBillingAddress>[0]): boolean {
  return formatCustomerBillingAddress(customer).length > 0;
}

/** Emails to Cc automatically when sending a document to this customer. */
export function customerCcEmails(
  contacts: Pick<CustomerContactRow, "email" | "cc_invoices" | "cc_quotes">[],
  kind: "invoices" | "quotes",
  exclude: Array<string | null | undefined> = []
): string[] {
  const skip = new Set(exclude.map((email) => (email || "").trim().toLowerCase()).filter(Boolean));
  const out: string[] = [];
  for (const contact of contacts) {
    const email = (contact.email || "").trim().toLowerCase();
    const wanted = kind === "invoices" ? contact.cc_invoices : contact.cc_quotes;
    if (!email || !wanted || skip.has(email)) continue;
    skip.add(email);
    out.push(email);
  }
  return out;
}

/** Compact customer info passed to quote / invoice / job pages. */
/** A person who can be the named contact on a quote: the primary contact plus extra contacts with an email. */
export type CustomerContactOption = {
  id: string;
  name: string;
  email: string;
  title: string | null;
  role: ContactRole | null;
  primary: boolean;
};

export type CustomerLinkSummary = {
  id: string;
  customer_number: number;
  display_name: string;
  company_name: string | null;
  primary_email: string;
  kind: CustomerKind;
  preferred_language: CustomerLanguage;
  po_required: boolean;
  default_po_number: string | null;
  tax_exempt: boolean;
  currency: CustomerCurrency;
  preferred_payment_method: string | null;
  invoiceCc: string[];
  quoteCc: string[];
  venues: CustomerVenueRow[];
  contactOptions: CustomerContactOption[];
};
