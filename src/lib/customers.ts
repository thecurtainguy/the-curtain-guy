import { isCustomerLanguage, normalizeCustomerLanguage, type CustomerLanguage } from "@/data/customer-language";
import {
  CONTACT_ROLE_LABELS,
  CUSTOMER_KIND_LABELS,
  EMPTY_CUSTOMER_STATS,
  customerCcEmails,
  formatCustomerBillingAddress,
  isContactRole,
  isCustomerCurrency,
  isCustomerKind,
  type CustomerContactOption,
  type CustomerContactRow,
  type CustomerEventRow,
  type CustomerFieldChange,
  type CustomerLinkSummary,
  type CustomerRow,
  type CustomerStats,
  type CustomerVenueRow,
} from "@/data/customers";
import {
  isBalanceDueRule,
  isInvoiceOverdue,
  type InvoicePaymentRow,
  type InvoiceRow,
  type InvoiceStatus,
} from "@/data/invoices";
import { formatCadFromCents, type QuoteRow } from "@/data/quotes";
import type { EventJobRow } from "@/data/jobs";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const OPEN_QUOTE_STATUSES = ["draft", "sent", "viewed", "revision_requested", "accepted"] as const;
const OPEN_INVOICE_STATUSES: InvoiceStatus[] = ["draft", "sent", "partially_paid"];

type Actor = { userId: string | null; email?: string | null };

function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function looksLikeEmail(value: string): boolean {
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value);
}

function cleanText(value: unknown, max = 500): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

export function normalizeCustomerRow(row: Record<string, unknown>): CustomerRow {
  const r = row as unknown as CustomerRow;
  return {
    ...r,
    preferred_language: normalizeCustomerLanguage(r.preferred_language),
    default_deposit_percent:
      r.default_deposit_percent === null || r.default_deposit_percent === undefined
        ? null
        : Number(r.default_deposit_percent),
    tags: Array.isArray(r.tags) ? r.tags : [],
  };
}

// ---------------------------------------------------------------------------
// Audit trail
// ---------------------------------------------------------------------------

export async function logCustomerEvent(input: {
  customerId: string | null;
  actorType?: CustomerEventRow["actor_type"];
  actorUserId?: string | null;
  eventType: string;
  summary: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const admin = createAdminSupabaseClient();
  const { error } = await admin.from("customer_events").insert({
    customer_id: input.customerId,
    actor_type: input.actorType ?? "owner",
    actor_user_id: input.actorUserId ?? null,
    event_type: input.eventType,
    summary: input.summary,
    metadata: input.metadata ?? {},
  });
  if (error) console.error("[customers] logCustomerEvent", error);
}

export async function listCustomerEvents(customerId: string, limit = 200): Promise<CustomerEventRow[]> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("customer_events")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) console.error("[customers] listCustomerEvents", error);
  return (data ?? []) as CustomerEventRow[];
}

const FIELD_LABELS: Record<string, string> = {
  kind: "Type",
  status: "Status",
  display_name: "Name",
  company_name: "Company",
  legal_name: "Legal name",
  primary_email: "Email",
  phone: "Phone",
  website: "Website",
  preferred_language: "Language",
  billing_address_line1: "Billing address",
  billing_address_line2: "Billing address line 2",
  billing_city: "Billing city",
  billing_province: "Billing province",
  billing_postal_code: "Billing postal code",
  billing_country: "Billing country",
  tax_exempt: "Tax exempt",
  tax_exempt_reason: "Tax exemption reason",
  gst_number: "Client GST #",
  qst_number: "Client QST #",
  po_required: "PO required",
  default_po_number: "Default PO #",
  currency: "Currency",
  preferred_payment_method: "Preferred payment method",
  default_deposit_percent: "Deposit %",
  balance_due_rule: "Balance due rule",
  balance_due_days: "Balance due days",
  tags: "Tags",
  source: "Source",
  internal_notes: "Internal notes",
};

function auditValue(field: string, value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.length ? value.join(", ") : null;
  if (field === "kind" && isCustomerKind(value)) return CUSTOMER_KIND_LABELS[value];
  if (field === "preferred_language" && isCustomerLanguage(value)) {
    return value === "fr" ? "Français" : "English";
  }
  if (field === "default_deposit_percent") return `${Number(value)}%`;
  const text = String(value);
  return text.length > 300 ? `${text.slice(0, 300)}…` : text;
}

function diffFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  fields: string[]
): CustomerFieldChange[] {
  const changes: CustomerFieldChange[] = [];
  for (const field of fields) {
    const from = auditValue(field, before[field]);
    const to = auditValue(field, after[field]);
    if (from !== to) changes.push({ field, label: FIELD_LABELS[field] ?? field, from, to });
  }
  return changes;
}

function describeChanges(changes: CustomerFieldChange[]): string {
  return changes.map((c) => c.label).join(", ");
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function fetchCustomerById(id: string): Promise<CustomerRow | null> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin.from("customers").select("*").eq("id", id).maybeSingle();
  if (error) console.error("[customers] fetchCustomerById", error);
  return data ? normalizeCustomerRow(data) : null;
}

export async function findCustomerByEmail(email: string): Promise<CustomerRow | null> {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("customers")
    .select("*")
    .eq("primary_email", normalized)
    .maybeSingle();
  if (data) return normalizeCustomerRow(data);
  const { data: contact } = await admin
    .from("customer_contacts")
    .select("customer_id")
    .eq("email", normalized)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return contact?.customer_id ? fetchCustomerById(contact.customer_id as string) : null;
}

