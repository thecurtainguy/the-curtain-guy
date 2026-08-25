import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FileUp } from "lucide-react";
import {
  isEmailVerified,
  requireAccountPage,
} from "@/lib/account-page";
import {
  AccountPageFrame,
  EmailVerificationBanner,
} from "@/components/account/account-page-frame";
import {
  customerCanAccessEstimate,
  fetchEstimateById,
  fetchEstimateFiles,
  toCustomerSafeEstimate,
} from "@/lib/estimate-access";
import { ClaimEstimateButton } from "@/components/account/claim-estimate-button";
import { AccountEstimateUploader } from "@/components/account/account-estimate-uploader";
import { EstimateFilesList } from "@/components/estimates/estimate-files-list";
import { EstimateStatusBadge } from "@/components/estimates/status-badge";
import { formatEstimateReference } from "@/data/estimate";
import { Button } from "@/components/ui/button";

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
  const files = (await fetchEstimateFiles(id, ["uploaded", "pending"])).filter(
    (file) => file.upload_status === "uploaded" || file.upload_status === "pending"
  );
  const reference = formatEstimateReference(estimate.id);
  const canClaim = verified && !estimate.user_id;

  return (
    <AccountPageFrame email={current.profile.email}>
      <EmailVerificationBanner verified={verified} />
      <div className="space-y-8">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
            <Link href="/account/estimates">← Your estimates</Link>
          </Button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-heading text-3xl font-semibold">{reference}</h1>
            <EstimateStatusBadge status={safe.status} />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Submitted {new Date(safe.created_at).toLocaleString()}
          </p>
        </div>

        {canClaim && (
          <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4">
            <p className="mb-3 text-sm text-muted-foreground">
              This estimate matched your verified email. Save it to your
              account for easier tracking.
            </p>
            <ClaimEstimateButton estimateId={estimate.id} />
          </div>
        )}

        <section className="rounded-3xl border border-border/40 bg-card/25 p-5">
          <h2 className="font-heading text-lg font-semibold">Event</h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
            <div>
              <dt className="text-muted-foreground">Type</dt>
              <dd className="font-medium">{safe.event_type || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Date</dt>
              <dd className="font-medium">{safe.event_date || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Venue</dt>
              <dd className="font-medium">{safe.venue_name || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">City / area</dt>
              <dd className="font-medium">{safe.city_area || "—"}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-3xl border border-border/40 bg-card/25 p-5">
          <h2 className="font-heading text-lg font-semibold">Your brief</h2>
          <pre className="mt-4 whitespace-pre-wrap rounded-xl border border-border/40 bg-background/40 p-4 text-xs leading-relaxed">
            {safe.estimate_brief}
          </pre>
          {safe.notes && (
            <div className="mt-4 text-sm">
              <p className="text-muted-foreground">Your notes</p>
              <p className="mt-1 whitespace-pre-wrap">{safe.notes}</p>
            </div>
          )}
        </section>

        <section className="space-y-4 rounded-3xl border border-primary/30 bg-card/25 p-5">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/25">
              <FileUp className="size-5" />
            </span>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
                Files
              </p>
              <h2 className="mt-1 font-heading text-lg font-semibold">
                Floor plans & inspiration
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                View attached files or upload more (PDF, PNG, JPG, WEBP · max 5
                total · 10MB each).
              </p>
            </div>
          </div>
          <EstimateFilesList files={files} />
          <div className="border-t border-border/40 pt-4">
            <AccountEstimateUploader
              estimateId={estimate.id}
              remainingSlots={Math.max(0, 5 - files.length)}
            />
          </div>
        </section>
      </div>
    </AccountPageFrame>
  );
}
