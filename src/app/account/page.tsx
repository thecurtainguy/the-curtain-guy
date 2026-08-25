import type { Metadata } from "next";
import Link from "next/link";
import {
  isEmailVerified,
  requireAccountPage,
} from "@/lib/account-page";
import {
  AccountPageFrame,
  EmailVerificationBanner,
} from "@/components/account/account-page-frame";
import { listEstimatesForCustomer } from "@/lib/estimate-access";
import { listQuotesForCustomer } from "@/lib/quotes";
import { EstimateStatusBadge } from "@/components/estimates/status-badge";
import { QuoteStatusBadge } from "@/components/quotes/quote-status-badge";
import { formatEstimateReference } from "@/data/estimate";
import { formatCadFromCents, resolveQuoteDisplayRef } from "@/data/quotes";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Your account",
  robots: { index: false, follow: false },
};

export default async function AccountHomePage() {
  const current = await requireAccountPage();
  const verified = isEmailVerified(current.user);
  const estimates = await listEstimatesForCustomer(current.user);
  const quotes = await listQuotesForCustomer(current.user);
  const recentEstimates = estimates.slice(0, 5);
  const recentQuotes = quotes.slice(0, 5);

  return (
    <AccountPageFrame email={current.profile.email}>
      <EmailVerificationBanner verified={verified} />
      <div className="space-y-8">
        <div className="rounded-2xl border border-border/40 bg-card/25 p-6 sm:p-8">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-primary">
            Welcome
          </p>
          <h1 className="mt-2 font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {current.profile.full_name || "Your account"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            View estimate briefs, proposals, booked events, and profile details.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/get-estimate">Start a new estimate</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/account/quotes">View quotes</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-border/40 bg-card/20 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Estimates
            </p>
            <p className="mt-2 font-heading text-3xl font-semibold">
              {estimates.length}
            </p>
          </div>
          <div className="rounded-2xl border border-border/40 bg-card/20 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Quotes
            </p>
            <p className="mt-2 font-heading text-3xl font-semibold">
              {quotes.length}
            </p>
            <Link
              href="/account/quotes"
              className="mt-2 inline-block text-xs text-primary hover:underline"
            >
              Open proposals
            </Link>
          </div>
          <div className="rounded-2xl border border-border/40 bg-card/20 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Email
            </p>
            <p className="mt-2 break-all text-sm font-medium">
              {current.profile.email}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {verified ? "Verified" : "Verification pending"}
            </p>
          </div>
        </div>

        <section className="overflow-hidden rounded-3xl border border-border/40 bg-card/20">
          <div className="border-b border-border/40 px-5 py-4">
            <h2 className="font-heading text-lg font-semibold">Recent quotes</h2>
          </div>
          {recentQuotes.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">
              No proposals yet. Quotes appear here after The Curtain Guy sends
              one.
            </div>
          ) : (
            <ul className="divide-y divide-border/30">
              {recentQuotes.map((row) => (
                <li key={row.id}>
                  <Link
                    href={`/account/quotes/${row.id}`}
                    className="flex flex-col gap-2 px-5 py-4 transition-colors hover:bg-muted/10 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium text-foreground">
                        {resolveQuoteDisplayRef(row)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {row.opportunity_ref}
                        {row.event_type ? ` · ${row.event_type}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-primary">
                        {formatCadFromCents(row.total_cents)}
                      </span>
                      <QuoteStatusBadge status={row.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="overflow-hidden rounded-3xl border border-border/40 bg-card/20">
          <div className="border-b border-border/40 px-5 py-4">
            <h2 className="font-heading text-lg font-semibold">
              Recent estimates
            </h2>
          </div>
          {recentEstimates.length === 0 ? (
            <div className="space-y-3 px-5 py-10 text-center">
              <p className="text-sm text-muted-foreground">No estimates yet.</p>
              <Button asChild>
                <Link href="/get-estimate">Start a new estimate</Link>
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-border/30">
              {recentEstimates.map((row) => (
                <li key={row.id}>
                  <Link
                    href={`/account/estimates/${row.id}`}
                    className="flex flex-col gap-2 px-5 py-4 transition-colors hover:bg-muted/10 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium text-foreground">
                        {formatEstimateReference(row.id, row.opportunity_ref)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {row.event_type || "Event"}
                        {row.city_area ? ` · ${row.city_area}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <EstimateStatusBadge status={row.status} />
                      <span className="text-xs text-muted-foreground">
                        {new Date(row.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AccountPageFrame>
  );
}
