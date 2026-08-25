import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { fetchEstimateById } from "@/lib/estimate-access";
import { createQuoteFromEstimate } from "@/lib/quotes";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json(
      { ok: false, message: "Owner access required." },
      { status: 403 }
    );
  }

  let body: { estimateRequestId?: string };
  try {
    body = (await request.json()) as { estimateRequestId?: string };
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const estimateRequestId = body.estimateRequestId?.trim();
  if (!estimateRequestId) {
    return NextResponse.json(
      { ok: false, message: "estimateRequestId is required." },
      { status: 400 }
    );
  }

  const estimate = await fetchEstimateById(estimateRequestId);
  if (!estimate) {
    return NextResponse.json(
      { ok: false, message: "Estimate not found." },
      { status: 404 }
    );
  }

  const result = await createQuoteFromEstimate({
    estimate,
    createdByUserId: owner.user.id,
  });

  if ("error" in result) {
    return NextResponse.json(
      { ok: false, message: result.error },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    quoteId: result.quote.id,
    created: result.created,
    quoteDisplayRef: result.quote.quote_display_ref,
  });
}
