import type { Metadata } from "next";
import {
  isEmailVerified,
  requireAccountPage,
} from "@/lib/account-page";
import {
  AccountPageFrame,
  EmailVerificationBanner,
} from "@/components/account/account-page-frame";
import {
  AccountEventPlansList,
  type AccountEventPlanListRow,
} from "@/components/account/lists/account-event-plans-list";
import { EventPlanPortalListShell } from "@/components/event-plans/event-plan-portal-list-shell";
import { listEventPlansForCustomer } from "@/lib/event-plan-access";

export const metadata: Metadata = {
  title: "Your event plans",
  robots: { index: false, follow: false },
};

export default async function AccountEventPlansPage() {
  const current = await requireAccountPage();
  const verified = isEmailVerified(current.user);
  const plans = await listEventPlansForCustomer(current.user);

  const listRows: AccountEventPlanListRow[] = plans.map((row) => ({
    id: row.id,
    reference: row.reference,
    status: row.status,
    owner_user_id: row.owner_user_id,
    event_type: row.event_type,
    event_date: row.event_date,
    venue_name: row.venue_name,
    city_area: row.city_area,
    created_at: row.created_at,
  }));

  return (
    <AccountPageFrame email={current.profile.email}>
      <EmailVerificationBanner verified={verified} />
      <EventPlanPortalListShell
        audience="customer"
        description="Review and edit event builder submissions you sent to our team."
        contactDefaults={{
          name: current.profile.full_name ?? "",
          email: current.profile.email,
          phone: current.profile.phone ?? "",
          notes: "",
        }}
      >
        <AccountEventPlansList rows={listRows} />
      </EventPlanPortalListShell>
    </AccountPageFrame>
  );
}
