import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, ClipboardList, LayoutDashboard } from "lucide-react";
import { requireAdminPage } from "@/lib/admin-page";
import { AdminPageFrame } from "@/components/admin/admin-page-frame";
import {
  AdminDashboardRecentList,
  type DashboardEstimateRow,
} from "@/components/admin/lists/admin-dashboard-recent-list";
import { PortalStartEstimateButton } from "@/components/estimates/portal-start-estimate-button";
import { PortalPageHeader } from "@/components/portal/portal-page-header";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { listAdminJobs } from "@/lib/jobs";
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

  const today = new Date().toISOString().slice(0, 10);
  const allJobs = await listAdminJobs({ limit: 500 });
  const upcomingEvents = allJobs.filter(
    (j) =>
      j.event_date &&
      j.event_date >= today &&
      j.status !== "cancelled" &&
      j.status !== "closed"
  ).length;
  const needsDetails = allJobs.filter((j) =>
    ["draft", "details_needed"].includes(j.status)
  ).length;
  const installScheduled = allJobs.filter(
    (j) => j.status === "install_scheduled"
  ).length;
  const teardownScheduled = allJobs.filter(
    (j) => j.status === "teardown_scheduled"
  ).length;

  const { data: recent } = await admin
    .from("estimate_requests")
    .select(
      "id, status, customer_name, customer_email, event_type, event_date, city_area, created_at, opportunity_ref"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  const recentRows: DashboardEstimateRow[] = (recent ?? []).map((row) => ({
    id: row.id,
    status: row.status,
    customer_name: row.customer_name,
    customer_email: row.customer_email,
    event_type: row.event_type,
    city_area: row.city_area,
    created_at: row.created_at,
    opportunity_ref: row.opportunity_ref,
  }));

  return (
    <AdminPageFrame email={owner.profile.email} profile={owner.profile}>
      <div className="space-y-8">
        <PortalPageHeader
          eyebrow="Dashboard"
          title="Operations overview"
          description="Scan estimate pipeline health and upcoming booked events."
          icon={LayoutDashboard}
          actions={
            <>
              <PortalStartEstimateButton />
              <Button asChild variant="outline">
                <Link href="/admin/estimates">
                  <ClipboardList className="size-4" />
                  All estimates
                </Link>
              </Button>
            </>
          }
        />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {STATUSES.map((status) => (
            <Link
              key={status}
              href={`/admin/estimates?status=${status}`}
              className="rounded-2xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/40"
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

        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-heading text-lg font-semibold text-foreground">
              Booked events
            </h2>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/jobs">
                <CalendarDays className="size-4" />
                All jobs
              </Link>
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "Upcoming events",
                value: upcomingEvents,
                href: "/admin/jobs?upcoming=1",
              },
              {
                label: "Needs details",
                value: needsDetails,
                href: "/admin/jobs?status=details_needed",
              },
              {
                label: "Install scheduled",
                value: installScheduled,
                href: "/admin/jobs?status=install_scheduled",
              },
              {
                label: "Teardown scheduled",
                value: teardownScheduled,
                href: "/admin/jobs?status=teardown_scheduled",
              },
            ].map((card) => (
              <Link
                key={card.label}
                href={card.href}
                className="rounded-2xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/40"
              >
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  {card.label}
                </p>
                <p className="mt-2 font-heading text-3xl font-semibold text-foreground">
                  {card.value}
                </p>
              </Link>
            ))}
          </div>
        </div>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-heading text-lg font-semibold text-foreground">
              Recent requests
            </h2>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/estimates">View all</Link>
            </Button>
          </div>
          <AdminDashboardRecentList rows={recentRows} />
        </section>
      </div>
    </AdminPageFrame>
  );
}
