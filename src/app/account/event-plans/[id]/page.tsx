import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  isEmailVerified,
  requireAccountPage,
} from "@/lib/account-page";
import {
  AccountPageFrame,
  EmailVerificationBanner,
} from "@/components/account/account-page-frame";
import { EventPlanPortalDetail } from "@/components/event-plans/event-plan-portal-detail";
import {
  customerCanAccessEventPlan,
  fetchEventPlanById,
  parseEventPlanBrief,
  parseEventPlanDesign,
  toCustomerSafeEventPlan,
} from "@/lib/event-plan-access";
import { formatEventPlanReference } from "@/data/event-plans";

export const metadata: Metadata = {
  title: "Event plan detail",
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AccountEventPlanDetailPage({ params }: PageProps) {
  const current = await requireAccountPage();
  const verified = isEmailVerified(current.user);
  const { id } = await params;
  const plan = await fetchEventPlanById(id);

  if (!plan || !customerCanAccessEventPlan(plan, current.user)) {
    notFound();
  }

  const safe = toCustomerSafeEventPlan(plan);
  const brief = parseEventPlanBrief(plan);
  const design = parseEventPlanDesign(plan);
  if (!brief || !design) notFound();

  const reference = formatEventPlanReference(plan.id, plan.reference);
  const submittedAt = new Date(safe.created_at).toLocaleString();

  return (
    <AccountPageFrame email={current.profile.email}>
      <EmailVerificationBanner verified={verified} />
      <EventPlanPortalDetail
        planId={plan.id}
        reference={reference}
        submittedAt={submittedAt}
        status={safe.status}
        audience="customer"
        planView={safe}
        brief={brief}
        design={design}
        contactDefaults={{
          name: safe.contact_name,
          email: safe.contact_email,
          phone: safe.contact_phone ?? "",
          notes: safe.notes ?? "",
        }}
        backHref="/account/event-plans"
        backLabel="Your event plans"
      />
    </AccountPageFrame>
  );
}
