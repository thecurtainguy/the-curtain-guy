import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { PageLocale } from "@/components/i18n/page-locale";
import { InvoiceDocumentView } from "@/components/invoices/invoice-document-view";
import { getBusinessSettings } from "@/lib/business-settings";
import { DocumentViewBeacon } from "@/components/documents/document-view-beacon";
import {
  isOwnerCopySource,
  OWNER_COPY_PARAM,
  OWNER_COPY_VALUE,
  recordDocumentOpen,
} from "@/lib/document-views";
import { fetchInvoiceByPublicToken, toCustomerSafeInvoice } from "@/lib/invoices";

const getInvoiceForToken = cache(fetchInvoiceByPublicToken);

type PageProps = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ src?: string | string[] }>;
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

export default async function PublicInvoicePage({ params, searchParams }: PageProps) {
  const { token } = await params;
  const invoice = await getInvoiceForToken(token);
  if (!invoice) notFound();

  const ownerCopy = isOwnerCopySource((await searchParams).src);
  const { viewId } = await recordDocumentOpen({
    target: { invoiceId: invoice.id },
    source: "public_link",
    ownerCopy,
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
          pdfUrl={`/api/invoice/${token}/pdf${ownerCopy ? `?${OWNER_COPY_PARAM}=${OWNER_COPY_VALUE}` : ""}`}
        />
        <DocumentViewBeacon viewId={viewId} />
      </div>
    </div>
  );
}
