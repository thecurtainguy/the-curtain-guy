import { NextResponse } from "next/server";
import {
  isQuoteLocked,
  isValidQuoteLineCategorySlug,
  QUOTE_LOCKED_MESSAGE,
  type QuoteRequestStatus,
  normalizeUnitPriceCents,
} from "@/data/quotes";
import { requireOwner } from "@/lib/auth";
import { fetchQuoteById, reviewCustomerRequest } from "@/lib/quotes";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const REVIEW_STATUSES: QuoteRequestStatus[] = [
  "pending_owner_review",
  "approved",
  "declined",
  "converted_to_line_item",
  "needs_info",
];

export async function POST(request: Request, context: RouteContext) {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json(
      { ok: false, message: "Owner access required." },
      { status: 403 }
    );
  }

  const { id: quoteId } = await context.params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const requestId =
    typeof body.requestId === "string" ? body.requestId.trim() : "";
  const status =
    typeof body.status === "string"
      ? (body.status as QuoteRequestStatus)
      : null;

  if (!requestId || !status || !REVIEW_STATUSES.includes(status)) {
    return NextResponse.json(
      { ok: false, message: "requestId and valid status are required." },
      { status: 400 }
    );
  }

  let convertToLineItem:
    | {
        category: string;
        category_label: string | null;
        description: string;
        quantity: number;
        unit_price_cents: number;
      }
    | null = null;

  if (body.convertToLineItem && typeof body.convertToLineItem === "object") {
    const convert = body.convertToLineItem as Record<string, unknown>;
    const category = String(convert.category || "");
    const description = String(convert.description || "").trim();
    if (!isValidQuoteLineCategorySlug(category) || !description) {
      return NextResponse.json(
        {
          ok: false,
          message: "convertToLineItem needs category and description.",
        },
        { status: 400 }
      );
    }
    convertToLineItem = {
      category,
      category_label:
        typeof convert.category_label === "string"
          ? convert.category_label.trim().slice(0, 80) || null
          : null,
      description,
      quantity: Number(convert.quantity) || 1,
      unit_price_cents: normalizeUnitPriceCents(convert.unit_price_cents),
    };
  }

  if (convertToLineItem) {
    const quote = await fetchQuoteById(quoteId);
    if (quote && isQuoteLocked(quote.status)) {
      return NextResponse.json({ ok: false, message: QUOTE_LOCKED_MESSAGE }, { status: 409 });
    }
  }

  const result = await reviewCustomerRequest({
    requestId,
    quoteId,
    status,
    ownerResponse:
      typeof body.ownerResponse === "string" ? body.ownerResponse : null,
    reviewedByUserId: owner.user.id,
    convertToLineItem,
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, message: result.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
