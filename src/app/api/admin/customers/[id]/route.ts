import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import {
  deleteCustomer,
  fetchCustomerById,
  updateCustomer,
  type CustomerInput,
} from "@/lib/customers";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

function forbidden() {
  return NextResponse.json({ ok: false, message: "Owner access required." }, { status: 403 });
}

export async function GET(_request: Request, context: RouteContext) {
  if (!(await requireOwner())) return forbidden();
  const { id } = await context.params;
  const customer = await fetchCustomerById(id);
  if (!customer) {
    return NextResponse.json({ ok: false, message: "Customer not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, customer });
}

export async function PATCH(request: Request, context: RouteContext) {
  const owner = await requireOwner();
  if (!owner) return forbidden();
  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as
    | (CustomerInput & { applyLanguageToOpenDocuments?: boolean })
    | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }
  const { applyLanguageToOpenDocuments, ...input } = body;
  const result = await updateCustomer(
    id,
    input,
    { userId: owner.user.id, email: owner.profile.email },
    { applyLanguageToOpenDocuments: applyLanguageToOpenDocuments !== false }
  );
  if ("error" in result) {
    return NextResponse.json({ ok: false, message: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, customer: result.customer, cascade: result.cascade });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const owner = await requireOwner();
  if (!owner) return forbidden();
  const { id } = await context.params;
  const result = await deleteCustomer(id, { userId: owner.user.id, email: owner.profile.email });
  if ("error" in result) {
    return NextResponse.json({ ok: false, message: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
