"use client";

import Link from "next/link";
import { JobStatusBadge } from "@/components/jobs/job-status-badge";
import {
  PortalListSuspense,
  PortalListView,
  PortalListFilterToggle,
  type PortalListColumn,
  type PortalStatusOption,
} from "@/components/portal/list";
import {
  JOB_STATUSES,
  formatJobRef,
  type JobStatus,
} from "@/data/jobs";
import { formatCadFromCents } from "@/data/quotes";
import { Button } from "@/components/ui/button";

export type AdminJobListRow = {
  id: string;
  opportunity_ref: string;
  status: JobStatus;
  customer_name: string | null;
  customer_email: string | null;
  event_date: string | null;
  venue_name: string | null;
  install_date: string | null;
  install_start_time: string | null;
  teardown_date: string | null;
  teardown_start_time: string | null;
  checklist_completed: number;
  checklist_total: number;
  quote_display_ref: string | null;
  accepted_quote_total_cents: number | null;
};

const STATUS_OPTIONS: PortalStatusOption[] = JOB_STATUSES.map((status) => ({
  value: status,
  label: status.replaceAll("_", " "),
}));

const columns: PortalListColumn<AdminJobListRow>[] = [
  {
    id: "job",
    label: "Job",
    sortable: true,
    sortValue: (row) => row.opportunity_ref,
    render: (row) => (
      <Link
        href={`/admin/jobs/${row.id}`}
        className="font-medium text-primary hover:underline"
      >
        {formatJobRef(row.opportunity_ref)}
      </Link>
    ),
  },
  {
    id: "customer",
    label: "Customer",
    sortable: true,
    sortValue: (row) => row.customer_name || row.customer_email || "",
    render: (row) => (
      <div>
        <div className="font-medium">{row.customer_name || "—"}</div>
        <div className="text-xs text-muted-foreground">{row.customer_email}</div>
      </div>
    ),
  },
  {
    id: "event",
    label: "Event",
    sortable: true,
    sortType: "date",
    sortValue: (row) => row.event_date,
    render: (row) => (
      <div className="text-muted-foreground">
        <div>{row.event_date || "—"}</div>
        <div className="text-xs">{row.venue_name || "—"}</div>
      </div>
    ),
  },
  {
    id: "status",
    label: "Status",
    sortable: true,
    sortValue: (row) => row.status,
    render: (row) => <JobStatusBadge status={row.status} />,
  },
  {
    id: "install",
    label: "Install",
    sortable: true,
    sortType: "date",
    sortValue: (row) => row.install_date,
    render: (row) => (
      <span className="text-xs text-muted-foreground">
        {row.install_date || "—"}
        {row.install_start_time ? ` ${row.install_start_time}` : ""}
      </span>
    ),
  },
  {
    id: "teardown",
    label: "Teardown",
    sortable: true,
    sortType: "date",
    sortValue: (row) => row.teardown_date,
    render: (row) => (
      <span className="text-xs text-muted-foreground">
        {row.teardown_date || "—"}
        {row.teardown_start_time ? ` ${row.teardown_start_time}` : ""}
      </span>
    ),
  },
  {
    id: "checklist",
    label: "Checklist",
    sortable: true,
    sortType: "number",
    sortValue: (row) =>
      row.checklist_total
        ? row.checklist_completed / row.checklist_total
        : 0,
    render: (row) => (
      <span className="tabular-nums text-muted-foreground">
        {row.checklist_completed}/{row.checklist_total}
      </span>
    ),
  },
  {
    id: "quote",
    label: "Quote",
    sortable: true,
    sortType: "number",
    sortValue: (row) => row.accepted_quote_total_cents ?? 0,
    render: (row) => (
      <div className="text-xs text-muted-foreground">
        {row.quote_display_ref || "—"}
        {row.accepted_quote_total_cents != null ? (
          <div className="tabular-nums text-foreground">
            {formatCadFromCents(row.accepted_quote_total_cents)}
          </div>
        ) : null}
      </div>
    ),
  },
  {
    id: "actions",
    label: "",
    render: (row) => (
      <Button asChild size="sm" variant="outline">
        <Link href={`/admin/jobs/${row.id}`}>Open</Link>
      </Button>
    ),
  },
];

function List({ rows }: { rows: AdminJobListRow[] }) {
  return (
    <PortalListView
      rows={rows}
      columns={columns}
      rowKey={(row) => row.id}
      getSearchText={(row) =>
        [
          row.opportunity_ref,
          formatJobRef(row.opportunity_ref),
          row.customer_name,
          row.customer_email,
          row.venue_name,
        ]
          .filter(Boolean)
          .join(" ")
      }
      getStatus={(row) => row.status}
      statusOptions={STATUS_OPTIONS}
      searchLabel="Search ref, customer, venue"
      searchPlaceholder="TCG-10001 or venue"
      extraKeys={["upcoming", "past"]}
      filterRow={(row, state) => {
        const today = new Date().toISOString().slice(0, 10);
        if (state.extras.upcoming === "1") {
          if (!row.event_date || row.event_date < today) return false;
        }
        if (state.extras.past === "1") {
          if (!row.event_date || row.event_date >= today) return false;
        }
        return true;
      }}
      renderFiltersExtras={({ state, setExtra }) => (
        <>
          <PortalListFilterToggle
            label="Upcoming"
            checked={state.extras.upcoming === "1"}
            onCheckedChange={(checked) =>
              setExtra("upcoming", checked ? "1" : null)
            }
          />
          <PortalListFilterToggle
            label="Past"
            checked={state.extras.past === "1"}
            onCheckedChange={(checked) =>
              setExtra("past", checked ? "1" : null)
            }
          />
        </>
      )}
      empty="No booked events yet. Accepted quotes can be converted into jobs."
    />
  );
}

export function AdminJobsList({ rows }: { rows: AdminJobListRow[] }) {
  return (
    <PortalListSuspense>
      <List rows={rows} />
    </PortalListSuspense>
  );
}
