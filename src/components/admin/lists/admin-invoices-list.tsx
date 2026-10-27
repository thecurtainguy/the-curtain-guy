"use client";

import Link from "next/link";
import { InvoiceStatusBadge } from "@/components/invoices/invoice-status-badge";
import {
  PortalListSuspense,
  PortalListView,
  PortalListFilterToggle,
  type PortalListColumn,
  type PortalStatusOption,
} from "@/components/portal/list";
import {
  INVOICE_STATUSES,
  INVOICE_STATUS_LABELS,
  invoiceDisplayStatus,
  type InvoiceRow,
} from "@/data/invoices";
import { formatMoneyFromCents } from "@/data/quotes";
import { Button } from "@/components/ui/button";

export type AdminInvoiceListRow = Pick<
  InvoiceRow,
  | "id"
  | "invoice_number"
  | "opportunity_ref"
  | "status"
  | "customer_name"
  | "customer_email"
  | "issue_date"
  | "due_date"
  | "event_date"
  | "total_cents"
  | "currency"
  | "amount_paid_cents"
  | "balance_due_cents"
>;

const STATUS_OPTIONS: PortalStatusOption[] = INVOICE_STATUSES.map((status) => ({
  value: status,
  label: INVOICE_STATUS_LABELS.en[status],
}));

const columns: PortalListColumn<AdminInvoiceListRow>[] = [
  {
    id: "invoice",
    label: "Invoice",
    sortable: true,
    sortValue: (row) => row.invoice_number,
    render: (row) => (
      <Link href={`/admin/invoices/${row.id}`} className="font-medium text-primary hover:underline">
        {row.invoice_number}
      </Link>
    ),
  },
  {
    id: "customer",
    label: "Client",
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
    id: "status",
    label: "Status",
    sortable: true,
    sortValue: (row) => invoiceDisplayStatus(row),
    render: (row) => <InvoiceStatusBadge invoice={row} />,
  },
  {
    id: "dates",
    label: "Issued / due",
    sortable: true,
    sortType: "date",
    sortValue: (row) => row.due_date,
    render: (row) => (
      <div className="text-xs text-muted-foreground">
        <div>{row.issue_date}</div>
        <div>{row.due_date ? `due ${row.due_date}` : "on receipt"}</div>
      </div>
    ),
  },
  {
    id: "total",
    label: "Total",
    sortable: true,
    sortType: "number",
    sortValue: (row) => row.total_cents,
    render: (row) => <span className="tabular-nums">{formatMoneyFromCents(row.total_cents, "en", row.currency)}</span>,
  },
  {
    id: "paid",
    label: "Paid",
    sortable: true,
    sortType: "number",
    sortValue: (row) => row.amount_paid_cents,
    render: (row) => (
      <span className="tabular-nums text-muted-foreground">{formatMoneyFromCents(row.amount_paid_cents, "en", row.currency)}</span>
    ),
  },
  {
    id: "balance",
    label: "Balance",
    sortable: true,
    sortType: "number",
    sortValue: (row) => row.balance_due_cents,
    render: (row) => (
      <span className="font-medium tabular-nums">
        {row.status === "void" ? "—" : formatMoneyFromCents(row.balance_due_cents, "en", row.currency)}
      </span>
    ),
  },
  {
    id: "actions",
    label: "",
    render: (row) => (
      <Button asChild size="sm" variant="outline">
        <Link href={`/admin/invoices/${row.id}`}>Open</Link>
      </Button>
    ),
  },
];

function List({ rows }: { rows: AdminInvoiceListRow[] }) {
  return (
    <PortalListView
      rows={rows}
      columns={columns}
      rowKey={(row) => row.id}
      getSearchText={(row) =>
        [row.invoice_number, row.opportunity_ref, row.customer_name, row.customer_email]
          .filter(Boolean)
          .join(" ")
      }
      getStatus={(row) => row.status}
      statusOptions={STATUS_OPTIONS}
      searchLabel="Search invoice, client"
      searchPlaceholder="INV-10030 or client"
      extraKeys={["owing"]}
      filterRow={(row, state) => {
        if (state.extras.owing === "1") {
          return row.status !== "void" && row.status !== "draft" && row.balance_due_cents > 0;
        }
        return true;
      }}
      renderFiltersExtras={({ state, setExtra }) => (
        <PortalListFilterToggle
          label="Money owing"
          checked={state.extras.owing === "1"}
          onCheckedChange={(checked) => setExtra("owing", checked ? "1" : null)}
        />
      )}
      empty="No invoices yet. Create one from a job, a customer profile, or with New invoice."
    />
  );
}

export function AdminInvoicesList({ rows }: { rows: AdminInvoiceListRow[] }) {
  return (
    <PortalListSuspense>
      <List rows={rows} />
    </PortalListSuspense>
  );
}
