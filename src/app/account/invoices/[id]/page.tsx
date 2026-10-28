import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAccountPage } from "@/lib/account-page";
import { AccountPageFrame } from "@/components/account/account-page-frame";
import { InvoiceDocumentView } from "@/components/invoices/invoice-document-view";
import { PortalBackLink } from "@/components/portal/portal-back-link";
import { isCustomerLanguage } from "@/data/customer-language";
import { otherCustomerLanguage } from "@/data/quotes";
import { getBusinessSettings } from "@/lib/business-settings";
import { DocumentViewBeacon } from "@/components/documents/document-view-beacon";
import { recordDocumentOpen } from "@/lib/document-views";
import { getCustomerInvoice, localizeInvoice, toCustomerSafeInvoice } from "@/lib/invoices";

export const metadata: Metadata = {
  title: "Invoice",
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lang?: string | string[] }>;
};

export default async function AccountInvoicePage({ params, searchParams }: PageProps) {
  const current = await requireAccountPage();
  const { id } = await params;
  const invoice = await getCustomerInvoice(id, current.user);
  if (!invoice) notFound();
  const { lang } = await searchParams;
  const language = isCustomerLanguage(lang) ? lang : invoice.language;
  const other = otherCustomerLanguage(language);
  const { viewId } = await recordDocumentOpen({
    target: { invoiceId: invoice.id },
    source: "account",
  });
  const settings = await getBusinessSettings();
  const query = (target: typeof language) => (target === invoice.language ? "" : `?lang=${target}`);

  return (
    <AccountPageFrame email={current.profile.email}>
      <div className="space-y-4">
        {invoice.job_id ? (
          <PortalBackLink href={`/account/events/${invoice.job_id}`}>
            {language === "fr" ? "Retour à l'événement" : "Back to event"}
          </PortalBackLink>
        ) : (
          <PortalBackLink href="/account">
            {language === "fr" ? "Retour au tableau de bord" : "Back to dashboard"}
          </PortalBackLink>
        )}
        <InvoiceDocumentView
          invoice={await localizeInvoice(toCustomerSafeInvoice(invoice), language)}
          settings={settings}
          pdfUrl={`/api/invoices/${invoice.id}/pdf${query(language)}`}
          otherLanguage={{
            href: `/account/invoices/${invoice.id}${query(other)}`,
            label: other === "fr" ? "Version française" : "English version",
            lang: other,
          }}
        />
        <DocumentViewBeacon viewId={viewId} />
      </div>
    </AccountPageFrame>
  );
}
