import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";
import { requireAdminPage } from "@/lib/admin-page";
import { AdminPageFrame } from "@/components/admin/admin-page-frame";
import {
  AdminJobsList,
  type AdminJobListRow,
} from "@/components/admin/lists/admin-jobs-list";
import { PortalPageHeader } from "@/components/portal/portal-page-header";
import { listAdminJobs } from "@/lib/jobs";

export const metadata: Metadata = {
  title: "Jobs",
  robots: { index: false, follow: false },
};

export default async function AdminJobsPage() {
  const owner = await requireAdminPage();
  const jobs = await listAdminJobs({ limit: 500 });

  const listRows: AdminJobListRow[] = jobs.map((row) => ({
    id: row.id,
    opportunity_ref: row.opportunity_ref,
    status: row.status,
    customer_name: row.customer_name,
    customer_email: row.customer_email,
    event_date: row.event_date,
    venue_name: row.venue_name,
    install_date: row.install_date,
    install_start_time: row.install_start_time,
    teardown_date: row.teardown_date,
    teardown_start_time: row.teardown_start_time,
    checklist_completed: row.checklist_completed,
    checklist_total: row.checklist_total,
    quote_display_ref: row.quote_display_ref,
    accepted_quote_total_cents: row.accepted_quote_total_cents,
  }));

  return (
    <AdminPageFrame email={owner.profile.email}>
      <div className="space-y-6">
        <PortalPageHeader
          eyebrow="Jobs"
          title="Jobs"
          description="Manage booked events, install schedules, teardown, and production notes."
          icon={CalendarDays}
        />
        <AdminJobsList rows={listRows} />
      </div>
    </AdminPageFrame>
  );
}
