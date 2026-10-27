import type { User } from "@supabase/supabase-js";
import { normalizeCustomerLanguage } from "@/data/customer-language";
import {
  addDaysIso,
  resolveBalanceDueDate,
  businessText,
  clampPercent,
  computeAmountDue,
  computeDepositCents,
  computeInvoiceTotals,
  deriveInvoiceStatus,
  formatInvoiceNumber,
  isDepositMode,
  sumPaymentsCents,
  todayIsoDate,
  type CustomerSafeInvoice,
  type DepositMode,
  INVOICE_STATUS_LABELS,
  type InvoiceEventRow,
  type InvoiceFieldChange,
  type InvoiceLineItemRow,
  type InvoicePaymentRow,
  type InvoiceRow,
  type InvoiceStatus,
  type InvoiceWithRelations,
  type PaymentKind,
} from "@/data/invoices";
import {
  computeLineTotalCents,
  formatCadFromCents,
  isQuoteTaxMode,
  normalizeManualTaxLines,
  normalizeUnitPriceCents,
  type QuoteTaxMode,
} from "@/data/quotes";
import type { EventJobRow } from "@/data/jobs";
import { formatVenueAddress } from "@/data/customers";
import { quotePaymentTermsFrom, resolveQuoteDueDate } from "@/data/quote-payment-terms";
import { resolveProductCategoryLabelFr, type ProductCategoryRow } from "@/data/product-categories";
import { listProductCategories } from "@/lib/product-categories";
import { getBusinessSettings } from "@/lib/business-settings";
import {
  customerInvoiceDefaults,
  ensureCustomerVenue,
  fetchCustomerById,
  logCustomerEvent,
} from "@/lib/customers";
import { getCustomerJob, listCustomerJobs } from "@/lib/jobs";
import { recordJobEvent } from "@/lib/job-events";
import { createQuoteToken, hashQuoteToken } from "@/lib/quote-tokens";
import { fetchQuoteById } from "@/lib/quotes";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const INVOICE_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 365;

export function buildPublicInvoiceUrl(siteUrl: string, token: string): string {
  return `${siteUrl.replace(/\/$/, "")}/invoice/${token}`;
}

function normalizeInvoiceRow(row: Record<string, unknown>): InvoiceRow {
  const r = row as unknown as InvoiceRow;
  return {
    ...r,
    language: normalizeCustomerLanguage(r.language),
    gst_rate: Number(r.gst_rate),
    qst_rate: Number(r.qst_rate),
    deposit_percent: Number(r.deposit_percent),
    manual_tax_lines: normalizeManualTaxLines(r.manual_tax_lines),
  };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CATEGORY_RE = /^[a-z0-9][a-z0-9_]*$/;

export type InvoiceLineInventoryInput = {
  product_id?: string | null;
  category?: string | null;
  category_label?: string | null;
  category_label_fr?: string | null;
  image_url?: string | null;
  image_alt?: string | null;
  source_quote_line_id?: string | null;
};

function cleanShort(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

type KnownLinks = { products: Set<string>; quoteLines: Set<string>; categories: ProductCategoryRow[] };

/** Sanitizes the inventory link on a line; links to deleted rows are dropped rather than failing the save. */
function inventoryLineFields(line: InvoiceLineInventoryInput, known: KnownLinks) {
  const productId =
    typeof line.product_id === "string" && known.products.has(line.product_id) ? line.product_id : null;
  const category =
    typeof line.category === "string" && CATEGORY_RE.test(line.category) && line.category.length <= 60
      ? line.category
      : null;
  const imageUrl = cleanShort(line.image_url, 2000);
  return {
    product_id: productId,
    category,
    category_label: category ? cleanShort(line.category_label, 120) : null,
    category_label_fr: category
      ? resolveProductCategoryLabelFr(category, known.categories) ?? cleanShort(line.category_label_fr, 120)
      : null,
    image_url: imageUrl && /^(https?:\/\/|\/)/.test(imageUrl) ? imageUrl : null,
    image_alt: imageUrl ? cleanShort(line.image_alt, 300) : null,
    source_quote_line_id:
      typeof line.source_quote_line_id === "string" && known.quoteLines.has(line.source_quote_line_id)
        ? line.source_quote_line_id
        : null,
  };
}

async function existingIds(table: string, values: Array<string | null | undefined>): Promise<Set<string>> {
  const ids = [...new Set(values.filter((id): id is string => typeof id === "string" && UUID_RE.test(id)))];
  if (ids.length === 0) return new Set();
  const admin = createAdminSupabaseClient();
  const { data } = await admin.from(table).select("id").in("id", ids);
  return new Set(((data ?? []) as Array<{ id: string }>).map((row) => row.id));
}

async function resolveKnownLinks(lines: InvoiceLineInventoryInput[]): Promise<KnownLinks> {
  const hasCategory = lines.some((line) => typeof line.category === "string" && line.category);
  const [products, quoteLines, categories] = await Promise.all([
    existingIds("products", lines.map((line) => line.product_id)),
    existingIds("quote_line_items", lines.map((line) => line.source_quote_line_id)),
    hasCategory ? listProductCategories() : Promise.resolve([] as ProductCategoryRow[]),
  ]);
  return { products, quoteLines, categories };
}

function normalizeLine(row: Record<string, unknown>): InvoiceLineItemRow {
  const r = row as unknown as InvoiceLineItemRow;
  return {
    ...r,
    quantity: Number(r.quantity),
    unit_price_cents: normalizeUnitPriceCents(r.unit_price_cents),
  };
}

/** Append-only audit log; the DB fills actor_email and invoice_number. */
export async function logInvoiceEvent(input: {
  invoiceId: string;
  actorType?: InvoiceEventRow["actor_type"];
  actorUserId?: string | null;
  eventType: string;
  summary: string;
  metadata?: Record<string, unknown>;
  invoiceNumber?: string | null;
}): Promise<void> {
  const admin = createAdminSupabaseClient();
  const { error } = await admin.from("invoice_events").insert({
    invoice_id: input.invoiceId,
    invoice_number: input.invoiceNumber ?? null,
    actor_type: input.actorType ?? "owner",
    actor_user_id: input.actorUserId ?? null,
    event_type: input.eventType,
    summary: input.summary,
    metadata: input.metadata ?? {},
  });
  if (error) console.error("[invoices] logInvoiceEvent", error);
}

const CLIENT_ACCESS_DEDUPE_MS = 30 * 60 * 1000;

/** Logs client views/downloads, skipping repeats from the same actor within 30 minutes. */
export async function logInvoiceClientAccess(input: {
  invoiceId: string;
  actorType: "customer" | "public_link";
  actorUserId?: string | null;
  eventType: "invoice_viewed" | "pdf_downloaded";
  summary: string;
}): Promise<void> {
  const admin = createAdminSupabaseClient();
  let query = admin
    .from("invoice_events")
    .select("id")
    .eq("invoice_id", input.invoiceId)
    .eq("event_type", input.eventType)
    .eq("actor_type", input.actorType)
    .gte("created_at", new Date(Date.now() - CLIENT_ACCESS_DEDUPE_MS).toISOString())
    .limit(1);
  query = input.actorUserId
    ? query.eq("actor_user_id", input.actorUserId)
    : query.is("actor_user_id", null);
  const { data } = await query;
  if (data && data.length > 0) return;
  await logInvoiceEvent(input);
}

export async function listRecentInvoiceEvents(limit = 40): Promise<InvoiceEventRow[]> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("invoice_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[invoices] listRecentInvoiceEvents", error);
    return [];
  }
  return (data ?? []) as InvoiceEventRow[];
}

