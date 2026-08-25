import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  isEmailVerified,
  requireAccountPage,
} from "@/lib/account-page";
import {
  AccountPageFrame,
  EmailVerificationBanner,
} from "@/components/account/account-page-frame";
import { QuoteProposalView } from "@/components/quotes/quote-proposal-view";
import { heroImage } from "@/data/site";
import { Button } from "@/components/ui/button";
import { getSiteUrl } from "@/lib/env";
import { fetchEstimateById } from "@/lib/estimate-access";
import {
  customerCanAccessQuote,
  fetchQuoteById,
  markQuoteViewed,
  toCustomerSafeQuote,
} from "@/lib/quotes";

export const metadata: Metadata = {
  title: "Quote proposal",
  robots: { index: false, follow: false },
};

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

  await markQuoteViewed(quote.id);

  const siteUrl = getSiteUrl().replace(/\/$/, "");
  const shareUrl = `${siteUrl}/account/quotes/${id}`;
  const safe = toCustomerSafeQuote(quote, { shareUrl });

  return (
    <AccountPageFrame email={current.profile.email}>
      <EmailVerificationBanner verified={verified} />
      <div className="mb-6">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/account/quotes">← Your proposals</Link>
        </Button>
      </div>
      <QuoteProposalView
        quote={safe}
        mode="account"
        actionEndpoint={`/api/quotes/${id}/customer-action`}
        pdfUrl={`/api/quotes/${id}/pdf`}
        shareUrl={shareUrl}
        heroImageSrc={heroImage.image}
      />
    </AccountPageFrame>
  );
}
