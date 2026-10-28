import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { createInvoiceFromJob, listInvoicesForJob } from "@/lib/invoices";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json(
      { ok: false, message: "Owner access required." },
      { status: 403 }
    );
  }
  const { id: jobId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { reuseActive?: boolean };
  try {
    if (body.reuseActive) {
      const active = (await listInvoicesForJob(jobId)).find((inv) => inv.status !== "void");
      if (active) {
        return NextResponse.json({
          ok: true,
          invoiceId: active.id,
          invoiceNumber: active.invoice_number,
          reused: true,
        });
      }
    }
    const result = await createInvoiceFromJob(jobId, owner.user.id);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not create invoice.";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
