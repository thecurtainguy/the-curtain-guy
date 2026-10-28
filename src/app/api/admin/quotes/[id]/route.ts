import { NextResponse } from "next/server";
import {
  DEFAULT_GST_RATE,
  DEFAULT_QST_RATE,
  isQuoteStatus,
  isQuoteTaxMode,
  type QuoteRow,
  type QuoteStatus,
  type QuoteTaxMode,
} from "@/data/quotes";
import { isCustomerLanguage } from "@/data/customer-language";
import { isCustomerCurrency, type CustomerVenueRow } from "@/data/customers";
import { ensureCustomerVenue } from "@/lib/customers";
import { parseQuotePaymentTerms } from "@/data/quote-payment-terms";
import {
  QUOTE_SCHEDULE_DATE_FIELDS,
  QUOTE_SCHEDULE_TIME_FIELDS,
  normalizeScheduleTime,
} from "@/data/quote-schedule";
import { requireOwner } from "@/lib/auth";
import {
  fetchQuoteById,
  logQuoteEvent,
  recalculateQuoteTotals,
} from "@/lib/quotes";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json(
      { ok: false, message: "Owner access required." },
      { status: 403 }
    );
  }

  const { id } = await context.params;
  const quote = await fetchQuoteById(id, { includeEvents: true });
  if (!quote) {
    return NextResponse.json(
      { ok: false, message: "Quote not found." },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true, quote });
}

