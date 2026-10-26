import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { deleteContact, updateContact, type ContactInput } from "@/lib/customers";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string; contactId: string }> };

function forbidden() {
  return NextResponse.json({ ok: false, message: "Owner access required." }, { status: 403 });
}

export async function PATCH(request: Request, context: RouteContext) {
  const owner = await requireOwner();
  if (!owner) return forbidden();
  const { id, contactId } = await context.params;
  const body = (await request.json().catch(() => null)) as ContactInput | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }
  const result = await updateContact(id, contactId, body, { userId: owner.user.id });
  if ("error" in result) {
    return NextResponse.json({ ok: false, message: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, contact: result.contact });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const owner = await requireOwner();
  if (!owner) return forbidden();
  const { id, contactId } = await context.params;
  const result = await deleteContact(id, contactId, { userId: owner.user.id });
  if ("error" in result) {
    return NextResponse.json({ ok: false, message: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
