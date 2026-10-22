import type { Metadata } from "next";
import Link from "next/link";
import { PanelsTopLeft, Plus } from "lucide-react";
import { requireAdminPage } from "@/lib/admin-page";
import { AdminPageFrame } from "@/components/admin/admin-page-frame";
import { AdminStudioList } from "@/components/admin/lists/admin-studio-list";
import { StudioLeadsStatTiles } from "@/components/admin/studio-leads/studio-leads-stat-tiles";
import { parseStudioLeadFilters } from "@/components/admin/studio-leads/studio-leads-shared";
import { PortalPageHeader } from "@/components/portal/portal-page-header";
import { Button } from "@/components/ui/button";
import { getStudioLeadStats, listStudioLeads } from "@/lib/studio-leads-admin";
import type { StudioActor } from "@/lib/studio";

export const metadata: Metadata = {
  title: "Studio leads",
  robots: { index: false, follow: false },
};

export default async function AdminStudioPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [owner, params] = await Promise.all([requireAdminPage(), searchParams]);
  const actor: StudioActor = {
    userId: owner.user.id,
    role: "owner",
    user: owner.user,
  };
  const filters = parseStudioLeadFilters(params);
  const [result, stats] = await Promise.all([
    listStudioLeads(actor, filters),
    getStudioLeadStats(actor),
  ]);

  return (
    <AdminPageFrame email={owner.profile.email} profile={owner.profile}>
      <div className="space-y-6">
        <PortalPageHeader
          eyebrow="Studio"
          title="Studio leads"
          description="Everyone designing a room — who they are, how far along they are, and their exact vision."
          icon={PanelsTopLeft}
          actions={
            <Button asChild>
              <Link href="/studio/new">
                <Plus className="size-4" />
                New room design
              </Link>
            </Button>
          }
        />
        {stats ? <StudioLeadsStatTiles stats={stats} activeStage={filters.stage} /> : null}
        <AdminStudioList
          leads={result.ok ? result.leads : []}
          total={result.ok ? result.total : 0}
          page={result.ok ? result.page : 1}
          pageCount={result.ok ? result.pageCount : 1}
          truncated={result.ok ? result.truncated : false}
          filters={filters}
          loadError={result.ok ? null : result.message}
        />
      </div>
    </AdminPageFrame>
  );
}
