import type { Metadata } from "next";
import { EventPlanSubmitSuccess } from "@/components/event-builder/event-plan-submit-success";
import { getCurrentProfile, getCurrentUser, isOwnerProfile } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Event plan submitted",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<{ ref?: string; id?: string; email?: string }>;
};

export default async function EventPlanSuccessPage({
  searchParams,
}: PageProps) {
  const { ref, id, email: emailParam } = await searchParams;
  const reference = ref ? decodeURIComponent(ref) : undefined;
  const planId = id ? decodeURIComponent(id) : undefined;
  const emailFromQuery = emailParam ? decodeURIComponent(emailParam) : "";

  const profileBundle = await getCurrentProfile();
  const user = profileBundle?.user ?? (await getCurrentUser());

  let viewerRole: "guest" | "customer" | "owner" = "guest";
  if (user && profileBundle) {
    viewerRole = isOwnerProfile(profileBundle.profile) ? "owner" : "customer";
  }

  const email =
    emailFromQuery ||
    profileBundle?.profile.email ||
    user?.email ||
    "";

  const accountEventPlanHref = planId
    ? `/account/event-plans/${planId}`
    : "/account/event-plans";
  const adminEventPlanHref = planId
    ? `/admin/event-plans/${planId}`
    : "/admin/event-plans";

  return (
    <EventPlanSubmitSuccess
      reference={reference}
      viewerRole={viewerRole}
      email={email}
      accountEventPlanHref={accountEventPlanHref}
      adminEventPlanHref={adminEventPlanHref}
    />
  );
}
