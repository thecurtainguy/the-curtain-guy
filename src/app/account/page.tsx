import type { Metadata } from "next";
import Link from "next/link";
import { LayoutDashboard } from "lucide-react";
import {
  isEmailVerified,
  requireAccountPage,
} from "@/lib/account-page";
import {
  AccountPageFrame,
  EmailVerificationBanner,
} from "@/components/account/account-page-frame";
import {
  AccountDashboardEstimatesList,
  AccountDashboardQuotesList,
  type AccountDashboardEstimateRow,
  type AccountDashboardQuoteRow,
} from "@/components/account/lists/account-dashboard-lists";
import { PortalPageHeader } from "@/components/portal/portal-page-header";
import { listEstimatesForCustomer } from "@/lib/estimate-access";
import { listQuotesForCustomer } from "@/lib/quotes";
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

  const estimateRows: AccountDashboardEstimateRow[] = estimates.map((row) => ({
    id: row.id,
    status: row.status,
    event_type: row.event_type,
    city_area: row.city_area,
    created_at: row.created_at,
    opportunity_ref: row.opportunity_ref ?? null,
  }));

  const quoteRows: AccountDashboardQuoteRow[] = quotes.map((row) => ({
    id: row.id,
    status: row.status,
    opportunity_ref: row.opportunity_ref,
    revision_number: row.revision_number,
    total_cents: row.total_cents,
    event_type: row.event_type,
    updated_at: row.updated_at,
  }));

  return (
    <AccountPageFrame email={current.profile.email}>
      <EmailVerificationBanner verified={verified} />
      <div className="space-y-8">
        <PortalPageHeader
          eyebrow="Welcome"
          title={current.profile.full_name || "Your account"}
          description="View estimate briefs, proposals, booked events, and profile details."
          icon={LayoutDashboard}
          actions={
            <>
              <Button asChild>
                <Link href="/get-estimate">Start a new estimate</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/account/quotes">View quotes</Link>
              </Button>
            </>
          }
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Estimates
            </p>
            <p className="mt-2 font-heading text-3xl font-semibold">
              {estimates.length}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
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
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
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

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-heading text-lg font-semibold">Recent quotes</h2>
            <Button asChild variant="outline" size="sm">
              <Link href="/account/quotes">View all</Link>
            </Button>
          </div>
          <AccountDashboardQuotesList rows={quoteRows} />
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-heading text-lg font-semibold">
              Recent estimates
            </h2>
            <Button asChild variant="outline" size="sm">
              <Link href="/account/estimates">View all</Link>
            </Button>
          </div>
          <AccountDashboardEstimatesList rows={estimateRows} />
        </section>
      </div>
    </AccountPageFrame>
  );
}
