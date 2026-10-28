import type { User } from "@supabase/supabase-js";
import {
  DEFAULT_GST_RATE,
  DEFAULT_QST_RATE,
  type CustomerSafeQuote,
  type QuoteBillTo,
  type QuoteCustomerRequestRow,
  type QuoteEventRow,
  type QuoteEventType,
  type QuoteLineItemRow,
  type QuoteRequestStatus,
  type QuoteRequestType,
  type QuoteRow,
  type QuoteStatus,
  type QuoteTaxCategory,
  type QuoteTaxMode,
  computeLineTotalCents,
  computeQuoteTaxTotals,
  customerQuoteDisplayRef,
  customerQuoteLineStatus,
  customerQuoteStatus,
  effectiveQuoteStatus,
  formatQuoteDisplayRef,
  hasPendingRenewalRequest,
  QUOTE_RENEWAL_REQUEST_TITLE,
  normalizeManualTaxLines,
  normalizeUnitPriceCents,
  linesMissingTranslation,
  textInLanguage,
} from "@/data/quotes";
import { quotePaymentTermsFrom } from "@/data/quote-payment-terms";
import {
  normalizeCustomerLanguage,
  type CustomerLanguage,
} from "@/data/customer-language";
import {
  initialEstimateFormData,
  type EstimateFormData,
} from "@/data/estimate";
import { formatEventPlanReference, type EventPlanSubmissionRow } from "@/data/event-plans";
import { parseEventBuilderBrief } from "@/data/event-builder/brief";
import { formatCustomerBillingAddress, type CustomerRow } from "@/data/customers";
import { isEmailVerified } from "@/lib/auth";
import { fetchCustomerById, findCustomerByEmail } from "@/lib/customers";
import {
  fetchEstimateById,
  type EstimateRequestRow,
} from "@/lib/estimate-access";
import { buildEstimateInsertRow } from "@/lib/estimate-server";
import {
  mapEventBuilderBriefToEstimate,
  mergeEstimatePrefill,
} from "@/lib/event-builder/map-brief-to-estimate";
import {
  getLocalizedDocumentText,
  quoteTermsNeedTranslation,
  resolveQuoteTerms,
  resolveQuoteTermsForView,
} from "@/lib/document-texts";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  buildStudioQuoteCustomerNotes,
  buildStudioQuoteOwnerNotes,
  buildStudioQuotePreview,
  loadStudioQuoteSource,
  type StudioQuotePreview,
  type StudioQuoteSource,
} from "@/lib/studio-quote-converter";
import { listProductCategories } from "@/lib/product-categories";
import { resolveProductCategoryLabelFr } from "@/data/product-categories";
import {
  buildPublicQuoteUrl,
  buildQuoteDisplayRef,
  createQuoteToken,
  hashQuoteToken,
  resolveOpportunityDisplayRef,
} from "@/lib/quote-tokens";

export type QuoteWithRelations = QuoteRow & {
  line_items: QuoteLineItemRow[];
  requests: QuoteCustomerRequestRow[];
  events?: QuoteEventRow[];
  bill_to?: QuoteBillTo | null;
};

function normalizeEmail(email: string | null | undefined): string {
  return (email || "").trim().toLowerCase();
}

export function customerCanAccessQuote(
  quote: Pick<QuoteRow, "customer_email" | "estimate_request_id">,
  user: User,
  estimate?: Pick<EstimateRequestRow, "user_id" | "customer_email"> | null
): boolean {
  const userEmail = normalizeEmail(user.email);
  const quoteEmail = normalizeEmail(quote.customer_email);

  if (estimate?.user_id && estimate.user_id === user.id) {
    return true;
  }

  if (userEmail && quoteEmail && userEmail === quoteEmail && isEmailVerified(user)) {
    return true;
  }

  if (
    estimate &&
    userEmail &&
    normalizeEmail(estimate.customer_email) === userEmail &&
    isEmailVerified(user)
  ) {
    return true;
  }

  return false;
}

export function toCustomerSafeQuote(
  quote: QuoteWithRelations,
  options?: { shareUrl?: string | null }
): CustomerSafeQuote {
  return {
    id: quote.id,
    estimate_request_id: quote.estimate_request_id,
    opportunity_ref: quote.opportunity_ref,
    revision_number: quote.revision_number,
    quote_display_ref: customerQuoteDisplayRef(quote),
    customer_name: quote.customer_name,
    customer_email: quote.customer_email,
    event_date: quote.event_date,
    event_start_time: quote.event_start_time ?? null,
    event_end_time: quote.event_end_time ?? null,
    install_date: quote.install_date ?? null,
    install_start_time: quote.install_start_time ?? null,
    install_end_time: quote.install_end_time ?? null,
    teardown_date: quote.teardown_date ?? null,
    teardown_start_time: quote.teardown_start_time ?? null,
    teardown_end_time: quote.teardown_end_time ?? null,
    event_type: quote.event_type,
    venue_name: quote.venue_name,
    venue_address: quote.venue_address ?? null,
    city_area: quote.city_area,
    ...quotePaymentTermsFrom(quote),
    status: customerQuoteStatus(effectiveQuoteStatus(quote.status, quote.valid_until)),
    language: normalizeCustomerLanguage(quote.language),
    currency: quote.currency,
    subtotal_cents: quote.subtotal_cents,
    total_cents: quote.total_cents,
    tax_mode: quote.tax_mode ?? "none",
    gst_rate: Number(quote.gst_rate ?? DEFAULT_GST_RATE),
    qst_rate: Number(quote.qst_rate ?? DEFAULT_QST_RATE),
    taxable_subtotal_cents: quote.taxable_subtotal_cents ?? 0,
    nontaxable_subtotal_cents: quote.nontaxable_subtotal_cents ?? 0,
    gst_cents: quote.gst_cents ?? 0,
    qst_cents: quote.qst_cents ?? 0,
    manual_tax_label: quote.manual_tax_label ?? null,
    manual_tax_cents: quote.manual_tax_cents ?? 0,
    manual_tax_lines: normalizeManualTaxLines(quote.manual_tax_lines),
    total_before_tax_cents:
      quote.total_before_tax_cents ?? quote.subtotal_cents ?? 0,
    total_tax_cents: quote.total_tax_cents ?? 0,
    valid_until: quote.valid_until,
    customer_notes: quote.customer_notes,
    terms: quote.terms,
    sent_at: quote.sent_at,
    accepted_at: quote.accepted_at,
    accepted_by_name: quote.accepted_by_name ?? null,
    declined_at: quote.declined_at,
    declined_by_name: quote.declined_by_name ?? null,
    created_at: quote.created_at,
    updated_at: quote.updated_at,
    line_items: (quote.line_items || [])
      .filter((item) => item.customer_visible)
      .map((item) => ({ ...item, status: customerQuoteLineStatus(item) })),
    requests: quote.requests || [],
    share_url: options?.shareUrl ?? null,
    bill_to: quote.bill_to ?? null,
  };
}

