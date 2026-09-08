import { NextResponse } from "next/server";
import { resolveQuoteDisplayRef } from "@/data/quotes";
import { requireOwner } from "@/lib/auth";
import { fetchEventPlanById } from "@/lib/event-plan-access";
import { createQuoteFromEventPlan } from "@/lib/quotes";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json(
      { ok: false, message: "Owner access required." },
      { status: 403 }
    );
  }

  let body: { eventPlanId?: string };
  try {
    body = (await request.json()) as { eventPlanId?: string };
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const eventPlanId = body.eventPlanId?.trim();
  if (!eventPlanId) {
    return NextResponse.json(
      { ok: false, message: "eventPlanId is required." },
      { status: 400 }
    );
  }

  const plan = await fetchEventPlanById(eventPlanId);
  if (!plan) {
    return NextResponse.json(
      { ok: false, message: "Event plan not found." },
      { status: 404 }
    );
  }

  const result = await createQuoteFromEventPlan({
    plan,
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
    estimateId: result.estimateId,
    created: result.created,
    quoteDisplayRef: resolveQuoteDisplayRef(result.quote),
  });
}