export async function listCustomers(): Promise<CustomerRow[]> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("customers")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5000);
  if (error) console.error("[customers] listCustomers", error);
  return (data ?? []).map((row) => normalizeCustomerRow(row));
}

export async function searchCustomers(query: string, limit = 12): Promise<CustomerRow[]> {
  const q = query.trim().replace(/[%_,()]/g, " ").trim();
  const admin = createAdminSupabaseClient();
  let request = admin
    .from("customers")
    .select("*")
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (q) {
    const numeric = q.replace(/^c-?/i, "");
    const filters = [
      `display_name.ilike.%${q}%`,
      `company_name.ilike.%${q}%`,
      `primary_email.ilike.%${q}%`,
      `phone.ilike.%${q}%`,
    ];
    if (/^\d+$/.test(numeric)) filters.push(`customer_number.eq.${numeric}`);
    request = request.or(filters.join(","));
  }
  const { data, error } = await request;
  if (error) console.error("[customers] searchCustomers", error);
  return (data ?? []).map((row) => normalizeCustomerRow(row));
}

type StatInvoice = Pick<
  InvoiceRow,
  "customer_id" | "status" | "due_date" | "balance_due_cents" | "amount_paid_cents" | "created_at" | "updated_at"
>;
type StatJob = Pick<EventJobRow, "customer_id" | "event_date" | "status" | "created_at" | "updated_at">;
type StatQuote = Pick<QuoteRow, "customer_id" | "status" | "created_at" | "updated_at">;
type StatEstimate = { customer_id: string | null; created_at: string };

function laterOf(a: string | null, b: string | null | undefined): string | null {
  if (!b) return a;
  if (!a) return b;
  return b > a ? b : a;
}

function buildStats(
  invoices: StatInvoice[],
  jobs: StatJob[],
  quotes: StatQuote[],
  estimates: StatEstimate[],
  today: string
): Map<string, CustomerStats> {
  const map = new Map<string, CustomerStats>();
  const get = (id: string) => {
    let stats = map.get(id);
    if (!stats) {
      stats = { ...EMPTY_CUSTOMER_STATS };
      map.set(id, stats);
    }
    return stats;
  };

  for (const row of estimates) {
    if (!row.customer_id) continue;
    const s = get(row.customer_id);
    s.estimates += 1;
    s.lastActivityAt = laterOf(s.lastActivityAt, row.created_at);
  }
  for (const row of quotes) {
    if (!row.customer_id) continue;
    const s = get(row.customer_id);
    s.quotes += 1;
    if (row.status === "accepted") s.isClient = true;
    s.lastActivityAt = laterOf(s.lastActivityAt, row.updated_at);
  }
  for (const row of jobs) {
    if (!row.customer_id) continue;
    const s = get(row.customer_id);
    s.jobs += 1;
    s.isClient = true;
    s.lastActivityAt = laterOf(s.lastActivityAt, row.updated_at);
    if (row.event_date && row.status !== "cancelled") {
      if (row.event_date >= today) {
        if (!s.nextEventDate || row.event_date < s.nextEventDate) s.nextEventDate = row.event_date;
      } else if (!s.lastEventDate || row.event_date > s.lastEventDate) {
        s.lastEventDate = row.event_date;
      }
    }
  }
  for (const row of invoices) {
    if (!row.customer_id) continue;
    const s = get(row.customer_id);
    s.lastActivityAt = laterOf(s.lastActivityAt, row.updated_at);
    if (row.status === "void") continue;
    s.invoices += 1;
    s.isClient = true;
    s.lifetimePaidCents += row.amount_paid_cents;
    if (row.status !== "draft" && row.balance_due_cents > 0) {
      s.outstandingCents += row.balance_due_cents;
      if (isInvoiceOverdue(row, today)) {
        s.overdueCents += row.balance_due_cents;
        s.overdueInvoices += 1;
      }
    }
  }
  return map;
}

function todayInToronto(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export async function computeCustomerStats(customerIds?: string[]): Promise<Map<string, CustomerStats>> {
  const admin = createAdminSupabaseClient();
  const scoped = (table: string, columns: string) => {
    const query = admin.from(table).select(columns).limit(10000);
    return customerIds ? query.in("customer_id", customerIds) : query.not("customer_id", "is", null);
  };

  const [invoices, jobs, quotes, estimates] = await Promise.all([
    scoped("invoices", "customer_id, status, due_date, balance_due_cents, amount_paid_cents, created_at, updated_at"),
    scoped("event_jobs", "customer_id, event_date, status, created_at, updated_at"),
    scoped("quotes", "customer_id, status, created_at, updated_at"),
    scoped("estimate_requests", "customer_id, created_at"),
  ]);
  return buildStats(
    (invoices.data ?? []) as unknown as StatInvoice[],
    (jobs.data ?? []) as unknown as StatJob[],
    (quotes.data ?? []) as unknown as StatQuote[],
    (estimates.data ?? []) as unknown as StatEstimate[],
    todayInToronto()
  );
}

export type CustomerListItem = CustomerRow & { stats: CustomerStats; contact_count: number };

export async function listCustomersWithStats(): Promise<CustomerListItem[]> {
  const admin = createAdminSupabaseClient();
  const [customers, stats, contacts] = await Promise.all([
    listCustomers(),
    computeCustomerStats(),
    admin.from("customer_contacts").select("customer_id").limit(10000),
  ]);
  const contactCounts = new Map<string, number>();
  for (const row of (contacts.data ?? []) as { customer_id: string }[]) {
    contactCounts.set(row.customer_id, (contactCounts.get(row.customer_id) ?? 0) + 1);
  }
  return customers.map((customer) => ({
    ...customer,
    stats: stats.get(customer.id) ?? { ...EMPTY_CUSTOMER_STATS },
    contact_count: contactCounts.get(customer.id) ?? 0,
  }));
}

export async function listCustomerContacts(customerId: string): Promise<CustomerContactRow[]> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("customer_contacts")
    .select("*")
    .eq("customer_id", customerId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) console.error("[customers] listCustomerContacts", error);
  return (data ?? []) as CustomerContactRow[];
}

