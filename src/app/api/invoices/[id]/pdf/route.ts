import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getBusinessSettings } from "@/lib/business-settings";
import { invoicePdfFilename, renderInvoicePdfBuffer } from "@/lib/invoice-pdf";
import {
  getCustomerInvoice,
  logInvoiceClientAccess,
  toCustomerSafeInvoice,
} from "@/lib/invoices";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Sign in required." }, { status: 401 });
  }
  const { id } = await context.params;
  const invoice = await getCustomerInvoice(id, user);
  if (!invoice) {
    return NextResponse.json({ ok: false, message: "Invoice not found." }, { status: 404 });
  }
  const buffer = await renderInvoicePdfBuffer({
    invoice: toCustomerSafeInvoice(invoice),
    settings: await getBusinessSettings(),
  });
  await logInvoiceClientAccess({
    invoiceId: invoice.id,
    actorType: "customer",
    actorUserId: user.id,
    eventType: "pdf_downloaded",
    summary: "Client downloaded the PDF (portal)",
  });
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${invoicePdfFilename(invoice.invoice_number)}"`,
      "Cache-Control": "no-store",
    },
  });
}
