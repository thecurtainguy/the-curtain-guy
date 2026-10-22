import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock3, PanelsTopLeft, PencilRuler } from "lucide-react";
import { requireAdminPage } from "@/lib/admin-page";
import { AdminPageFrame } from "@/components/admin/admin-page-frame";
import { BuildQuoteFromDesignButton } from "@/components/admin/studio-quote/build-quote-from-design-button";
import {
  summarizeStudioDesign,
  toPlanThumbData,
} from "@/components/admin/studio-leads/design-summary";
import {
  StudioLeadSourceBadge,
  StudioLeadStageBadge,
} from "@/components/admin/studio-leads/lead-badges";
import { StudioDesignViewer } from "@/components/admin/studio-leads/studio-design-viewer";
import { StudioDesignWants } from "@/components/admin/studio-leads/studio-design-wants";
import { StudioLeadProfile } from "@/components/admin/studio-leads/studio-lead-profile";
import { PortalPageHeader } from "@/components/portal/portal-page-header";
import { Button } from "@/components/ui/button";
import { getStudioLeadDetail } from "@/lib/studio-leads-admin";
import type { StudioActor } from "@/lib/studio";

export const metadata: Metadata = {
  title: "Studio lead",
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminStudioLeadPage({ params }: PageProps) {
  const [owner, { id }] = await Promise.all([requireAdminPage(), params]);
  const actor: StudioActor = {
    userId: owner.user.id,
    role: "owner",
    user: owner.user,
  };
  const lead = await getStudioLeadDetail(actor, id);
  if (!lead) notFound();

  const summary = summarizeStudioDesign(lead.design);
  const plan = toPlanThumbData({
    floor: lead.design.room.floor,
    drapeRuns: lead.design.drapeRuns,
    openings: lead.design.openings,
  });
  const editHref = `/admin/studio/${lead.id}/edit`;
  const headline =
    lead.contact.name ?? lead.event.name ?? lead.contact.email ?? lead.title;

  return (
    <AdminPageFrame email={owner.profile.email} profile={owner.profile}>
      <div className="space-y-5">
        <PortalPageHeader
          backHref="/admin/studio"
          backLabel="All studio leads"
          eyebrow={`Studio lead${lead.opportunityRef ? ` · ${lead.opportunityRef}` : ""}`}
          title={headline}
          description={`${lead.title} · ${summary.roomName}`}
          icon={PanelsTopLeft}
          meta={
            <>
              <StudioLeadStageBadge stage={lead.stage} />
              <StudioLeadSourceBadge source={lead.source} />
              <span className="inline-flex items-center gap-1.5 text-xs">
                <Clock3 className="size-3.5 text-primary" aria-hidden />
                Last active · {lead.lastActivityLabel}
              </span>
            </>
          }
          actions={
            <>
              <Button asChild variant="outline">
                <Link href={editHref}>
                  <PencilRuler className="size-4" />
                  Open in editor
                </Link>
              </Button>
              <BuildQuoteFromDesignButton
                designId={lead.id}
                existingQuoteId={lead.links.quote?.id ?? null}
              />
            </>
          }
        />

        <div className="grid gap-5 xl:grid-cols-[19rem_minmax(0,1fr)] 2xl:grid-cols-[19rem_minmax(0,1fr)_23rem]">
          <aside>
            <StudioLeadProfile lead={lead} />
          </aside>
          <div className="min-w-0">
            <StudioDesignViewer
              design={lead.design}
              plan={plan}
              editHref={editHref}
              className="2xl:sticky 2xl:top-4"
            />
          </div>
          <aside className="min-w-0 xl:col-span-2 2xl:col-span-1">
            <div className="mb-3 flex items-center gap-2">
              <span className="h-px flex-1 bg-gradient-to-r from-transparent to-primary/50" aria-hidden />
              <p className="text-[10px] font-semibold tracking-[0.22em] text-primary uppercase">
                What they want
              </p>
              <span className="h-px flex-1 bg-gradient-to-l from-transparent to-primary/50" aria-hidden />
            </div>
            <StudioDesignWants summary={summary} />
          </aside>
        </div>
      </div>
    </AdminPageFrame>
  );
}