export async function listCustomerVenues(customerId: string): Promise<CustomerVenueRow[]> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("customer_venues")
    .select("*")
    .eq("customer_id", customerId)
    .order("name", { ascending: true });
  if (error) console.error("[customers] listCustomerVenues", error);
  return (data ?? []) as CustomerVenueRow[];
}

export type CustomerHistory = {
  estimates: Array<{
    id: string;
    opportunity_ref: string | null;
    status: string;
    event_type: string | null;
    event_date: string | null;
    created_at: string;
    source: string;
  }>;
  quotes: Array<
    Pick<
      QuoteRow,
      | "id"
      | "quote_display_ref"
      | "opportunity_ref"
      | "revision_number"
      | "status"
      | "total_cents"
      | "event_date"
      | "language"
      | "currency"
      | "created_at"
      | "updated_at"
    >
  >;
  jobs: Array<
    Pick<EventJobRow, "id" | "opportunity_ref" | "status" | "event_date" | "event_type" | "venue_name" | "created_at">
  >;
  invoices: InvoiceRow[];
  payments: Array<InvoicePaymentRow & { invoice_number: string }>;
  studioDesigns: Array<{ id: string; title: string; status: string; event_date: string | null; created_at: string }>;
  eventPlans: Array<{ id: string; reference: string; status: string; event_date: string | null; created_at: string }>;
};

export async function fetchCustomerHistory(customerId: string): Promise<CustomerHistory> {
  const admin = createAdminSupabaseClient();
  const [estimates, quotes, jobs, invoices, studio, plans] = await Promise.all([
    admin
      .from("estimate_requests")
      .select("id, opportunity_ref, status, event_type, event_date, created_at, source")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false }),
    admin
      .from("quotes")
      .select("id, quote_display_ref, opportunity_ref, revision_number, status, total_cents, currency, event_date, language, created_at, updated_at")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false }),
    admin
      .from("event_jobs")
      .select("id, opportunity_ref, status, event_date, event_type, venue_name, created_at")
      .eq("customer_id", customerId)
      .order("event_date", { ascending: false, nullsFirst: false }),
    admin
      .from("invoices")
      .select("*")
      .eq("customer_id", customerId)
      .order("issue_date", { ascending: false }),
    admin
      .from("studio_designs")
      .select("id, title, status, event_date, created_at")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false }),
    admin
      .from("event_plan_submissions")
      .select("id, reference, status, event_date, created_at")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false }),
  ]);

  const invoiceRows = (invoices.data ?? []).map((row) => ({
    ...(row as unknown as InvoiceRow),
    language: normalizeCustomerLanguage((row as { language?: string }).language),
  }));
  const invoiceNumbers = new Map(invoiceRows.map((inv) => [inv.id, inv.invoice_number]));
  let payments: CustomerHistory["payments"] = [];
  if (invoiceRows.length > 0) {
    const { data } = await admin
      .from("invoice_payments")
      .select("*")
      .in("invoice_id", invoiceRows.map((inv) => inv.id))
      .order("paid_on", { ascending: false });
    payments = ((data ?? []) as InvoicePaymentRow[]).map((payment) => ({
      ...payment,
      invoice_number: invoiceNumbers.get(payment.invoice_id) ?? "",
    }));
  }

  return {
    estimates: (estimates.data ?? []) as CustomerHistory["estimates"],
    quotes: (quotes.data ?? []) as CustomerHistory["quotes"],
    jobs: (jobs.data ?? []) as CustomerHistory["jobs"],
    invoices: invoiceRows,
    payments,
    studioDesigns: (studio.data ?? []) as CustomerHistory["studioDesigns"],
    eventPlans: (plans.data ?? []) as CustomerHistory["eventPlans"],
  };
}

export type CustomerPortalStatus = {
  hasAccount: boolean;
  email: string | null;
  lastSignInAt: string | null;
  emailConfirmed: boolean;
  invitedAt: string | null;
};

export async function getCustomerPortalStatus(customer: CustomerRow): Promise<CustomerPortalStatus> {
  const base: CustomerPortalStatus = {
    hasAccount: false,
    email: null,
    lastSignInAt: null,
    emailConfirmed: false,
    invitedAt: customer.portal_invited_at,
  };
  if (!customer.user_id) return base;
  try {
    const admin = createAdminSupabaseClient();
    const { data } = await admin.auth.admin.getUserById(customer.user_id);
    const user = data.user;
    if (!user) return base;
    return {
      ...base,
      hasAccount: true,
      email: user.email ?? null,
      lastSignInAt: user.last_sign_in_at ?? null,
      emailConfirmed: Boolean(user.email_confirmed_at),
    };
  } catch (error) {
    console.error("[customers] portal status", error);
    return { ...base, hasAccount: true };
  }
}