/**
 * The quote's customer-facing content in one language — line descriptions,
 * customer notes and terms — with `language` set to that language. Amounts
 * and every other field are unchanged, so both versions stay equivalent.
 */
export async function localizeQuote(
  quote: QuoteWithRelations,
  viewLanguage: CustomerLanguage
): Promise<QuoteWithRelations> {
  const baseLanguage = normalizeCustomerLanguage(quote.language);
  return {
    ...quote,
    language: viewLanguage,
    customer_notes:
      textInLanguage(
        quote.customer_notes,
        quote.customer_notes_translated,
        baseLanguage,
        viewLanguage
      ) || null,
    terms: await resolveQuoteTermsForView(
      quote.terms,
      baseLanguage,
      viewLanguage,
      quote.terms_translated
    ),
    line_items: (quote.line_items || []).map((item) => ({
      ...item,
      description: textInLanguage(
        item.description,
        item.description_translated,
        baseLanguage,
        viewLanguage
      ),
    })),
  };
}

export function otherLanguageName(language: string | null | undefined): string {
  return normalizeCustomerLanguage(language) === "fr" ? "English" : "French";
}

/**
 * Customer-facing text that has no translation yet: visible line items,
 * customer notes and custom terms. Both versions must be complete to send.
 */
export async function missingQuoteTranslations(
  quote: QuoteWithRelations
): Promise<string[]> {
  const missing: string[] = [];
  const lines = linesMissingTranslation(quote.line_items || []);
  if (lines.length > 0) {
    missing.push(`${lines.length} line item${lines.length === 1 ? "" : "s"}`);
  }
  if (quote.customer_notes?.trim() && !quote.customer_notes_translated?.trim()) {
    missing.push("customer notes");
  }
  if (
    await quoteTermsNeedTranslation(
      quote.terms,
      quote.terms_translated,
      normalizeCustomerLanguage(quote.language)
    )
  ) {
    missing.push("custom terms");
  }
  return missing;
}

/** Customer-safe French and English versions, for the bilingual signing step. */
export async function toCustomerQuoteVersions(
  quote: QuoteWithRelations,
  patch: Partial<QuoteWithRelations> = {},
  options?: { shareUrl?: string | null }
): Promise<Record<CustomerLanguage, CustomerSafeQuote>> {
  const [fr, en] = await Promise.all(
    (["fr", "en"] as const).map((lang) => localizeQuote({ ...quote, ...patch }, lang))
  );
  return {
    fr: toCustomerSafeQuote(fr, options),
    en: toCustomerSafeQuote(en, options),
  };
}

export async function ensureOpportunityRef(
  estimateId: string
): Promise<string | null> {
  const admin = createAdminSupabaseClient();
  const { data: estimate, error } = await admin
    .from("estimate_requests")
    .select("id, opportunity_ref")
    .eq("id", estimateId)
    .maybeSingle();

  if (error || !estimate) {
    console.error("[quotes] ensureOpportunityRef load failed", error);
    return null;
  }

  if (estimate.opportunity_ref) {
    return estimate.opportunity_ref as string;
  }

  const { data: assigned, error: rpcError } = await admin.rpc(
    "assign_estimate_opportunity_ref",
    { p_estimate_id: estimateId }
  );

  if (rpcError) {
    console.error("[quotes] assign_estimate_opportunity_ref failed", rpcError);
    return null;
  }

  return typeof assigned === "string" ? assigned : null;
}

export async function logQuoteEvent(input: {
  quoteId: string;
  actorType: QuoteEventRow["actor_type"];
  actorUserId?: string | null;
  actorEmail?: string | null;
  eventType: QuoteEventType;
  summary: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const admin = createAdminSupabaseClient();
  const { error } = await admin.from("quote_events").insert({
    quote_id: input.quoteId,
    actor_type: input.actorType,
    actor_user_id: input.actorUserId ?? null,
    actor_email: input.actorEmail ?? null,
    event_type: input.eventType,
    summary: input.summary,
    metadata: input.metadata ?? {},
  });

  if (error) {
    console.error("[quotes] logQuoteEvent failed", error);
  }
}

export async function fetchQuoteById(
  id: string,
  options?: { includeEvents?: boolean }
): Promise<QuoteWithRelations | null> {
  const admin = createAdminSupabaseClient();
  const { data: quote, error } = await admin
    .from("quotes")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !quote) {
    if (error) console.error("[quotes] fetchQuoteById", error);
    return null;
  }

  const [{ data: lineItems }, { data: requests }, eventsResult, customer] =
    await Promise.all([
      admin
        .from("quote_line_items")
        .select("*")
        .eq("quote_id", id)
        .order("sort_order", { ascending: true }),
      admin
        .from("quote_customer_requests")
        .select("*")
        .eq("quote_id", id)
        .order("created_at", { ascending: false }),
      options?.includeEvents
        ? admin
            .from("quote_events")
            .select("*")
            .eq("quote_id", id)
            .order("created_at", { ascending: false })
            .limit(200)
        : Promise.resolve({ data: null }),
      quote.customer_id
        ? fetchCustomerById(quote.customer_id as string)
        : Promise.resolve(null),
    ]);

  return {
    ...(quote as QuoteRow),
    line_items: (lineItems || []) as QuoteLineItemRow[],
    requests: (requests || []) as QuoteCustomerRequestRow[],
    events: options?.includeEvents
      ? ((eventsResult.data || []) as QuoteEventRow[])
      : undefined,
    bill_to: customer ? quoteBillToFromCustomer(customer) : null,
  };
}

function quoteBillToFromCustomer(customer: CustomerRow): QuoteBillTo | null {
  const company = customer.company_name?.trim() || null;
  const address = formatCustomerBillingAddress(customer) || null;
  if (!company && !address) return null;
  return { company_name: company, address };
}

export async function fetchQuoteByPublicToken(
  token: string
): Promise<QuoteWithRelations | null> {
  if (!token || token.length < 32) return null;
  const admin = createAdminSupabaseClient();
  const tokenHash = hashQuoteToken(token);
  const { data: match, error } = await admin
    .from("quotes")
    .select("*")
    .eq("public_token_hash", tokenHash)
    // Guest links are issued on drafts for owner preview; cancel blocks the link.
    .neq("status", "cancelled")
    .maybeSingle();

  if (error) {
    console.error("[quotes] fetchQuoteByPublicToken", error);
    return null;
  }
  if (!match) return null;

  const quote = match as QuoteRow;
  if (quote.public_token_expires_at) {
    const expires = new Date(quote.public_token_expires_at).getTime();
    if (Number.isFinite(expires) && expires < Date.now()) return null;
  }

  return fetchQuoteById(quote.id);
}

