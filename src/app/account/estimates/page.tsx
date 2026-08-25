import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList } from "lucide-react";
import {
  isEmailVerified,
  requireAccountPage,
} from "@/lib/account-page";
import {
  AccountPageFrame,
  EmailVerificationBanner,
} from "@/components/account/account-page-frame";
import {
  AccountEstimatesList,
  type AccountEstimateListRow,
} from "@/components/account/lists/account-estimates-list";
import { PortalPageHeader } from "@/components/portal/portal-page-header";
import { listEstimatesForCustomer } from "@/lib/estimate-access";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Your estimates",
  robots: { index: false, follow: false },
};

export default async function AccountEstimatesPage() {
  const current = await requireAccountPage();
  const verified = isEmailVerified(current.user);
  const estimates = await listEstimatesForCustomer(current.user);

  const ids = estimates.map((row) => row.id);
  const fileCounts = new Map<string, number>();
  if (ids.length > 0) {
    const admin = createAdminSupabaseClient();
    const { data: files } = await admin
      .from("estimate_files")
      .select("estimate_request_id")
      .in("estimate_request_id", ids)
      .eq("upload_status", "uploaded");
    for (const file of files ?? []) {
      const key = file.estimate_request_id as string;
      fileCounts.set(key, (fileCounts.get(key) ?? 0) + 1);
    }
  }

  const listRows: AccountEstimateListRow[] = estimates.map((row) => ({
    id: row.id,
    status: row.status,
    user_id: row.user_id,
    event_type: row.event_type,
    event_date: row.event_date,
    venue_name: row.venue_name,
    city_area: row.city_area,
    created_at: row.created_at,
    opportunity_ref: row.opportunity_ref ?? null,
    file_count: fileCounts.get(row.id) ?? 0,
  }));

  return (
    <AccountPageFrame email={current.profile.email}>
      <EmailVerificationBanner verified={verified} />
      <div className="space-y-6">
        <PortalPageHeader
          eyebrow="Estimates"
          title="Estimates"
          description="Track your estimate briefs and uploaded files."
          icon={ClipboardList}
          actions={
            <Button asChild>
              <Link href="/get-estimate">Start a new estimate</Link>
            </Button>
          }
        />
        <AccountEstimatesList rows={listRows} />
      </div>
    </AccountPageFrame>
  );
}
