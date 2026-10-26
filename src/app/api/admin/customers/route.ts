import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { createCustomer, searchCustomers, type CustomerInput } from "@/lib/customers";

export const runtime = "nodejs";

function forbidden() {
  return NextResponse.json({ ok: false, message: "Owner access required." }, { status: 403 });
}

export async function GET(request: Request) {
  if (!(await requireOwner())) return forbidden();
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const customers = await searchCustomers(q, 12);
  return NextResponse.json({
    ok: true,
    customers: customers.map((c) => ({
      id: c.id,
      customer_number: c.customer_number,
      display_name: c.display_name,
      company_name: c.company_name,
      primary_email: c.primary_email,
      phone: c.phone,
      kind: c.kind,
      preferred_language: c.preferred_language,
    })),
  });
}

export async function POST(request: Request) {
  const owner = await requireOwner();
  if (!owner) return forbidden();
  const body = (await request.json().catch(() => null)) as CustomerInput | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }
  const result = await createCustomer(body, { userId: owner.user.id, email: owner.profile.email });
  if ("error" in result) {
    return NextResponse.json(
      { ok: false, message: result.error, existingId: result.existingId ?? null },
      { status: result.existingId ? 409 : 400 }
    );
  }
  return NextResponse.json({ ok: true, customer: result.customer });
}
