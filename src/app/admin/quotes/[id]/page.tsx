import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PanelsTopLeft } from "lucide-react";
import { requireAdminPage } from "@/lib/admin-page";
import { AdminPageFrame } from "@/components/admin/admin-page-frame";
import { AdminQuoteBuilder } from "@/components/admin/admin-quote-builder";
import { AdminQuoteJobActions } from "@/components/admin/admin-quote-job-actions";
import { getSiteUrl } from "@/lib/env";
import { fetchEstimateFiles } from "@/lib/estimate-access";
import { fetchEventPlanByEstimateId } from "@/lib/event-plan-access";
import { fetchJobByQuoteId } from "@/lib/jobs";
import { listProductCategories } from "@/lib/product-categories";
import { fetchQuoteById, findActivePublicQuoteUrl } from "@/lib/quotes";
import { getCustomerLinkSummary } from "@/lib/customers";
import { formatCustomerNumber } from "@/data/customers";
import { fetchStudioDesignSummaryForQuote } from "@/lib/studio-quote-converter";
import { BuildQuoteFromDesignButton } from "@/components/admin/studio-quote/build-quote-from-design-button";
import { StudioDesignSummaryCard } from "@/components/admin/studio-quote/studio-design-summary-card";
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
  const estimateFiles = quote.estimate_request_id
    ? await fetchEstimateFiles(quote.estimate_request_id, [
        "uploaded",
        "pending",
      ])
    : [];
  const sourceEventPlan = quote.estimate_request_id
    ? await fetchEventPlanByEstimateId(quote.estimate_request_id)
    : null;
  const categories = await listProductCategories();
  const studioSummary = await fetchStudioDesignSummaryForQuote(quote);
  const customerLink = await getCustomerLinkSummary(quote.customer_id, {
    excludeEmails: [quote.customer_email],
  });

  return (
    <AdminPageFrame email={owner.profile.email}>
      <div className="space-y-6">
        <AdminQuoteJobActions
          quoteId={quote.id}
          quoteStatus={quote.status}
          existingJobId={linkedJob?.id}
          customerName={quote.customer_name}
        />
        {customerLink ? (
          <Link
            href={`/admin/customers/${customerLink.id}`}
            className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border/40 bg-card/25 px-4 py-3 text-sm hover:border-primary/40"
          >
            <span>
              <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-primary">Customer</span>{" "}
              <span className="ml-2 font-medium">{customerLink.display_name}</span>
              <span className="text-muted-foreground">
                {" "}· {formatCustomerNumber(customerLink.customer_number)}
                {customerLink.company_name ? ` · ${customerLink.company_name}` : ""}
                {customerLink.quoteCc.length ? ` · Cc ${customerLink.quoteCc.join(", ")}` : ""}
              </span>
              <span className="ml-2 inline-flex gap-1.5 align-middle">
                <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                  {customerLink.currency}
                </span>
                {customerLink.tax_exempt ? (
                  <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                    Tax exempt
                  </span>
                ) : null}
              </span>
            </span>
            <span className="text-xs text-muted-foreground">Open profile →</span>
          </Link>
        ) : null}
        {studioSummary ? (
          <StudioDesignSummaryCard
            summary={studioSummary}
            variant="admin"
            href={
              studioSummary.kind === "studio_design"
                ? `/admin/studio/${studioSummary.id}`
                : `/admin/event-plans/${studioSummary.id}`
            }
            actions={
              <BuildQuoteFromDesignButton
                designId={studioSummary.kind === "studio_design" ? studioSummary.id : undefined}
                eventPlanId={studioSummary.kind === "event_plan" ? studioSummary.id : undefined}
              />
            }
          />
        ) : (
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
        )}
        <AdminQuoteBuilder
          quote={quote}
          initialGuestUrl={initialGuestUrl}
          opportunityFiles={estimateFiles}
          sourceEventPlan={
            sourceEventPlan
              ? {
                  id: sourceEventPlan.id,
                  reference: sourceEventPlan.reference,
                }
              : null
          }
          categories={categories}
          defaultCc={customerLink?.quoteCc ?? []}
          customer={customerLink}
        />
      </div>
    </AdminPageFrame>
  );
}
