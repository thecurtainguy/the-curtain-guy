"use client";

import Link from "next/link";
import { EstimateStatusBadge } from "@/components/estimates/status-badge";
import {
  PortalListSuspense,
  PortalListView,
  type PortalListColumn,
  type PortalStatusOption,
} from "@/components/portal/list";
import { formatEstimateReference } from "@/data/estimate";

export type AccountEstimateListRow = {
  id: string;
  status: string;
  user_id: string | null;
  event_type: string | null;
  event_date: string | null;
  venue_name: string | null;
  city_area: string | null;
  created_at: string;
  opportunity_ref: string | null;
  file_count: number;
};

const STATUS_OPTIONS: PortalStatusOption[] = [
  { value: "new", label: "New" },
  { value: "reviewed", label: "Reviewed" },
  { value: "quoted", label: "Quoted" },
  { value: "closed", label: "Closed" },
];

const columns: PortalListColumn<AccountEstimateListRow>[] = [
  {
    id: "reference",
    label: "Reference",
    sortable: true,
    sortValue: (row) => formatEstimateReference(row.id, row.opportunity_ref),
    render: (row) => (
      <div>
        <Link
          href={`/account/estimates/${row.id}`}
          className="font-medium text-primary hover:underline"
        >
          {formatEstimateReference(row.id, row.opportunity_ref)}
        </Link>
        {!row.user_id ? (
          <span className="ml-2 text-[10px] uppercase tracking-wide text-muted-foreground">
            Guest match
          </span>
        ) : null}
      </div>
    ),
  },
  {
    id: "status",
    label: "Status",
    sortable: true,
    sortValue: (row) => row.status,
    render: (row) => <EstimateStatusBadge status={row.status} />,
  },
  {
    id: "event",
    label: "Event",
    sortable: true,
    sortValue: (row) => row.event_type,
    render: (row) => (
      <span className="text-muted-foreground">{row.event_type || "—"}</span>
    ),
  },
  {
    id: "date",
    label: "Date",
    sortable: true,
    sortType: "date",
    sortValue: (row) => row.event_date,
    render: (row) => (
      <span className="text-muted-foreground">{row.event_date || "—"}</span>
    ),
  },
  {
    id: "venue",
    label: "Venue / city",
    sortable: true,
    sortValue: (row) =>
      [row.venue_name, row.city_area].filter(Boolean).join(" · ") || "",
    render: (row) => (
      <span className="text-muted-foreground">
        {[row.venue_name, row.city_area].filter(Boolean).join(" · ") || "—"}
      </span>
    ),
  },
  {
    id: "files",
    label: "Files",
    sortable: true,
    sortType: "number",
    sortValue: (row) => row.file_count,
    align: "right",
    render: (row) => (
      <span className="text-muted-foreground">{row.file_count}</span>
    ),
  },
  {
    id: "created",
    label: "Created",
    sortable: true,
    sortType: "date",
    sortValue: (row) => row.created_at,
    render: (row) => (
      <span className="text-muted-foreground">
        {new Date(row.created_at).toLocaleDateString()}
      </span>
    ),
  },
];

function List({ rows }: { rows: AccountEstimateListRow[] }) {
  return (
    <PortalListView
      rows={rows}
      columns={columns}
      rowKey={(row) => row.id}
      getSearchText={(row) =>
        [
          formatEstimateReference(row.id, row.opportunity_ref),
          row.opportunity_ref,
          row.event_type,
          row.venue_name,
          row.city_area,
        ]
          .filter(Boolean)
          .join(" ")
      }
      getStatus={(row) => row.status}
      statusOptions={STATUS_OPTIONS}
      searchLabel="Search reference, event, or venue"
      searchPlaceholder="TCG-… or venue"
      empty={
        <>
          No estimates yet.{" "}
          <Link href="/get-estimate" className="text-primary hover:underline">
            Start a new estimate
          </Link>
        </>
      }
    />
  );
}

export function AccountEstimatesList({
  rows,
}: {
  rows: AccountEstimateListRow[];
}) {
  return (
    <PortalListSuspense>
      <List rows={rows} />
    </PortalListSuspense>
  );
}
