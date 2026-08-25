"use client";

import Link from "next/link";
import { JobStatusBadge } from "@/components/jobs/job-status-badge";
import {
  PortalListSuspense,
  PortalListView,
  type PortalListColumn,
  type PortalStatusOption,
} from "@/components/portal/list";
import {
  JOB_STATUSES,
  formatJobRef,
  type JobStatus,
} from "@/data/jobs";
import { formatDisplayDate, parseISODate } from "@/lib/date";
import { Button } from "@/components/ui/button";

export type AccountEventListRow = {
  id: string;
  opportunity_ref: string;
  status: JobStatus;
  event_date: string | null;
  venue_name: string | null;
  install_date: string | null;
  install_start_time: string | null;
  teardown_date: string | null;
  teardown_start_time: string | null;
};

function formatEventDate(value: string | null): string {
  if (!value) return "—";
  const parsed = parseISODate(value.slice(0, 10));
  if (parsed) return formatDisplayDate(parsed);
  return value;
}

const STATUS_OPTIONS: PortalStatusOption[] = JOB_STATUSES.map((status) => ({
  value: status,
  label: status.replaceAll("_", " "),
}));

const columns: PortalListColumn<AccountEventListRow>[] = [
  {
    id: "event",
    label: "Event",
    sortable: true,
    sortValue: (row) => row.opportunity_ref,
    render: () => null,
  },
  {
    id: "status",
    label: "Status",
    sortable: true,
    sortValue: (row) => row.status,
    render: () => null,
  },
  {
    id: "date",
    label: "Date",
    sortable: true,
    sortType: "date",
    sortValue: (row) => row.event_date,
    render: () => null,
  },
];

function List({ rows }: { rows: AccountEventListRow[] }) {
  return (
    <PortalListView
      rows={rows}
      columns={columns}
      rowKey={(row) => row.id}
      getSearchText={(row) =>
        [
          row.opportunity_ref,
          formatJobRef(row.opportunity_ref),
          row.venue_name,
        ]
          .filter(Boolean)
          .join(" ")
      }
      getStatus={(row) => row.status}
      statusOptions={STATUS_OPTIONS}
      searchLabel="Search reference or venue"
      searchPlaceholder="TCG-10001 or venue"
      itemLabel="Cards"
      empty={
        <div className="space-y-4">
          <p>
            No booked events yet. When a quote is accepted and confirmed, your
            event will appear here.
          </p>
          <Button asChild variant="outline">
            <Link href="/account/quotes">View your quotes</Link>
          </Button>
        </div>
      }
      renderCards={(pageRows) => (
        <div className="grid gap-4 sm:grid-cols-2">
          {pageRows.map((job) => (
            <article
              key={job.id}
              className="flex flex-col rounded-3xl border border-border bg-card p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-primary">
                    {job.opportunity_ref}
                  </p>
                  <h2 className="mt-1 font-heading text-xl font-semibold">
                    {formatJobRef(job.opportunity_ref)}
                  </h2>
                </div>
                <JobStatusBadge status={job.status} />
              </div>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Event date</dt>
                  <dd className="font-medium">
                    {formatEventDate(job.event_date)}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Venue</dt>
                  <dd className="text-right font-medium">
                    {job.venue_name || "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Install</dt>
                  <dd className="text-right font-medium">
                    {job.install_date
                      ? `${formatEventDate(job.install_date)}${job.install_start_time ? ` · ${job.install_start_time}` : ""}`
                      : "Scheduling in progress"}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Teardown</dt>
                  <dd className="text-right font-medium">
                    {job.teardown_date
                      ? `${formatEventDate(job.teardown_date)}${job.teardown_start_time ? ` · ${job.teardown_start_time}` : ""}`
                      : "Scheduling in progress"}
                  </dd>
                </div>
              </dl>
              <Button asChild className="mt-5 w-full">
                <Link href={`/account/events/${job.id}`}>Open event</Link>
              </Button>
            </article>
          ))}
        </div>
      )}
    />
  );
}

export function AccountEventsList({ rows }: { rows: AccountEventListRow[] }) {
  return (
    <PortalListSuspense>
      <List rows={rows} />
    </PortalListSuspense>
  );
}
