import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { deleteEventType, updateEventType } from "@/lib/event-types";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function forbidden() {
  return NextResponse.json({ ok: false, message: "Owner access required." }, { status: 403 });
}

export async function PATCH(request: Request, context: RouteContext) {
  if (!(await requireOwner())) return forbidden();
  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }
  const result = await updateEventType(id, body);
  if ("error" in result) {
    return NextResponse.json({ ok: false, message: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, eventType: result.eventType });
}

export async function DELETE(_request: Request, context: RouteContext) {
  if (!(await requireOwner())) return forbidden();
  const { id } = await context.params;
  const result = await deleteEventType(id);
  if ("error" in result) {
    return NextResponse.json(
      { ok: false, message: result.error, usage: result.usage ?? null },
      { status: 409 }
    );
  }
  return NextResponse.json({ ok: true });
}
