import { NextResponse } from "next/server";
import {
  DEFAULT_GST_RATE,
  DEFAULT_QST_RATE,
  isQuoteLineCategory,
  isQuoteLineStatus,
  isQuoteTaxMode,
  normalizeManualTaxLines,
} from "@/data/quotes";
import { requireOwner } from "@/lib/auth";
import { upsertLineItems, type LineItemInput } from "@/lib/quotes";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json(
      { ok: false, message: "Owner access required." },
      { status: 403 }
    );
  }

  const { id } = await context.params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON body." },
      { status: 400 }
    );
  }

  if (!Array.isArray(body.items)) {
    return NextResponse.json(
      { ok: false, message: "items array is required." },
      { status: 400 }
    );
  }

  const items: LineItemInput[] = [];
  for (const raw of body.items) {
    if (!raw || typeof raw !== "object") {
      return NextResponse.json(
        { ok: false, message: "Invalid line item." },
        { status: 400 }
      );
    }
    const row = raw as Record<string, unknown>;
    const category = String(row.category || "");
    const description = String(row.description || "").trim();
    if (!isQuoteLineCategory(category)) {
      return NextResponse.json(
        { ok: false, message: `Invalid category: ${category}` },
        { status: 400 }
      );
    }
    if (!description) {
      return NextResponse.json(
        { ok: false, message: "Each line item needs a description." },
        { status: 400 }
      );
    }
    const status =
      typeof row.status === "string" && isQuoteLineStatus(row.status)
        ? row.status
        : "priced";

    items.push({
      id: typeof row.id === "string" ? row.id : undefined,
      category,
      description,
      quantity: Number(row.quantity) || 1,
      unit_price_cents: Math.round(Number(row.unit_price_cents) || 0),
      status,
      customer_visible:
        typeof row.customer_visible === "boolean" ? row.customer_visible : true,
      is_taxable: typeof row.is_taxable === "boolean" ? row.is_taxable : true,
      tax_category:
        typeof row.tax_category === "string" ? row.tax_category : "standard",
      sort_order:
        typeof row.sort_order === "number" ? row.sort_order : undefined,
    });
  }

  const taxUpdates: Record<string, unknown> = {};
  if (typeof body.tax_mode === "string" && isQuoteTaxMode(body.tax_mode)) {
    taxUpdates.tax_mode = body.tax_mode;
    if (body.tax_mode === "quebec_gst_qst") {
      taxUpdates.gst_rate = DEFAULT_GST_RATE;
      taxUpdates.qst_rate = DEFAULT_QST_RATE;
    }
  }
  if ("manual_tax_lines" in body) {
    const lines = normalizeManualTaxLines(body.manual_tax_lines);
    taxUpdates.manual_tax_lines = lines;
    taxUpdates.manual_tax_label = lines[0]?.label ?? null;
  } else {
    if ("manual_tax_label" in body) {
      taxUpdates.manual_tax_label =
        typeof body.manual_tax_label === "string"
          ? body.manual_tax_label.trim() || null
          : null;
    }
    if ("manual_tax_cents" in body) {
      taxUpdates.manual_tax_cents = Math.max(
        0,
        Math.round(Number(body.manual_tax_cents) || 0)
      );
    }
  }
  if (Object.keys(taxUpdates).length > 0) {
    const admin = createAdminSupabaseClient();
    await admin.from("quotes").update(taxUpdates).eq("id", id);
  }

  const result = await upsertLineItems({
    quoteId: id,
    items,
    actorUserId: owner.user.id,
    actorEmail: owner.profile.email,
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, message: result.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
