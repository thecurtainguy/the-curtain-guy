import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/admin-page";
import { AdminPageFrame } from "@/components/admin/admin-page-frame";
import { AdminEventPlanQuotesSection } from "@/components/admin/admin-event-plan-quotes-section";
import { EventPlanPortalDetail } from "@/components/event-plans/event-plan-portal-detail";
import {
  fetchEventPlanById,
  parseEventPlanBrief,
  parseEventPlanDesign,
} from "@/lib/event-plan-access";
import { formatEventPlanReference } from "@/data/event-plans";
import { listQuotesForEstimate } from "@/lib/quotes";
import { getStudioDesignQuoteId } from "@/lib/studio-leads-admin";
import type { StudioActor } from "@/lib/studio";
import { StudioDesignReviewSection } from "@/components/admin/studio-leads/studio-design-review-section";

export const metadata: Metadata = {
  title: "Event plan detail",
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminEventPlanDetailPage({ params }: PageProps) {
  const owner = await requireAdminPage();
  const { id } = await params;
  const plan = await fetchEventPlanById(id);

  if (!plan) notFound();

  const brief = parseEventPlanBrief(plan);
  const design = parseEventPlanDesign(plan);
  if (!brief || !design) notFound();

  const reference = formatEventPlanReference(plan.id, plan.reference);
  const submittedAt = new Date(plan.created_at).toLocaleString();
  const actor: StudioActor = {
    userId: owner.user.id,
    role: "owner",
    user: owner.user,
  };
  const [quotes, designQuoteId] = await Promise.all([
    plan.estimate_request_id
      ? listQuotesForEstimate(plan.estimate_request_id)
      : Promise.resolve([]),
    getStudioDesignQuoteId(actor, plan.studio_design_id),
  ]);

  return (
    <AdminPageFrame email={owner.profile.email}>
      <EventPlanPortalDetail
        planId={plan.id}
        reference={reference}
        submittedAt={submittedAt}
        status={plan.status}
        audience="admin"
        planView={plan}
        brief={brief}
        design={design}
        contactDefaults={{
          name: plan.contact_name,
          email: plan.contact_email,
          phone: plan.contact_phone ?? "",
          notes: plan.notes ?? "",
        }}
        backHref="/admin/event-plans"
        backLabel="All event plans"
        afterHeader={
          <>
            <AdminEventPlanQuotesSection
              eventPlanId={plan.id}
              estimateId={plan.estimate_request_id}
              quotes={quotes}
            />
            <StudioDesignReviewSection
              design={design}
              designId={plan.studio_design_id}
              eventPlanId={plan.id}
              existingQuoteId={designQuoteId}
            />
          </>
        }
      />
    </AdminPageFrame>
  );
}
