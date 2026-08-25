import type { User } from "@supabase/supabase-js";
import {
  DEFAULT_QUOTE_TERMS,
  type CustomerSafeQuote,
  type QuoteCustomerRequestRow,
  type QuoteEventRow,
  type QuoteEventType,
  type QuoteLineItemRow,
  type QuoteRequestStatus,
  type QuoteRequestType,
  type QuoteRow,
  type QuoteStatus,
  computeLineTotalCents,
  formatQuoteDisplayRef,
  resolveQuoteDisplayRef,
  sumPricedSubtotalCents,
} from "@/data/quotes";
import { isEmailVerified } from "@/lib/auth";
import type { EstimateRequestRow } from "@/lib/estimate-access";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  buildQuoteDisplayRef,
  createQuoteToken,
  hashQuoteToken,
  resolveOpportunityDisplayRef,
} from "@/lib/quote-tokens";

export type QuoteWithRelations = QuoteRow & {
  line_items: QuoteLineItemRow[];
  requests: QuoteCustomerRequestRow[];
  events?: QuoteEventRow[];
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
    quote_display_ref: resolveQuoteDisplayRef(quote),
    customer_name: quote.customer_name,
    customer_email: quote.customer_email,
    event_date: quote.event_date,
    event_type: quote.event_type,
    venue_name: quote.venue_name,
    city_area: quote.city_area,
    status: quote.status,
    currency: quote.currency,
    subtotal_cents: quote.subtotal_cents,
    total_cents: quote.total_cents,
    valid_until: quote.valid_until,
    customer_notes: quote.customer_notes,
    terms: quote.terms,
    sent_at: quote.sent_at,
    viewed_at: quote.viewed_at,
    accepted_at: quote.accepted_at,
    declined_at: quote.declined_at,
    created_at: quote.created_at,
    updated_at: quote.updated_at,
    line_items: (quote.line_items || []).filter((item) => item.customer_visible),
    requests: quote.requests || [],
    share_url: options?.shareUrl ?? null,
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

  const [{ data: lineItems }, { data: requests }, eventsResult] =
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
    ]);

  return {
    ...(quote as QuoteRow),
    line_items: (lineItems || []) as QuoteLineItemRow[],
    requests: (requests || []) as QuoteCustomerRequestRow[],
    events: options?.includeEvents
      ? ((eventsResult.data || []) as QuoteEventRow[])
      : undefined,
  };
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
    .neq("status", "draft")
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
  const { data: items } = await admin
    .from("quote_line_items")
    .select("*")
    .eq("quote_id", quoteId);

  const subtotal = sumPricedSubtotalCents((items || []) as QuoteLineItemRow[]);
  await admin
    .from("quotes")
    .update({
      subtotal_cents: subtotal,
      total_cents: subtotal,
    })
    .eq("id", quoteId);
}

export async function createQuoteFromEstimate(input: {
  estimate: EstimateRequestRow;
  createdByUserId: string;
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
  const { data, error } = await admin
    .from("quotes")
    .insert({
      estimate_request_id: input.estimate.id,
      opportunity_ref: opportunityRef,
      revision_number: 1,
      quote_display_ref: displayRef,
      customer_name: input.estimate.customer_name,
      customer_email: input.estimate.customer_email,
      event_date: input.estimate.event_date,
      event_type: input.estimate.event_type,
      venue_name: input.estimate.venue_name,
      city_area: input.estimate.city_area,
      status: "draft",
      currency: "CAD",
      terms: DEFAULT_QUOTE_TERMS,
      created_by_user_id: input.createdByUserId,
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
    actorUserId: input.createdByUserId,
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
      opportunity_ref: source.opportunity_ref,
      revision_number: nextRevision,
      quote_display_ref: displayRef,
      customer_name: source.customer_name,
      customer_email: source.customer_email,
      event_date: source.event_date,
      event_type: source.event_type,
      venue_name: source.venue_name,
      city_area: source.city_area,
      status: "draft",
      currency: "CAD",
      customer_notes: source.customer_notes,
      owner_notes: source.owner_notes,
      terms: source.terms || DEFAULT_QUOTE_TERMS,
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
      description: item.description,
      quantity: item.quantity,
      unit_price_cents: item.unit_price_cents,
      line_total_cents: item.line_total_cents,
      status: item.status === "pending_owner_review" ? "priced" : item.status,
      customer_visible: item.customer_visible,
      sort_order: item.sort_order ?? index,
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
  description: string;
  quantity: number;
  unit_price_cents: number;
  status?: string;
  customer_visible?: boolean;
  sort_order?: number;
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
    const unitPrice = Math.round(Number(item.unit_price_cents) || 0);
    const lineTotal = computeLineTotalCents(quantity, unitPrice);
    const payload = {
      quote_id: input.quoteId,
      category: item.category,
      description: item.description.trim(),
      quantity,
      unit_price_cents: unitPrice,
      line_total_cents: lineTotal,
      status: item.status || "priced",
      customer_visible: item.customer_visible ?? true,
      sort_order: item.sort_order ?? index,
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

export async function reviewCustomerRequest(input: {
  requestId: string;
  quoteId: string;
  status: QuoteRequestStatus;
  ownerResponse?: string | null;
  reviewedByUserId: string;
  convertToLineItem?: {
    category: string;
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
      description: input.convertToLineItem.description,
      quantity: input.convertToLineItem.quantity,
      unit_price_cents: input.convertToLineItem.unit_price_cents,
      line_total_cents: lineTotal,
      status: "priced",
      customer_visible: true,
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
