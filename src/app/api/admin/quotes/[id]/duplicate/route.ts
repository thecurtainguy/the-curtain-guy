import { NextResponse } from "next/server";
import { isCustomerLanguage } from "@/data/customer-language";
import { isCustomerCurrency } from "@/data/customers";
import {
  QUOTE_DUPLICATE_COPY_KEYS,
  type QuoteDuplicateCopy,
  type QuoteDuplicateDetails,
  type QuoteDuplicateLine,
  type QuoteDuplicateRequest,
} from "@/data/quote-duplicate";
import { QUOTE_SCHEDULE_TIME_FIELDS, normalizeScheduleTime } from "@/data/quote-schedule";
import { resolveQuoteDisplayRef } from "@/data/quotes";
import { requireOwner } from "@/lib/auth";
import { duplicateQuote } from "@/lib/quote-duplicate";
import { fetchQuoteById } from "@/lib/quotes";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

type RouteContext = {
  params: Promise<{ id: string }>;
};

function text(value: unknown): string | null {
  return typeof value === "string" ? value.trim() || null : null;
}

function parseRequest(body: Record<string, unknown>): QuoteDuplicateRequest | { error: string } {
  const raw = (body.details ?? {}) as Record<string, unknown>;
  const email = text(raw.customer_email)?.toLowerCase() ?? "";
  if (!email.includes("@")) return { error: "A valid customer email is required." };
  if (!isCustomerLanguage(raw.language)) return { error: "Invalid language." };
  if (!isCustomerCurrency(raw.currency)) return { error: "Invalid currency." };

  const dates: Record<string, string | null> = {};
  for (const field of ["event_date", "install_date", "teardown_date", "valid_until"] as const) {
    const value = text(raw[field]);
    if (value && !ISO_DATE.test(value)) {
      return { error: `Invalid ${field.replaceAll("_", " ")}.` };
    }
    dates[field] = value;
  }
  const times: Record<string, string | null> = {};
  for (const field of QUOTE_SCHEDULE_TIME_FIELDS) {
    const value = normalizeScheduleTime(raw[field]);
    if (value === undefined) {
      return { error: `Invalid time for ${field.replaceAll("_", " ")}.` };
    }
    times[field] = value;
  }
  const venueAddress = text(raw.venue_address);
  if (venueAddress && venueAddress.length > 400) {
    return { error: "Venue address is too long (400 characters max)." };
  }

  const details = {
    customer_name: text(raw.customer_name),
    customer_email: email,
    event_type: text(raw.event_type),
    venue_name: text(raw.venue_name),
    venue_address: venueAddress,
    customer_venue_id: text(raw.customer_venue_id),
    city_area: text(raw.city_area),
    language: raw.language,
    currency: raw.currency,
    ...dates,
    ...times,
  } as QuoteDuplicateDetails;

  const lines: QuoteDuplicateLine[] = [];
  for (const entry of Array.isArray(body.lines) ? body.lines : []) {
    const line = entry as Record<string, unknown>;
    const quantity = Number(line.quantity);
    const unitPriceCents = Number(line.unitPriceCents);
    if (typeof line.sourceId !== "string") return { error: "Invalid line item." };
    if (!Number.isFinite(quantity) || quantity < 0 || !Number.isFinite(unitPriceCents)) {
      return { error: "Each line item needs a valid quantity and price." };
    }
    lines.push({ sourceId: line.sourceId, include: line.include !== false, quantity, unitPriceCents });
  }

  const rawCopy = (body.copy ?? {}) as Record<string, unknown>;
  const copy = Object.fromEntries(
    QUOTE_DUPLICATE_COPY_KEYS.map((key) => [key, rawCopy[key] !== false])
  ) as QuoteDuplicateCopy;
  const fileIds = Array.isArray(body.fileIds)
    ? body.fileIds.filter((id): id is string => typeof id === "string")
    : [];

  return { details, lines, copy, fileIds };
}

export async function POST(request: Request, context: RouteContext) {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json({ ok: false, message: "Owner access required." }, { status: 403 });
  }

  const { id } = await context.params;
  const source = await fetchQuoteById(id);
  if (!source) {
    return NextResponse.json({ ok: false, message: "Quote not found." }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = parseRequest(body);
  if ("error" in parsed) {
    return NextResponse.json({ ok: false, message: parsed.error }, { status: 400 });
  }

  const venueId = parsed.details.customer_venue_id;
  if (venueId) {
    const { data: venue } = await createAdminSupabaseClient()
      .from("customer_venues")
      .select("id, customer_id")
      .eq("id", venueId)
      .maybeSingle();
    if (!venue || venue.customer_id !== source.customer_id) {
      return NextResponse.json(
        { ok: false, message: "That saved venue doesn't belong to this customer." },
        { status: 400 }
      );
    }
  }

  const result = await duplicateQuote({
    sourceQuoteId: id,
    request: parsed,
    actor: { userId: owner.user.id, email: owner.profile.email },
  });
  if ("error" in result) {
    return NextResponse.json({ ok: false, message: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    quoteId: result.quote.id,
    quoteDisplayRef: resolveQuoteDisplayRef(result.quote),
    opportunityRef: result.quote.opportunity_ref,
    warnings: result.warnings,
  });
}