/** Customer defaults needed on quote / invoice / job pages. */
export async function getCustomerLinkSummary(
  customerId: string | null | undefined,
  options?: { excludeEmails?: Array<string | null | undefined> }
): Promise<CustomerLinkSummary | null> {
  if (!customerId) return null;
  const [customer, contacts, venues] = await Promise.all([
    fetchCustomerById(customerId),
    listCustomerContacts(customerId),
    listCustomerVenues(customerId),
  ]);
  if (!customer) return null;
  const exclude = options?.excludeEmails ?? [];
  return {
    id: customer.id,
    customer_number: customer.customer_number,
    display_name: customer.display_name,
    company_name: customer.company_name,
    primary_email: customer.primary_email,
    kind: customer.kind,
    preferred_language: customer.preferred_language,
    po_required: customer.po_required,
    default_po_number: customer.default_po_number,
    tax_exempt: customer.tax_exempt,
    currency: customer.currency,
    preferred_payment_method: customer.preferred_payment_method,
    invoiceCc: customerCcEmails(contacts, "invoices", exclude),
    quoteCc: customerCcEmails(contacts, "quotes", exclude),
    venues,
    contactOptions: buildContactOptions(customer, contacts),
  };
}

function buildContactOptions(
  customer: CustomerRow,
  contacts: CustomerContactRow[]
): CustomerContactOption[] {
  const seen = new Set<string>();
  const options: CustomerContactOption[] = [];
  const add = (option: CustomerContactOption) => {
    const key = option.email.trim().toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    options.push(option);
  };
  add({
    id: "primary",
    name: customer.display_name,
    email: customer.primary_email,
    title: null,
    role: null,
    primary: true,
  });
  for (const contact of contacts) {
    if (!contact.email) continue;
    add({
      id: contact.id,
      name: contact.name,
      email: contact.email,
      title: contact.title,
      role: contact.role,
      primary: false,
    });
  }
  return options;
}

// ---------------------------------------------------------------------------
// Create / update
// ---------------------------------------------------------------------------

export type CustomerInput = Partial<{
  kind: string;
  status: string;
  display_name: string;
  company_name: string | null;
  legal_name: string | null;
  primary_email: string;
  phone: string | null;
  website: string | null;
  preferred_language: string;
  billing_address_line1: string | null;
  billing_address_line2: string | null;
  billing_city: string | null;
  billing_province: string | null;
  billing_postal_code: string | null;
  billing_country: string | null;
  tax_exempt: boolean;
  tax_exempt_reason: string | null;
  gst_number: string | null;
  qst_number: string | null;
  po_required: boolean;
  default_po_number: string | null;
  currency: string;
  preferred_payment_method: string | null;
  default_deposit_percent: number | string | null;
  balance_due_rule: string | null;
  balance_due_days: number | string | null;
  tags: string[] | string;
  source: string | null;
  internal_notes: string | null;
}>;

const TEXT_FIELDS: Record<string, number> = {
  company_name: 200,
  legal_name: 200,
  phone: 60,
  website: 200,
  billing_address_line1: 200,
  billing_address_line2: 200,
  billing_city: 120,
  billing_province: 80,
  billing_postal_code: 20,
  tax_exempt_reason: 300,
  gst_number: 40,
  qst_number: 40,
  default_po_number: 80,
  preferred_payment_method: 60,
  source: 120,
  internal_notes: 8000,
};

function cleanTags(value: unknown): string[] {
  const raw = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const tag = item.trim().slice(0, 40);
    if (tag && !out.some((existing) => existing.toLowerCase() === tag.toLowerCase())) out.push(tag);
    if (out.length >= 20) break;
  }
  return out;
}

function buildCustomerUpdate(input: CustomerInput): { update: Record<string, unknown>; error?: string } {
  const update: Record<string, unknown> = {};
  if (input.kind !== undefined) {
    if (!isCustomerKind(input.kind)) return { update, error: "Unknown customer type." };
    update.kind = input.kind;
  }
  if (input.status !== undefined) {
    if (input.status !== "active" && input.status !== "archived") return { update, error: "Unknown status." };
    update.status = input.status;
  }
  if (input.display_name !== undefined) {
    const name = cleanText(input.display_name, 200);
    if (!name) return { update, error: "Customer name is required." };
    update.display_name = name;
  }
  if (input.primary_email !== undefined) {
    const email = normalizeEmail(input.primary_email);
    if (!looksLikeEmail(email)) return { update, error: "A valid email is required." };
    update.primary_email = email;
  }
  if (input.preferred_language !== undefined) {
    if (!isCustomerLanguage(input.preferred_language)) return { update, error: "Unknown language." };
    update.preferred_language = input.preferred_language;
  }
  if (input.currency !== undefined) {
    if (!isCustomerCurrency(input.currency)) return { update, error: "Currency must be CAD or USD." };
    update.currency = input.currency;
  }
  for (const [field, max] of Object.entries(TEXT_FIELDS)) {
    if (field in input) update[field] = cleanText((input as Record<string, unknown>)[field], max);
  }
  if (input.billing_country !== undefined) {
    update.billing_country = cleanText(input.billing_country, 80) ?? "Canada";
  }
  if (input.tax_exempt !== undefined) update.tax_exempt = Boolean(input.tax_exempt);
  if (input.po_required !== undefined) update.po_required = Boolean(input.po_required);
  if (input.default_deposit_percent !== undefined) {
    const raw = input.default_deposit_percent;
    if (raw === null || raw === "") {
      update.default_deposit_percent = null;
    } else {
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0 || n > 100) return { update, error: "Deposit % must be between 0 and 100." };
      update.default_deposit_percent = Math.round(n * 100) / 100;
    }
  }
  if (input.balance_due_rule !== undefined) {
    if (input.balance_due_rule === null || input.balance_due_rule === "") {
      update.balance_due_rule = null;
    } else if (isBalanceDueRule(input.balance_due_rule)) {
      update.balance_due_rule = input.balance_due_rule;
    } else {
      return { update, error: "Unknown balance due rule." };
    }
  }
  if (input.balance_due_days !== undefined) {
    const raw = input.balance_due_days;
    if (raw === null || raw === "") {
      update.balance_due_days = null;
    } else {
      const n = Math.round(Number(raw));
      if (!Number.isFinite(n) || n < 0 || n > 365) return { update, error: "Due days must be 0–365." };
      update.balance_due_days = n;
    }
  }
  if (input.tags !== undefined) update.tags = cleanTags(input.tags);
  return { update };
}

