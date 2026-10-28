import { NextResponse } from "next/server";
import { isCustomerLanguage } from "@/data/customer-language";
import { getCurrentUser } from "@/lib/auth";
import { getBusinessSettings } from "@/lib/business-settings";
import { invoicePdfFilename, renderInvoicePdfBuffer } from "@/lib/invoice-pdf";
import {
  getCustomerInvoice,
  localizeInvoice,
  logInvoiceClientAccess,
  toCustomerSafeInvoice,
} from "@/lib/invoices";
import { recordDocumentOpen } from "@/lib/document-views";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Sign in required." }, { status: 401 });
  }
  const { id } = await context.params;
  const invoice = await getCustomerInvoice(id, user);
  if (!invoice) {
    return NextResponse.json({ ok: false, message: "Invoice not found." }, { status: 404 });
  }
  const lang = new URL(request.url).searchParams.get("lang");
  const language = isCustomerLanguage(lang) ? lang : invoice.language;
  const buffer = await renderInvoicePdfBuffer({
    invoice: await localizeInvoice(toCustomerSafeInvoice(invoice), language),
    settings: await getBusinessSettings(),
  });
  const { owner } = await recordDocumentOpen({
    target: { invoiceId: invoice.id },
    source: "account",
    pdf: true,
  });
  if (!owner) {
    await logInvoiceClientAccess({
      invoiceId: invoice.id,
      actorType: "customer",
      actorUserId: user.id,
      eventType: "pdf_downloaded",
      summary: `Client downloaded the PDF (portal, ${language === "fr" ? "French" : "English"})`,
    });
  }
  const filename =
    language === invoice.language
      ? invoicePdfFilename(invoice.invoice_number)
      : invoicePdfFilename(invoice.invoice_number, language);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
