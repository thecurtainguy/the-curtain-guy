import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClipboardList, PanelsTopLeft } from "lucide-react";
import {
  isEmailVerified,
  requireAccountPage,
} from "@/lib/account-page";
import {
  AccountPageFrame,
  EmailVerificationBanner,
} from "@/components/account/account-page-frame";
import { PortalPageHeader } from "@/components/portal/portal-page-header";
import { EstimateBriefView } from "@/components/estimates/estimate-brief-view";
import {
  customerCanAccessEstimate,
  fetchEstimateById,
  fetchEstimateFiles,
  toCustomerSafeEstimate,
} from "@/lib/estimate-access";
import { ClaimEstimateButton } from "@/components/account/claim-estimate-button";
import { OpportunityFilesPanel } from "@/components/estimates/opportunity-files-panel";
import { EstimateStatusBadge } from "@/components/estimates/status-badge";
import { formatEstimateReference } from "@/data/estimate";

export const metadata: Metadata = {
  title: "Estimate detail",
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AccountEstimateDetailPage({ params }: PageProps) {
  const current = await requireAccountPage();
  const verified = isEmailVerified(current.user);
  const { id } = await params;
  const estimate = await fetchEstimateById(id);

  if (!estimate || !customerCanAccessEstimate(estimate, current.user)) {
    notFound();
  }

  const safe = toCustomerSafeEstimate(estimate);
  const allFiles = await fetchEstimateFiles(id, ["uploaded", "pending"]);
  const files = allFiles.filter((file) => file.customer_visible !== false);
  const reference = formatEstimateReference(
    estimate.id,
    estimate.opportunity_ref
  );
  const canClaim = verified && !estimate.user_id;

  return (
    <AccountPageFrame email={current.profile.email}>
      <EmailVerificationBanner verified={verified} />
      <div className="space-y-6">
        <PortalPageHeader
          eyebrow="Estimate"
          title={reference}
          description={`Submitted ${new Date(safe.created_at).toLocaleString()}`}
          icon={ClipboardList}
          backHref="/account/estimates"
          backLabel="Your estimates"
          meta={<EstimateStatusBadge status={safe.status} />}
        />

        {canClaim && (
          <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4">
            <p className="mb-3 text-sm text-muted-foreground">
              This estimate matched your verified email. Save it to your
              account for easier tracking.
            </p>
            <ClaimEstimateButton estimateId={estimate.id} />
          </div>
        )}

        <EstimateBriefView estimate={safe} audience="customer" />

        <section className="rounded-2xl border border-primary/25 bg-primary/[0.06] p-5">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/25">
              <PanelsTopLeft className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
                Draw Your Room
              </p>
              <h2 className="mt-1 font-heading text-lg font-semibold">
                Add a room design to this estimate
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Sketch the room in 2D, place drape runs and a stage, then review
                the same plan in 3D.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={`/studio/new?estimateId=${estimate.id}&opportunityRef=${encodeURIComponent(estimate.opportunity_ref ?? "")}`}
                  className="inline-flex min-h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Draw your room
                </Link>
                <Link
                  href={`/account/studio?estimateId=${estimate.id}`}
                  className="inline-flex min-h-9 items-center justify-center rounded-lg border border-border bg-background/40 px-4 text-sm font-medium transition-colors hover:bg-muted/40"
                >
                  View saved designs
                </Link>
              </div>
            </div>
          </div>
        </section>

        <OpportunityFilesPanel
          estimateRequestId={estimate.id}
          files={files}
          totalFileCount={allFiles.length}
          audience="customer"
        />
      </div>
    </AccountPageFrame>
  );
}
