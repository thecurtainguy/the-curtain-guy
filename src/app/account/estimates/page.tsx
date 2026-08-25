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
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { EstimateStatusBadge } from "@/components/estimates/status-badge";
import { formatEstimateReference } from "@/data/estimate";
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

  return (
    <AccountPageFrame email={current.profile.email}>
      <EmailVerificationBanner verified={verified} />
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
              Estimates
            </p>
            <h1 className="mt-1 font-heading text-3xl font-semibold">
              Your requests
            </h1>
          </div>
          <Button asChild>
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
                  <th className="px-4 py-3 font-medium">Event</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Venue / city</th>
                  <th className="px-4 py-3 font-medium">Files</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {estimates.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center text-muted-foreground"
                    >
                      No estimates yet.{" "}
                      <Link
                        href="/get-estimate"
                        className="text-primary hover:underline"
                      >
                        Start a new estimate
                      </Link>
                    </td>
                  </tr>
                ) : (
                  estimates.map((row) => (
                    <tr
                      key={row.id}
                      className="border-t border-border/30 hover:bg-muted/10"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/account/estimates/${row.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {formatEstimateReference(row.id)}
                        </Link>
                        {!row.user_id && (
                          <span className="ml-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                            Guest match
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <EstimateStatusBadge status={row.status} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {row.event_type || "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {row.event_date || "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {[row.venue_name, row.city_area]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {fileCounts.get(row.id) ?? 0}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(row.created_at).toLocaleDateString()}
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
