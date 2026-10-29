import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { PageLocale } from "@/components/i18n/page-locale";
import { InvoiceDocumentView } from "@/components/invoices/invoice-document-view";
import { isCustomerLanguage, type CustomerLanguage } from "@/data/customer-language";
import { otherCustomerLanguage } from "@/data/quotes";
import { getBusinessSettings } from "@/lib/business-settings";
import { DocumentViewBeacon } from "@/components/documents/document-view-beacon";
import { LINK_CHANNEL_PARAM, linkChannelFrom } from "@/data/link-channel";
import {
  isOwnerCopySource,
  OWNER_COPY_PARAM,
  OWNER_COPY_VALUE,
  recordDocumentOpen,
} from "@/lib/document-views";
import { fetchInvoiceByPublicToken, localizeInvoice, toCustomerSafeInvoice } from "@/lib/invoices";

const getInvoiceForToken = cache(fetchInvoiceByPublicToken);

type PageProps = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{
    lang?: string | string[];
    src?: string | string[];
    via?: string | string[];
  }>;
};

/** `?lang=` shows the same invoice in the other language. */
function viewLanguage(invoiceLanguage: CustomerLanguage, lang: string | string[] | undefined): CustomerLanguage {
  return isCustomerLanguage(lang) ? lang : invoiceLanguage;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { token } = await params;
  const invoice = await getInvoiceForToken(token);
  const language = invoice ? viewLanguage(invoice.language, (await searchParams).lang) : "en";
  return {
    title: invoice ? `${language === "fr" ? "Facture" : "Invoice"} ${invoice.invoice_number}` : "Invoice",
    robots: { index: false, follow: false },
  };
}

export default async function PublicInvoicePage({ params, searchParams }: PageProps) {
  const { token } = await params;
  const invoice = await getInvoiceForToken(token);
  if (!invoice) notFound();

  const { lang, src, via } = await searchParams;
  const language = viewLanguage(invoice.language, lang);
  const ownerCopy = isOwnerCopySource(src);
  const channel = linkChannelFrom(via);
  const { viewId } = await recordDocumentOpen({
    target: { invoiceId: invoice.id },
    source: "public_link",
    ownerCopy,
    via: channel,
  });
  const settings = await getBusinessSettings();

  const pdfParams = new URLSearchParams();
  if (language !== invoice.language) pdfParams.set("lang", language);
  if (ownerCopy) pdfParams.set(OWNER_COPY_PARAM, OWNER_COPY_VALUE);
  if (channel) pdfParams.set(LINK_CHANNEL_PARAM, channel);
  const pdfQuery = pdfParams.toString();

  const other = otherCustomerLanguage(language);
  const otherParams = new URLSearchParams();
  if (other !== invoice.language) otherParams.set("lang", other);
  if (ownerCopy) otherParams.set(OWNER_COPY_PARAM, OWNER_COPY_VALUE);
  if (channel) otherParams.set(LINK_CHANNEL_PARAM, channel);
  const otherQuery = otherParams.toString();

  return (
    <div className="relative min-h-[70vh] py-10 sm:py-14">
      <PageLocale locale={language} />
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.1),transparent_50%)]"
        aria-hidden
      />
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <InvoiceDocumentView
          invoice={await localizeInvoice(toCustomerSafeInvoice(invoice), language)}
          settings={settings}
          pdfUrl={`/api/invoice/${token}/pdf${pdfQuery ? `?${pdfQuery}` : ""}`}
          otherLanguage={{
            href: `/invoice/${token}${otherQuery ? `?${otherQuery}` : ""}`,
            label: other === "fr" ? "Version française" : "English version",
            lang: other,
          }}
        />
        <DocumentViewBeacon viewId={viewId} />
      </div>
    </div>
  );
}
