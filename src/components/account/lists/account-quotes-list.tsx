"use client";

import Link from "next/link";
import { QuoteStatusBadge } from "@/components/quotes/quote-status-badge";
import {
  PortalListSuspense,
  PortalListView,
  type PortalListColumn,
  type PortalStatusOption,
} from "@/components/portal/list";
import {
  QUOTE_STATUSES,
  formatCadFromCents,
  resolveQuoteDisplayRef,
  type QuoteStatus,
} from "@/data/quotes";
import { formatDisplayDate, parseISODate } from "@/lib/date";

export type AccountQuoteListRow = {
  id: string;
  status: QuoteStatus;
  opportunity_ref: string;
  revision_number: number;
  total_cents: number;
  event_date: string | null;
  updated_at: string;
};

function formatEventDate(value: string | null): string {
  if (!value) return "—";
  const parsed = parseISODate(value.slice(0, 10));
  if (parsed) return formatDisplayDate(parsed);
  return value;
}

const STATUS_OPTIONS: PortalStatusOption[] = QUOTE_STATUSES.filter(
  (status) => status !== "draft"
).map((status) => ({
  value: status,
  label: status.replaceAll("_", " "),
}));

const columns: PortalListColumn<AccountQuoteListRow>[] = [
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
        </p>
      </div>
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
    id: "total",
    label: "Total",
    sortable: true,
    sortType: "number",
    sortValue: (row) => row.total_cents,
    align: "right",
    render: (row) => (
      <span className="font-medium text-foreground">
        {formatCadFromCents(row.total_cents)}
      </span>
    ),
  },
  {
    id: "event",
    label: "Event date",
    sortable: true,
    sortType: "date",
    sortValue: (row) => row.event_date,
    render: (row) => (
      <span className="text-muted-foreground">
        {formatEventDate(row.event_date)}
      </span>
    ),
  },
  {
    id: "updated",
    label: "Updated",
    sortable: true,
    sortType: "date",
    sortValue: (row) => row.updated_at,
    render: (row) => (
      <span className="text-muted-foreground">
        {new Date(row.updated_at).toLocaleDateString("en-CA")}
      </span>
    ),
  },
];

function List({ rows }: { rows: AccountQuoteListRow[] }) {
  return (
    <PortalListView
      rows={rows}
      columns={columns}
      rowKey={(row) => row.id}
      getSearchText={(row) =>
        [resolveQuoteDisplayRef(row), row.opportunity_ref, row.id]
          .filter(Boolean)
          .join(" ")
      }
      getStatus={(row) => row.status}
      statusOptions={STATUS_OPTIONS}
      searchLabel="Search reference"
      searchPlaceholder="Quote TCG-…"
      empty="No proposals yet. Once we send a quote, it will appear here."
    />
  );
}

export function AccountQuotesList({ rows }: { rows: AccountQuoteListRow[] }) {
  return (
    <PortalListSuspense>
      <List rows={rows} />
    </PortalListSuspense>
  );
}
