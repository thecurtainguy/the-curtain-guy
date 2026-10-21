import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageLocale } from "@/components/i18n/page-locale";
import { QuoteProposalView } from "@/components/quotes/quote-proposal-view";
import {
  isCustomerLanguage,
  normalizeCustomerLanguage,
} from "@/data/customer-language";
import { heroImage } from "@/data/site";
import { requireOwner } from "@/lib/auth";
import { resolveQuoteTermsForView } from "@/lib/document-texts";
import { getSiteUrl } from "@/lib/env";
import {
  fetchQuoteById,
  findActivePublicQuoteUrl,
  toCustomerSafeQuote,
} from "@/lib/quotes";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lang?: string | string[] }>;
};

export const metadata: Metadata = {
  title: "Customer preview",
  robots: { index: false, follow: false },
};

/**
 * Owner-only mirror of `/quote/[token]`. Does not mark the quote viewed and
 * the proposal view never posts customer actions.
 */
export default async function QuoteCustomerPreviewPage({
  params,
  searchParams,
}: PageProps) {
  const owner = await requireOwner();
  if (!owner) notFound();

  const { id } = await params;
  const { lang } = await searchParams;
  const quote = await fetchQuoteById(id);
  if (!quote) notFound();

  const quoteLanguage = normalizeCustomerLanguage(quote.language);
  const language = isCustomerLanguage(lang) ? lang : quoteLanguage;
  const siteUrl = getSiteUrl();
  const shareUrl = (await findActivePublicQuoteUrl(id, siteUrl)) ?? siteUrl;
  const safe = toCustomerSafeQuote(
    {
      ...quote,
      // Customers only ever see a quote once it has been sent.
      status: quote.status === "draft" ? "sent" : quote.status,
      language,
      terms: await resolveQuoteTermsForView(
        quote.terms,
        quoteLanguage,
        language
      ),
    },
    { shareUrl }
  );

  return (
    <div className="relative min-h-[70vh] py-10 sm:py-14">
      <PageLocale locale={language} />
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.1),transparent_50%)]"
        aria-hidden
      />
      <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8 xl:px-10">
        <QuoteProposalView
          quote={safe}
          mode="public"
          preview
          actionEndpoint=""
          pdfUrl={`/api/quotes/${id}/pdf?preview=1${
            language === quoteLanguage ? "" : `&lang=${language}`
          }`}
          shareUrl={shareUrl}
          heroImageSrc={heroImage.image}
        />
      </div>
    </div>
  );
}
