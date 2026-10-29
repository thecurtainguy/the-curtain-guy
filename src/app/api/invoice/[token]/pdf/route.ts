import { NextResponse } from "next/server";
import { isCustomerLanguage } from "@/data/customer-language";
import { getBusinessSettings } from "@/lib/business-settings";
import { getSiteUrl } from "@/lib/env";
import { invoicePdfFilename, renderInvoicePdfBuffer } from "@/lib/invoice-pdf";
import {
  buildPublicInvoiceUrl,
  fetchInvoiceByPublicToken,
  localizeInvoice,
  logInvoiceClientAccess,
  toCustomerSafeInvoice,
} from "@/lib/invoices";
import { LINK_CHANNEL_PARAM } from "@/data/link-channel";
import { isOwnerCopySource, OWNER_COPY_PARAM, recordDocumentOpen } from "@/lib/document-views";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { token } = await context.params;
  const invoice = await fetchInvoiceByPublicToken(token);
  if (!invoice) {
    return NextResponse.json({ ok: false, message: "Invoice not found." }, { status: 404 });
  }
  const searchParams = new URL(request.url).searchParams;
  const lang = searchParams.get("lang");
  const language = isCustomerLanguage(lang) ? lang : invoice.language;
  const buffer = await renderInvoicePdfBuffer({
    invoice: await localizeInvoice(toCustomerSafeInvoice(invoice), language),
    settings: await getBusinessSettings(),
    publicUrl: buildPublicInvoiceUrl(getSiteUrl(), token),
  });
  const { owner } = await recordDocumentOpen({
    target: { invoiceId: invoice.id },
    source: "public_link",
    ownerCopy: isOwnerCopySource(searchParams.get(OWNER_COPY_PARAM)),
    pdf: true,
    via: searchParams.get(LINK_CHANNEL_PARAM),
  });
  if (!owner) {
    await logInvoiceClientAccess({
      invoiceId: invoice.id,
      actorType: "public_link",
      eventType: "pdf_downloaded",
      summary: `Client downloaded the PDF (secure link, ${language === "fr" ? "French" : "English"})`,
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
