import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminPage } from "@/lib/admin-page";
import { AdminPageFrame } from "@/components/admin/admin-page-frame";
import { JobStatusBadge } from "@/components/jobs/job-status-badge";
import {
  JOB_STATUSES,
  formatJobRef,
  isJobStatus,
  type JobStatus,
} from "@/data/jobs";
import { formatCadFromCents } from "@/data/quotes";
import { listAdminJobs } from "@/lib/jobs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Jobs",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{
  status?: string;
  q?: string;
  upcoming?: string;
  past?: string;
}>;

export default async function AdminJobsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const owner = await requireAdminPage();
  const params = await searchParams;
  const statusParam = params.status?.trim() || "";
  const q = params.q?.trim() || "";
  const statusFilter: JobStatus | null =
    statusParam && isJobStatus(statusParam) ? statusParam : null;

  const jobs = await listAdminJobs({
    status: statusFilter,
    search: q || undefined,
    upcoming: params.upcoming === "1",
    past: params.past === "1",
  });

  return (
    <AdminPageFrame email={owner.profile.email}>
      <div className="space-y-6">
        <div className="border-b border-border/30 pb-6">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-primary">
            Jobs
          </p>
          <h1 className="mt-1 font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Jobs
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Manage booked events, install schedules, teardown, and production notes.
          </p>
        </div>

        <form className="flex flex-col gap-3 rounded-2xl border border-border/40 bg-card/20 p-4 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="min-w-[200px] flex-1 space-y-2">
            <label htmlFor="q" className="text-xs text-muted-foreground">
              Search ref, customer, venue
            </label>
            <Input id="q" name="q" defaultValue={q} placeholder="TCG-10001 or venue" />
          </div>
          <div className="space-y-2 sm:w-48">
            <label htmlFor="status" className="text-xs text-muted-foreground">
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={statusFilter ?? ""}
              className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
            >
              <option value="">All</option>
              {JOB_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="upcoming" value="1" defaultChecked={params.upcoming === "1"} />
            Upcoming
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="past" value="1" defaultChecked={params.past === "1"} />
            Past
          </label>
          <Button type="submit">Filter</Button>
        </form>

        <div className="overflow-hidden rounded-3xl border border-border/40 bg-card/20">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-muted/20 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Job</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Event</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Install</th>
                  <th className="px-4 py-3 font-medium">Teardown</th>
                  <th className="px-4 py-3 font-medium">Checklist</th>
                  <th className="px-4 py-3 font-medium">Quote</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {jobs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">
                      No booked events yet. Accepted quotes can be converted into jobs.
                    </td>
                  </tr>
                ) : (
                  jobs.map((row) => (
                    <tr key={row.id} className="border-t border-border/30 hover:bg-muted/10">
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/jobs/${row.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {formatJobRef(row.opportunity_ref)}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{row.customer_name || "—"}</div>
                        <div className="text-xs text-muted-foreground">{row.customer_email}</div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <div>{row.event_date || "—"}</div>
                        <div className="text-xs">{row.venue_name || "—"}</div>
                      </td>
                      <td className="px-4 py-3">
                        <JobStatusBadge status={row.status} />
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {row.install_date || "—"}
                        {row.install_start_time ? ` ${row.install_start_time}` : ""}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {row.teardown_date || "—"}
                        {row.teardown_start_time ? ` ${row.teardown_start_time}` : ""}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-muted-foreground">
                        {row.checklist_completed}/{row.checklist_total}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {row.quote_display_ref || "—"}
                        {row.accepted_quote_total_cents != null ? (
                          <div className="tabular-nums text-foreground">
                            {formatCadFromCents(row.accepted_quote_total_cents)}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/admin/jobs/${row.id}`}>Open</Link>
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminPageFrame>
  );
}
