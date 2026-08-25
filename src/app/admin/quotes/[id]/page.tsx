import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PanelsTopLeft } from "lucide-react";
import { requireAdminPage } from "@/lib/admin-page";
import { AdminPageFrame } from "@/components/admin/admin-page-frame";
import { AdminQuoteBuilder } from "@/components/admin/admin-quote-builder";
import { AdminQuoteJobActions } from "@/components/admin/admin-quote-job-actions";
import { getSiteUrl } from "@/lib/env";
import { fetchJobByQuoteId } from "@/lib/jobs";
import { fetchQuoteById, findActivePublicQuoteUrl } from "@/lib/quotes";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Quote detail",
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminQuoteDetailPage({ params }: PageProps) {
  const owner = await requireAdminPage();
  const { id } = await params;
  const quote = await fetchQuoteById(id, { includeEvents: true });
  if (!quote) notFound();

  const linkedJob = await fetchJobByQuoteId(id);
  const initialGuestUrl = await findActivePublicQuoteUrl(id, getSiteUrl());

  return (
    <AdminPageFrame email={owner.profile.email}>
      <div className="space-y-6">
        <AdminQuoteJobActions
          quoteId={quote.id}
          quoteStatus={quote.status}
          existingJobId={linkedJob?.id}
        />
        <section className="flex flex-col gap-4 rounded-2xl border border-primary/25 bg-primary/[0.06] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <PanelsTopLeft className="size-5" />
            </span>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-primary">
                Studio
              </p>
              <h2 className="mt-1 font-heading text-lg font-semibold">
                Room design for this quote
              </h2>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link
                href={`/studio/new?quoteId=${quote.id}&estimateId=${quote.estimate_request_id}&opportunityRef=${encodeURIComponent(quote.opportunity_ref)}`}
              >
                Create room design
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/admin/studio?quoteId=${quote.id}`}>
                Open linked designs
              </Link>
            </Button>
          </div>
        </section>
        <AdminQuoteBuilder quote={quote} initialGuestUrl={initialGuestUrl} />
      </div>
    </AdminPageFrame>
  );
}
