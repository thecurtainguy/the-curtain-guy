import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { PageLocale } from "@/components/i18n/page-locale";
import { QuoteProposalView } from "@/components/quotes/quote-proposal-view";
import {
  isCustomerLanguage,
  normalizeCustomerLanguage,
} from "@/data/customer-language";
import { heroImage } from "@/data/site";
import { getSiteUrl } from "@/lib/env";
import { resolveQuoteTermsForView } from "@/lib/document-texts";
import { buildPublicQuoteUrl } from "@/lib/quote-tokens";
import {
  fetchQuoteByPublicToken,
  markQuoteViewed,
  toCustomerSafeQuote,
} from "@/lib/quotes";

const getQuoteForToken = cache(fetchQuoteByPublicToken);

type PageProps = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ lang?: string | string[] }>;
};

/** `?lang=` lets a visitor read the quote in the other language. */
function viewLanguage(
  quoteLanguage: string | null | undefined,
  lang: string | string[] | undefined
) {
  return isCustomerLanguage(lang) ? lang : normalizeCustomerLanguage(quoteLanguage);
}

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const { token } = await params;
  const { lang } = await searchParams;
  const quote = await getQuoteForToken(token);
  const language = viewLanguage(quote?.language, lang);
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
  const { lang } = await searchParams;
  const quote = await getQuoteForToken(token);
  if (!quote) notFound();

  await markQuoteViewed(quote.id);

  const quoteLanguage = normalizeCustomerLanguage(quote.language);
  const language = viewLanguage(quote.language, lang);
  const siteUrl = getSiteUrl();
  const shareUrl = buildPublicQuoteUrl(siteUrl, token);
  const safe = toCustomerSafeQuote(
    {
      ...quote,
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
          actionEndpoint={`/api/quote/${token}/customer-action`}
          pdfUrl={`/api/quote/${token}/pdf${
            language === quoteLanguage ? "" : `?lang=${language}`
          }`}
          shareUrl={shareUrl}
          heroImageSrc={heroImage.image}
        />
      </div>
    </div>
  );
}
