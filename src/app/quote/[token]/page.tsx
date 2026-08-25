import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { QuoteProposalView } from "@/components/quotes/quote-proposal-view";
import { heroImage } from "@/data/site";
import { getSiteUrl } from "@/lib/env";
import { buildPublicQuoteUrl } from "@/lib/quote-tokens";
import {
  fetchQuoteByPublicToken,
  markQuoteViewed,
  toCustomerSafeQuote,
} from "@/lib/quotes";

export const metadata: Metadata = {
  title: "Your draping proposal",
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function PublicQuotePage({ params }: PageProps) {
  const { token } = await params;
  const quote = await fetchQuoteByPublicToken(token);
  if (!quote) notFound();

  await markQuoteViewed(quote.id);

  const siteUrl = getSiteUrl();
  const shareUrl = buildPublicQuoteUrl(siteUrl, token);
  const safe = toCustomerSafeQuote(quote, { shareUrl });

  return (
    <div className="relative min-h-[70vh] py-10 sm:py-14">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.1),transparent_50%)]"
        aria-hidden
      />
      <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8 xl:px-10">
        <QuoteProposalView
          quote={safe}
          mode="public"
          actionEndpoint={`/api/quote/${token}/customer-action`}
          pdfUrl={`/api/quote/${token}/pdf`}
          shareUrl={shareUrl}
          heroImageSrc={heroImage.image}
        />
      </div>
    </div>
  );
}
