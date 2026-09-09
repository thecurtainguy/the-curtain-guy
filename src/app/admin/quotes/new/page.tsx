import type { Metadata } from "next";
import { FileText } from "lucide-react";
import { requireAdminPage } from "@/lib/admin-page";
import { AdminCreateQuoteForm } from "@/components/admin/admin-create-quote-form";
import { AdminPageFrame } from "@/components/admin/admin-page-frame";
import { PortalPageHeader } from "@/components/portal/portal-page-header";

export const metadata: Metadata = {
  title: "Create quote",
  robots: { index: false, follow: false },
};

export default async function AdminCreateQuotePage() {
  const owner = await requireAdminPage();

  return (
    <AdminPageFrame email={owner.profile.email} profile={owner.profile}>
      <div className="space-y-6">
        <PortalPageHeader
          eyebrow="Quotes"
          title="Create quote"
          description="Start a draft proposal without an estimate — for phone calls, walk-ins, and known bookings."
          icon={FileText}
          backHref="/admin/quotes"
          backLabel="All quotes"
        />
        <AdminCreateQuoteForm />
      </div>
    </AdminPageFrame>
  );
}
