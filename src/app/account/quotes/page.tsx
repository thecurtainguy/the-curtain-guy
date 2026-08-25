import type { Metadata } from "next";
import Link from "next/link";
import { FileText } from "lucide-react";
import {
  isEmailVerified,
  requireAccountPage,
} from "@/lib/account-page";
import {
  AccountPageFrame,
  EmailVerificationBanner,
} from "@/components/account/account-page-frame";
import {
  AccountQuotesList,
  type AccountQuoteListRow,
} from "@/components/account/lists/account-quotes-list";
import { PortalPageHeader } from "@/components/portal/portal-page-header";
import { listQuotesForCustomer } from "@/lib/quotes";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Your proposals",
  robots: { index: false, follow: false },
};

export default async function AccountQuotesPage() {
  const current = await requireAccountPage();
  const verified = isEmailVerified(current.user);
  const quotes = await listQuotesForCustomer(current.user);

  const listRows: AccountQuoteListRow[] = quotes.map((row) => ({
    id: row.id,
    status: row.status,
    opportunity_ref: row.opportunity_ref,
    revision_number: row.revision_number,
    total_cents: row.total_cents,
    event_date: row.event_date,
    updated_at: row.updated_at,
  }));

  return (
    <AccountPageFrame email={current.profile.email}>
      <EmailVerificationBanner verified={verified} />
      <div className="space-y-6">
        <PortalPageHeader
          eyebrow="Quotes"
          title="Quotes"
          description="Review proposals, request changes, and accept when ready."
          icon={FileText}
          actions={
            <Button asChild variant="outline">
              <Link href="/get-estimate">Start a new estimate</Link>
            </Button>
          }
        />
        <AccountQuotesList rows={listRows} />
      </div>
    </AccountPageFrame>
  );
}
