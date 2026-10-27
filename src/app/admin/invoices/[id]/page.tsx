import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/admin-page";
import { AdminPageFrame } from "@/components/admin/admin-page-frame";
import { AdminInvoiceEditor } from "@/components/admin/admin-invoice-editor";
import { OpportunityFilesPanel } from "@/components/estimates/opportunity-files-panel";
import { getBusinessSettings } from "@/lib/business-settings";
import { getSiteUrl } from "@/lib/env";
import { fetchInvoiceById, findActiveInvoiceUrl } from "@/lib/invoices";
import { getCustomerLinkSummary } from "@/lib/customers";
import { loadAdminOpportunityFiles } from "@/lib/estimate-file-events";

export const metadata: Metadata = {
  title: "Invoice",
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminInvoicePage({ params }: PageProps) {
  const owner = await requireAdminPage();
  const { id } = await params;
  const [invoice, settings, publicUrl] = await Promise.all([
    fetchInvoiceById(id, { includeEvents: true }),
    getBusinessSettings(),
    findActiveInvoiceUrl(id, getSiteUrl()),
  ]);
  if (!invoice) notFound();
  const customerLink = await getCustomerLinkSummary(invoice.customer_id, {
    excludeEmails: [invoice.customer_email],
  });
  const opportunityFiles = invoice.estimate_request_id
    ? await loadAdminOpportunityFiles(invoice.estimate_request_id)
    : null;

  return (
    <AdminPageFrame email={owner.profile.email}>
      <AdminInvoiceEditor
        invoice={invoice}
        paymentMethods={settings.payment_methods}
        tradeName={settings.trade_name}
        initialPublicUrl={publicUrl}
        customerLink={customerLink}
      />
      {invoice.estimate_request_id && opportunityFiles ? (
        <OpportunityFilesPanel
          estimateRequestId={invoice.estimate_request_id}
          files={opportunityFiles.files}
          deletedFiles={opportunityFiles.deletedFiles}
          activity={opportunityFiles.activity}
          audience="admin"
          title="Files & PDF attachments"
          description="Turn on Invoice to add a shared file to the invoice PDF. Internal files never go to the customer."
          className="mt-6"
        />
      ) : null}
    </AdminPageFrame>
  );
}
