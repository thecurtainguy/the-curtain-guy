import { NextRequest, NextResponse } from "next/server";
import type { RentalCartLine } from "@/data/rentals";
import { isHoneypotTriggered } from "@/lib/estimate-server";
import { submitRentalsCheckout } from "@/lib/rentals-checkout";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON body." },
      { status: 400 }
    );
  }

  if (isHoneypotTriggered(body)) {
    return NextResponse.json({
      ok: true,
      estimateId: "ok",
      quoteId: "ok",
      opportunityRef: null,
      estimateTotalCents: 0,
    });
  }

  const lines = Array.isArray(body.lines) ? (body.lines as RentalCartLine[]) : [];

  const result = await submitRentalsCheckout({
    name: String(body.name || ""),
    email: String(body.email || ""),
    phone: String(body.phone || ""),
    eventDate: String(body.eventDate || ""),
    eventType: String(body.eventType || ""),
    venueName: String(body.venueName || ""),
    cityArea: String(body.cityArea || ""),
    message: String(body.message || ""),
    lines,
    submittedFromUrl: request.headers.get("referer"),
    userAgent: request.headers.get("user-agent"),
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json(result);
}