export async function createCustomer(
  input: CustomerInput,
  actor: Actor
): Promise<{ customer: CustomerRow } | { error: string; existingId?: string }> {
  const { update, error } = buildCustomerUpdate(input);
  if (error) return { error };
  if (!update.display_name) return { error: "Customer name is required." };
  if (!update.primary_email) return { error: "A valid email is required." };

  const existing = await findCustomerByEmail(update.primary_email as string);
  if (existing) {
    return { error: `${existing.display_name} already uses this email.`, existingId: existing.id };
  }

  const admin = createAdminSupabaseClient();
  const { data, error: insertError } = await admin
    .from("customers")
    .insert({ ...update, source: update.source ?? "admin", created_by_user_id: actor.userId })
    .select("*")
    .single();
  if (insertError || !data) {
    console.error("[customers] create", insertError);
    return { error: insertError?.code === "23505" ? "This email is already used by another customer." : "Could not create customer." };
  }
  const customer = normalizeCustomerRow(data);
  await logCustomerEvent({
    customerId: customer.id,
    actorUserId: actor.userId,
    eventType: "customer_created",
    summary: `Customer created by owner (${CUSTOMER_KIND_LABELS[customer.kind]})`,
    metadata: { fields: update },
  });
  await linkUnassignedRecords(customer.id, customer.primary_email);
  return { customer };
}

/** Attach existing records with this email that aren't linked to any customer yet. */
async function linkUnassignedRecords(customerId: string, email: string): Promise<void> {
  const admin = createAdminSupabaseClient();
  const pairs: Array<[string, string]> = [
    ["estimate_requests", "customer_email"],
    ["quotes", "customer_email"],
    ["event_jobs", "customer_email"],
    ["invoices", "customer_email"],
    ["event_plan_submissions", "contact_email"],
    ["studio_designs", "contact_email"],
  ];
  await Promise.all(
    pairs.map(([table, column]) =>
      admin
        .from(table)
        .update({ customer_id: customerId })
        .is("customer_id", null)
        .ilike(column, email.replace(/[\\%_]/g, "\\$&"))
    )
  );
}

export type LanguageCascadeResult = { quotes: string[]; invoices: string[]; estimates: number };

/** Moves open quotes, unpaid invoices and active estimates to the customer's language. */
export async function applyLanguageToOpenDocuments(
  customerId: string,
  language: CustomerLanguage,
  actor: Actor
): Promise<LanguageCascadeResult> {
  const admin = createAdminSupabaseClient();
  const label = language === "fr" ? "Français" : "English";
  const result: LanguageCascadeResult = { quotes: [], invoices: [], estimates: 0 };

  const { data: quotes } = await admin
    .from("quotes")
    .select("id, quote_display_ref, language")
    .eq("customer_id", customerId)
    .in("status", [...OPEN_QUOTE_STATUSES])
    .neq("language", language);
  for (const quote of (quotes ?? []) as Array<{ id: string; quote_display_ref: string; language: string }>) {
    const { error } = await admin.from("quotes").update({ language }).eq("id", quote.id);
    if (error) {
      console.error("[customers] cascade quote language", error);
      continue;
    }
    result.quotes.push(quote.quote_display_ref);
    const { logQuoteEvent } = await import("@/lib/quotes");
    await logQuoteEvent({
      quoteId: quote.id,
      actorType: "owner",
      actorUserId: actor.userId,
      actorEmail: actor.email ?? null,
      eventType: "quote_edited",
      summary: `Language changed to ${label} from the customer profile`,
      metadata: { field: "language", from: quote.language, to: language, source: "customer_profile" },
    });
  }

  const { data: invoices } = await admin
    .from("invoices")
    .select("id, invoice_number, language")
    .eq("customer_id", customerId)
    .in("status", OPEN_INVOICE_STATUSES)
    .neq("language", language);
  const { logInvoiceEvent } = await import("@/lib/invoices");
  for (const invoice of (invoices ?? []) as Array<{ id: string; invoice_number: string; language: string }>) {
    const { error } = await admin.from("invoices").update({ language }).eq("id", invoice.id);
    if (error) {
      console.error("[customers] cascade invoice language", error);
      continue;
    }
    result.invoices.push(invoice.invoice_number);
    await logInvoiceEvent({
      invoiceId: invoice.id,
      actorUserId: actor.userId,
      eventType: "invoice_edited",
      summary: `Edited: Language (from the customer profile)`,
      metadata: {
        changes: [
          {
            field: "language",
            label: "Language",
            from: invoice.language === "fr" ? "fr" : "en",
            to: language,
          },
        ],
        source: "customer_profile",
      },
    });
  }

  const { data: estimates } = await admin
    .from("estimate_requests")
    .update({ language })
    .eq("customer_id", customerId)
    .neq("language", language)
    .not("status", "in", "(closed,archived)")
    .select("id");
  result.estimates = estimates?.length ?? 0;

  return result;
}

