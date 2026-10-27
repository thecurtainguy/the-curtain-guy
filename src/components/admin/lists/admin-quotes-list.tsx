"use client";

import Link from "next/link";
import { QuoteStatusBadge } from "@/components/quotes/quote-status-badge";
import { ViewCountCell } from "@/components/admin/lists/view-count-cell";
import {
  PortalListSuspense,
  PortalListView,
  type PortalListColumn,
  type PortalStatusOption,
} from "@/components/portal/list";
import {
  QUOTE_STATUSES,
  formatMoneyFromCents,
  formatQuoteRevisionLabel,
  resolveQuoteDisplayRef,
  type QuoteStatus,
} from "@/data/quotes";

export type AdminQuoteListRow = {
  id: string;
  status: QuoteStatus;
  quote_display_ref: string;
  opportunity_ref: string;
  customer_name: string | null;
  customer_email: string;
  total_cents: number;
  currency: string;
  event_date: string | null;
  revision_number: number;
  sent_at: string | null;
  viewed_at: string | null;
  view_count: number;
  last_viewed_at: string | null;
  accepted_at: string | null;
  created_at: string;
  linked_job_id: string | null;
};

function formatStamp(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

const STATUS_OPTIONS: PortalStatusOption[] = QUOTE_STATUSES.map((status) => ({
  value: status,
  label: status.replaceAll("_", " "),
}));

const columns: PortalListColumn<AdminQuoteListRow>[] = [
  {
    id: "quote",
    label: "Quote",
    sortable: true,
    sortValue: (row) => resolveQuoteDisplayRef(row),
    render: (row) => (
      <Link
        href={`/admin/quotes/${row.id}`}
        className="font-medium text-primary hover:underline"
      >
        {resolveQuoteDisplayRef(row)}
      </Link>
    ),
  },
  {
    id: "opportunity",
    label: "Opportunity",
    sortable: true,
    sortValue: (row) => row.opportunity_ref,
    render: (row) => (
      <span className="text-muted-foreground">{row.opportunity_ref}</span>
    ),
  },
  {
    id: "customer",
    label: "Customer",
    sortable: true,
    sortValue: (row) => row.customer_name || row.customer_email,
    render: (row) => (
      <div>
        <div className="font-medium">{row.customer_name || "—"}</div>
        <div className="text-xs text-muted-foreground">{row.customer_email}</div>
      </div>
    ),
  },
  {
    id: "status",
    label: "Status",
    sortable: true,
    sortValue: (row) => row.status,
    render: (row) => (
      <div>
        <QuoteStatusBadge status={row.status} />
        {row.status === "accepted" && row.linked_job_id ? (
          <Link
            href={`/admin/jobs/${row.linked_job_id}`}
            className="mt-1 block text-[10px] uppercase tracking-wide text-primary hover:underline"
          >
            Job linked
          </Link>
        ) : null}
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
      <span className="font-medium tabular-nums">
        {formatMoneyFromCents(row.total_cents, "en", row.currency)}
      </span>
    ),
  },
  {
    id: "event",
    label: "Event",
    sortable: true,
    sortType: "date",
    sortValue: (row) => row.event_date,
    render: (row) => (
      <span className="text-muted-foreground">{row.event_date || "—"}</span>
    ),
  },
  {
    id: "rev",
    label: "Rev",
    sortable: true,
    sortType: "number",
    sortValue: (row) => row.revision_number,
    render: (row) => (
      <span className="text-muted-foreground">
        {formatQuoteRevisionLabel(row.revision_number) ?? "—"}
      </span>
    ),
  },
  {
    id: "stamps",
    label: "Sent / viewed / accepted",
    sortable: true,
    sortType: "date",
    sortValue: (row) => row.sent_at || row.viewed_at || row.accepted_at,
    render: (row) => (
      <div className="text-xs text-muted-foreground">
        <div>S {formatStamp(row.sent_at)}</div>
        <div>V {formatStamp(row.viewed_at)}</div>
        <div>A {formatStamp(row.accepted_at)}</div>
      </div>
    ),
  },
  {
    id: "views",
    label: "Views",
    sortable: true,
    sortType: "number",
    sortValue: (row) => row.view_count,
    align: "right",
    render: (row) => <ViewCountCell count={row.view_count} lastViewedAt={row.last_viewed_at} />,
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

function List({ rows }: { rows: AdminQuoteListRow[] }) {
  return (
    <PortalListView
      rows={rows}
      columns={columns}
      rowKey={(row) => row.id}
      getSearchText={(row) =>
        [
          row.quote_display_ref,
          resolveQuoteDisplayRef(row),
          row.opportunity_ref,
          row.customer_name,
          row.customer_email,
          row.id,
        ]
          .filter(Boolean)
          .join(" ")
      }
      getStatus={(row) => row.status}
      statusOptions={STATUS_OPTIONS}
      searchLabel="Search ref, customer, email"
      searchPlaceholder="Quote TCG-… or customer"
      empty="No quotes match these filters."
    />
  );
}

export function AdminQuotesList({ rows }: { rows: AdminQuoteListRow[] }) {
  return (
    <PortalListSuspense>
      <List rows={rows} />
    </PortalListSuspense>
  );
}
