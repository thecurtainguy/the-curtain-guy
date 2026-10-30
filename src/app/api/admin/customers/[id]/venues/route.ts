import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { createVenue, fetchCustomerById, listCustomerVenues, type VenueInput } from "@/lib/customers";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json({ ok: false, message: "Owner access required." }, { status: 403 });
  }
  const { id } = await context.params;
  if (!(await fetchCustomerById(id))) {
    return NextResponse.json({ ok: false, message: "Customer not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, venues: await listCustomerVenues(id) });
}

export async function POST(request: Request, context: RouteContext) {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json({ ok: false, message: "Owner access required." }, { status: 403 });
  }
  const { id } = await context.params;
  if (!(await fetchCustomerById(id))) {
    return NextResponse.json({ ok: false, message: "Customer not found." }, { status: 404 });
  }
  const body = (await request.json().catch(() => null)) as (VenueInput & { fromJobId?: string }) | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }
  const { fromJobId, ...input } = body;
  const result = await createVenue(id, input, { userId: owner.user.id }, {
    fromJobId: typeof fromJobId === "string" ? fromJobId : undefined,
  });
  if ("error" in result) {
    return NextResponse.json({ ok: false, message: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, venue: result.venue });
}
