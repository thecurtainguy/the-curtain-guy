import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { PageLocale } from "@/components/i18n/page-locale";
import { InvoiceDocumentView } from "@/components/invoices/invoice-document-view";
import { getBusinessSettings } from "@/lib/business-settings";
import {
  fetchInvoiceByPublicToken,
  logInvoiceClientAccess,
  markInvoiceViewed,
  toCustomerSafeInvoice,
} from "@/lib/invoices";

const getInvoiceForToken = cache(fetchInvoiceByPublicToken);

type PageProps = {
  params: Promise<{ token: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params;
  const invoice = await getInvoiceForToken(token);
  return {
    title: invoice
      ? `${invoice.language === "fr" ? "Facture" : "Invoice"} ${invoice.invoice_number}`
      : "Invoice",
    robots: { index: false, follow: false },
  };
}

export default async function PublicInvoicePage({ params }: PageProps) {
  const { token } = await params;
  const invoice = await getInvoiceForToken(token);
  if (!invoice) notFound();

  if (!invoice.viewed_at) await markInvoiceViewed(invoice.id);
  await logInvoiceClientAccess({
    invoiceId: invoice.id,
    actorType: "public_link",
    eventType: "invoice_viewed",
    summary: invoice.viewed_at
      ? "Client opened the invoice again (secure link)"
      : "Client opened the invoice for the first time (secure link)",
  });
  const settings = await getBusinessSettings();

  return (
    <div className="relative min-h-[70vh] py-10 sm:py-14">
      <PageLocale locale={invoice.language} />
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.1),transparent_50%)]"
        aria-hidden
      />
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <InvoiceDocumentView
          invoice={toCustomerSafeInvoice(invoice)}
          settings={settings}
          pdfUrl={`/api/invoice/${token}/pdf`}
        />
      </div>
    </div>
  );
}