export async function updateCustomer(
  customerId: string,
  input: CustomerInput,
  actor: Actor,
  options?: { applyLanguageToOpenDocuments?: boolean }
): Promise<{ customer: CustomerRow; cascade: LanguageCascadeResult | null } | { error: string }> {
  const before = await fetchCustomerById(customerId);
  if (!before) return { error: "Customer not found." };
  const { update, error } = buildCustomerUpdate(input);
  if (error) return { error };
  if (Object.keys(update).length === 0) return { customer: before, cascade: null };

  if (update.primary_email && update.primary_email !== before.primary_email) {
    const clash = await findCustomerByEmail(update.primary_email as string);
    if (clash && clash.id !== customerId) {
      return { error: `${clash.display_name} already uses this email.` };
    }
  }

  const admin = createAdminSupabaseClient();
  const { data, error: updateError } = await admin
    .from("customers")
    .update(update)
    .eq("id", customerId)
    .select("*")
    .single();
  if (updateError || !data) {
    console.error("[customers] update", updateError);
    return { error: updateError?.code === "23505" ? "This email is already used by another customer." : "Could not save customer." };
  }
  const customer = normalizeCustomerRow(data);
  const changes = diffFields(
    before as unknown as Record<string, unknown>,
    customer as unknown as Record<string, unknown>,
    Object.keys(update)
  );

  let cascade: LanguageCascadeResult | null = null;
  const languageChanged = before.preferred_language !== customer.preferred_language;
  if (languageChanged) {
    if (customer.user_id) {
      await admin
        .from("user_profiles")
        .update({ preferred_language: customer.preferred_language })
        .eq("id", customer.user_id)
        .eq("role", "customer");
    }
    if (options?.applyLanguageToOpenDocuments !== false) {
      cascade = await applyLanguageToOpenDocuments(customerId, customer.preferred_language, actor);
    }
  }

  if (changes.length > 0) {
    const cascadeText =
      cascade && (cascade.quotes.length || cascade.invoices.length)
        ? ` · language applied to ${[...cascade.quotes, ...cascade.invoices].join(", ")}`
        : "";
    await logCustomerEvent({
      customerId,
      actorUserId: actor.userId,
      eventType: "customer_updated",
      summary: `Edited: ${describeChanges(changes)}${cascadeText}`,
      metadata: { changes, language_cascade: cascade },
    });
  }
  if (update.primary_email && update.primary_email !== before.primary_email) {
    await linkUnassignedRecords(customerId, customer.primary_email);
  }
  return { customer, cascade };
}

/** Language chosen by the customer on their own portal profile. */
export async function syncCustomerLanguageFromProfile(
  userId: string,
  language: CustomerLanguage
): Promise<void> {
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("customers")
    .update({ preferred_language: language })
    .eq("user_id", userId)
    .neq("preferred_language", language)
    .select("id");
  for (const row of (data ?? []) as { id: string }[]) {
    await logCustomerEvent({
      customerId: row.id,
      actorType: "customer",
      actorUserId: userId,
      eventType: "customer_updated",
      summary: `Client changed their language to ${language === "fr" ? "Français" : "English"} in the portal`,
      metadata: { changes: [{ field: "preferred_language", label: "Language", to: language }] },
    });
  }
}

