import { NextResponse } from "next/server";
import {
  DEFAULT_GST_RATE,
  DEFAULT_QST_RATE,
  isQuoteStatus,
  isQuoteTaxMode,
  type QuoteStatus,
  type QuoteTaxMode,
} from "@/data/quotes";
import { requireOwner } from "@/lib/auth";
import {
  fetchQuoteById,
  logQuoteEvent,
  recalculateQuoteTotals,
} from "@/lib/quotes";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

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
    "city_area",
    "customer_notes",
    "owner_notes",
    "terms",
  ] as const;

  for (const field of stringFields) {
    if (field in body) {
      const value = body[field];
      updates[field] =
        typeof value === "string" ? value.trim() || null : null;
    }
  }

  if ("event_date" in body) {
    updates.event_date =
      typeof body.event_date === "string" && body.event_date.trim()
        ? body.event_date.trim()
        : null;
  }
  if ("valid_until" in body) {
    updates.valid_until =
      typeof body.valid_until === "string" && body.valid_until.trim()
        ? body.valid_until.trim()
        : null;
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

  const admin = createAdminSupabaseClient();
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

  await logQuoteEvent({
    quoteId: id,
    actorType: "owner",
    actorUserId: owner.user.id,
    actorEmail: owner.profile.email,
    eventType: "quote_edited",
    summary: "Quote details updated",
    metadata: { fields: Object.keys(updates) },
  });

  const refreshed = shouldRecalculate
    ? await fetchQuoteById(id, { includeEvents: true })
    : null;

  return NextResponse.json({
    ok: true,
    quote: refreshed ?? data,
  });
}
