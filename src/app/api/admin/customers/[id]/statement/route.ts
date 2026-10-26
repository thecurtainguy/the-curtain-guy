import { NextResponse } from "next/server";
import { isCustomerLanguage } from "@/data/customer-language";
import { requireOwner } from "@/lib/auth";
import { getBusinessSettings } from "@/lib/business-settings";
import { fetchCustomerById, fetchCustomerHistory, logCustomerEvent } from "@/lib/customers";
import { renderCustomerStatementPdf, statementPdfFilename } from "@/lib/customer-statement-pdf";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json({ ok: false, message: "Owner access required." }, { status: 403 });
  }
  const { id } = await context.params;
  const customer = await fetchCustomerById(id);
  if (!customer) {
    return NextResponse.json({ ok: false, message: "Customer not found." }, { status: 404 });
  }
  const url = new URL(request.url);
  const lang = url.searchParams.get("lang");
  const openOnly = url.searchParams.get("scope") === "open";
  const language = isCustomerLanguage(lang) ? lang : customer.preferred_language;

  const [history, settings] = await Promise.all([fetchCustomerHistory(id), getBusinessSettings()]);
  const pdf = await renderCustomerStatementPdf({
    customer,
    invoices: history.invoices,
    payments: history.payments,
    settings,
    language,
    openOnly,
  });
  await logCustomerEvent({
    customerId: id,
    actorUserId: owner.user.id,
    eventType: "statement_generated",
    summary: `Statement of account generated (${openOnly ? "open invoices" : "all invoices"}, ${language === "fr" ? "Français" : "English"})`,
    metadata: { open_only: openOnly, language },
  });

  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${url.searchParams.get("download") ? "attachment" : "inline"}; filename="${statementPdfFilename(customer, today)}"`,
      "Cache-Control": "no-store",
    },
  });
}
