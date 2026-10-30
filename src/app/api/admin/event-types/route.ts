import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import {
  createEventType,
  getEventTypes,
  getEventTypeUsage,
  reorderEventTypes,
} from "@/lib/event-types";

export const runtime = "nodejs";

function forbidden() {
  return NextResponse.json({ ok: false, message: "Owner access required." }, { status: 403 });
}

export async function GET() {
  if (!(await requireOwner())) return forbidden();
  const [eventTypes, usage] = await Promise.all([getEventTypes(), getEventTypeUsage()]);
  return NextResponse.json({ ok: true, eventTypes, usage });
}

export async function POST(request: Request) {
  if (!(await requireOwner())) return forbidden();
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }
  const result = await createEventType(body);
  if ("error" in result) {
    return NextResponse.json({ ok: false, message: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, eventType: result.eventType });
}

/** Body: { order: string[] } — every event type id, in the new display order. */
export async function PUT(request: Request) {
  if (!(await requireOwner())) return forbidden();
  const body = (await request.json().catch(() => null)) as { order?: unknown } | null;
  const order = Array.isArray(body?.order)
    ? body.order.filter((id): id is string => typeof id === "string")
    : null;
  if (!order || order.length === 0) {
    return NextResponse.json({ ok: false, message: "Invalid order." }, { status: 400 });
  }
  const result = await reorderEventTypes(order);
  if ("error" in result) {
    return NextResponse.json({ ok: false, message: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
