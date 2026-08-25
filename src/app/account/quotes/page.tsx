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
import { QuoteStatusBadge } from "@/components/quotes/quote-status-badge";
import { formatCadFromCents } from "@/data/quotes";
import { formatDisplayDate, parseISODate } from "@/lib/date";
import { listQuotesForCustomer } from "@/lib/quotes";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Your proposals",
  robots: { index: false, follow: false },
};

function formatEventDate(value: string | null): string {
  if (!value) return "—";
  const parsed = parseISODate(value.slice(0, 10));
  if (parsed) return formatDisplayDate(parsed);
  return value;
}

export default async function AccountQuotesPage() {
  const current = await requireAccountPage();
  const verified = isEmailVerified(current.user);
  const quotes = await listQuotesForCustomer(current.user);

  return (
    <AccountPageFrame email={current.profile.email}>
      <EmailVerificationBanner verified={verified} />
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
              Proposals
            </p>
            <h1 className="mt-1 font-heading text-3xl font-semibold">
              Your quotes
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Review sent proposals, request changes, and explore options with
              our team.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/get-estimate">Start a new estimate</Link>
          </Button>
        </div>

        <div className="overflow-hidden rounded-3xl border border-border/40 bg-card/20">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-muted/20 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Reference</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Event date</th>
                  <th className="px-4 py-3 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody>
                {quotes.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-10 text-center text-muted-foreground"
                    >
                      No proposals yet. Once we send a quote, it will appear
                      here.
                    </td>
                  </tr>
                ) : (
                  quotes.map((row) => (
                    <tr
                      key={row.id}
                      className="border-t border-border/30 hover:bg-muted/10"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/account/quotes/${row.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {row.quote_display_ref}
                        </Link>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {row.opportunity_ref}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <QuoteStatusBadge status={row.status} />
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">
                        {formatCadFromCents(row.total_cents)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatEventDate(row.event_date)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(row.updated_at).toLocaleDateString("en-CA")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AccountPageFrame>
  );
}
