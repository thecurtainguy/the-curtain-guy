import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";
import {
  isEmailVerified,
  requireAccountPage,
} from "@/lib/account-page";
import {
  AccountPageFrame,
  EmailVerificationBanner,
} from "@/components/account/account-page-frame";
import {
  AccountEventsList,
  type AccountEventListRow,
} from "@/components/account/lists/account-events-list";
import { PortalPageHeader } from "@/components/portal/portal-page-header";
import { listCustomerJobs } from "@/lib/jobs";

export const metadata: Metadata = {
  title: "Your events",
  robots: { index: false, follow: false },
};

export default async function AccountEventsPage() {
  const current = await requireAccountPage();
  const verified = isEmailVerified(current.user);
  const jobs = await listCustomerJobs(current.user);

  const listRows: AccountEventListRow[] = jobs.map((job) => ({
    id: job.id,
    opportunity_ref: job.opportunity_ref,
    status: job.status,
    event_date: job.event_date,
    venue_name: job.venue_name,
    install_date: job.install_date,
    install_start_time: job.install_start_time,
    teardown_date: job.teardown_date,
    teardown_start_time: job.teardown_start_time,
  }));

  return (
    <AccountPageFrame email={current.profile.email}>
      <EmailVerificationBanner verified={verified} />
      <div className="space-y-6">
        <PortalPageHeader
          eyebrow="Events"
          title="Events"
          description="View your confirmed event details and updates."
          icon={CalendarDays}
        />
        <AccountEventsList rows={listRows} />
      </div>
    </AccountPageFrame>
  );
}
