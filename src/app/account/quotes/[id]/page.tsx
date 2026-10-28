import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PanelsTopLeft } from "lucide-react";
import {
  isEmailVerified,
  requireAccountPage,
} from "@/lib/account-page";
import {
  AccountPageFrame,
  EmailVerificationBanner,
} from "@/components/account/account-page-frame";
import { QuoteProposalView } from "@/components/quotes/quote-proposal-view";
import { QuoteGuestProposalCard } from "@/components/quotes/quote-guest-proposal-card";
import { OpportunityFilesPanel } from "@/components/estimates/opportunity-files-panel";
import { PortalBackLink } from "@/components/portal/portal-back-link";
import { heroImage } from "@/data/site";
import { getSiteUrl } from "@/lib/env";
import { listAttachmentViewItems } from "@/lib/pdf-attachments";
import {
  fetchExecutedSignature,
  findFrenchVersionEvidence,
  toAgreementSummary,
} from "@/lib/quote-signing";
import { normalizeCustomerLanguage } from "@/data/customer-language";
import {
  fetchEstimateById,
  fetchEstimateFiles,
} from "@/lib/estimate-access";
import {
  customerCanAccessQuote,
  fetchQuoteById,
  findActivePublicQuoteUrl,
  localizeQuote,
  toCustomerQuoteVersions,
  toCustomerSafeQuote,
} from "@/lib/quotes";
import { DocumentViewBeacon } from "@/components/documents/document-view-beacon";
import { recordDocumentOpen } from "@/lib/document-views";
import { Button } from "@/components/ui/button";
import { StudioDesignSummaryCard } from "@/components/admin/studio-quote/studio-design-summary-card";
import { fetchStudioDesignSummaryForQuote } from "@/lib/studio-quote-converter";

export const metadata: Metadata = {
  title: "Quote proposal",
  robots: { index: false, follow: false },
};

const STUDIO_COPY = {
  en: {
    title: "Draw the room for this proposal",
    body: "Place drape runs in 2D and inspect the same design in 3D.",
    draw: "Draw your room",
    open: "Open designs",
  },
  fr: {
    title: "Dessinez la salle pour cette soumission",
    body: "Placez les draperies en 2D et visualisez le même plan en 3D.",
    draw: "Dessiner ma salle",
    open: "Voir mes plans",
  },
} as const;

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AccountQuoteDetailPage({ params }: PageProps) {
  const current = await requireAccountPage();
  const verified = isEmailVerified(current.user);
  const { id } = await params;

  const quote = await fetchQuoteById(id);
  if (!quote || quote.status === "draft") {
    notFound();
  }

  const estimate = await fetchEstimateById(quote.estimate_request_id);
  if (!customerCanAccessQuote(quote, current.user, estimate)) {
    notFound();
  }

  const { viewId } = await recordDocumentOpen({
    target: { quoteId: quote.id },
    source: "account",
  });

  const language = normalizeCustomerLanguage(quote.language);
  const studio = STUDIO_COPY[language];
  const siteUrl = getSiteUrl().replace(/\/$/, "");
  const shareUrl = `${siteUrl}/account/quotes/${id}`;
  const [safe, signingQuotes, frenchEvidence] = await Promise.all([
    localizeQuote(quote, language).then((localized) =>
      toCustomerSafeQuote(localized, { shareUrl })
    ),
    toCustomerQuoteVersions(quote, {}, { shareUrl }),
    findFrenchVersionEvidence(quote.id),
  ]);
  const initialGuestUrl = await findActivePublicQuoteUrl(id, siteUrl);
  const studioSummary = await fetchStudioDesignSummaryForQuote(quote);

  const allFiles = quote.estimate_request_id
    ? await fetchEstimateFiles(quote.estimate_request_id, [
        "uploaded",
        "pending",
      ])
    : [];
  const sharedFiles = allFiles.filter(
    (file) => file.customer_visible !== false
  );

  const attachments = await listAttachmentViewItems(
    safe.estimate_request_id,
    "quote"
  );
  const signature = await fetchExecutedSignature(quote.id);
  return (
    <AccountPageFrame email={current.profile.email}>
      <EmailVerificationBanner verified={verified} />
      <div className="mb-6">
        <PortalBackLink href="/account/quotes">Your quotes</PortalBackLink>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          <section className="flex flex-col gap-4 rounded-3xl border border-primary/25 bg-primary/[0.06] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <PanelsTopLeft className="size-5" />
              </span>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-primary">
                  Studio
                </p>
                <h2 className="mt-1 font-heading text-lg font-semibold">
                  {studio.title}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {studio.body}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link
                  href={`/studio/new?quoteId=${quote.id}&estimateId=${quote.estimate_request_id}&opportunityRef=${encodeURIComponent(quote.opportunity_ref)}`}
                >
                  {studio.draw}
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={`/account/studio?quoteId=${quote.id}`}>
                  {studio.open}
                </Link>
              </Button>
            </div>
          </section>
          <QuoteProposalView
            quote={safe}
            signingQuotes={signingQuotes}
            frenchVersionProvided={Boolean(frenchEvidence)}
            attachments={attachments}
            mode="account"
            actionEndpoint={`/api/quotes/${id}/customer-action`}
            pdfUrl={`/api/quotes/${id}/pdf`}
            shareUrl={shareUrl}
            heroImageSrc={heroImage.image}
            agreement={signature ? toAgreementSummary(signature) : null}
            agreementPdfUrl={`/api/quotes/${id}/agreement`}
          />
          {quote.estimate_request_id ? (
            <OpportunityFilesPanel
              estimateRequestId={quote.estimate_request_id}
              files={sharedFiles}
              totalFileCount={allFiles.length}
              audience="customer"
              title="Shared files"
            />
          ) : null}
        </div>

        <aside className="space-y-6 xl:sticky xl:top-4">
          {studioSummary ? (
            <StudioDesignSummaryCard
              summary={studioSummary}
              variant="customer"
              language={language}
              layout="stack"
              href={
                studioSummary.kind === "studio_design"
                  ? `/account/studio/${studioSummary.id}`
                  : `/account/event-plans/${studioSummary.id}`
              }
            />
          ) : null}
          <QuoteGuestProposalCard
            ensureEndpoint={`/api/quotes/${id}/guest-link`}
            initialUrl={initialGuestUrl}
            language={language}
          />
        </aside>
      </div>
      <DocumentViewBeacon viewId={viewId} />
    </AccountPageFrame>
  );
}
