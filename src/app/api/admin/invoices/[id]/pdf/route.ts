import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { getBusinessSettings } from "@/lib/business-settings";
import { getSiteUrl } from "@/lib/env";
import { invoicePdfFilename, renderInvoicePdfBuffer } from "@/lib/invoice-pdf";
import {
  fetchInvoiceById,
  findActiveInvoiceUrl,
  localizeInvoice,
  toCustomerSafeInvoice,
} from "@/lib/invoices";
import { isCustomerLanguage } from "@/data/customer-language";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  if (!(await requireOwner())) {
    return NextResponse.json(
      { ok: false, message: "Owner access required." },
      { status: 403 }
    );
  }
  const { id } = await context.params;
  const invoice = await fetchInvoiceById(id);
  if (!invoice) {
    return NextResponse.json({ ok: false, message: "Invoice not found." }, { status: 404 });
  }
  const [settings, publicUrl] = await Promise.all([
    getBusinessSettings(),
    findActiveInvoiceUrl(id, getSiteUrl()),
  ]);
  const searchParams = new URL(request.url).searchParams;
  const lang = searchParams.get("lang");
  const language = isCustomerLanguage(lang) ? lang : invoice.language;
  const buffer = await renderInvoicePdfBuffer({
    invoice: await localizeInvoice(toCustomerSafeInvoice(invoice), language),
    settings,
    publicUrl,
  });
  const download = searchParams.get("download") === "1";
  const filename =
    language === invoice.language
      ? invoicePdfFilename(invoice.invoice_number)
      : invoicePdfFilename(invoice.invoice_number, language);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
