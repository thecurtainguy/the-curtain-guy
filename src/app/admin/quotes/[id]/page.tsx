import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/admin-page";
import { AdminPageFrame } from "@/components/admin/admin-page-frame";
import { AdminQuoteBuilder } from "@/components/admin/admin-quote-builder";
import { AdminQuoteJobActions } from "@/components/admin/admin-quote-job-actions";
import { AdminQuoteStudioCard } from "@/components/admin/studio-quote/admin-quote-studio-card";
import { DocumentEngagementCard } from "@/components/admin/document-engagement-card";
import { getDocumentEngagement } from "@/lib/document-engagement";
import { getSiteUrl } from "@/lib/env";
import { loadAdminOpportunityFiles } from "@/lib/estimate-file-events";
import { fetchEventPlanByEstimateId } from "@/lib/event-plan-access";
import { fetchJobByQuoteId } from "@/lib/jobs";
import { listProductCategories } from "@/lib/product-categories";
import { fetchQuoteById, findActivePublicQuoteUrl } from "@/lib/quotes";
import { getBusinessSettings } from "@/lib/business-settings";
import { fetchCustomerById, getCustomerLinkSummary } from "@/lib/customers";
import { fetchStudioDesignSummaryForQuote } from "@/lib/studio-quote-converter";

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
  const opportunityFiles = quote.estimate_request_id
    ? await loadAdminOpportunityFiles(quote.estimate_request_id)
    : null;
  const sourceEventPlan = quote.estimate_request_id
    ? await fetchEventPlanByEstimateId(quote.estimate_request_id)
    : null;
  const categories = await listProductCategories();
  const studioSummary = await fetchStudioDesignSummaryForQuote(quote);
  const [customerLink, customerRow, settings, engagement] = await Promise.all([
    getCustomerLinkSummary(quote.customer_id, { excludeEmails: [quote.customer_email] }),
    quote.customer_id ? fetchCustomerById(quote.customer_id) : Promise.resolve(null),
    getBusinessSettings(),
    getDocumentEngagement({ quoteId: quote.id }),
  ]);
  const paymentDefaults = {
    deposit_percent: customerRow?.default_deposit_percent ?? settings.default_deposit_percent,
    balance_due_rule: customerRow?.balance_due_rule ?? settings.default_balance_due_rule,
    balance_due_days: customerRow?.balance_due_days ?? settings.default_due_days,
  };

  return (
    <AdminPageFrame email={owner.profile.email}>
      <div className="space-y-6">
        <AdminQuoteBuilder
          quote={quote}
          initialGuestUrl={initialGuestUrl}
          opportunityFiles={opportunityFiles?.files ?? []}
          deletedOpportunityFiles={opportunityFiles?.deletedFiles ?? []}
          fileActivity={opportunityFiles?.activity ?? []}
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
          paymentDefaults={paymentDefaults}
          hasStudioDesigns={studioSummary?.kind === "studio_design"}
          bookingActions={
            <AdminQuoteJobActions
              quoteId={quote.id}
              quoteStatus={quote.status}
              existingJobId={linkedJob?.id}
              customerName={quote.customer_name}
            />
          }
          engagementPanel={
            quote.status === "draft" && engagement.activity.length === 0 ? null : (
              <DocumentEngagementCard engagement={engagement} documentLabel="quote" />
            )
          }
          studioPanel={
            <AdminQuoteStudioCard
              summary={studioSummary}
              quoteId={quote.id}
              estimateRequestId={quote.estimate_request_id}
              opportunityRef={quote.opportunity_ref}
            />
          }
        />
      </div>
    </AdminPageFrame>
  );
}
