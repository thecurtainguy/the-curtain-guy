import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { deleteInvoicePayment, fetchInvoiceById } from "@/lib/invoices";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string; paymentId: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json(
      { ok: false, message: "Owner access required." },
      { status: 403 }
    );
  }
  const { id, paymentId } = await context.params;
  const result = await deleteInvoicePayment(id, paymentId, owner.user.id);
  if ("error" in result) {
    return NextResponse.json({ ok: false, message: result.error }, { status: 400 });
  }
  return NextResponse.json({
    ok: true,
    invoice: await fetchInvoiceById(id, { includeEvents: true }),
  });
}