const AUDIT_FIELD_LABELS: Record<string, string> = {
  customer_name: "Client name",
  customer_email: "Client email",
  customer_phone: "Client phone",
  company_name: "Company",
  billing_address: "Billing address",
  po_number: "PO #",
  currency: "Currency",
  event_date: "Event date",
  event_type: "Event type",
  venue_name: "Venue",
  venue_address: "Venue address",
  customer_venue_id: "Saved venue",
  issue_date: "Issue date",
  due_date: "Balance due date",
  language: "Language",
  tax_mode: "Tax",
  gst_rate: "GST rate",
  qst_rate: "QST rate",
  deposit_mode: "Deposit type",
  deposit_percent: "Deposit %",
  deposit_due_date: "Deposit due date",
  notes: "Notes to client",
  terms: "Terms",
  internal_notes: "Internal notes",
  subtotal_cents: "Subtotal",
  total_cents: "Total",
  deposit_cents: "Deposit amount",
  balance_due_cents: "Balance due",
};

function auditValue(field: string, value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (field.endsWith("_cents")) return formatCadFromCents(Number(value));
  if (field === "gst_rate" || field === "qst_rate") {
    return `${Number((Number(value) * 100).toFixed(4))}%`;
  }
  if (field === "deposit_percent") return `${Number(value)}%`;
  const text = String(value);
  return text.length > 500 ? `${text.slice(0, 500)}…` : text;
}

function diffInvoiceFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  fields: readonly string[]
): InvoiceFieldChange[] {
  const changes: InvoiceFieldChange[] = [];
  for (const field of fields) {
    if (!(field in after)) continue;
    const from = auditValue(field, before[field]);
    const to = auditValue(field, after[field]);
    if (from !== to) {
      changes.push({ field, label: AUDIT_FIELD_LABELS[field] ?? field, from, to });
    }
  }
  return changes;
}

function lineSignature(line: Pick<InvoiceLineItemRow, "description" | "quantity" | "unit_label" | "unit_price_cents" | "is_taxable">): string {
  return [
    line.description.trim(),
    Number(line.quantity),
    line.unit_label ?? "",
    normalizeUnitPriceCents(line.unit_price_cents),
    line.is_taxable ? "T" : "N",
  ].join("|");
}

function describeLine(line: Pick<InvoiceLineItemRow, "description" | "quantity" | "unit_price_cents" | "line_total_cents">): string {
  return `${line.description || "(no description)"} — ${Number(line.quantity)} × ${formatCadFromCents(normalizeUnitPriceCents(line.unit_price_cents))} = ${formatCadFromCents(line.line_total_cents)}`;
}

function diffInvoiceLines(
  before: InvoiceLineItemRow[],
  after: InvoiceLineItemRow[]
): { added: string[]; removed: string[]; reordered: boolean } {
  const remaining = new Map<string, number>();
  for (const line of before) {
    const sig = lineSignature(line);
    remaining.set(sig, (remaining.get(sig) ?? 0) + 1);
  }
  const added: string[] = [];
  for (const line of after) {
    const sig = lineSignature(line);
    const count = remaining.get(sig) ?? 0;
    if (count > 0) remaining.set(sig, count - 1);
    else added.push(describeLine(line));
  }
  const removed: string[] = [];
  const pending = new Map(remaining);
  for (const line of before) {
    const sig = lineSignature(line);
    const count = pending.get(sig) ?? 0;
    if (count > 0) {
      removed.push(describeLine(line));
      pending.set(sig, count - 1);
    }
  }
  const reordered =
    added.length === 0 &&
    removed.length === 0 &&
    before.map(lineSignature).join("\n") !== after.map(lineSignature).join("\n");
  return { added, removed, reordered };
}

function statusLabel(status: string): string {
  return INVOICE_STATUS_LABELS.en[status as InvoiceStatus] ?? status;
}

function paymentAuditMetadata(payment: Partial<InvoicePaymentRow>): Record<string, unknown> {
  return {
    payment_id: payment.id ?? null,
    kind: payment.kind ?? null,
    amount_cents: payment.amount_cents ?? null,
    paid_on: payment.paid_on ?? null,
    method: payment.method || null,
    reference: payment.reference ?? null,
    note: payment.note ?? null,
  };
}

function describePayment(payment: Pick<InvoicePaymentRow, "kind" | "amount_cents" | "paid_on" | "method" | "reference">): string {
  const parts = [formatCadFromCents(payment.amount_cents)];
  if (payment.method) parts.push(`by ${payment.method}`);
  parts.push(`on ${payment.paid_on}`);
  if (payment.reference) parts.push(`(ref ${payment.reference})`);
  return parts.join(" ");
}

export async function fetchInvoiceById(
  id: string,
  options?: { includeEvents?: boolean }
): Promise<InvoiceWithRelations | null> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("invoices")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) {
    if (error) console.error("[invoices] fetchInvoiceById", error);
    return null;
  }

  const [lines, payments, events] = await Promise.all([
    admin
      .from("invoice_line_items")
      .select("*")
      .eq("invoice_id", id)
      .order("sort_order", { ascending: true }),
    admin
      .from("invoice_payments")
      .select("*")
      .eq("invoice_id", id)
      .order("paid_on", { ascending: true })
      .order("created_at", { ascending: true }),
    options?.includeEvents
      ? admin
          .from("invoice_events")
          .select("*")
          .eq("invoice_id", id)
          .order("created_at", { ascending: false })
          .limit(500)
      : Promise.resolve({ data: [] as unknown[] }),
  ]);

  return {
    ...normalizeInvoiceRow(data),
    line_items: (lines.data ?? []).map((row) => normalizeLine(row)),
    payments: (payments.data ?? []) as InvoicePaymentRow[],
    events: options?.includeEvents
      ? ((events.data ?? []) as InvoiceEventRow[])
      : undefined,
  };
}

export async function listInvoices(options?: {
  limit?: number;
}): Promise<InvoiceRow[]> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("invoices")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(options?.limit ?? 500);
  if (error) {
    console.error("[invoices] listInvoices", error);
    return [];
  }
  return (data ?? []).map((row) => normalizeInvoiceRow(row));
}

export async function listInvoicesForJob(jobId: string): Promise<InvoiceRow[]> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("invoices")
    .select("*")
    .eq("job_id", jobId)
    .order("sequence", { ascending: true });
  if (error) {
    console.error("[invoices] listInvoicesForJob", error);
    return [];
  }
  return (data ?? []).map((row) => normalizeInvoiceRow(row));
}

