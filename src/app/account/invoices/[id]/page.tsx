import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAccountPage } from "@/lib/account-page";
import { AccountPageFrame } from "@/components/account/account-page-frame";
import { InvoiceDocumentView } from "@/components/invoices/invoice-document-view";
import { PortalBackLink } from "@/components/portal/portal-back-link";
import { getBusinessSettings } from "@/lib/business-settings";
import { DocumentViewBeacon } from "@/components/documents/document-view-beacon";
import { recordDocumentOpen } from "@/lib/document-views";
import { getCustomerInvoice, toCustomerSafeInvoice } from "@/lib/invoices";

export const metadata: Metadata = {
  title: "Invoice",
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AccountInvoicePage({ params }: PageProps) {
  const current = await requireAccountPage();
  const { id } = await params;
  const invoice = await getCustomerInvoice(id, current.user);
  if (!invoice) notFound();
  const { viewId } = await recordDocumentOpen({
    target: { invoiceId: invoice.id },
    source: "account",
  });
  const settings = await getBusinessSettings();

  return (
    <AccountPageFrame email={current.profile.email}>
      <div className="space-y-4">
        {invoice.job_id ? (
          <PortalBackLink href={`/account/events/${invoice.job_id}`}>
            {invoice.language === "fr" ? "Retour à l'événement" : "Back to event"}
          </PortalBackLink>
        ) : (
          <PortalBackLink href="/account">
            {invoice.language === "fr" ? "Retour au tableau de bord" : "Back to dashboard"}
          </PortalBackLink>
        )}
        <InvoiceDocumentView
          invoice={toCustomerSafeInvoice(invoice)}
          settings={settings}
          pdfUrl={`/api/invoices/${invoice.id}/pdf`}
        />
        <DocumentViewBeacon viewId={viewId} />
      </div>
    </AccountPageFrame>
  );
}
