import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Star } from "lucide-react";
import { requireAdminPage } from "@/lib/admin-page";
import { AdminPageFrame } from "@/components/admin/admin-page-frame";
import { AdminReviewActions } from "@/components/admin/admin-review-actions";
import { AdminReviewSubmissionView } from "@/components/admin/admin-review-submission-view";
import { PortalPageHeader } from "@/components/portal/portal-page-header";
import { ReviewSubmissionStatusBadge } from "@/components/reviews/review-submission-status-badge";
import { formatReviewSubmissionRef } from "@/data/review-submissions";
import {
  fetchReviewSubmissionById,
  updateReviewSubmission,
} from "@/lib/review-submissions";

export const metadata: Metadata = {
  title: "Review detail",
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

export default async function AdminReviewDetailPage({ params }: PageProps) {
  const owner = await requireAdminPage();
  const { id } = await params;
  const review = await fetchReviewSubmissionById(id);
  if (!review) notFound();

  await updateReviewSubmission(id, { markViewed: true });

  const reference = formatReviewSubmissionRef(review.id);

  return (
    <AdminPageFrame email={owner.profile.email}>
      <div className="space-y-6">
        <PortalPageHeader
          eyebrow="Review detail"
          title={reference}
          description={`Submitted ${new Date(review.created_at).toLocaleString()} · ${review.name}`}
          icon={Star}
          backHref="/admin/reviews"
          backLabel="All reviews"
          meta={<ReviewSubmissionStatusBadge status={review.status} />}
        />

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="min-w-0 space-y-6">
            <AdminReviewSubmissionView review={review} />

            <details className="rounded-2xl border border-border bg-card/40 p-5">
              <summary className="cursor-pointer font-heading text-lg font-semibold">
                Raw payload
              </summary>
              <pre className="mt-4 max-h-96 max-w-full overflow-auto whitespace-pre-wrap break-words rounded-xl bg-background/50 p-4 font-mono text-xs">
                {jsonPreview(review.raw_payload)}
              </pre>
            </details>
          </div>

          <div className="space-y-6 xl:sticky xl:top-4">
            <AdminReviewActions
              reviewId={review.id}
              initialStatus={review.status}
              initialNotes={review.internal_notes ?? ""}
              customerEmail={review.email}
              customerName={review.name}
            />

            <section className="rounded-3xl border border-border/40 bg-card/25 p-5">
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
                Submission meta
              </p>
              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">Source</dt>
                  <dd className="font-medium">{review.source}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Submitted from</dt>
                  <dd className="break-all font-medium">
                    {review.submitted_from_url || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Last viewed</dt>
                  <dd className="font-medium">
                    {review.last_viewed_by_owner_at
                      ? new Date(review.last_viewed_by_owner_at).toLocaleString()
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Reviewed at</dt>
                  <dd className="font-medium">
                    {review.reviewed_at
                      ? new Date(review.reviewed_at).toLocaleString()
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Published at</dt>
                  <dd className="font-medium">
                    {review.published_at
                      ? new Date(review.published_at).toLocaleString()
                      : "—"}
                  </dd>
                </div>
              </dl>
            </section>
          </div>
        </div>
      </div>
    </AdminPageFrame>
  );
}
