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
import { PortalBackLink } from "@/components/portal/portal-back-link";
import { heroImage } from "@/data/site";
import { getSiteUrl } from "@/lib/env";
import { fetchEstimateById } from "@/lib/estimate-access";
import {
  customerCanAccessQuote,
  fetchQuoteById,
  findActivePublicQuoteUrl,
  markQuoteViewed,
  toCustomerSafeQuote,
} from "@/lib/quotes";
import { Button } from "@/components/ui/button";

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
  const initialGuestUrl = await findActivePublicQuoteUrl(id, siteUrl);

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
                  Draw the room for this proposal
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Place drape runs in 2D and inspect the same design in 3D.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link
                  href={`/studio/new?quoteId=${quote.id}&estimateId=${quote.estimate_request_id}&opportunityRef=${encodeURIComponent(quote.opportunity_ref)}`}
                >
                  Draw your room
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={`/account/studio?quoteId=${quote.id}`}>
                  Open designs
                </Link>
              </Button>
            </div>
          </section>
          <QuoteProposalView
            quote={safe}
            mode="account"
            actionEndpoint={`/api/quotes/${id}/customer-action`}
            pdfUrl={`/api/quotes/${id}/pdf`}
            shareUrl={shareUrl}
            heroImageSrc={heroImage.image}
          />
        </div>

        <aside className="space-y-6 xl:sticky xl:top-4">
          <QuoteGuestProposalCard
            ensureEndpoint={`/api/quotes/${id}/guest-link`}
            initialUrl={initialGuestUrl}
          />
        </aside>
      </div>
    </AccountPageFrame>
  );
}
