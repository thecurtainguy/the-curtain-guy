import type { Metadata } from "next";
import { Tags } from "lucide-react";
import { requireAdminPage } from "@/lib/admin-page";
import { AdminPageFrame } from "@/components/admin/admin-page-frame";
import { AdminEventTypesSettings } from "@/components/admin/admin-event-types-settings";
import { PortalPageHeader } from "@/components/portal/portal-page-header";
import { getEventTypes, getEventTypeUsage } from "@/lib/event-types";

export const metadata: Metadata = {
  title: "Event types",
  robots: { index: false, follow: false },
};

export default async function AdminEventTypesPage() {
  const owner = await requireAdminPage();
  const [eventTypes, usage] = await Promise.all([getEventTypes(), getEventTypeUsage()]);

  return (
    <AdminPageFrame email={owner.profile.email} profile={owner.profile}>
      <div className="space-y-6">
        <PortalPageHeader
          eyebrow="Settings"
          title="Event types"
          description="Add, rename, reorder or hide the event types clients choose from."
          icon={Tags}
        />
        <AdminEventTypesSettings initialTypes={eventTypes} initialUsage={usage} />
      </div>
    </AdminPageFrame>
  );
}
