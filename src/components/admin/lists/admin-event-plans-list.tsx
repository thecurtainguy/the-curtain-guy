"use client";

import Link from "next/link";
import { EventPlanStatusBadge } from "@/components/event-plans/event-plan-status-badge";
import {
  PortalListSuspense,
  PortalListView,
  type PortalListColumn,
  type PortalStatusOption,
} from "@/components/portal/list";
import { useEventPlanPortalBuildNew } from "@/components/event-plans/event-plan-portal-list-shell";
import { formatEventPlanReference } from "@/data/event-plans";

export type AdminEventPlanListRow = {
  id: string;
  reference: string;
  status: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  event_type: string | null;
  event_date: string | null;
  venue_name: string | null;
  city_area: string | null;
  created_at: string;
  brief_json?: Record<string, unknown>;
  design_json?: Record<string, unknown>;
  notes?: string | null;
  studio_design_id?: string | null;
};

const STATUS_OPTIONS: PortalStatusOption[] = [
  { value: "new", label: "New" },
  { value: "reviewed", label: "Reviewed" },
  { value: "quoted", label: "Quoted" },
  { value: "archived", label: "Archived" },
];

const columns: PortalListColumn<AdminEventPlanListRow>[] = [
  {
    id: "reference",
    label: "Reference",
    sortable: true,
    sortValue: (row) => formatEventPlanReference(row.id, row.reference),
    render: (row) => (
      <Link
        href={`/admin/event-plans/${row.id}`}
        className="font-medium text-primary hover:underline"
      >
        {formatEventPlanReference(row.id, row.reference)}
      </Link>
    ),
  },
  {
    id: "status",
    label: "Status",
    sortable: true,
    sortValue: (row) => row.status,
    render: (row) => <EventPlanStatusBadge status={row.status} />,
  },
  {
    id: "customer",
    label: "Customer",
    sortable: true,
    sortValue: (row) => row.contact_name,
    render: (row) => (
      <div>
        <div className="font-medium">{row.contact_name}</div>
        <div className="text-xs text-muted-foreground">{row.contact_email}</div>
      </div>
    ),
  },
  {
    id: "phone",
    label: "Phone",
    sortable: true,
    sortValue: (row) => row.contact_phone,
    render: (row) => (
      <span className="text-muted-foreground">{row.contact_phone || "—"}</span>
    ),
  },
  {
    id: "event",
    label: "Event",
    sortable: true,
    sortValue: (row) => row.event_type,
    render: (row) => (
      <span className="text-muted-foreground">
        {row.event_type?.replace(/-/g, " ") || "—"}
      </span>
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
    id: "created",
    label: "Submitted",
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

function List({ rows }: { rows: AdminEventPlanListRow[] }) {
  const onBuildNew = useEventPlanPortalBuildNew();
  return (
    <PortalListView
      rows={rows}
      columns={columns}
      rowKey={(row) => row.id}
      getSearchText={(row) =>
        [
          formatEventPlanReference(row.id, row.reference),
          row.reference,
          row.contact_name,
          row.contact_email,
          row.contact_phone,
          row.event_type,
          row.venue_name,
          row.city_area,
          row.id,
        ]
          .filter(Boolean)
          .join(" ")
      }
      getStatus={(row) => row.status}
      statusOptions={STATUS_OPTIONS}
      searchLabel="Search reference, customer, or event"
      searchPlaceholder="EP-… or customer details"
      empty={
        rows.length === 0 && onBuildNew ? (
          <>
            No event plans yet.{" "}
            <button
              type="button"
              onClick={onBuildNew}
              className="text-primary hover:underline"
            >
              Build a new event plan
            </button>
          </>
        ) : (
          "No event plans match these filters."
        )
      }
    />
  );
}

export function AdminEventPlansList({
  rows,
}: {
  rows: AdminEventPlanListRow[];
}) {
  return (
    <PortalListSuspense>
      <List rows={rows} />
    </PortalListSuspense>
  );
}
