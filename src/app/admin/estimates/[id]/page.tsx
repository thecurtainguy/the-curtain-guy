import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { requireAdminPage } from "@/lib/admin-page";
import { AdminPageFrame } from "@/components/admin/admin-page-frame";
import { PortalPageHeader } from "@/components/portal/portal-page-header";
import { EstimateBriefView } from "@/components/estimates/estimate-brief-view";
import {
  fetchEstimateById,
  fetchEstimateFiles,
} from "@/lib/estimate-access";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { fetchJobByEstimateId } from "@/lib/jobs";
import { AdminEstimateActions } from "@/components/admin/admin-estimate-actions";
import { AdminEstimateQuotesSection } from "@/components/admin/admin-estimate-quotes-section";
import { OpportunityFilesPanel } from "@/components/estimates/opportunity-files-panel";
import { EstimateStatusBadge } from "@/components/estimates/status-badge";
import { formatEstimateReference } from "@/data/estimate";
import { listQuotesForEstimate } from "@/lib/quotes";

export const metadata: Metadata = {
  title: "Estimate detail",
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ id: string }>;
};

function jsonPreview(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export default async function AdminEstimateDetailPage({ params }: PageProps) {
  const owner = await requireAdminPage();
  const { id } = await params;
  const estimate = await fetchEstimateById(id);
  if (!estimate) notFound();

  const files = await fetchEstimateFiles(id, ["uploaded", "pending"]);
  const quotes = await listQuotesForEstimate(id);
  const linkedJob = await fetchJobByEstimateId(id);

  const admin = createAdminSupabaseClient();
  await admin
    .from("estimate_requests")
    .update({ last_viewed_by_owner_at: new Date().toISOString() })
    .eq("id", id);

  const reference = formatEstimateReference(
    estimate.id,
    estimate.opportunity_ref
  );

  return (
    <AdminPageFrame email={owner.profile.email}>
      <div className="space-y-6">
        <PortalPageHeader
          eyebrow="Estimate detail"
          title={reference}
          description={`Submitted ${new Date(estimate.created_at).toLocaleString()}`}
          icon={ClipboardList}
          backHref="/admin/estimates"
          backLabel="All estimates"
          meta={<EstimateStatusBadge status={estimate.status} />}
        />

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="min-w-0 space-y-6">
            <EstimateBriefView estimate={estimate} audience="admin" />

            <details className="rounded-2xl border border-border bg-card/40 p-5">
              <summary className="cursor-pointer font-heading text-lg font-semibold">
                Raw payload
              </summary>
              <pre className="mt-4 max-h-96 max-w-full overflow-auto whitespace-pre-wrap break-words rounded-xl bg-background/50 p-4 font-mono text-xs">
                {jsonPreview(estimate.raw_payload)}
              </pre>
            </details>
          </div>

          <div className="space-y-6 xl:sticky xl:top-4">
            <AdminEstimateActions
              estimateId={estimate.id}
              initialStatus={estimate.status}
              initialNotes={estimate.internal_notes ?? ""}
              customerEmail={estimate.customer_email}
              customerName={estimate.customer_name}
            />

            <AdminEstimateQuotesSection
              estimateId={estimate.id}
              quotes={quotes}
              linkedJobId={linkedJob?.id}
              linkedJobRef={linkedJob?.opportunity_ref}
            />

            <section className="rounded-2xl border border-primary/25 bg-primary/[0.06] p-5">
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
                Studio
              </p>
              <h2 className="mt-1 font-heading text-lg font-semibold">
                Room design
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Create a 2D room plan and generated 3D drape preview from this
                estimate.
              </p>
              <div className="mt-4 flex flex-col gap-2">
                <Link
                  href={`/studio/new?estimateId=${estimate.id}&opportunityRef=${encodeURIComponent(estimate.opportunity_ref ?? "")}`}
                  className="inline-flex min-h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Create room design
                </Link>
                <Link
                  href={`/admin/studio?estimateId=${estimate.id}`}
                  className="inline-flex min-h-9 items-center justify-center rounded-lg border border-border bg-background/40 px-4 text-sm font-medium transition-colors hover:bg-muted/40"
                >
                  Open linked designs
                </Link>
              </div>
            </section>

            <OpportunityFilesPanel
              estimateRequestId={estimate.id}
              files={files}
              audience="admin"
              className="border-border bg-card"
            />
          </div>
        </div>
      </div>
    </AdminPageFrame>
  );
}
