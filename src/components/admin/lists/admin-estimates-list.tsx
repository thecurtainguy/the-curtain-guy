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

export type AdminEstimateListRow = {
  id: string;
  status: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
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
  { value: "spam", label: "Spam" },
];

const columns: PortalListColumn<AdminEstimateListRow>[] = [
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
        <div className="font-medium">{row.customer_name}</div>
        <div className="text-xs text-muted-foreground">{row.customer_email}</div>
      </div>
    ),
  },
  {
    id: "phone",
    label: "Phone",
    sortable: true,
    sortValue: (row) => row.customer_phone,
    render: (row) => (
      <span className="text-muted-foreground">{row.customer_phone || "—"}</span>
    ),
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
      <span className="tabular-nums text-muted-foreground">{row.file_count}</span>
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

function List({ rows }: { rows: AdminEstimateListRow[] }) {
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
          row.customer_phone,
          row.id,
        ]
          .filter(Boolean)
          .join(" ")
      }
      getStatus={(row) => row.status}
      statusOptions={STATUS_OPTIONS}
      searchLabel="Search reference, name, email, phone"
      searchPlaceholder="TCG-… or customer details"
      empty="No estimates match these filters."
    />
  );
}

export function AdminEstimatesList({ rows }: { rows: AdminEstimateListRow[] }) {
  return (
    <PortalListSuspense>
      <List rows={rows} />
    </PortalListSuspense>
  );
}