export async function deleteCustomer(
  customerId: string,
  actor: Actor
): Promise<{ ok: true } | { error: string }> {
  const customer = await fetchCustomerById(customerId);
  if (!customer) return { error: "Customer not found." };
  const stats = (await computeCustomerStats([customerId])).get(customerId);
  if (stats && (stats.estimates || stats.quotes || stats.jobs || stats.invoices)) {
    return { error: "This customer has estimates, quotes, jobs or invoices. Archive it instead." };
  }
  await logCustomerEvent({
    customerId,
    actorUserId: actor.userId,
    eventType: "customer_deleted",
    summary: `Customer ${customer.display_name} (${customer.primary_email}) deleted`,
    metadata: { snapshot: customer },
  });
  const admin = createAdminSupabaseClient();
  const { error } = await admin.from("customers").delete().eq("id", customerId);
  if (error) {
    console.error("[customers] delete", error);
    return { error: "Could not delete customer." };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Contacts
// ---------------------------------------------------------------------------

export type ContactInput = Partial<{
  name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  role: string;
  cc_invoices: boolean;
  cc_quotes: boolean;
  notes: string | null;
}>;

function buildContactUpdate(input: ContactInput): { update: Record<string, unknown>; error?: string } {
  const update: Record<string, unknown> = {};
  if (input.name !== undefined) update.name = cleanText(input.name, 200) ?? "";
  if (input.email !== undefined) {
    const email = normalizeEmail(input.email);
    if (email && !looksLikeEmail(email)) return { update, error: "That email doesn't look right." };
    update.email = email || null;
  }
  if (input.phone !== undefined) update.phone = cleanText(input.phone, 60);
  if (input.title !== undefined) update.title = cleanText(input.title, 120);
  if (input.notes !== undefined) update.notes = cleanText(input.notes, 2000);
  if (input.role !== undefined) {
    if (!isContactRole(input.role)) return { update, error: "Unknown contact role." };
    update.role = input.role;
  }
  if (input.cc_invoices !== undefined) update.cc_invoices = Boolean(input.cc_invoices);
  if (input.cc_quotes !== undefined) update.cc_quotes = Boolean(input.cc_quotes);
  return { update };
}

function describeContact(contact: Pick<CustomerContactRow, "name" | "email" | "role">): string {
  const who = contact.name || contact.email || "contact";
  return `${who} (${CONTACT_ROLE_LABELS[contact.role] ?? contact.role})`;
}

export async function createContact(
  customerId: string,
  input: ContactInput,
  actor: Actor
): Promise<{ contact: CustomerContactRow } | { error: string }> {
  const { update, error } = buildContactUpdate(input);
  if (error) return { error };
  if (!update.name && !update.email) return { error: "Add a name or an email." };
  const admin = createAdminSupabaseClient();
  const { count } = await admin
    .from("customer_contacts")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", customerId);
  const { data, error: insertError } = await admin
    .from("customer_contacts")
    .insert({ ...update, customer_id: customerId, sort_order: count ?? 0 })
    .select("*")
    .single();
  if (insertError || !data) {
    console.error("[customers] create contact", insertError);
    return { error: "Could not add contact." };
  }
  const contact = data as CustomerContactRow;
  await logCustomerEvent({
    customerId,
    actorUserId: actor.userId,
    eventType: "contact_added",
    summary: `Contact added: ${describeContact(contact)}`,
    metadata: { contact },
  });
  return { contact };
}

export async function updateContact(
  customerId: string,
  contactId: string,
  input: ContactInput,
  actor: Actor
): Promise<{ contact: CustomerContactRow } | { error: string }> {
  const { update, error } = buildContactUpdate(input);
  if (error) return { error };
  const admin = createAdminSupabaseClient();
  const { data: beforeData } = await admin
    .from("customer_contacts")
    .select("*")
    .eq("id", contactId)
    .eq("customer_id", customerId)
    .maybeSingle();
  if (!beforeData) return { error: "Contact not found." };
  const { data, error: updateError } = await admin
    .from("customer_contacts")
    .update(update)
    .eq("id", contactId)
    .select("*")
    .single();
  if (updateError || !data) {
    console.error("[customers] update contact", updateError);
    return { error: "Could not save contact." };
  }
  const contact = data as CustomerContactRow;
  const before = beforeData as CustomerContactRow;
  const fields = Object.keys(update) as Array<keyof CustomerContactRow>;
  const changed = fields.filter((field) => (before[field] ?? null) !== (contact[field] ?? null));
  if (changed.length > 0) {
    await logCustomerEvent({
      customerId,
      actorUserId: actor.userId,
      eventType: "contact_updated",
      summary: `Contact updated: ${describeContact(contact)} — ${changed.map((f) => String(f).replace("_", " ")).join(", ")}`,
      metadata: {
        contact_id: contactId,
        changes: changed.map((field) => ({ field, from: before[field] ?? null, to: contact[field] ?? null })),
      },
    });
  }
  return { contact };
}

export async function deleteContact(
  customerId: string,
  contactId: string,
  actor: Actor
): Promise<{ ok: true } | { error: string }> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("customer_contacts")
    .delete()
    .eq("id", contactId)
    .eq("customer_id", customerId)
    .select("*")
    .maybeSingle();
  if (error) {
    console.error("[customers] delete contact", error);
    return { error: "Could not remove contact." };
  }
  if (data) {
    await logCustomerEvent({
      customerId,
      actorUserId: actor.userId,
      eventType: "contact_removed",
      summary: `Contact removed: ${describeContact(data as CustomerContactRow)}`,
      metadata: { contact: data },
    });
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Venues
// ---------------------------------------------------------------------------

export type VenueInput = Partial<
  Record<
    | "name"
    | "address"
    | "city"
    | "region"
    | "postal_code"
    | "country"
    | "access_notes"
    | "loading_notes"
    | "parking_notes"
    | "elevator_notes"
    | "room_notes"
    | "notes",
    string | null
  >
>;

const VENUE_FIELDS: Record<keyof VenueInput, number> = {
  name: 200,
  address: 300,
  city: 120,
  region: 80,
  postal_code: 20,
  country: 80,
  access_notes: 4000,
  loading_notes: 4000,
  parking_notes: 4000,
  elevator_notes: 4000,
  room_notes: 4000,
  notes: 4000,
};

function buildVenueUpdate(input: VenueInput): Record<string, unknown> {
  const update: Record<string, unknown> = {};
  for (const [field, max] of Object.entries(VENUE_FIELDS)) {
    if (field in input) update[field] = cleanText((input as Record<string, unknown>)[field], max);
  }
  if ("country" in update && !update.country) update.country = "Canada";
  return update;
}

/** ref is the display label, e.g. "Quote TCG-10007" or "Invoice INV-10039". */
type VenueSource = { kind: "quote" | "invoice"; id: string; ref: string };

/**
 * Venue typed on a quote or invoice → the customer's saved venue with the same name,
 * or a new saved venue. An existing saved venue is never overwritten.
 */
export async function ensureCustomerVenue(input: {
  customerId: string;
  venueName: string | null | undefined;
  venueAddress: string | null | undefined;
  actor: Actor;
  source: VenueSource;
}): Promise<CustomerVenueRow | null> {
  const name = input.venueName?.trim();
  if (!name) return null;
  const existing = (await listCustomerVenues(input.customerId)).find(
    (venue) => venue.name.trim().toLowerCase() === name.toLowerCase()
  );
  if (existing) return existing;
  const result = await createVenue(
    input.customerId,
    { name, address: input.venueAddress?.trim() || null },
    input.actor,
    { fromDocument: input.source }
  );
  return "venue" in result ? result.venue : null;
}

export async function createVenue(
  customerId: string,
  input: VenueInput,
  actor: Actor,
  options?: { fromJobId?: string; fromDocument?: VenueSource }
): Promise<{ venue: CustomerVenueRow } | { error: string }> {
  const update = buildVenueUpdate(input);
  if (!update.name) return { error: "Venue name is required." };
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("customer_venues")
    .insert({ ...update, customer_id: customerId })
    .select("*")
    .single();
  if (error || !data) {
    console.error("[customers] create venue", error);
    return { error: "Could not save venue." };
  }
  const venue = data as CustomerVenueRow;
  const fromDocument = options?.fromDocument;
  await logCustomerEvent({
    customerId,
    actorUserId: actor.userId,
    eventType: "venue_added",
    summary: fromDocument
      ? `Venue saved from ${fromDocument.ref}: ${venue.name}`
      : options?.fromJobId
        ? `Venue saved from a job: ${venue.name}`
        : `Venue added: ${venue.name}`,
    metadata: {
      venue,
      job_id: options?.fromJobId ?? null,
      ...(fromDocument ? { [`${fromDocument.kind}_id`]: fromDocument.id } : {}),
    },
  });
  return { venue };
}

export async function updateVenue(
  customerId: string,
  venueId: string,
  input: VenueInput,
  actor: Actor
): Promise<{ venue: CustomerVenueRow } | { error: string }> {
  const update = buildVenueUpdate(input);
  if ("name" in update && !update.name) return { error: "Venue name is required." };
  const admin = createAdminSupabaseClient();
  const { data: beforeData } = await admin
    .from("customer_venues")
    .select("*")
    .eq("id", venueId)
    .eq("customer_id", customerId)
    .maybeSingle();
  if (!beforeData) return { error: "Venue not found." };
  const { data, error } = await admin
    .from("customer_venues")
    .update(update)
    .eq("id", venueId)
    .select("*")
    .single();
  if (error || !data) {
    console.error("[customers] update venue", error);
    return { error: "Could not save venue." };
  }
  const venue = data as CustomerVenueRow;
  const before = beforeData as Record<string, unknown>;
  const after = venue as unknown as Record<string, unknown>;
  const changed = Object.keys(update).filter((field) => (before[field] ?? null) !== (after[field] ?? null));
  if (changed.length > 0) {
    await logCustomerEvent({
      customerId,
      actorUserId: actor.userId,
      eventType: "venue_updated",
      summary: `Venue updated: ${venue.name} — ${changed.map((f) => f.replace("_", " ")).join(", ")}`,
      metadata: {
        venue_id: venueId,
        changes: changed.map((field) => ({ field, from: before[field] ?? null, to: after[field] ?? null })),
      },
    });
  }
  return { venue };
}

export async function deleteVenue(
  customerId: string,
  venueId: string,
  actor: Actor
): Promise<{ ok: true } | { error: string }> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("customer_venues")
    .delete()
    .eq("id", venueId)
    .eq("customer_id", customerId)
    .select("*")
    .maybeSingle();
  if (error) {
    console.error("[customers] delete venue", error);
    return { error: "Could not remove venue." };
  }
  if (data) {
    await logCustomerEvent({
      customerId,
      actorUserId: actor.userId,
      eventType: "venue_removed",
      summary: `Venue removed: ${(data as CustomerVenueRow).name}`,
      metadata: { venue: data },
    });
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Document defaults
// ---------------------------------------------------------------------------

export type CustomerInvoiceDefaults = {
  customer_id: string;
  language: CustomerLanguage;
  company_name: string | null;
  billing_address: string | null;
  currency: string;
  po_number: string | null;
  tax_exempt: boolean;
  deposit_percent: number | null;
  balance_due_rule: CustomerRow["balance_due_rule"];
  balance_due_days: number | null;
};

export function customerInvoiceDefaults(customer: CustomerRow): CustomerInvoiceDefaults {
  const address = formatCustomerBillingAddress(customer);
  return {
    customer_id: customer.id,
    language: customer.preferred_language,
    company_name: customer.company_name || customer.legal_name || null,
    billing_address: address || null,
    currency: customer.currency,
    po_number: customer.default_po_number,
    tax_exempt: customer.tax_exempt,
    deposit_percent: customer.default_deposit_percent,
    balance_due_rule: customer.balance_due_rule,
    balance_due_days: customer.balance_due_days,
  };
}

export async function markPortalInvited(
  customerId: string,
  actor: Actor,
  sentTo: string
): Promise<void> {
  const admin = createAdminSupabaseClient();
  await admin.from("customers").update({ portal_invited_at: new Date().toISOString() }).eq("id", customerId);
  await logCustomerEvent({
    customerId,
    actorUserId: actor.userId,
    eventType: "portal_invited",
    summary: `Portal invitation emailed to ${sentTo}`,
    metadata: { to: sentTo },
  });
}

export function describeOutstanding(stats: CustomerStats): string {
  if (stats.outstandingCents <= 0) return "Nothing owing";
  const overdue = stats.overdueCents > 0 ? ` · ${formatCadFromCents(stats.overdueCents)} overdue` : "";
  return `${formatCadFromCents(stats.outstandingCents)} owing${overdue}`;
}
