import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { getBusinessSettings } from "@/lib/business-settings";
import { getSiteUrl } from "@/lib/env";
import { buildInvoiceEmailPreview } from "@/lib/invoice-email";
import { fetchInvoiceById, findActiveInvoiceUrl } from "@/lib/invoices";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

/** Renders the exact invoice email HTML without sending it or issuing a new link. */
export async function POST(request: Request, context: RouteContext) {
  if (!(await requireOwner())) {
    return NextResponse.json({ ok: false, message: "Owner access required." }, { status: 403 });
  }
  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as {
    subject?: string;
    bodyText?: string;
    attachPdf?: boolean;
  };
  const invoice = await fetchInvoiceById(id);
  if (!invoice) {
    return NextResponse.json({ ok: false, message: "Invoice not found." }, { status: 404 });
  }
  const siteUrl = getSiteUrl();
  const publicUrl = (await findActiveInvoiceUrl(id, siteUrl)) ?? `${siteUrl}/invoice/…`;
  const preview = await buildInvoiceEmailPreview({
    invoice,
    settings: await getBusinessSettings(),
    publicUrl,
    subject: body.subject,
    bodyText: body.bodyText,
    attachPdf: body.attachPdf,
  });
  return NextResponse.json({ ok: true, ...preview });
}