export async function PUT(request: Request, context: RouteContext) {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json(
      { ok: false, message: "Owner access required." },
      { status: 403 }
    );
  }

  const { id } = await context.params;
  const existing = await fetchQuoteById(id);
  if (!existing) {
    return NextResponse.json(
      { ok: false, message: "Quote not found." },
      { status: 404 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const updates: Record<string, unknown> = {};
  const stringFields = [
    "customer_name",
    "customer_email",
    "event_type",
    "venue_name",
    "venue_address",
    "city_area",
    "customer_notes",
    "customer_notes_translated",
    "owner_notes",
    "terms",
    "terms_translated",
  ] as const;

  for (const field of stringFields) {
    if (field in body) {
      const value = body[field];
      updates[field] =
        typeof value === "string" ? value.trim() || null : null;
    }
  }
  if (typeof updates.venue_address === "string" && updates.venue_address.length > 400) {
    return NextResponse.json(
      { ok: false, message: "Venue address is too long (400 characters max)." },
      { status: 400 }
    );
  }

  const admin = createAdminSupabaseClient();
  if ("customer_venue_id" in body) {
    const venueId = typeof body.customer_venue_id === "string" ? body.customer_venue_id : null;
    if (venueId) {
      const { data: venue } = await admin
        .from("customer_venues")
        .select("id, customer_id")
        .eq("id", venueId)
        .maybeSingle();
      if (!venue || (existing.customer_id && venue.customer_id !== existing.customer_id)) {
        return NextResponse.json(
          { ok: false, message: "That saved venue doesn't belong to this customer." },
          { status: 400 }
        );
      }
    }
    updates.customer_venue_id = venueId;
  }

  if ("event_date" in body) {
    updates.event_date =
      typeof body.event_date === "string" && body.event_date.trim()
        ? body.event_date.trim()
        : null;
  }
  for (const field of QUOTE_SCHEDULE_DATE_FIELDS) {
    if (!(field in body)) continue;
    const value = typeof body[field] === "string" ? (body[field] as string).trim() : "";
    if (value && !ISO_DATE.test(value)) {
      return NextResponse.json(
        { ok: false, message: `Invalid ${field.replace("_", " ")}.` },
        { status: 400 }
      );
    }
    updates[field] = value || null;
  }
  for (const field of QUOTE_SCHEDULE_TIME_FIELDS) {
    if (!(field in body)) continue;
    const value = normalizeScheduleTime(body[field]);
    if (value === undefined) {
      return NextResponse.json(
        { ok: false, message: `Invalid time for ${field.replaceAll("_", " ")}.` },
        { status: 400 }
      );
    }
    updates[field] = value;
  }
  if ("payment_deposit_mode" in body) {
    const parsed = parseQuotePaymentTerms(body);
    if ("error" in parsed) {
      return NextResponse.json({ ok: false, message: parsed.error }, { status: 400 });
    }
    Object.assign(updates, parsed.terms);
  }
  if ("valid_until" in body) {
    updates.valid_until =
      typeof body.valid_until === "string" && body.valid_until.trim()
        ? body.valid_until.trim()
        : null;
  }
  if ("language" in body) {
    if (!isCustomerLanguage(body.language)) {
      return NextResponse.json(
        { ok: false, message: "Invalid language." },
        { status: 400 }
      );
    }
    updates.language = body.language;
  }
  if ("currency" in body) {
    if (!isCustomerCurrency(body.currency)) {
      return NextResponse.json(
        { ok: false, message: "Invalid currency." },
        { status: 400 }
      );
    }
    updates.currency = body.currency;
  }
  if ("status" in body && typeof body.status === "string") {
    if (!isQuoteStatus(body.status)) {
      return NextResponse.json(
        { ok: false, message: "Invalid status." },
        { status: 400 }
      );
    }
    updates.status = body.status as QuoteStatus;
  }

  let shouldRecalculate = false;

  if ("tax_mode" in body) {
    if (typeof body.tax_mode !== "string" || !isQuoteTaxMode(body.tax_mode)) {
      return NextResponse.json(
        { ok: false, message: "Invalid tax mode." },
        { status: 400 }
      );
    }
    updates.tax_mode = body.tax_mode as QuoteTaxMode;
    if (body.tax_mode === "quebec_gst_qst") {
      updates.gst_rate = DEFAULT_GST_RATE;
      updates.qst_rate = DEFAULT_QST_RATE;
    }
    shouldRecalculate = true;
  }

  if ("manual_tax_label" in body) {
    updates.manual_tax_label =
      typeof body.manual_tax_label === "string"
        ? body.manual_tax_label.trim() || null
        : null;
    shouldRecalculate = true;
  }

  if ("manual_tax_cents" in body) {
    const cents = Math.round(Number(body.manual_tax_cents) || 0);
    if (!Number.isFinite(cents) || cents < 0) {
      return NextResponse.json(
        { ok: false, message: "Invalid manual tax amount." },
        { status: 400 }
      );
    }
    updates.manual_tax_cents = cents;
    shouldRecalculate = true;
  }

  if (typeof body.customer_email === "string" && !body.customer_email.trim()) {
    return NextResponse.json(
      { ok: false, message: "Customer email is required." },
      { status: 400 }
    );
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { ok: false, message: "No updates provided." },
      { status: 400 }
    );
  }

  const { data, error } = await admin
    .from("quotes")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { ok: false, message: error?.message || "Update failed." },
      { status: 500 }
    );
  }

  if (shouldRecalculate) {
    await recalculateQuoteTotals(id);
  }

  let saved = data as QuoteRow;
  let savedVenue: CustomerVenueRow | null = null;
  const venueTouched = ["venue_name", "venue_address", "customer_venue_id"].some((f) => f in updates);
  if (venueTouched && saved.customer_id && saved.venue_name && !saved.customer_venue_id) {
    savedVenue = await ensureCustomerVenue({
      customerId: saved.customer_id,
      venueName: saved.venue_name,
      venueAddress: saved.venue_address,
      actor: { userId: owner.user.id, email: owner.profile.email },
      source: { kind: "quote", id, ref: saved.quote_display_ref },
    });
    if (savedVenue) {
      const { error: linkError } = await admin
        .from("quotes")
        .update({ customer_venue_id: savedVenue.id })
        .eq("id", id);
      if (linkError) console.error("[quotes] link saved venue", linkError);
      else saved = { ...saved, customer_venue_id: savedVenue.id };
    }
  }

  await logQuoteEvent({
    quoteId: id,
    actorType: "owner",
    actorUserId: owner.user.id,
    actorEmail: owner.profile.email,
    eventType: "quote_edited",
    summary: savedVenue
      ? `Quote details updated · venue linked to the customer profile (${savedVenue.name})`
      : "Quote details updated",
    metadata: { fields: Object.keys(updates), customer_venue_id: savedVenue?.id ?? null },
  });

  const refreshed = shouldRecalculate
    ? await fetchQuoteById(id, { includeEvents: true })
    : null;

  return NextResponse.json({
    ok: true,
    quote: refreshed ?? saved,
  });
}
