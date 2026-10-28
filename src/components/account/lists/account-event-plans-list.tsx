"use client";

import Link from "next/link";
import {
  PortalListSuspense,
  PortalListView,
  type PortalListColumn,
  type PortalStatusOption,
} from "@/components/portal/list";
import { useEventPlanPortalBuildNew } from "@/components/event-plans/event-plan-portal-list-shell";
import { EventPlanStatusBadge } from "@/components/event-plans/event-plan-status-badge";
import { formatEventPlanReference } from "@/data/event-plans";

export type AccountEventPlanListRow = {
  id: string;
  reference: string;
  status: string;
  owner_user_id: string | null;
  event_type: string | null;
  event_date: string | null;
  venue_name: string | null;
  city_area: string | null;
  created_at: string;
};

const STATUS_OPTIONS: PortalStatusOption[] = [
  { value: "new", label: "New" },
  { value: "reviewed", label: "Reviewed" },
  { value: "quoted", label: "Quoted" },
  { value: "archived", label: "Archived" },
];

const columns: PortalListColumn<AccountEventPlanListRow>[] = [
  {
    id: "reference",
    label: "Reference",
    sortable: true,
    sortValue: (row) => formatEventPlanReference(row.id, row.reference),
    render: (row) => (
      <div>
        <Link
          href={`/account/event-plans/${row.id}`}
          className="font-medium text-primary hover:underline"
        >
          {formatEventPlanReference(row.id, row.reference)}
        </Link>
        {!row.owner_user_id ? (
          <span className="ml-2 text-[10px] uppercase tracking-wide text-muted-foreground">
            Email match
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
    render: (row) => <EventPlanStatusBadge status={row.status} />,
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
        {new Date(row.created_at).toLocaleDateString()}
      </span>
    ),
  },
];

function List({ rows }: { rows: AccountEventPlanListRow[] }) {
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
      searchPlaceholder="EP-… or venue"
      empty={
        rows.length === 0 ? (
          <>
            No event plans yet.{" "}
            {onBuildNew ? (
              <button
                type="button"
                onClick={onBuildNew}
                className="text-primary hover:underline"
              >
                Build a new event plan
              </button>
            ) : null}
          </>
        ) : (
          "No event plans match these filters."
        )
      }
    />
  );
}

export function AccountEventPlansList({
  rows,
}: {
  rows: AccountEventPlanListRow[];
}) {
  return (
    <PortalListSuspense>
      <List rows={rows} />
    </PortalListSuspense>
  );
}
