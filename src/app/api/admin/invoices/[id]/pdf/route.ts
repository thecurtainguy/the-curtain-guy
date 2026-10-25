import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { getBusinessSettings } from "@/lib/business-settings";
import { getSiteUrl } from "@/lib/env";
import { invoicePdfFilename, renderInvoicePdfBuffer } from "@/lib/invoice-pdf";
import {
  fetchInvoiceById,
  findActiveInvoiceUrl,
  toCustomerSafeInvoice,
} from "@/lib/invoices";

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
  const buffer = await renderInvoicePdfBuffer({
    invoice: toCustomerSafeInvoice(invoice),
    settings,
    publicUrl,
  });
  const download = new URL(request.url).searchParams.get("download") === "1";
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${invoicePdfFilename(invoice.invoice_number)}"`,
      "Cache-Control": "no-store",
    },
  });
}
