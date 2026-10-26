import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { deleteVenue, updateVenue, type VenueInput } from "@/lib/customers";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string; venueId: string }> };

function forbidden() {
  return NextResponse.json({ ok: false, message: "Owner access required." }, { status: 403 });
}

export async function PATCH(request: Request, context: RouteContext) {
  const owner = await requireOwner();
  if (!owner) return forbidden();
  const { id, venueId } = await context.params;
  const body = (await request.json().catch(() => null)) as VenueInput | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }
  const result = await updateVenue(id, venueId, body, { userId: owner.user.id });
  if ("error" in result) {
    return NextResponse.json({ ok: false, message: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, venue: result.venue });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const owner = await requireOwner();
  if (!owner) return forbidden();
  const { id, venueId } = await context.params;
  const result = await deleteVenue(id, venueId, { userId: owner.user.id });
  if ("error" in result) {
    return NextResponse.json({ ok: false, message: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
