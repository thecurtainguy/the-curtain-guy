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

export type DashboardEstimateRow = {
  id: string;
  status: string;
  customer_name: string;
  customer_email: string;
  event_type: string | null;
  city_area: string | null;
  created_at: string;
  opportunity_ref: string | null;
};

const STATUS_OPTIONS: PortalStatusOption[] = [
  { value: "new", label: "New" },
  { value: "reviewed", label: "Reviewed" },
  { value: "quoted", label: "Quoted" },
  { value: "closed", label: "Closed" },
  { value: "spam", label: "Spam" },
];

const columns: PortalListColumn<DashboardEstimateRow>[] = [
  {
    id: "reference",
    label: "Reference",
    sortable: true,
    sortValue: (row) => formatEstimateReference(row.id, row.opportunity_ref),
    render: (row) => (
      <Link
        href={`/admin/estimates/${row.id}`}
        className="font-medium text-primary hover:underline"
      >
        {formatEstimateReference(row.id, row.opportunity_ref)}
      </Link>
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
    id: "customer",
    label: "Customer",
    sortable: true,
    sortValue: (row) => row.customer_name,
    render: (row) => (
      <div>
        <div className="font-medium text-foreground">{row.customer_name}</div>
        <div className="text-xs text-muted-foreground">{row.customer_email}</div>
      </div>
    ),
  },
  {
    id: "event",
    label: "Event",
    sortable: true,
    sortValue: (row) => row.event_type,
    render: (row) => (
      <span className="text-muted-foreground">
        {row.event_type ?? "—"}
        {row.city_area ? ` · ${row.city_area}` : ""}
      </span>
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
        {new Date(row.created_at).toLocaleString()}
      </span>
    ),
  },
];

function List({ rows }: { rows: DashboardEstimateRow[] }) {
  return (
    <PortalListView
      rows={rows}
      columns={columns}
      rowKey={(row) => row.id}
      getSearchText={(row) =>
        [
          formatEstimateReference(row.id, row.opportunity_ref),
          row.opportunity_ref,
          row.customer_name,
          row.customer_email,
          row.event_type,
          row.city_area,
        ]
          .filter(Boolean)
          .join(" ")
      }
      getStatus={(row) => row.status}
      statusOptions={STATUS_OPTIONS}
      searchLabel="Search recent requests"
      searchPlaceholder="TCG-… or customer"
      empty="No estimates yet."
      resultNoun="requests"
    />
  );
}

export function AdminDashboardRecentList({
  rows,
}: {
  rows: DashboardEstimateRow[];
}) {
  return (
    <PortalListSuspense>
      <List rows={rows} />
    </PortalListSuspense>
  );
}
