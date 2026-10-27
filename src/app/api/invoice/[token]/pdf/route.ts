import { NextResponse } from "next/server";
import { getBusinessSettings } from "@/lib/business-settings";
import { getSiteUrl } from "@/lib/env";
import { invoicePdfFilename, renderInvoicePdfBuffer } from "@/lib/invoice-pdf";
import {
  buildPublicInvoiceUrl,
  fetchInvoiceByPublicToken,
  logInvoiceClientAccess,
  toCustomerSafeInvoice,
} from "@/lib/invoices";
import { isOwnerCopySource, OWNER_COPY_PARAM, recordDocumentOpen } from "@/lib/document-views";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { token } = await context.params;
  const invoice = await fetchInvoiceByPublicToken(token);
  if (!invoice) {
    return NextResponse.json({ ok: false, message: "Invoice not found." }, { status: 404 });
  }
  const buffer = await renderInvoicePdfBuffer({
    invoice: toCustomerSafeInvoice(invoice),
    settings: await getBusinessSettings(),
    publicUrl: buildPublicInvoiceUrl(getSiteUrl(), token),
  });
  const { owner } = await recordDocumentOpen({
    target: { invoiceId: invoice.id },
    source: "public_link",
    ownerCopy: isOwnerCopySource(new URL(request.url).searchParams.get(OWNER_COPY_PARAM)),
    pdf: true,
  });
  if (!owner) {
    await logInvoiceClientAccess({
      invoiceId: invoice.id,
      actorType: "public_link",
      eventType: "pdf_downloaded",
      summary: "Client downloaded the PDF (secure link)",
    });
  }
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${invoicePdfFilename(invoice.invoice_number)}"`,
      "Cache-Control": "no-store",
    },
  });
}
