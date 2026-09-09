import { NextResponse } from "next/server";
import { resolveQuoteDisplayRef } from "@/data/quotes";
import { requireOwner } from "@/lib/auth";
import { createDirectQuote } from "@/lib/quotes";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json(
      { ok: false, message: "Owner access required." },
      { status: 403 }
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

  const result = await createDirectQuote({
    customerName: String(body.customerName || ""),
    customerEmail: String(body.customerEmail || ""),
    customerPhone:
      typeof body.customerPhone === "string" ? body.customerPhone : null,
    eventDate: typeof body.eventDate === "string" ? body.eventDate : null,
    eventType: typeof body.eventType === "string" ? body.eventType : null,
    venueName: typeof body.venueName === "string" ? body.venueName : null,
    cityArea: typeof body.cityArea === "string" ? body.cityArea : null,
    ownerNotes: typeof body.ownerNotes === "string" ? body.ownerNotes : null,
    createdByUserId: owner.user.id,
  });

  if ("error" in result) {
    return NextResponse.json(
      { ok: false, message: result.error },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    quoteId: result.quote.id,
    quoteDisplayRef: resolveQuoteDisplayRef(result.quote),
  });
}
