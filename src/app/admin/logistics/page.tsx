import type { Metadata } from "next";
import { Truck } from "lucide-react";
import { requireAdminPage } from "@/lib/admin-page";
import { AdminDeliveryZonesEditor } from "@/components/admin/admin-delivery-zones";
import { AdminPageFrame } from "@/components/admin/admin-page-frame";
import { PortalPageHeader } from "@/components/portal/portal-page-header";
import { listRentalDeliveryZones } from "@/lib/rental-delivery-zones";

export const metadata: Metadata = {
  title: "Logistics zones",
  robots: { index: false, follow: false },
};

export default async function AdminLogisticsPage() {
  const owner = await requireAdminPage();
  const zones = await listRentalDeliveryZones({ includeInactive: true });

  return (
    <AdminPageFrame email={owner.profile.email} profile={owner.profile}>
      <div className="space-y-6">
        <PortalPageHeader
          eyebrow="Logistics"
          title="Delivery zones"
          description="Set full-service and transport-only fees for each rentals delivery area."
          icon={Truck}
        />
        <AdminDeliveryZonesEditor initialZones={zones} />
      </div>
    </AdminPageFrame>
  );
}
