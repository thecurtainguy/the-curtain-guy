import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { createInvoiceFromJob } from "@/lib/invoices";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json(
      { ok: false, message: "Owner access required." },
      { status: 403 }
    );
  }
  const { id: jobId } = await context.params;
  try {
    const result = await createInvoiceFromJob(jobId, owner.user.id);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not create invoice.";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
