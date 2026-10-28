import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { createInvoiceRevision } from "@/lib/invoices";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

/** Opens (or reuses) the draft revision that will replace this issued invoice. */
export async function POST(_request: Request, context: RouteContext) {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json({ ok: false, message: "Owner access required." }, { status: 403 });
  }
  const { id } = await context.params;
  const result = await createInvoiceRevision(id, owner.user.id);
  if ("error" in result) {
    return NextResponse.json({ ok: false, message: result.error }, { status: 400 });
  }
  return NextResponse.json({
    ok: true,
    ...result,
    message: result.created
      ? `Revision ${result.invoiceNumber} created as a draft.`
      : `Revision ${result.invoiceNumber} is already in progress.`,
  });
}