/** Recompute totals, deposit, paid, balance, and status from lines + payments. */
export async function recalculateInvoice(
  invoiceId: string,
  actorUserId?: string | null
): Promise<void> {
  const invoice = await fetchInvoiceById(invoiceId);
  if (!invoice) return;

  const totals = computeInvoiceTotals(invoice.line_items, invoice);
  const depositCents = computeDepositCents({
    mode: invoice.deposit_mode,
    percent: invoice.deposit_percent,
    fixedCents: invoice.deposit_cents,
    totalCents: totals.total_cents,
  });
  const paid = sumPaymentsCents(invoice.payments);
  const status = deriveInvoiceStatus({
    current: invoice.status,
    sentAt: invoice.sent_at,
    totalCents: totals.total_cents,
    paidCents: paid,
  });

  const admin = createAdminSupabaseClient();
  const { error } = await admin
    .from("invoices")
    .update({
      ...totals,
      deposit_cents: depositCents,
      amount_paid_cents: paid,
      balance_due_cents: totals.total_cents - paid,
      status,
      paid_at:
        status === "paid" ? invoice.paid_at ?? new Date().toISOString() : null,
    })
    .eq("id", invoiceId);
  if (error) {
    console.error("[invoices] recalculateInvoice", error);
    return;
  }
  if (status !== invoice.status) {
    await logInvoiceEvent({
      invoiceId,
      actorType: actorUserId ? "owner" : "system",
      actorUserId: actorUserId ?? null,
      eventType: "status_changed",
      summary: `Status: ${statusLabel(invoice.status)} → ${statusLabel(status)}`,
      metadata: { from: invoice.status, to: status, amount_paid_cents: paid, total_cents: totals.total_cents },
    });
  }
}

