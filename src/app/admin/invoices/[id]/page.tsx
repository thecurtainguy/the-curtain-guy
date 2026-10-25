import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/admin-page";
import { AdminPageFrame } from "@/components/admin/admin-page-frame";
import { AdminInvoiceEditor } from "@/components/admin/admin-invoice-editor";
import { getBusinessSettings } from "@/lib/business-settings";
import { getSiteUrl } from "@/lib/env";
import { fetchInvoiceById, findActiveInvoiceUrl } from "@/lib/invoices";

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

  return (
    <AdminPageFrame email={owner.profile.email}>
      <AdminInvoiceEditor
        invoice={invoice}
        paymentMethods={settings.payment_methods}
        tradeName={settings.trade_name}
        initialPublicUrl={publicUrl}
      />
    </AdminPageFrame>
  );
}
