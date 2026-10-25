import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import {
  deleteDraftInvoice,
  fetchInvoiceById,
  saveInvoice,
  type InvoiceSaveInput,
} from "@/lib/invoices";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

function forbidden() {
  return NextResponse.json(
    { ok: false, message: "Owner access required." },
    { status: 403 }
  );
}

export async function GET(_request: Request, context: RouteContext) {
  if (!(await requireOwner())) return forbidden();
  const { id } = await context.params;
  const invoice = await fetchInvoiceById(id, { includeEvents: true });
  if (!invoice) {
    return NextResponse.json({ ok: false, message: "Invoice not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, invoice });
}

export async function PUT(request: Request, context: RouteContext) {
  const owner = await requireOwner();
  if (!owner) return forbidden();
  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as InvoiceSaveInput | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }
  const result = await saveInvoice(id, body, owner.user.id);
  if ("error" in result) {
    return NextResponse.json({ ok: false, message: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, invoice: result });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const owner = await requireOwner();
  if (!owner) return forbidden();
  const { id } = await context.params;
  const result = await deleteDraftInvoice(id, owner.user.id);
  if ("error" in result) {
    return NextResponse.json({ ok: false, message: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
