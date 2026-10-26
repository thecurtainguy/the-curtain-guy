import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { createContact, fetchCustomerById, type ContactInput } from "@/lib/customers";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json({ ok: false, message: "Owner access required." }, { status: 403 });
  }
  const { id } = await context.params;
  if (!(await fetchCustomerById(id))) {
    return NextResponse.json({ ok: false, message: "Customer not found." }, { status: 404 });
  }
  const body = (await request.json().catch(() => null)) as ContactInput | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }
  const result = await createContact(id, body, { userId: owner.user.id });
  if ("error" in result) {
    return NextResponse.json({ ok: false, message: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, contact: result.contact });
}
