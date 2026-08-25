import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { requireAdminPage } from "@/lib/admin-page";
import { AdminPageFrame } from "@/components/admin/admin-page-frame";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { EstimateStatusBadge } from "@/components/estimates/status-badge";
import { formatEstimateReference } from "@/data/estimate";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Owner dashboard",
  robots: { index: false, follow: false },
};

const STATUSES = ["new", "reviewed", "quoted", "closed", "spam"] as const;

export default async function AdminDashboardPage() {
  const owner = await requireAdminPage();
  const admin = createAdminSupabaseClient();

  const counts = Object.fromEntries(
    await Promise.all(
      STATUSES.map(async (status) => {
        const { count } = await admin
          .from("estimate_requests")
          .select("id", { count: "exact", head: true })
          .eq("status", status);
        return [status, count ?? 0] as const;
      })
    )
  ) as Record<(typeof STATUSES)[number], number>;

  const { data: recent } = await admin
    .from("estimate_requests")
    .select(
      "id, status, customer_name, customer_email, event_type, event_date, city_area, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(8);

  return (
    <AdminPageFrame email={owner.profile.email}>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
              Dashboard
            </p>
            <h1 className="mt-1 font-heading text-3xl font-semibold text-foreground">
              Estimate requests
            </h1>
          </div>
          <Button asChild>
            <Link href="/admin/estimates">
              <ClipboardList className="size-4" />
              All estimates
            </Link>
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {STATUSES.map((status) => (
            <Link
              key={status}
              href={`/admin/estimates?status=${status}`}
              className="rounded-2xl border border-border/40 bg-card/25 p-4 transition-colors hover:border-primary/30 hover:bg-card/40"
            >
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                {status}
              </p>
              <p className="mt-2 font-heading text-3xl font-semibold text-foreground">
                {counts[status]}
              </p>
            </Link>
          ))}
        </div>

        <section className="rounded-3xl border border-border/40 bg-card/20 overflow-hidden">
          <div className="border-b border-border/40 px-5 py-4">
            <h2 className="font-heading text-lg font-semibold text-foreground">
              Recent requests
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-muted/20 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Reference</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Event</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {(recent ?? []).length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      No estimates yet.
                    </td>
                  </tr>
                ) : (
                  (recent ?? []).map((row) => (
                    <tr
                      key={row.id}
                      className="border-t border-border/30 hover:bg-muted/10"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/estimates/${row.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {formatEstimateReference(row.id)}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <EstimateStatusBadge status={row.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">
                          {row.customer_name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {row.customer_email}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {row.event_type ?? "—"}
                        {row.city_area ? ` · ${row.city_area}` : ""}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(row.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AdminPageFrame>
  );
}