async function nextInvoiceSequence(opportunityRef: string): Promise<number> {
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("invoices")
    .select("sequence")
    .eq("opportunity_ref", opportunityRef)
    .order("sequence", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? Number(data.sequence) + 1 : 0;
}

export async function createInvoiceFromJob(
  jobId: string,
  ownerUserId: string
): Promise<{ invoiceId: string; invoiceNumber: string }> {
  const admin = createAdminSupabaseClient();
  const { data: jobData, error: jobError } = await admin
    .from("event_jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();
  if (jobError || !jobData) throw new Error("Job not found.");
  const job = jobData as EventJobRow;

  const [quote, settings, existing] = await Promise.all([
    job.quote_id ? fetchQuoteById(job.quote_id) : Promise.resolve(null),
    getBusinessSettings(),
    listInvoicesForJob(jobId),
  ]);

  const customerId = job.customer_id ?? quote?.customer_id ?? null;
  const customer = customerId ? await fetchCustomerById(customerId) : null;
  const defaults = customer ? customerInvoiceDefaults(customer) : null;
  const language = quote
    ? normalizeCustomerLanguage(quote.language)
    : defaults?.language ?? "en";
  const isFirstActive = !existing.some((inv) => inv.status !== "void");
  const today = todayIsoDate();
  // Terms the customer accepted on the quote win over the customer / business defaults.
  const quoteTerms = isFirstActive && quote ? quotePaymentTermsFrom(quote) : null;
  const acceptedTerms =
    quoteTerms?.payment_deposit_mode && quoteTerms.payment_balance_due_rule ? quoteTerms : null;
  const dueDate = acceptedTerms
    ? resolveQuoteDueDate({
        rule: acceptedTerms.payment_balance_due_rule!,
        days: acceptedTerms.payment_balance_due_days ?? 0,
        date: acceptedTerms.payment_balance_due_date,
        issueDate: today,
        eventDate: job.event_date,
        validUntil: quote?.valid_until,
      })
    : resolveBalanceDueDate({
        rule: defaults?.balance_due_rule ?? settings.default_balance_due_rule,
        days: defaults?.balance_due_days ?? settings.default_due_days,
        issueDate: today,
        eventDate: job.event_date,
      });
  const depositDueDate = acceptedTerms
    ? resolveQuoteDueDate({
        rule: acceptedTerms.payment_deposit_due_rule ?? "on_acceptance",
        days: 0,
        date: acceptedTerms.payment_deposit_due_date,
        issueDate: today,
        eventDate: job.event_date,
        validUntil: quote?.valid_until,
      })
    : [addDaysIso(today, settings.default_deposit_due_days), dueDate].sort()[0];
  const depositMode: DepositMode = acceptedTerms
    ? acceptedTerms.payment_deposit_mode!
    : isFirstActive
      ? "percent"
      : "none";
  const taxMode: QuoteTaxMode = defaults?.tax_exempt
    ? "none"
    : quote && isQuoteTaxMode(quote.tax_mode)
      ? quote.tax_mode
      : "quebec_gst_qst";

  const lines = isFirstActive && quote
    ? quote.line_items
        .filter(
          (item) =>
            item.customer_visible &&
            (item.status === "priced" || item.status === "included")
        )
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((item, index) => {
          const unit = item.status === "included" ? 0 : normalizeUnitPriceCents(item.unit_price_cents);
          return {
            description: item.description,
            quantity: Number(item.quantity) || 0,
            unit_label: item.unit_label ?? null,
            unit_price_cents: unit,
            line_total_cents: computeLineTotalCents(Number(item.quantity) || 0, unit),
            is_taxable: item.is_taxable !== false,
            sort_order: index,
            product_id: item.product_id ?? null,
            category: item.category ?? null,
            category_label: item.category_label ?? null,
            category_label_fr: item.category_label_fr ?? null,
            image_url: item.image_url ?? null,
            image_alt: item.image_alt ?? null,
            source_quote_line_id: item.id,
          };
        })
    : [];

  let attempt = 0;
  let inserted: { id: string; invoice_number: string } | null = null;
  while (!inserted && attempt < 3) {
    const sequence = (await nextInvoiceSequence(job.opportunity_ref)) + attempt;
    const invoiceNumber = formatInvoiceNumber(
      settings.invoice_prefix,
      job.opportunity_ref,
      sequence
    );
    const { data, error } = await admin
      .from("invoices")
      .insert({
        invoice_number: invoiceNumber,
        opportunity_ref: job.opportunity_ref,
        sequence,
        job_id: job.id,
        quote_id: job.quote_id,
        estimate_request_id: job.estimate_request_id,
        customer_id: customerId,
        status: "draft",
        language,
        customer_name: job.customer_name,
        customer_email: job.customer_email,
        customer_phone: job.customer_phone,
        company_name: job.company_name || defaults?.company_name || null,
        billing_address: defaults?.billing_address ?? null,
        po_number: defaults?.po_number ?? null,
        event_date: job.event_date,
        event_type: job.event_type,
        venue_name: job.venue_name,
        venue_address: jobVenueAddress(job) || quote?.venue_address || null,
        customer_venue_id: quote?.customer_venue_id ?? null,
        issue_date: today,
        due_date: dueDate,
        currency: quote?.currency || defaults?.currency || job.currency || "CAD",
        tax_mode: taxMode,
        gst_rate: quote?.gst_rate ?? 0.05,
        qst_rate: quote?.qst_rate ?? 0.09975,
        manual_tax_lines: normalizeManualTaxLines(quote?.manual_tax_lines),
        deposit_mode: depositMode,
        deposit_percent:
          acceptedTerms?.payment_deposit_percent ??
          defaults?.deposit_percent ??
          settings.default_deposit_percent,
        ...(depositMode === "fixed"
          ? { deposit_cents: acceptedTerms?.payment_deposit_fixed_cents ?? 0 }
          : {}),
        deposit_due_date: depositMode === "none" ? null : depositDueDate,
        notes: businessText(settings, "invoice_notes", language) || null,
        terms: businessText(settings, "invoice_terms", language) || null,
        created_by_user_id: ownerUserId,
      })
      .select("id, invoice_number")
      .single();
    if (data) {
      inserted = data as { id: string; invoice_number: string };
    } else if (error?.code !== "23505") {
      console.error("[invoices] create insert", error);
      throw new Error("Could not create invoice.");
    }
    attempt += 1;
  }
  if (!inserted) throw new Error("Could not allocate an invoice number.");

  if (lines.length > 0) {
    const { error } = await admin
      .from("invoice_line_items")
      .insert(lines.map((line) => ({ ...line, invoice_id: inserted!.id })));
    if (error) console.error("[invoices] copy lines", error);
  }

  await recalculateInvoice(inserted.id, ownerUserId);
  const created = await fetchInvoiceById(inserted.id);
  await logInvoiceEvent({
    invoiceId: inserted.id,
    actorUserId: ownerUserId,
    eventType: "invoice_created",
    summary: `${quote ? `Created from ${quote.opportunity_ref}` : "Invoice created"} · total ${formatCadFromCents(created?.total_cents ?? 0)}${acceptedTerms ? " · payment terms from the quote" : ""}`,
    metadata: {
      quote_id: job.quote_id,
      job_id: job.id,
      line_count: lines.length,
      total_cents: created?.total_cents ?? null,
      deposit_mode: created?.deposit_mode ?? null,
      deposit_percent: created?.deposit_percent ?? null,
      deposit_cents: created?.deposit_cents ?? null,
      deposit_due_date: depositDueDate,
      due_date: dueDate,
      due_rule:
        acceptedTerms?.payment_balance_due_rule ??
        defaults?.balance_due_rule ??
        settings.default_balance_due_rule,
      deposit_due_rule: acceptedTerms ? acceptedTerms.payment_deposit_due_rule ?? "on_acceptance" : null,
      terms_from_quote: Boolean(acceptedTerms),
    },
  });
  await recordJobEvent({
    jobId: job.id,
    actorUserId: ownerUserId,
    actorRole: "owner",
    eventType: "invoice_created",
    title: `Invoice ${inserted.invoice_number} created`,
    customerVisible: false,
    metadata: { invoice_id: inserted.id },
  });
  if (customerId) {
    await logCustomerEvent({
      customerId,
      actorUserId: ownerUserId,
      eventType: "invoice_created",
      summary: `Invoice ${inserted.invoice_number} created from job ${job.opportunity_ref}`,
      metadata: { invoice_id: inserted.id, job_id: job.id },
    });
  }

  return { invoiceId: inserted.id, invoiceNumber: inserted.invoice_number };
}

export type DirectInvoiceInput = {
  customerId: string;
  eventDate?: string | null;
  eventType?: string | null;
  venueName?: string | null;
  venueAddress?: string | null;
  language?: string | null;
  requestDeposit?: boolean;
  poNumber?: string | null;
  lines?: Array<
    {
      description?: string;
      quantity?: number;
      unit_label?: string | null;
      unit_price_cents?: number;
      is_taxable?: boolean;
    } & InvoiceLineInventoryInput
  >;
};

/** Invoice that doesn't come from a quote or job (damage fees, extras, one-off rentals). */
export async function createDirectInvoice(
  input: DirectInvoiceInput,
  ownerUserId: string
): Promise<{ invoiceId: string; invoiceNumber: string } | { error: string }> {
  const customer = await fetchCustomerById(input.customerId);
  if (!customer) return { error: "Customer not found." };
  const settings = await getBusinessSettings();
  const defaults = customerInvoiceDefaults(customer);
  const admin = createAdminSupabaseClient();

  const { data: refData, error: refError } = await admin.rpc("next_tcg_opportunity_ref");
  const opportunityRef = typeof refData === "string" ? refData : null;
  if (refError || !opportunityRef) {
    console.error("[invoices] next_tcg_opportunity_ref", refError);
    return { error: "Could not allocate an invoice number." };
  }

  const today = todayIsoDate();
  const eventDate = cleanDate(input.eventDate);
  const dueDate = resolveBalanceDueDate({
    rule: defaults.balance_due_rule ?? settings.default_balance_due_rule,
    days: defaults.balance_due_days ?? settings.default_due_days,
    issueDate: today,
    eventDate,
  });
  const depositDueDate = [addDaysIso(today, settings.default_deposit_due_days), dueDate].sort()[0];
  const language = input.language ? normalizeCustomerLanguage(input.language) : defaults.language;
  const invoiceNumber = formatInvoiceNumber(settings.invoice_prefix, opportunityRef, 0);
  const venueName = cleanText(input.venueName, 200);
  const venueAddress = cleanText(input.venueAddress, 400);

  const { data, error } = await admin
    .from("invoices")
    .insert({
      invoice_number: invoiceNumber,
      opportunity_ref: opportunityRef,
      sequence: 0,
      customer_id: customer.id,
      status: "draft",
      language,
      customer_name: customer.display_name,
      customer_email: customer.primary_email,
      customer_phone: customer.phone,
      company_name: defaults.company_name,
      billing_address: defaults.billing_address,
      po_number: cleanText(input.poNumber, 80) ?? defaults.po_number,
      event_date: eventDate,
      event_type: cleanText(input.eventType, 120),
      venue_name: venueName,
      venue_address: venueAddress,
      issue_date: today,
      due_date: dueDate,
      currency: defaults.currency,
      tax_mode: defaults.tax_exempt ? "none" : "quebec_gst_qst",
      deposit_mode: input.requestDeposit ? "percent" : "none",
      deposit_percent: defaults.deposit_percent ?? settings.default_deposit_percent,
      deposit_due_date: input.requestDeposit ? depositDueDate : null,
      notes: businessText(settings, "invoice_notes", language) || null,
      terms: businessText(settings, "invoice_terms", language) || null,
      created_by_user_id: ownerUserId,
    })
    .select("id, invoice_number")
    .single();
  if (error || !data) {
    console.error("[invoices] create direct", error);
    return { error: "Could not create invoice." };
  }
  const invoiceId = data.id as string;

  const venue = await ensureCustomerVenue({
    customerId: customer.id,
    venueName,
    venueAddress,
    actor: { userId: ownerUserId },
    source: { kind: "invoice", id: invoiceId, ref: `Invoice ${invoiceNumber}` },
  });
  if (venue) {
    const { error: venueError } = await admin
      .from("invoices")
      .update({ customer_venue_id: venue.id })
      .eq("id", invoiceId);
    if (venueError) console.error("[invoices] link saved venue", venueError);
  }

  const directLines = (input.lines ?? [])
    .filter((line) => (line.description || "").trim() || Number(line.unit_price_cents) > 0)
    .slice(0, 200);
  const knownLinks = await resolveKnownLinks(directLines);
  const lines = directLines
    .map((line, index) => {
      const quantity = Number(line.quantity);
      const qty = Number.isFinite(quantity) ? Math.max(0, quantity) : 1;
      const unit = normalizeUnitPriceCents(line.unit_price_cents);
      return {
        invoice_id: invoiceId,
        description: (line.description || "").trim().slice(0, 2000),
        quantity: qty,
        unit_label: cleanText(line.unit_label, 40),
        unit_price_cents: unit,
        line_total_cents: computeLineTotalCents(qty, unit),
        is_taxable: line.is_taxable !== false,
        sort_order: index,
        ...inventoryLineFields(line, knownLinks),
      };
    });
  if (lines.length > 0) {
    const { error: lineError } = await admin.from("invoice_line_items").insert(lines);
    if (lineError) console.error("[invoices] direct lines", lineError);
  }

  await recalculateInvoice(invoiceId, ownerUserId);
  const created = await fetchInvoiceById(invoiceId);
  await logInvoiceEvent({
    invoiceId,
    actorUserId: ownerUserId,
    eventType: "invoice_created",
    summary: `Direct invoice created for ${customer.display_name} · total ${formatCadFromCents(created?.total_cents ?? 0)}`,
    metadata: {
      direct: true,
      customer_id: customer.id,
      line_count: lines.length,
      total_cents: created?.total_cents ?? null,
      deposit_mode: created?.deposit_mode ?? null,
      due_date: dueDate,
    },
  });
  await logCustomerEvent({
    customerId: customer.id,
    actorUserId: ownerUserId,
    eventType: "invoice_created",
    summary: `Direct invoice ${invoiceNumber} created`,
    metadata: { invoice_id: invoiceId },
  });
  return { invoiceId, invoiceNumber: data.invoice_number as string };
}

const JOB_SYNC_FIELDS = [
  "event_date",
  "event_type",
  "venue_name",
  "venue_address",
  "customer_name",
  "customer_email",
  "customer_phone",
  "company_name",
] as const;

function jobVenueAddress(job: EventJobRow): string {
  return formatVenueAddress({
    address: job.venue_address,
    city: job.venue_city,
    region: job.venue_region,
    postal_code: job.venue_postal_code,
    country: job.venue_country,
  });
}

function jobSyncValues(job: EventJobRow): Record<string, string | null> {
  return {
    ...(job as unknown as Record<string, string | null>),
    venue_address: jobVenueAddress(job) || null,
  };
}

function clampToIssue(date: string, issueDate: string): string {
  return date < issueDate ? issueDate : date;
}

/** New balance due date when the event moves, only if the old one was derived from the event date. */
function followEventDueDate(
  invoice: InvoiceRow,
  oldEvent: string | null,
  newEvent: string | null,
  settings: { default_balance_due_rule: string; default_due_days: number }
): string | null {
  if (!newEvent || !invoice.due_date) return null;
  const days = settings.default_due_days;
  if (!oldEvent) {
    const wasFallback = invoice.due_date === addDaysIso(invoice.issue_date, days);
    if (!wasFallback || settings.default_balance_due_rule === "days_after_issue") return null;
    const target =
      settings.default_balance_due_rule === "event_date" ? newEvent : addDaysIso(newEvent, -days);
    return clampToIssue(target, invoice.issue_date);
  }
  if (invoice.due_date === oldEvent) return clampToIssue(newEvent, invoice.issue_date);
  if (days > 0 && invoice.due_date === addDaysIso(oldEvent, -days)) {
    return clampToIssue(addDaysIso(newEvent, -days), invoice.issue_date);
  }
  return null;
}

/**
 * Pushes job changes (event date, venue, client details) to the job's non-void invoices.
 * A field is only updated when the invoice still matches the job's previous value,
 * so values edited directly on an invoice are never overwritten.
 */
export async function syncInvoicesFromJob(input: {
  before: EventJobRow;
  after: EventJobRow;
  actorUserId: string | null;
}): Promise<{ updated: string[] }> {
  const before = jobSyncValues(input.before);
  const after = jobSyncValues(input.after);
  const changed = JOB_SYNC_FIELDS.filter((f) => (before[f] ?? null) !== (after[f] ?? null));
  if (changed.length === 0) return { updated: [] };

  const invoices = (await listInvoicesForJob(input.after.id)).filter((inv) => inv.status !== "void");
  if (invoices.length === 0) return { updated: [] };
  const settings = changed.includes("event_date") ? await getBusinessSettings() : null;
  const admin = createAdminSupabaseClient();
  const updated: string[] = [];

  for (const invoice of invoices) {
    const current = invoice as unknown as Record<string, string | null>;
    const update: Record<string, string | null> = {};
    const kept: InvoiceFieldChange[] = [];
    for (const field of changed) {
      const nextValue = after[field] ?? null;
      if ((current[field] ?? null) === (before[field] ?? null)) {
        update[field] = nextValue;
      } else if ((current[field] ?? null) !== nextValue) {
        kept.push({
          field,
          label: AUDIT_FIELD_LABELS[field] ?? field,
          from: auditValue(field, current[field]),
          to: auditValue(field, nextValue),
        });
      }
    }
    if ("event_date" in update && settings) {
      const due = followEventDueDate(invoice, before.event_date ?? null, update.event_date, settings);
      if (due && due !== invoice.due_date) update.due_date = due;
      const balanceDue = update.due_date ?? invoice.due_date;
      if (balanceDue && invoice.deposit_due_date && invoice.deposit_due_date > balanceDue) {
        update.deposit_due_date = balanceDue;
      }
    }
    if (Object.keys(update).length === 0 && kept.length === 0) continue;

    if (Object.keys(update).length > 0) {
      const { error } = await admin.from("invoices").update(update).eq("id", invoice.id);
      if (error) {
        console.error("[invoices] syncInvoicesFromJob", error);
        continue;
      }
      updated.push(invoice.invoice_number);
    }

    const changes = diffInvoiceFields(current, update, Object.keys(update));
    const describe = (c: InvoiceFieldChange) => `${c.label} ${c.from ?? "—"} → ${c.to ?? "—"}`;
    const keptText = kept.length
      ? `kept the invoice's own ${kept.map((c) => c.label.toLowerCase()).join(", ")}`
      : null;
    const summary = changes.length
      ? `Updated from job: ${[changes.map(describe).join("; "), keptText].filter(Boolean).join(" · ")}`
      : `Job details changed — ${keptText}`;
    await logInvoiceEvent({
      invoiceId: invoice.id,
      actorUserId: input.actorUserId,
      eventType: "synced_from_job",
      summary,
      metadata: {
        job_id: input.after.id,
        changes,
        kept_invoice_values: kept,
        invoice_status: invoice.status,
      },
    });
  }

  return { updated };
}

export type InvoiceSaveInput = {
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  company_name?: string | null;
  billing_address?: string | null;
  po_number?: string | null;
  currency?: string | null;
  event_date?: string | null;
  event_type?: string | null;
  venue_name?: string | null;
  venue_address?: string | null;
  customer_venue_id?: string | null;
  issue_date?: string | null;
  due_date?: string | null;
  language?: string | null;
  tax_mode?: string | null;
  gst_rate?: number | null;
  qst_rate?: number | null;
  deposit_mode?: string | null;
  deposit_percent?: number | null;
  deposit_fixed_cents?: number | null;
  deposit_due_date?: string | null;
  notes?: string | null;
  terms?: string | null;
  internal_notes?: string | null;
  line_items?: Array<
    {
      description?: string;
      quantity?: number;
      unit_label?: string | null;
      unit_price_cents?: number;
      is_taxable?: boolean;
    } & InvoiceLineInventoryInput
  >;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function cleanText(value: unknown, max = 4000): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function cleanDate(value: unknown): string | null {
  return typeof value === "string" && ISO_DATE.test(value) ? value : null;
}

function cleanRate(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 && n <= 1 ? n : fallback;
}

export async function saveInvoice(
  invoiceId: string,
  input: InvoiceSaveInput,
  ownerUserId: string
): Promise<InvoiceWithRelations | { error: string }> {
  const current = await fetchInvoiceById(invoiceId);
  if (!current) return { error: "Invoice not found." };

  const update: Record<string, unknown> = {};
  const textKeys = [
    "customer_name",
    "customer_email",
    "customer_phone",
    "company_name",
    "billing_address",
    "po_number",
    "event_type",
    "venue_name",
    "venue_address",
    "notes",
    "terms",
    "internal_notes",
  ] as const;
  for (const key of textKeys) {
    if (key in input) update[key] = cleanText(input[key], key === "venue_address" ? 400 : 4000);
  }
  if ("customer_venue_id" in input) {
    const venueId = typeof input.customer_venue_id === "string" ? input.customer_venue_id : null;
    if (venueId) {
      const { data: venue } = await createAdminSupabaseClient()
        .from("customer_venues")
        .select("customer_id")
        .eq("id", venueId)
        .maybeSingle();
      if (!venue || (current.customer_id && venue.customer_id !== current.customer_id)) {
        return { error: "That saved venue doesn't belong to this customer." };
      }
    }
    update.customer_venue_id = venueId;
  }
  for (const key of ["event_date", "due_date", "deposit_due_date"] as const) {
    if (key in input) update[key] = cleanDate(input[key]);
  }
  if (input.issue_date !== undefined) {
    const issue = cleanDate(input.issue_date);
    if (issue) update.issue_date = issue;
  }
  if (input.language !== undefined) {
    update.language = normalizeCustomerLanguage(input.language);
  }
  if (input.currency === "CAD" || input.currency === "USD") {
    update.currency = input.currency;
  }
  if (input.tax_mode && isQuoteTaxMode(input.tax_mode)) {
    update.tax_mode = input.tax_mode;
  }
  if (input.gst_rate !== undefined) update.gst_rate = cleanRate(input.gst_rate, current.gst_rate);
  if (input.qst_rate !== undefined) update.qst_rate = cleanRate(input.qst_rate, current.qst_rate);

  let depositMode: DepositMode = current.deposit_mode;
  if (isDepositMode(input.deposit_mode)) {
    depositMode = input.deposit_mode;
    update.deposit_mode = depositMode;
  }
  if (input.deposit_percent !== undefined && input.deposit_percent !== null) {
    update.deposit_percent = clampPercent(input.deposit_percent);
  }
  if (depositMode === "fixed" && input.deposit_fixed_cents != null) {
    update.deposit_cents = Math.max(0, Math.round(Number(input.deposit_fixed_cents) || 0));
  }

  const venueTouched = ["venue_name", "venue_address", "customer_venue_id"].some((f) => f in update);
  const venueName = ("venue_name" in update ? update.venue_name : current.venue_name) as string | null;
  const venueLinked = "customer_venue_id" in update ? update.customer_venue_id : current.customer_venue_id;
  if (venueTouched && current.customer_id && venueName && !venueLinked) {
    const venue = await ensureCustomerVenue({
      customerId: current.customer_id,
      venueName,
      venueAddress: ("venue_address" in update ? update.venue_address : current.venue_address) as string | null,
      actor: { userId: ownerUserId },
      source: { kind: "invoice", id: invoiceId, ref: `Invoice ${current.invoice_number}` },
    });
    if (venue) update.customer_venue_id = venue.id;
  }

  const admin = createAdminSupabaseClient();
  if (Object.keys(update).length > 0) {
    const { error } = await admin.from("invoices").update(update).eq("id", invoiceId);
    if (error) {
      console.error("[invoices] save header", error);
      return { error: "Could not save invoice." };
    }
  }

  if (Array.isArray(input.line_items)) {
    const incoming = input.line_items.slice(0, 200);
    const known = await resolveKnownLinks(incoming);
    const rows = incoming.map((line, index) => {
      const quantity = Number(line.quantity);
      const qty = Number.isFinite(quantity) ? Math.max(0, quantity) : 0;
      const unit = normalizeUnitPriceCents(line.unit_price_cents);
      return {
        invoice_id: invoiceId,
        description: (line.description || "").trim().slice(0, 2000),
        quantity: qty,
        unit_label: cleanText(line.unit_label, 40),
        unit_price_cents: unit,
        line_total_cents: computeLineTotalCents(qty, unit),
        is_taxable: line.is_taxable !== false,
        sort_order: index,
        ...inventoryLineFields(line, known),
      };
    });
    const { error: deleteError } = await admin
      .from("invoice_line_items")
      .delete()
      .eq("invoice_id", invoiceId);
    if (deleteError) {
      console.error("[invoices] clear lines", deleteError);
      return { error: "Could not save line items." };
    }
    if (rows.length > 0) {
      const { error } = await admin.from("invoice_line_items").insert(rows);
      if (error) {
        console.error("[invoices] insert lines", error);
        return { error: "Could not save line items." };
      }
    }
  }

  await recalculateInvoice(invoiceId, ownerUserId);
  const after = await fetchInvoiceById(invoiceId);
  if (after) {
    const changes = diffInvoiceFields(
      current as unknown as Record<string, unknown>,
      after as unknown as Record<string, unknown>,
      [
        ...Object.keys(update).filter((key) => key !== "deposit_cents"),
        "subtotal_cents",
        "total_cents",
        "deposit_cents",
        "balance_due_cents",
      ]
    );
    const lineDiff = Array.isArray(input.line_items)
      ? diffInvoiceLines(current.line_items, after.line_items)
      : { added: [], removed: [], reordered: false };
    const lineParts = [
      lineDiff.added.length ? `${lineDiff.added.length} line${lineDiff.added.length > 1 ? "s" : ""} added` : null,
      lineDiff.removed.length ? `${lineDiff.removed.length} line${lineDiff.removed.length > 1 ? "s" : ""} removed` : null,
      lineDiff.reordered ? "lines reordered" : null,
    ].filter(Boolean) as string[];

    if (changes.length > 0 || lineParts.length > 0) {
      const labels = changes
        .filter((c) => !["subtotal_cents", "total_cents", "balance_due_cents"].includes(c.field))
        .map((c) => c.label);
      const totalChange = changes.find((c) => c.field === "total_cents");
      const summaryParts = [
        [...labels, ...lineParts].join(", "),
        totalChange ? `total ${totalChange.from ?? "$0"} → ${totalChange.to ?? "$0"}` : null,
      ].filter(Boolean);
      await logInvoiceEvent({
        invoiceId,
        actorUserId: ownerUserId,
        eventType: "invoice_edited",
        summary: `Edited: ${summaryParts.join(" · ")}`,
        metadata: {
          changes,
          lines_added: lineDiff.added,
          lines_removed: lineDiff.removed,
          lines_reordered: lineDiff.reordered,
        },
      });
    }
  }

  const saved = await fetchInvoiceById(invoiceId, { includeEvents: true });
  return saved ?? { error: "Invoice not found." };
}

export async function addInvoicePayment(
  invoiceId: string,
  input: {
    kind: PaymentKind;
    amountCents: number;
    paidOn?: string | null;
    method?: string | null;
    reference?: string | null;
    note?: string | null;
  },
  ownerUserId: string
): Promise<{ ok: true } | { error: string }> {
  const amount = Math.round(Number(input.amountCents) || 0);
  if (amount <= 0) return { error: "Payment amount must be more than $0." };

  const invoice = await fetchInvoiceById(invoiceId);
  if (!invoice) return { error: "Invoice not found." };
  if (invoice.status === "void") return { error: "This invoice is void." };

  const admin = createAdminSupabaseClient();
  const { data: payment, error } = await admin
    .from("invoice_payments")
    .insert({
      invoice_id: invoiceId,
      kind: input.kind,
      amount_cents: amount,
      paid_on: cleanDate(input.paidOn) ?? todayIsoDate(),
      method: (input.method || "").trim().slice(0, 60),
      reference: cleanText(input.reference, 200),
      note: cleanText(input.note, 1000),
      recorded_by: ownerUserId,
    })
    .select("*")
    .single();
  if (error || !payment) {
    console.error("[invoices] add payment", error);
    return { error: "Could not record payment." };
  }

  const label =
    input.kind === "refund"
      ? "Refund recorded"
      : input.kind === "deposit"
        ? "Deposit received"
        : "Payment received";
  await logInvoiceEvent({
    invoiceId,
    actorUserId: ownerUserId,
    eventType: input.kind === "refund" ? "refund_recorded" : "payment_recorded",
    summary: `${label}: ${describePayment(payment as InvoicePaymentRow)}`,
    metadata: {
      ...paymentAuditMetadata(payment as InvoicePaymentRow),
      balance_before_cents: invoice.balance_due_cents,
    },
  });
  await recalculateInvoice(invoiceId, ownerUserId);
  if (invoice.job_id) {
    await recordJobEvent({
      jobId: invoice.job_id,
      actorUserId: ownerUserId,
      actorRole: "owner",
      eventType: "invoice_payment",
      title: `${label} on ${invoice.invoice_number}`,
      body: formatCadFromCents(amount),
      customerVisible: input.kind !== "refund",
      metadata: { invoice_id: invoiceId },
    });
  }
  return { ok: true };
}

/** Amount for the "deposit received" / "paid in full" shortcuts. */
export function quickPaymentAmount(
  invoice: InvoiceRow,
  kind: "deposit" | "full"
): number {
  if (kind === "full") return Math.max(0, invoice.balance_due_cents);
  return computeAmountDue(invoice).depositOutstandingCents;
}

export async function deleteInvoicePayment(
  invoiceId: string,
  paymentId: string,
  ownerUserId: string
): Promise<{ ok: true } | { error: string }> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("invoice_payments")
    .delete()
    .eq("id", paymentId)
    .eq("invoice_id", invoiceId)
    .select("*")
    .maybeSingle();
  if (error) {
    console.error("[invoices] delete payment", error);
    return { error: "Could not remove payment." };
  }
  if (data) {
    const payment = data as InvoicePaymentRow;
    await logInvoiceEvent({
      invoiceId,
      actorUserId: ownerUserId,
      eventType: "payment_removed",
      summary: `Removed ${payment.kind}: ${describePayment(payment)}`,
      metadata: paymentAuditMetadata(payment),
    });
  }
  await recalculateInvoice(invoiceId, ownerUserId);
  return { ok: true };
}

export async function clearInvoicePayments(
  invoiceId: string,
  ownerUserId: string
): Promise<{ ok: true } | { error: string }> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("invoice_payments")
    .delete()
    .eq("invoice_id", invoiceId)
    .select("*");
  if (error) {
    console.error("[invoices] clear payments", error);
    return { error: "Could not mark unpaid." };
  }
  const removed = (data ?? []) as InvoicePaymentRow[];
  if (removed.length > 0) {
    await logInvoiceEvent({
      invoiceId,
      actorUserId: ownerUserId,
      eventType: "marked_unpaid",
      summary: `Marked unpaid — removed ${removed.length} payment${removed.length > 1 ? "s" : ""} totalling ${formatCadFromCents(sumPaymentsCents(removed))}`,
      metadata: { payments: removed.map(paymentAuditMetadata) },
    });
  }
  await recalculateInvoice(invoiceId, ownerUserId);
  return { ok: true };
}

export type InvoiceStatusAction = "mark_sent" | "revert_draft" | "void" | "unvoid";

export async function setInvoiceStatus(
  invoiceId: string,
  action: InvoiceStatusAction,
  ownerUserId: string
): Promise<{ ok: true } | { error: string }> {
  const invoice = await fetchInvoiceById(invoiceId);
  if (!invoice) return { error: "Invoice not found." };

  const update: Record<string, unknown> = {};
  let summary = "";
  if (action === "mark_sent") {
    update.sent_at = invoice.sent_at ?? new Date().toISOString();
    if (invoice.status === "draft") update.status = "sent";
    summary = "Marked as sent";
  } else if (action === "revert_draft") {
    update.sent_at = null;
    if (invoice.status === "sent") update.status = "draft";
    summary = "Reverted to draft";
  } else if (action === "void") {
    update.status = "void";
    update.voided_at = new Date().toISOString();
    summary = "Invoice voided";
  } else {
    update.status = invoice.sent_at ? "sent" : "draft";
    update.voided_at = null;
    summary = "Invoice restored from void";
  }

  const admin = createAdminSupabaseClient();
  const { error } = await admin.from("invoices").update(update).eq("id", invoiceId);
  if (error) {
    console.error("[invoices] set status", error);
    return { error: "Could not update status." };
  }
  await logInvoiceEvent({
    invoiceId,
    actorUserId: ownerUserId,
    eventType: `status_${action}`,
    summary,
    metadata: { from: invoice.status, action },
  });
  await recalculateInvoice(invoiceId, ownerUserId);
  return { ok: true };
}

export async function deleteDraftInvoice(
  invoiceId: string,
  ownerUserId: string
): Promise<{ ok: true } | { error: string }> {
  const invoice = await fetchInvoiceById(invoiceId);
  if (!invoice) return { error: "Invoice not found." };
  if (invoice.status !== "draft" || invoice.payments.length > 0) {
    return { error: "Only unsent drafts with no payments can be deleted. Void it instead." };
  }
  const snapshot = {
    invoice_number: invoice.invoice_number,
    job_id: invoice.job_id,
    quote_id: invoice.quote_id,
    customer_name: invoice.customer_name,
    total_cents: invoice.total_cents,
    deposit_cents: invoice.deposit_cents,
    due_date: invoice.due_date,
    line_items: invoice.line_items.map(describeLine),
  };
  await logInvoiceEvent({
    invoiceId,
    actorUserId: ownerUserId,
    eventType: "invoice_deleted",
    summary: `Draft ${invoice.invoice_number} deleted (total ${formatCadFromCents(invoice.total_cents)})`,
    metadata: snapshot,
  });
  const admin = createAdminSupabaseClient();
  const { error } = await admin.from("invoices").delete().eq("id", invoiceId);
  if (error) {
    console.error("[invoices] delete draft", error);
    return { error: "Could not delete invoice." };
  }
  if (invoice.job_id) {
    await recordJobEvent({
      jobId: invoice.job_id,
      actorUserId: ownerUserId,
      actorRole: "owner",
      eventType: "invoice_deleted",
      title: `Draft invoice ${invoice.invoice_number} deleted`,
      body: `Total ${formatCadFromCents(invoice.total_cents)}`,
      customerVisible: false,
      metadata: snapshot,
    });
  }
  return { ok: true };
}

export async function issueInvoiceToken(
  invoiceId: string,
  siteUrl: string,
  actorUserId?: string | null,
  options?: { reset?: boolean }
): Promise<string> {
  const { token, hash } = createQuoteToken();
  const expiresAt = new Date(Date.now() + INVOICE_TOKEN_TTL_MS).toISOString();
  const admin = createAdminSupabaseClient();
  const { error } = await admin
    .from("invoices")
    .update({ public_token_hash: hash, public_token_expires_at: expiresAt })
    .eq("id", invoiceId);
  if (error) {
    console.error("[invoices] issue token", error);
    throw new Error("Could not create invoice link.");
  }
  await logInvoiceEvent({
    invoiceId,
    actorUserId,
    eventType: "link_issued",
    summary: options?.reset
      ? "Client link reset — the previous link no longer works"
      : "Client link created",
    metadata: { token, reset: Boolean(options?.reset), expires_at: expiresAt },
  });
  return buildPublicInvoiceUrl(siteUrl, token);
}

export async function findActiveInvoiceUrl(
  invoiceId: string,
  siteUrl: string
): Promise<string | null> {
  const admin = createAdminSupabaseClient();
  const { data: invoice } = await admin
    .from("invoices")
    .select("public_token_hash, public_token_expires_at")
    .eq("id", invoiceId)
    .maybeSingle();
  if (!invoice?.public_token_hash) return null;
  if (
    invoice.public_token_expires_at &&
    new Date(invoice.public_token_expires_at as string).getTime() < Date.now()
  ) {
    return null;
  }
  const { data: events } = await admin
    .from("invoice_events")
    .select("metadata")
    .eq("invoice_id", invoiceId)
    .eq("event_type", "link_issued")
    .order("created_at", { ascending: false })
    .limit(10);
  for (const event of events ?? []) {
    const token = (event.metadata as Record<string, unknown> | null)?.token;
    if (typeof token === "string" && hashQuoteToken(token) === invoice.public_token_hash) {
      return buildPublicInvoiceUrl(siteUrl, token);
    }
  }
  return null;
}

export async function ensureInvoicePublicUrl(
  invoiceId: string,
  siteUrl: string,
  actorUserId?: string | null
): Promise<string> {
  return (
    (await findActiveInvoiceUrl(invoiceId, siteUrl)) ??
    (await issueInvoiceToken(invoiceId, siteUrl, actorUserId))
  );
}

export async function fetchInvoiceByPublicToken(
  token: string
): Promise<InvoiceWithRelations | null> {
  if (!token || token.length < 32) return null;
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("invoices")
    .select("id, public_token_expires_at")
    .eq("public_token_hash", hashQuoteToken(token))
    .maybeSingle();
  if (error || !data) {
    if (error) console.error("[invoices] fetchInvoiceByPublicToken", error);
    return null;
  }
  if (
    data.public_token_expires_at &&
    new Date(data.public_token_expires_at as string).getTime() < Date.now()
  ) {
    return null;
  }
  return fetchInvoiceById(data.id as string);
}

export async function markInvoiceViewed(invoiceId: string): Promise<void> {
  const admin = createAdminSupabaseClient();
  const { error } = await admin
    .from("invoices")
    .update({ viewed_at: new Date().toISOString() })
    .eq("id", invoiceId)
    .is("viewed_at", null);
  if (error) console.error("[invoices] markInvoiceViewed", error);
}

export function toCustomerSafeInvoice(
  invoice: InvoiceWithRelations
): CustomerSafeInvoice {
  const {
    internal_notes: _internal,
    public_token_hash: _hash,
    created_by_user_id: _creator,
    events: _events,
    payments,
    ...rest
  } = invoice;
  void _internal;
  void _hash;
  void _creator;
  void _events;
  return {
    ...rest,
    payments: payments.map((p) => ({
      id: p.id,
      kind: p.kind,
      amount_cents: p.amount_cents,
      paid_on: p.paid_on,
      method: p.method,
    })),
  };
}

export async function listCustomerInvoicesForJob(
  jobId: string
): Promise<InvoiceRow[]> {
  const invoices = await listInvoicesForJob(jobId);
  return invoices.filter((inv) => inv.status !== "draft");
}

async function customerIdsForUser(user: User): Promise<string[]> {
  const admin = createAdminSupabaseClient();
  const { data } = await admin.from("customers").select("id").eq("user_id", user.id);
  return ((data ?? []) as { id: string }[]).map((row) => row.id);
}

function verifiedEmail(user: User): string | null {
  const email = (user.email || "").trim().toLowerCase();
  return email && user.email_confirmed_at ? email : null;
}

export async function getCustomerInvoice(
  invoiceId: string,
  user: User
): Promise<InvoiceWithRelations | null> {
  const invoice = await fetchInvoiceById(invoiceId);
  if (!invoice || invoice.status === "draft") return null;
  if (invoice.job_id && (await getCustomerJob(invoice.job_id, user))) return invoice;
  const email = verifiedEmail(user);
  if (email && (invoice.customer_email || "").trim().toLowerCase() === email) return invoice;
  if (invoice.customer_id && (await customerIdsForUser(user)).includes(invoice.customer_id)) {
    return invoice;
  }
  return null;
}

/** Every sent invoice the signed-in client can open (jobs, linked customer, verified email). */
export async function listCustomerInvoices(user: User): Promise<InvoiceRow[]> {
  const admin = createAdminSupabaseClient();
  const [jobs, customerIds] = await Promise.all([listCustomerJobs(user), customerIdsForUser(user)]);
  const email = verifiedEmail(user);
  const filters: string[] = [];
  if (jobs.length > 0) filters.push(`job_id.in.(${jobs.map((job) => job.id).join(",")})`);
  if (customerIds.length > 0) filters.push(`customer_id.in.(${customerIds.join(",")})`);
  if (email && !/[,()]/.test(email)) filters.push(`customer_email.ilike.${email.replace(/[\\%_]/g, "\\$&")}`);
  if (filters.length === 0) return [];
  const { data, error } = await admin
    .from("invoices")
    .select("*")
    .or(filters.join(","))
    .neq("status", "draft")
    .order("issue_date", { ascending: false })
    .limit(200);
  if (error) {
    console.error("[invoices] listCustomerInvoices", error);
    return [];
  }
  return (data ?? []).map((row) => normalizeInvoiceRow(row));
}