export async function listQuotes(options?: {
  status?: QuoteStatus | null;
  limit?: number;
}): Promise<QuoteRow[]> {
  const admin = createAdminSupabaseClient();
  let query = admin
    .from("quotes")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(options?.limit ?? 200);

  if (options?.status) {
    query = query.eq("status", options.status);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[quotes] listQuotes", error);
    return [];
  }
  return (data || []) as QuoteRow[];
}

export async function listQuotesForEstimate(
  estimateRequestId: string
): Promise<QuoteRow[]> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("quotes")
    .select("*")
    .eq("estimate_request_id", estimateRequestId)
    .order("revision_number", { ascending: false });

  if (error) {
    console.error("[quotes] listQuotesForEstimate", error);
    return [];
  }
  return (data || []) as QuoteRow[];
}

export async function listQuotesForCustomer(user: User): Promise<QuoteRow[]> {
  const admin = createAdminSupabaseClient();
  const email = normalizeEmail(user.email);

  const { data: byUserEstimates } = await admin
    .from("estimate_requests")
    .select("id")
    .eq("user_id", user.id);

  const estimateIds = (byUserEstimates || []).map((row) => row.id as string);
  const byId = new Map<string, QuoteRow>();

  if (estimateIds.length > 0) {
    const { data, error } = await admin
      .from("quotes")
      .select("*")
      .in("estimate_request_id", estimateIds)
      .neq("status", "draft")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      console.error("[quotes] listQuotesForCustomer by estimate", error);
    } else {
      for (const row of (data || []) as QuoteRow[]) {
        byId.set(row.id, row);
      }
    }
  }

  if (email && isEmailVerified(user)) {
    const { data, error } = await admin
      .from("quotes")
      .select("*")
      .ilike("customer_email", email)
      .neq("status", "draft")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      console.error("[quotes] listQuotesForCustomer by email", error);
    } else {
      for (const row of (data || []) as QuoteRow[]) {
        byId.set(row.id, row);
      }
    }
  }

  return Array.from(byId.values()).sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export async function recalculateQuoteTotals(quoteId: string): Promise<void> {
  const admin = createAdminSupabaseClient();
  const [{ data: items }, { data: quote }] = await Promise.all([
    admin.from("quote_line_items").select("*").eq("quote_id", quoteId),
    admin
      .from("quotes")
      .select(
        "tax_mode, gst_rate, qst_rate, manual_tax_cents, manual_tax_label, manual_tax_lines"
      )
      .eq("id", quoteId)
      .maybeSingle(),
  ]);

  const taxMode =
    ((quote?.tax_mode as QuoteTaxMode | undefined) ?? "quebec_gst_qst");
  const storedManualTaxCents = Number(quote?.manual_tax_cents ?? 0);
  const manualTaxLines = normalizeManualTaxLines(quote?.manual_tax_lines);
  const totals = computeQuoteTaxTotals((items || []) as QuoteLineItemRow[], {
    tax_mode: taxMode,
    gst_rate: Number(quote?.gst_rate ?? DEFAULT_GST_RATE),
    qst_rate: Number(quote?.qst_rate ?? DEFAULT_QST_RATE),
    manual_tax_cents: storedManualTaxCents,
    manual_tax_lines: manualTaxLines,
  });

  await admin
    .from("quotes")
    .update({
      subtotal_cents: totals.subtotal_cents,
      taxable_subtotal_cents: totals.taxable_subtotal_cents,
      nontaxable_subtotal_cents: totals.nontaxable_subtotal_cents,
      gst_cents: totals.gst_cents,
      qst_cents: totals.qst_cents,
      // Preserve owner-entered manual amount when not in manual mode.
      manual_tax_cents:
        taxMode === "manual" ? totals.manual_tax_cents : storedManualTaxCents,
      total_before_tax_cents: totals.total_before_tax_cents,
      total_tax_cents: totals.total_tax_cents,
      total_cents: totals.total_cents,
    })
    .eq("id", quoteId);
}

