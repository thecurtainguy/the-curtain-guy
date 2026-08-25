"use client";

import Link from "next/link";
import { EstimateStatusBadge } from "@/components/estimates/status-badge";
import { QuoteStatusBadge } from "@/components/quotes/quote-status-badge";
import {
  PortalListSuspense,
  PortalListView,
  type PortalListColumn,
  type PortalStatusOption,
} from "@/components/portal/list";
import { formatEstimateReference } from "@/data/estimate";
import {
  QUOTE_STATUSES,
  formatCadFromCents,
  resolveQuoteDisplayRef,
  type QuoteStatus,
} from "@/data/quotes";
import { Button } from "@/components/ui/button";

export type AccountDashboardEstimateRow = {
  id: string;
  status: string;
  event_type: string | null;
  city_area: string | null;
  created_at: string;
  opportunity_ref: string | null;
};

export type AccountDashboardQuoteRow = {
  id: string;
  status: QuoteStatus;
  opportunity_ref: string;
  revision_number: number;
  total_cents: number;
  event_type: string | null;
  updated_at: string;
};

const ESTIMATE_STATUS_OPTIONS: PortalStatusOption[] = [
  { value: "new", label: "New" },
  { value: "reviewed", label: "Reviewed" },
  { value: "quoted", label: "Quoted" },
  { value: "closed", label: "Closed" },
];

const QUOTE_STATUS_OPTIONS: PortalStatusOption[] = QUOTE_STATUSES.filter(
  (status) => status !== "draft"
).map((status) => ({
  value: status,
  label: status.replaceAll("_", " "),
}));

const estimateColumns: PortalListColumn<AccountDashboardEstimateRow>[] = [
  {
    id: "reference",
    label: "Reference",
    sortable: true,
    sortValue: (row) => formatEstimateReference(row.id, row.opportunity_ref),
    render: (row) => (
      <Link
        href={`/account/estimates/${row.id}`}
        className="font-medium text-primary hover:underline"
      >
        {formatEstimateReference(row.id, row.opportunity_ref)}
      </Link>
    ),
  },
  {
    id: "event",
    label: "Event",
    sortable: true,
    sortValue: (row) => row.event_type,
    render: (row) => (
      <span className="text-muted-foreground">
        {row.event_type || "Event"}
        {row.city_area ? ` · ${row.city_area}` : ""}
      </span>
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

const quoteColumns: PortalListColumn<AccountDashboardQuoteRow>[] = [
  {
    id: "reference",
    label: "Reference",
    sortable: true,
    sortValue: (row) => resolveQuoteDisplayRef(row),
    render: (row) => (
      <div>
        <Link
          href={`/account/quotes/${row.id}`}
          className="font-medium text-primary hover:underline"
        >
          {resolveQuoteDisplayRef(row)}
        </Link>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {row.opportunity_ref}
          {row.event_type ? ` · ${row.event_type}` : ""}
        </p>
      </div>
    ),
  },
  {
    id: "total",
    label: "Total",
    sortable: true,
    sortType: "number",
    sortValue: (row) => row.total_cents,
    align: "right",
    render: (row) => (
      <span className="font-medium text-primary">
        {formatCadFromCents(row.total_cents)}
      </span>
    ),
  },
  {
    id: "status",
    label: "Status",
    sortable: true,
    sortValue: (row) => row.status,
    render: (row) => <QuoteStatusBadge status={row.status} />,
  },
  {
    id: "updated",
    label: "Updated",
    sortable: true,
    sortType: "date",
    sortValue: (row) => row.updated_at,
    render: (row) => (
      <span className="text-muted-foreground">
        {new Date(row.updated_at).toLocaleDateString()}
      </span>
    ),
  },
];

function EstimatesList({ rows }: { rows: AccountDashboardEstimateRow[] }) {
  return (
    <PortalListView
      rows={rows}
      columns={estimateColumns}
      rowKey={(row) => row.id}
      getSearchText={(row) =>
        [
          formatEstimateReference(row.id, row.opportunity_ref),
          row.opportunity_ref,
          row.event_type,
          row.city_area,
        ]
          .filter(Boolean)
          .join(" ")
      }
      getStatus={(row) => row.status}
      statusOptions={ESTIMATE_STATUS_OPTIONS}
      searchLabel="Search estimates"
      searchPlaceholder="TCG-… or event"
      empty={
        <div className="space-y-3">
          <p>No estimates yet.</p>
          <Button asChild>
            <Link href="/get-estimate">Start a new estimate</Link>
          </Button>
        </div>
      }
    />
  );
}

function QuotesList({ rows }: { rows: AccountDashboardQuoteRow[] }) {
  return (
    <PortalListView
      rows={rows}
      columns={quoteColumns}
      rowKey={(row) => row.id}
      getSearchText={(row) =>
        [resolveQuoteDisplayRef(row), row.opportunity_ref, row.event_type]
          .filter(Boolean)
          .join(" ")
      }
      getStatus={(row) => row.status}
      statusOptions={QUOTE_STATUS_OPTIONS}
      searchLabel="Search quotes"
      searchPlaceholder="Quote TCG-…"
      empty="No proposals yet. Quotes appear here after The Curtain Guy sends one."
    />
  );
}

export function AccountDashboardEstimatesList({
  rows,
}: {
  rows: AccountDashboardEstimateRow[];
}) {
  return (
    <PortalListSuspense>
      <EstimatesList rows={rows} />
    </PortalListSuspense>
  );
}

export function AccountDashboardQuotesList({
  rows,
}: {
  rows: AccountDashboardQuoteRow[];
}) {
  return (
    <PortalListSuspense>
      <QuotesList rows={rows} />
    </PortalListSuspense>
  );
}
