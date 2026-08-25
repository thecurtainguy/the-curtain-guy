import { NextResponse } from "next/server";
import {
  isQuoteLineCategory,
  isQuoteLineStatus,
} from "@/data/quotes";
import { requireOwner } from "@/lib/auth";
import { upsertLineItems, type LineItemInput } from "@/lib/quotes";

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
  let body: { items?: unknown };
  try {
    body = (await request.json()) as { items?: unknown };
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
      sort_order:
        typeof row.sort_order === "number" ? row.sort_order : undefined,
    });
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