export async function createQuoteFromEstimate(input: {
  estimate: EstimateRequestRow;
  createdByUserId?: string | null;
  /** Explicit choice; otherwise the customer's preference, then the estimate's language. */
  language?: CustomerLanguage | null;
}): Promise<{ quote: QuoteRow; created: boolean } | { error: string }> {
  const opportunityRef = await ensureOpportunityRef(input.estimate.id);
  if (!opportunityRef) {
    return { error: "Could not assign opportunity reference." };
  }

  const admin = createAdminSupabaseClient();
  const existing = await listQuotesForEstimate(input.estimate.id);
  if (existing.length > 0) {
    return { quote: existing[0], created: false };
  }

  const displayRef = buildQuoteDisplayRef(opportunityRef, 1);
  const customer = input.estimate.customer_id
    ? await fetchCustomerById(input.estimate.customer_id)
    : await findCustomerByEmail(input.estimate.customer_email);
  const language =
    input.language ??
    customer?.preferred_language ??
    normalizeCustomerLanguage(input.estimate.language);
  const defaultTerms = await getLocalizedDocumentText("quote.terms", language);
  const { data, error } = await admin
    .from("quotes")
    .insert({
      estimate_request_id: input.estimate.id,
      customer_id: input.estimate.customer_id ?? customer?.id ?? null,
      opportunity_ref: opportunityRef,
      revision_number: 1,
      quote_display_ref: displayRef,
      language,
      customer_name: input.estimate.customer_name,
      customer_email: input.estimate.customer_email,
      event_date: input.estimate.event_date,
      event_type: input.estimate.event_type,
      venue_name: input.estimate.venue_name,
      city_area: input.estimate.city_area,
      status: "draft",
      currency: customer?.currency ?? "CAD",
      tax_mode: customer?.tax_exempt ? "none" : "quebec_gst_qst",
      gst_rate: DEFAULT_GST_RATE,
      qst_rate: DEFAULT_QST_RATE,
      terms: defaultTerms,
      created_by_user_id: input.createdByUserId || null,
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("[quotes] createQuoteFromEstimate", error);
    return { error: error?.message || "Failed to create quote." };
  }

  await logQuoteEvent({
    quoteId: data.id,
    actorType: "owner",
    actorUserId: input.createdByUserId || null,
    eventType: "quote_created",
    summary: `Created ${displayRef}`,
    metadata: {
      opportunity_ref: opportunityRef,
      estimate_request_id: input.estimate.id,
    },
  });

  await admin
    .from("estimate_requests")
    .update({ status: "quoted" })
    .eq("id", input.estimate.id)
    .neq("status", "closed");

  return { quote: data as QuoteRow, created: true };
}

export type DirectQuoteInput = {
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  eventDate?: string | null;
  eventType?: string | null;
  venueName?: string | null;
  cityArea?: string | null;
  ownerNotes?: string | null;
  language?: CustomerLanguage;
  customerId?: string | null;
  createdByUserId: string;
};

/** Saved account preference for this email, else English. */
export async function findPreferredLanguageForEmail(
  email: string
): Promise<CustomerLanguage> {
  const normalized = normalizeEmail(email);
  if (!normalized) return "en";
  const customer = await findCustomerByEmail(normalized);
  if (customer) return customer.preferred_language;
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("user_profiles")
    .select("preferred_language")
    .ilike("email", normalized.replace(/[\\%_]/g, "\\$&"))
    .not("preferred_language", "is", null)
    .limit(1)
    .maybeSingle();
  return normalizeCustomerLanguage(data?.preferred_language);
}

export async function createDirectQuote(
  input: DirectQuoteInput
): Promise<{ quote: QuoteRow } | { error: string }> {
  const customerName = input.customerName.trim();
  const customerEmail = input.customerEmail.trim().toLowerCase();
  if (!customerName) {
    return { error: "Customer name is required." };
  }
  if (!customerEmail || !customerEmail.includes("@")) {
    return { error: "A valid customer email is required." };
  }

  const form: EstimateFormData = {
    ...initialEstimateFormData,
    name: customerName,
    email: customerEmail,
    phone: input.customerPhone?.trim() || "",
    eventType: input.eventType?.trim() || "",
    eventDate: input.eventDate?.trim() || "",
    venueName: input.venueName?.trim() || "",
    cityArea: input.cityArea?.trim() || "Montreal area",
    message: input.ownerNotes?.trim() || "",
    drapeGoals: ["full-room"],
    measurementsKnown: "help",
    floorPlanAvailable: "no",
    fabricDirections: ["recommend"],
  };

  const admin = createAdminSupabaseClient();
  const row = {
    ...buildEstimateInsertRow(form, {
      userId: input.createdByUserId,
      source: "admin_direct_quote",
      language:
        input.language ?? (await findPreferredLanguageForEmail(customerEmail)),
    }),
    source: "admin_direct_quote",
    status: "quoted",
    ...(input.customerId ? { customer_id: input.customerId } : {}),
    raw_payload: {
      ...form,
      created_via: "admin_direct_quote",
    },
  };

  const { data: inserted, error: estimateError } = await admin
    .from("estimate_requests")
    .insert(row)
    .select("*")
    .single();

  if (estimateError || !inserted) {
    console.error("[quotes] createDirectQuote estimate", estimateError);
    return {
      error: estimateError?.message || "Failed to create opportunity for quote.",
    };
  }

  const estimate = inserted as EstimateRequestRow;
  const quoteResult = await createQuoteFromEstimate({
    estimate,
    createdByUserId: input.createdByUserId,
    language: input.language ?? null,
  });

  if ("error" in quoteResult) {
    return quoteResult;
  }

  if (input.ownerNotes?.trim()) {
    await admin
      .from("quotes")
      .update({ owner_notes: input.ownerNotes.trim() })
      .eq("id", quoteResult.quote.id);
    quoteResult.quote.owner_notes = input.ownerNotes.trim();
  }

  return { quote: quoteResult.quote };
}

export async function ensureEstimateFromEventPlan(
  plan: EventPlanSubmissionRow
): Promise<{ estimate: EstimateRequestRow } | { error: string }> {
  const admin = createAdminSupabaseClient();

  if (plan.estimate_request_id) {
    const existing = await fetchEstimateById(plan.estimate_request_id);
    if (existing) return { estimate: existing };
  }

  const brief = parseEventBuilderBrief(plan.brief_json);
  if (!brief) {
    return { error: "Event plan brief is invalid." };
  }

  const mapped = mapEventBuilderBriefToEstimate(brief);
  const form: EstimateFormData = mergeEstimatePrefill(initialEstimateFormData, {
    ...mapped,
    name: plan.contact_name,
    email: plan.contact_email,
    phone: plan.contact_phone ?? "",
    eventType: plan.event_type || mapped.eventType || "",
    eventDate: plan.event_date || mapped.eventDate || "",
    venueName: plan.venue_name || mapped.venueName || "",
    cityArea: plan.city_area || mapped.cityArea || "Montreal area",
    message: [
      mapped.message?.trim(),
      plan.notes?.trim() ? `Customer notes:\n${plan.notes.trim()}` : null,
      `Source event plan: ${formatEventPlanReference(plan.id, plan.reference)}`,
    ]
      .filter(Boolean)
      .join("\n\n"),
  });

  if (!form.fabricDirections.length) {
    form.fabricDirections = ["recommend"];
  }
  if (!form.drapeGoals.length) {
    form.drapeGoals = ["full-room"];
  }
  if (!form.measurementsKnown) {
    form.measurementsKnown = "help";
  }
  if (!form.floorPlanAvailable) {
    form.floorPlanAvailable = "no";
  }

  const row = {
    ...buildEstimateInsertRow(form, {
      submittedFromUrl: plan.submitted_from_url,
      userAgent: plan.user_agent,
      userId: plan.owner_user_id,
      language: normalizeCustomerLanguage(plan.language),
    }),
    source: "event_plan_submission",
    status: "reviewed",
    raw_payload: {
      ...form,
      event_plan_submission_id: plan.id,
      event_plan_reference: formatEventPlanReference(plan.id, plan.reference),
      brief_json: plan.brief_json,
    },
  };

  const { data: inserted, error } = await admin
    .from("estimate_requests")
    .insert(row)
    .select("*")
    .single();

  if (error || !inserted) {
    console.error("[quotes] ensureEstimateFromEventPlan insert", error);
    return { error: error?.message || "Failed to create estimate from event plan." };
  }

  const estimate = inserted as EstimateRequestRow;

  const { error: linkError } = await admin
    .from("event_plan_submissions")
    .update({ estimate_request_id: estimate.id })
    .eq("id", plan.id);

  if (linkError) {
    console.error("[quotes] link event plan to estimate", linkError);
  }

  return { estimate };
}

export async function createQuoteFromEventPlan(input: {
  plan: EventPlanSubmissionRow;
  createdByUserId: string;
}): Promise<
  | { quote: QuoteRow; created: boolean; estimateId: string }
  | { error: string }
> {
  const estimateResult = await ensureEstimateFromEventPlan(input.plan);
  if ("error" in estimateResult) return estimateResult;

  const quoteResult = await createQuoteFromEstimate({
    estimate: estimateResult.estimate,
    createdByUserId: input.createdByUserId,
  });

  if ("error" in quoteResult) return quoteResult;

  const admin = createAdminSupabaseClient();
  await admin
    .from("event_plan_submissions")
    .update({
      estimate_request_id: estimateResult.estimate.id,
      status: "quoted",
    })
    .eq("id", input.plan.id)
    .neq("status", "archived");

  if (quoteResult.created) {
    const source = await loadStudioQuoteSource({ eventPlanId: input.plan.id });
    if (!("error" in source)) {
      const preview = await buildStudioQuotePreview(source);
      if (!preview.bom.isEmpty) {
        const filled = await fillQuoteFromStudioPreview({
          quoteId: quoteResult.quote.id,
          source,
          preview,
          actorUserId: input.createdByUserId,
        });
        if (!filled.ok) {
          console.error("[quotes] createQuoteFromEventPlan studio lines", filled.message);
        }
      }
    }
  }

  return {
    quote: quoteResult.quote,
    created: quoteResult.created,
    estimateId: estimateResult.estimate.id,
  };
}

export async function createQuoteRevision(input: {
  sourceQuoteId: string;
  createdByUserId: string;
}): Promise<{ quote: QuoteRow } | { error: string }> {
  const source = await fetchQuoteById(input.sourceQuoteId);
  if (!source) return { error: "Source quote not found." };

  const admin = createAdminSupabaseClient();
  const siblings = await listQuotesForEstimate(source.estimate_request_id);
  const nextRevision =
    Math.max(0, ...siblings.map((q) => q.revision_number)) + 1;
  const displayRef = formatQuoteDisplayRef(source.opportunity_ref, nextRevision);

  const { data, error } = await admin
    .from("quotes")
    .insert({
      estimate_request_id: source.estimate_request_id,
      customer_id: source.customer_id ?? null,
      opportunity_ref: source.opportunity_ref,
      revision_number: nextRevision,
      quote_display_ref: displayRef,
      customer_name: source.customer_name,
      customer_email: source.customer_email,
      event_date: source.event_date,
      event_start_time: source.event_start_time ?? null,
      event_end_time: source.event_end_time ?? null,
      install_date: source.install_date ?? null,
      install_start_time: source.install_start_time ?? null,
      install_end_time: source.install_end_time ?? null,
      teardown_date: source.teardown_date ?? null,
      teardown_start_time: source.teardown_start_time ?? null,
      teardown_end_time: source.teardown_end_time ?? null,
      event_type: source.event_type,
      venue_name: source.venue_name,
      venue_address: source.venue_address ?? null,
      customer_venue_id: source.customer_venue_id ?? null,
      city_area: source.city_area,
      ...quotePaymentTermsFrom(source),
      status: "draft",
      language: normalizeCustomerLanguage(source.language),
      currency: source.currency || "CAD",
      tax_mode: source.tax_mode || "quebec_gst_qst",
      gst_rate: Number(source.gst_rate ?? DEFAULT_GST_RATE),
      qst_rate: Number(source.qst_rate ?? DEFAULT_QST_RATE),
      manual_tax_label: source.manual_tax_label,
      manual_tax_cents: source.manual_tax_cents || 0,
      manual_tax_lines: normalizeManualTaxLines(source.manual_tax_lines),
      customer_notes: source.customer_notes,
      customer_notes_translated: source.customer_notes_translated ?? null,
      owner_notes: source.owner_notes,
      terms: await resolveQuoteTerms(
        source.terms,
        normalizeCustomerLanguage(source.language)
      ),
      terms_translated: source.terms_translated ?? null,
      created_by_user_id: input.createdByUserId,
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("[quotes] createQuoteRevision", error);
    return { error: error?.message || "Failed to create revision." };
  }

  if (source.line_items.length > 0) {
    const copies = source.line_items.map((item, index) => ({
      quote_id: data.id,
      category: item.category,
      category_label: item.category_label ?? null,
      category_label_fr: item.category_label_fr ?? null,
      description: item.description,
      description_translated: item.description_translated ?? null,
      quantity: item.quantity,
      unit_label: item.unit_label ?? null,
      unit_price_cents: item.unit_price_cents,
      line_total_cents: item.line_total_cents,
      status: item.status === "pending_owner_review" ? "priced" : item.status,
      customer_visible: item.customer_visible,
      is_taxable: item.is_taxable !== false,
      tax_category: item.tax_category || "standard",
      sort_order: item.sort_order ?? index,
      product_id: item.product_id ?? null,
      image_url: item.image_url ?? null,
      image_alt: item.image_alt ?? null,
    }));
    const { error: lineError } = await admin
      .from("quote_line_items")
      .insert(copies);
    if (lineError) {
      console.error("[quotes] copy line items", lineError);
    }
    await recalculateQuoteTotals(data.id);
  }

  await logQuoteEvent({
    quoteId: data.id,
    actorType: "owner",
    actorUserId: input.createdByUserId,
    eventType: "revision_created",
    summary: `Created ${displayRef} from ${formatQuoteDisplayRef(source.opportunity_ref, source.revision_number)}`,
    metadata: { source_quote_id: source.id },
  });

  return { quote: data as QuoteRow };
}

export async function issuePublicQuoteToken(quoteId: string): Promise<{
  token: string;
  expiresAt: string;
} | null> {
  const admin = createAdminSupabaseClient();
  const issued = createQuoteToken();
  const { error } = await admin
    .from("quotes")
    .update({
      public_token_hash: issued.hash,
      public_token_expires_at: issued.expiresAt,
    })
    .eq("id", quoteId);

  if (error) {
    console.error("[quotes] issuePublicQuoteToken", error);
    return null;
  }
  return { token: issued.token, expiresAt: issued.expiresAt };
}

/**
 * Recover the live guest `/quote/[token]` URL from event metadata when the
 * stored token still matches the quote’s current hash.
 */
export async function findActivePublicQuoteUrl(
  quoteId: string,
  siteUrl: string
): Promise<string | null> {
  const quote = await fetchQuoteById(quoteId);
  if (!quote?.public_token_hash) return null;

  if (quote.public_token_expires_at) {
    const expires = new Date(quote.public_token_expires_at).getTime();
    if (Number.isFinite(expires) && expires < Date.now()) return null;
  }

  const admin = createAdminSupabaseClient();
  const { data: events, error } = await admin
    .from("quote_events")
    .select("metadata, created_at")
    .eq("quote_id", quoteId)
    .order("created_at", { ascending: false })
    .limit(40);

  if (error) {
    console.error("[quotes] findActivePublicQuoteUrl", error);
    return null;
  }

  for (const row of events || []) {
    const meta = (row.metadata || {}) as Record<string, unknown>;
    const token =
      typeof meta.public_token === "string" ? meta.public_token : null;
    if (!token) continue;
    if (hashQuoteToken(token) !== quote.public_token_hash) continue;
    return buildPublicQuoteUrl(siteUrl, token);
  }

  return null;
}

/**
 * Return the active guest proposal URL, issuing a new token when needed.
 * Does not change quote status or send email.
 */
export async function ensurePublicQuoteUrl(input: {
  quoteId: string;
  siteUrl: string;
  actorType: QuoteEventRow["actor_type"];
  actorUserId?: string | null;
  actorEmail?: string | null;
}): Promise<string | null> {
  const existing = await findActivePublicQuoteUrl(input.quoteId, input.siteUrl);
  if (existing) return existing;

  const issued = await issuePublicQuoteToken(input.quoteId);
  if (!issued) return null;

  const publicUrl = buildPublicQuoteUrl(input.siteUrl, issued.token);
  await logQuoteEvent({
    quoteId: input.quoteId,
    actorType: input.actorType,
    actorUserId: input.actorUserId,
    actorEmail: input.actorEmail,
    eventType: "quote_edited",
    summary: "Guest proposal link ready",
    metadata: {
      public_token: issued.token,
      public_url: publicUrl,
      public_token_expires_at: issued.expiresAt,
    },
  });

  return publicUrl;
}

export async function markQuoteViewed(quoteId: string): Promise<void> {
  const admin = createAdminSupabaseClient();
  const quote = await fetchQuoteById(quoteId);
  if (!quote) return;
  if (quote.status === "draft" || quote.status === "cancelled") return;

  const updates: Record<string, unknown> = {};
  if (!quote.viewed_at) {
    updates.viewed_at = new Date().toISOString();
  }
  if (quote.status === "sent") {
    updates.status = "viewed";
  }

  if (Object.keys(updates).length > 0) {
    await admin.from("quotes").update(updates).eq("id", quoteId);
    await logQuoteEvent({
      quoteId,
      actorType: "public_link",
      eventType: "quote_viewed",
      summary: "Quote viewed",
    });
  }
}

export type LineItemInput = {
  id?: string;
  category: string;
  category_label?: string | null;
  description: string;
  /** Omit to keep the saved translation while the description is unchanged. */
  description_translated?: string | null;
  quantity: number;
  unit_label?: string | null;
  unit_price_cents: number;
  status?: string;
  customer_visible?: boolean;
  is_taxable?: boolean;
  tax_category?: QuoteTaxCategory | string;
  sort_order?: number;
  product_id?: string | null;
  image_url?: string | null;
  image_alt?: string | null;
};

export async function upsertLineItems(input: {
  quoteId: string;
  items: LineItemInput[];
  actorUserId?: string | null;
  actorEmail?: string | null;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const admin = createAdminSupabaseClient();
  const existing = await fetchQuoteById(input.quoteId);
  if (!existing) return { ok: false, message: "Quote not found." };

  const keepIds = new Set(
    input.items.filter((item) => item.id).map((item) => item.id as string)
  );
  const categories = await listProductCategories();

  for (const item of existing.line_items) {
    if (!keepIds.has(item.id)) {
      await admin.from("quote_line_items").delete().eq("id", item.id);
      await logQuoteEvent({
        quoteId: input.quoteId,
        actorType: "owner",
        actorUserId: input.actorUserId,
        actorEmail: input.actorEmail,
        eventType: "line_item_removed",
        summary: `Removed line item: ${item.description}`,
        metadata: { line_item_id: item.id },
      });
    }
  }

  for (let index = 0; index < input.items.length; index++) {
    const item = input.items[index];
    const quantity = Number(item.quantity) || 0;
    const unitPrice = normalizeUnitPriceCents(item.unit_price_cents);
    const lineTotal = computeLineTotalCents(quantity, unitPrice);
    const taxCategory =
      item.tax_category === "exempt" || item.tax_category === "custom"
        ? item.tax_category
        : "standard";
    const isTaxable =
      typeof item.is_taxable === "boolean"
        ? item.is_taxable
        : taxCategory !== "exempt";
    const categoryLabel = item.category_label?.trim() || null;
    const previous = item.id
      ? existing.line_items.find((line) => line.id === item.id)
      : undefined;
    const categoryLabelFr = categoryLabel
      ? resolveProductCategoryLabelFr(item.category, categories) ??
        (previous?.category === item.category
          ? previous.category_label_fr ?? null
          : null)
      : null;
    const payload = {
      quote_id: input.quoteId,
      category: item.category,
      category_label: categoryLabel,
      category_label_fr: categoryLabelFr,
      description: item.description.trim(),
      description_translated:
        item.description_translated !== undefined
          ? item.description_translated?.trim() || null
          : previous?.description === item.description.trim()
            ? previous.description_translated ?? null
            : null,
      quantity,
      unit_label: item.unit_label?.trim().slice(0, 40) || null,
      unit_price_cents: unitPrice,
      line_total_cents: lineTotal,
      status: item.status || "priced",
      customer_visible: item.customer_visible ?? true,
      is_taxable: isTaxable,
      tax_category: isTaxable ? taxCategory : "exempt",
      sort_order: item.sort_order ?? index,
      product_id: item.product_id ?? null,
      image_url: item.image_url?.trim() || null,
      image_alt: item.image_alt?.trim() || null,
    };

    if (item.id) {
      const { error } = await admin
        .from("quote_line_items")
        .update(payload)
        .eq("id", item.id)
        .eq("quote_id", input.quoteId);
      if (error) {
        return { ok: false, message: error.message };
      }
      await logQuoteEvent({
        quoteId: input.quoteId,
        actorType: "owner",
        actorUserId: input.actorUserId,
        actorEmail: input.actorEmail,
        eventType: "line_item_updated",
        summary: `Updated line item: ${payload.description}`,
        metadata: { line_item_id: item.id },
      });
    } else {
      const { error } = await admin.from("quote_line_items").insert(payload);
      if (error) {
        return { ok: false, message: error.message };
      }
      await logQuoteEvent({
        quoteId: input.quoteId,
        actorType: "owner",
        actorUserId: input.actorUserId,
        actorEmail: input.actorEmail,
        eventType: "line_item_added",
        summary: `Added line item: ${payload.description}`,
      });
    }
  }

  await recalculateQuoteTotals(input.quoteId);
  await logQuoteEvent({
    quoteId: input.quoteId,
    actorType: "owner",
    actorUserId: input.actorUserId,
    actorEmail: input.actorEmail,
    eventType: "quote_edited",
    summary: "Quote line items saved",
  });

  return { ok: true };
}

export async function createCustomerRequest(input: {
  quote: QuoteRow;
  requestType: QuoteRequestType;
  title: string;
  message?: string | null;
  sourceKey?: string | null;
  createdByEmail?: string | null;
  createdByUserId?: string | null;
  actorType: QuoteEventRow["actor_type"];
}): Promise<QuoteCustomerRequestRow | null> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("quote_customer_requests")
    .insert({
      quote_id: input.quote.id,
      estimate_request_id: input.quote.estimate_request_id,
      request_type: input.requestType,
      source_key: input.sourceKey ?? null,
      title: input.title.trim(),
      message: input.message?.trim() || null,
      status: "pending_owner_review",
      created_by_email: input.createdByEmail ?? null,
      created_by_user_id: input.createdByUserId ?? null,
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("[quotes] createCustomerRequest", error);
    return null;
  }

  const eventType: QuoteEventType =
    input.requestType === "add_on"
      ? "customer_requested_add_on"
      : input.requestType === "revision"
        ? "customer_requested_revision"
        : input.requestType === "question"
          ? "customer_question"
          : "customer_requested_add_on";

  await logQuoteEvent({
    quoteId: input.quote.id,
    actorType: input.actorType,
    actorUserId: input.createdByUserId,
    actorEmail: input.createdByEmail,
    eventType,
    summary: `Customer request: ${input.title}`,
    metadata: { request_id: data.id, request_type: input.requestType },
  });

  if (input.requestType === "revision") {
    await admin
      .from("quotes")
      .update({ status: "revision_requested" })
      .eq("id", input.quote.id)
      .in("status", ["sent", "viewed"]);
  }

  return data as QuoteCustomerRequestRow;
}

/** Files a renewal request for an expired proposal; repeats while one is pending are no-ops. */
export async function requestQuoteRenewal(input: {
  quote: QuoteWithRelations;
  message?: string | null;
  createdByEmail?: string | null;
  createdByUserId?: string | null;
  actorType: QuoteEventRow["actor_type"];
}): Promise<{ ok: boolean; alreadyRequested: boolean }> {
  if (hasPendingRenewalRequest(input.quote)) return { ok: true, alreadyRequested: true };
  const created = await createCustomerRequest({
    quote: input.quote,
    requestType: "revision",
    title: QUOTE_RENEWAL_REQUEST_TITLE,
    message: input.message,
    createdByEmail: input.createdByEmail,
    createdByUserId: input.createdByUserId,
    actorType: input.actorType,
  });
  return { ok: Boolean(created), alreadyRequested: false };
}

export async function reviewCustomerRequest(input: {
  requestId: string;
  quoteId: string;
  status: QuoteRequestStatus;
  ownerResponse?: string | null;
  reviewedByUserId: string;
  convertToLineItem?: {
    category: string;
    category_label?: string | null;
    description: string;
    quantity: number;
    unit_price_cents: number;
  } | null;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const admin = createAdminSupabaseClient();
  const now = new Date().toISOString();

  let finalStatus = input.status;
  if (input.convertToLineItem) {
    const lineTotal = computeLineTotalCents(
      input.convertToLineItem.quantity,
      input.convertToLineItem.unit_price_cents
    );
    const { data: existingItems } = await admin
      .from("quote_line_items")
      .select("sort_order")
      .eq("quote_id", input.quoteId)
      .order("sort_order", { ascending: false })
      .limit(1);

    const nextSort =
      ((existingItems?.[0]?.sort_order as number | undefined) ?? -1) + 1;

    const { error: lineError } = await admin.from("quote_line_items").insert({
      quote_id: input.quoteId,
      category: input.convertToLineItem.category,
      category_label: input.convertToLineItem.category_label?.trim() || null,
      category_label_fr: input.convertToLineItem.category_label?.trim()
        ? resolveProductCategoryLabelFr(
            input.convertToLineItem.category,
            await listProductCategories()
          )
        : null,
      description: input.convertToLineItem.description,
      quantity: input.convertToLineItem.quantity,
      unit_price_cents: input.convertToLineItem.unit_price_cents,
      line_total_cents: lineTotal,
      status: "priced",
      customer_visible: true,
      is_taxable: true,
      tax_category: "standard",
      sort_order: nextSort,
    });

    if (lineError) {
      return { ok: false, message: lineError.message };
    }

    await recalculateQuoteTotals(input.quoteId);
    finalStatus = "converted_to_line_item";
  }

  const { error } = await admin
    .from("quote_customer_requests")
    .update({
      status: finalStatus,
      owner_response: input.ownerResponse?.trim() || null,
      reviewed_by_user_id: input.reviewedByUserId,
      reviewed_at: now,
    })
    .eq("id", input.requestId)
    .eq("quote_id", input.quoteId);

  if (error) {
    return { ok: false, message: error.message };
  }

  await logQuoteEvent({
    quoteId: input.quoteId,
    actorType: "owner",
    actorUserId: input.reviewedByUserId,
    eventType: "request_reviewed",
    summary: `Request ${finalStatus.replaceAll("_", " ")}`,
    metadata: { request_id: input.requestId, status: finalStatus },
  });

  return { ok: true };
}

export function getLegacyOrOpportunityRef(estimate: {
  id: string;
  opportunity_ref?: string | null;
}): string {
  return resolveOpportunityDisplayRef({
    opportunity_ref: estimate.opportunity_ref,
    estimate_id: estimate.id,
  });
}

/* ------------------------------------------------------------------ */
/* Studio design → draft quote                                         */
/* ------------------------------------------------------------------ */

const STUDIO_OWNER_NOTES_PREFIX = "Built from Studio design";

/** Writes converted studio lines, notes and links onto an existing quote. */
export async function fillQuoteFromStudioPreview(input: {
  quoteId: string;
  source: StudioQuoteSource;
  preview: StudioQuotePreview;
  actorUserId: string | null;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const { conversion } = input.preview;
  const saved = await upsertLineItems({
    quoteId: input.quoteId,
    items: conversion.lines.map((line) => line.item),
    actorUserId: input.actorUserId,
  });
  if (!saved.ok) return saved;

  const admin = createAdminSupabaseClient();
  const { data: header } = await admin
    .from("quotes")
    .select("estimate_request_id, opportunity_ref, customer_notes, owner_notes")
    .eq("id", input.quoteId)
    .maybeSingle();

  const ownerBlocks = (header?.owner_notes ?? "")
    .split(/\n{2,}/)
    .map((block: string) => block.trim())
    .filter((block: string) => block && !block.startsWith(STUDIO_OWNER_NOTES_PREFIX));
  ownerBlocks.push(buildStudioQuoteOwnerNotes(conversion, input.source.title));

  const { error: notesError } = await admin
    .from("quotes")
    .update({
      customer_notes: header?.customer_notes?.trim()
        ? header.customer_notes
        : buildStudioQuoteCustomerNotes(input.source.event, input.source.title),
      owner_notes: ownerBlocks.join("\n\n"),
    })
    .eq("id", input.quoteId);
  if (notesError) console.error("[quotes] studio quote notes", notesError);

  if (input.source.designRow && header) {
    const { error } = await admin
      .from("studio_designs")
      .update({
        quote_id: input.quoteId,
        estimate_request_id: header.estimate_request_id,
        opportunity_ref: header.opportunity_ref,
      })
      .eq("id", input.source.designRow.id);
    if (error) console.error("[quotes] link studio design to quote", error);
  }

  if (input.source.plan && header) {
    const { error } = await admin
      .from("event_plan_submissions")
      .update({ estimate_request_id: header.estimate_request_id, status: "quoted" })
      .eq("id", input.source.plan.id)
      .neq("status", "archived");
    if (error) console.error("[quotes] mark event plan quoted", error);
  }

  const { summary } = conversion;
  await logQuoteEvent({
    quoteId: input.quoteId,
    actorType: "owner",
    actorUserId: input.actorUserId,
    eventType: "quote_edited",
    summary: `Built ${summary.lineCount} lines from Studio design “${input.source.title}” (${summary.pricedCount} priced, ${summary.notPricedCount} not priced yet)`,
    metadata: {
      studio_design_id: input.source.designRow?.id ?? null,
      event_plan_id: input.source.plan?.id ?? null,
      priced_count: summary.pricedCount,
      included_count: summary.includedCount,
      flagged_count: summary.flaggedCount,
      not_priced_count: summary.notPricedCount,
      unmapped_keys: summary.unmappedKeys,
    },
  });

  return { ok: true };
}

async function ensureEstimateFromStudioDesign(
  source: StudioQuoteSource,
  preview: StudioQuotePreview
): Promise<{ estimate: EstimateRequestRow } | { error: string }> {
  const row = source.designRow;
  if (!row) return { error: "Studio design not found." };

  if (row.estimate_request_id) {
    const existing = await fetchEstimateById(row.estimate_request_id);
    if (existing) return { estimate: existing };
  }

  const admin = createAdminSupabaseClient();
  let profile: { email: string | null; full_name: string | null; role: string | null } | null =
    null;
  if (row.owner_user_id) {
    const { data } = await admin
      .from("user_profiles")
      .select("email, full_name, role")
      .eq("id", row.owner_user_id)
      .maybeSingle();
    profile = data ?? null;
  }

  const email = source.event.contactEmail ?? profile?.email?.trim() ?? "";
  if (!email.includes("@")) {
    return { error: "Add a contact email to this design before building a quote." };
  }
  const name = source.event.contactName ?? profile?.full_name?.trim() ?? email;
  const { totals } = preview.bom;

  const form: EstimateFormData = {
    ...initialEstimateFormData,
    name,
    email,
    phone: source.event.contactPhone ?? "",
    eventType: source.event.eventType ?? "",
    eventDate: source.event.eventDate ?? "",
    venueName: source.event.venueName ?? "",
    cityArea: source.event.cityArea ?? "",
    guestCount: source.event.guestCount ? String(source.event.guestCount) : "",
    drapeGoals: ["full-room"],
    measurementsKnown: totals.drapeLinearFeet > 0 ? "partial" : "help",
    linearFeet: totals.drapeLinearFeet > 0 ? String(totals.drapeLinearFeet) : "",
    floorPlanAvailable: "yes",
    fabricDirections: ["recommend"],
    message: [
      source.event.eventName ? `Event: ${source.event.eventName}` : null,
      `Source Studio design: ${source.title}`,
    ]
      .filter(Boolean)
      .join("\n\n"),
  };

  const insertRow = {
    ...buildEstimateInsertRow(form, {
      userId: profile?.role === "customer" ? row.owner_user_id : null,
      language: source.event.language,
    }),
    city_area: source.event.cityArea,
    source: "studio_design",
    status: "reviewed",
    raw_payload: {
      ...form,
      studio_design_id: row.id,
      studio_design_title: source.title,
    },
  };

  const { data: inserted, error } = await admin
    .from("estimate_requests")
    .insert(insertRow)
    .select("*")
    .single();
  if (error || !inserted) {
    console.error("[quotes] ensureEstimateFromStudioDesign insert", error);
    return { error: error?.message || "Failed to create an estimate for this design." };
  }
  return { estimate: inserted as EstimateRequestRow };
}

export async function findExistingStudioQuote(
  source: StudioQuoteSource
): Promise<QuoteWithRelations | null> {
  const estimateIds = new Set<string>();
  if (source.designRow?.quote_id) {
    const linked = await fetchQuoteById(source.designRow.quote_id);
    if (linked) estimateIds.add(linked.estimate_request_id);
  }
  if (source.designRow?.estimate_request_id) estimateIds.add(source.designRow.estimate_request_id);
  if (source.plan?.estimate_request_id) estimateIds.add(source.plan.estimate_request_id);

  for (const estimateId of estimateIds) {
    const [latest] = await listQuotesForEstimate(estimateId);
    if (latest) return fetchQuoteById(latest.id);
  }
  return null;
}

export type StudioQuoteBuildResult =
  | {
      ok: true;
      quote: QuoteRow;
      outcome: "created" | "filled" | "revision";
      preview: StudioQuotePreview;
    }
  | { ok: false; status: number; message: string; existingQuoteId?: string };

/**
 * Builds a complete draft quote from a studio design or event plan layout.
 * An existing quote is only reused when it is an empty draft; otherwise the
 * caller must ask for `mode: "revision"`.
 */
export async function createQuoteFromStudioDesign(input: {
  designId?: string | null;
  eventPlanId?: string | null;
  createdByUserId: string;
  mode?: "create" | "revision";
}): Promise<StudioQuoteBuildResult> {
  const source = await loadStudioQuoteSource(input);
  if ("error" in source) {
    return { ok: false, status: source.status, message: source.error };
  }
  const preview = await buildStudioQuotePreview(source);
  if (preview.bom.isEmpty) {
    return {
      ok: false,
      status: 422,
      message: "This design has nothing to quote yet — add drapes, decor or furniture first.",
    };
  }

  let target: QuoteRow;
  let outcome: "created" | "filled" | "revision";
  const existing = await findExistingStudioQuote(source);

  if (existing && input.mode === "revision") {
    const revision = await createQuoteRevision({
      sourceQuoteId: existing.id,
      createdByUserId: input.createdByUserId,
    });
    if ("error" in revision) return { ok: false, status: 500, message: revision.error };
    const admin = createAdminSupabaseClient();
    await admin.from("quote_line_items").delete().eq("quote_id", revision.quote.id);
    target = revision.quote;
    outcome = "revision";
  } else if (existing) {
    if (existing.status !== "draft" || existing.line_items.length > 0) {
      return {
        ok: false,
        status: 409,
        message: `${existing.quote_display_ref} already exists for this design.`,
        existingQuoteId: existing.id,
      };
    }
    target = existing;
    outcome = "filled";
  } else {
    const estimateResult = source.plan
      ? await ensureEstimateFromEventPlan(source.plan)
      : await ensureEstimateFromStudioDesign(source, preview);
    if ("error" in estimateResult) {
      return { ok: false, status: 422, message: estimateResult.error };
    }
    const quoteResult = await createQuoteFromEstimate({
      estimate: estimateResult.estimate,
      createdByUserId: input.createdByUserId,
    });
    if ("error" in quoteResult) return { ok: false, status: 500, message: quoteResult.error };
    if (!quoteResult.created) {
      const current = await fetchQuoteById(quoteResult.quote.id);
      if (current && (current.status !== "draft" || current.line_items.length > 0)) {
        return {
          ok: false,
          status: 409,
          message: `${current.quote_display_ref} already exists for this design.`,
          existingQuoteId: current.id,
        };
      }
    }
    target = quoteResult.quote;
    outcome = quoteResult.created ? "created" : "filled";
  }

  const filled = await fillQuoteFromStudioPreview({
    quoteId: target.id,
    source,
    preview,
    actorUserId: input.createdByUserId,
  });
  if (!filled.ok) return { ok: false, status: 500, message: filled.message };

  return { ok: true, quote: target, outcome, preview };
}
