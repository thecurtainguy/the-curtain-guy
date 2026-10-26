import type { Metadata } from "next";
import { FileText } from "lucide-react";
import { requireAdminPage } from "@/lib/admin-page";
import { AdminCreateQuoteForm } from "@/components/admin/admin-create-quote-form";
import { AdminPageFrame } from "@/components/admin/admin-page-frame";
import { PortalPageHeader } from "@/components/portal/portal-page-header";
import { fetchCustomerById } from "@/lib/customers";

export const metadata: Metadata = {
  title: "Create quote",
  robots: { index: false, follow: false },
};

type PageProps = { searchParams: Promise<{ customer?: string }> };

export default async function AdminCreateQuotePage({ searchParams }: PageProps) {
  const owner = await requireAdminPage();
  const { customer: customerId } = await searchParams;
  const customer = customerId ? await fetchCustomerById(customerId) : null;

  return (
    <AdminPageFrame email={owner.profile.email}>
      <div className="space-y-6">
        <PortalPageHeader
          eyebrow="Quotes"
          title="Create quote"
          description="Start a draft proposal without an estimate — for phone calls, walk-ins, and known bookings."
          icon={FileText}
          backHref={customer ? `/admin/customers/${customer.id}` : "/admin/quotes"}
          backLabel={customer ? customer.display_name : "All quotes"}
        />
        <AdminCreateQuoteForm
          initialCustomer={
            customer
              ? {
                  id: customer.id,
                  customer_number: customer.customer_number,
                  display_name: customer.display_name,
                  company_name: customer.company_name,
                  primary_email: customer.primary_email,
                  phone: customer.phone,
                  kind: customer.kind,
                  preferred_language: customer.preferred_language,
                }
              : null
          }
        />
      </div>
    </AdminPageFrame>
  );
}
