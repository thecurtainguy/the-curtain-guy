import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { PageLocale } from "@/components/i18n/page-locale";
import { StudioDesignSummaryCard } from "@/components/admin/studio-quote/studio-design-summary-card";
import { QuoteProposalView } from "@/components/quotes/quote-proposal-view";
import { normalizeCustomerLanguage } from "@/data/customer-language";
import { quoteViewLanguage } from "@/data/quotes";
import { heroImage } from "@/data/site";
import { getSiteUrl } from "@/lib/env";
import { listAttachmentViewItems } from "@/lib/pdf-attachments";
import {
  fetchExecutedSignature,
  findFrenchVersionEvidence,
  toAgreementSummary,
} from "@/lib/quote-signing";
import { buildPublicQuoteUrl } from "@/lib/quote-tokens";
import {
  fetchQuoteByPublicToken,
  localizeQuote,
  toCustomerQuoteVersions,
  toCustomerSafeQuote,
} from "@/lib/quotes";
import { DocumentViewBeacon } from "@/components/documents/document-view-beacon";
import { LINK_CHANNEL_PARAM, linkChannelFrom } from "@/data/link-channel";
import {
  isOwnerCopySource,
  OWNER_COPY_PARAM,
  OWNER_COPY_VALUE,
  recordDocumentOpen,
} from "@/lib/document-views";
import { fetchStudioDesignSummaryForQuote } from "@/lib/studio-quote-converter";

const getQuoteForToken = cache(fetchQuoteByPublicToken);

type PageProps = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{
    lang?: string | string[];
    src?: string | string[];
    via?: string | string[];
  }>;
};

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const { token } = await params;
  const { lang } = await searchParams;
  const quote = await getQuoteForToken(token);
  const language = quote ? quoteViewLanguage(quote, lang) : normalizeCustomerLanguage(null);
  return {
    title:
      language === "fr" ? "Votre soumission de drapage" : "Your draping proposal",
    robots: { index: false, follow: false },
  };
}

export default async function PublicQuotePage({
  params,
  searchParams,
}: PageProps) {
  const { token } = await params;
  const { lang, src, via } = await searchParams;
  const quote = await getQuoteForToken(token);
  if (!quote) notFound();

  const ownerCopy = isOwnerCopySource(src);
  const channel = linkChannelFrom(via);
  const { viewId } = await recordDocumentOpen({
    target: { quoteId: quote.id },
    source: "public_link",
    ownerCopy,
    via: channel,
  });
  const studioSummary = await fetchStudioDesignSummaryForQuote(quote);

  const quoteLanguage = normalizeCustomerLanguage(quote.language);
  const language = quoteViewLanguage(quote, lang);
  const siteUrl = getSiteUrl();
  const shareUrl = buildPublicQuoteUrl(siteUrl, token);
  const [safe, signingQuotes, frenchEvidence] = await Promise.all([
    localizeQuote(quote, language).then((localized) =>
      toCustomerSafeQuote(localized, { shareUrl })
    ),
    toCustomerQuoteVersions(quote, {}, { shareUrl }),
    findFrenchVersionEvidence(quote.id),
  ]);

  const pdfParams = new URLSearchParams();
  if (language !== quoteLanguage) pdfParams.set("lang", language);
  if (ownerCopy) pdfParams.set(OWNER_COPY_PARAM, OWNER_COPY_VALUE);
  if (channel) pdfParams.set(LINK_CHANNEL_PARAM, channel);
  const pdfUrl = `/api/quote/${token}/pdf${pdfParams.size ? `?${pdfParams}` : ""}`;

  const attachments = await listAttachmentViewItems(
    safe.estimate_request_id,
    "quote"
  );
  const signature = await fetchExecutedSignature(quote.id);
  return (
    <div className="relative min-h-[70vh] py-10 sm:py-14">
      <PageLocale locale={language} />
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.1),transparent_50%)]"
        aria-hidden
      />
      <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8 xl:px-10">
        {studioSummary ? (
          <StudioDesignSummaryCard
            summary={studioSummary}
            variant="customer"
            language={language}
            className="mb-6"
          />
        ) : null}
        <QuoteProposalView
          quote={safe}
          signingQuotes={signingQuotes}
          frenchVersionProvided={Boolean(frenchEvidence)}
          attachments={attachments}
          mode="public"
          actionEndpoint={`/api/quote/${token}/customer-action`}
          pdfUrl={pdfUrl}
          shareUrl={shareUrl}
          heroImageSrc={heroImage.image}
          agreement={signature ? toAgreementSummary(signature) : null}
          agreementPdfUrl={`/api/quote/${token}/agreement`}
        />
        <DocumentViewBeacon viewId={viewId} />
      </div>
    </div>
  );
}
