"use client";

import Link from "next/link";
import {
  PortalListFilterToggle,
  PortalListSuspense,
  PortalListView,
  type PortalListColumn,
  type PortalStatusOption,
} from "@/components/portal/list";
import { Button } from "@/components/ui/button";
import {
  CUSTOMER_KINDS,
  CUSTOMER_KIND_LABELS,
  formatCustomerNumber,
  type CustomerKind,
  type CustomerStats,
} from "@/data/customers";
import type { CustomerLanguage } from "@/data/customer-language";
import { formatCadFromCents } from "@/data/quotes";
import { cn } from "@/lib/utils";

export type AdminCustomerListRow = {
  id: string;
  customer_number: number;
  kind: CustomerKind;
  status: "active" | "archived";
  display_name: string;
  company_name: string | null;
  primary_email: string;
  phone: string | null;
  preferred_language: CustomerLanguage;
  has_portal: boolean;
  tags: string[];
  contact_count: number;
  stats: CustomerStats;
};

const KIND_OPTIONS: PortalStatusOption[] = CUSTOMER_KINDS.map((kind) => ({
  value: kind,
  label: CUSTOMER_KIND_LABELS[kind],
}));

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
}

function formatShortDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
}

const columns: PortalListColumn<AdminCustomerListRow>[] = [
  {
    id: "customer",
    label: "Customer",
    sortable: true,
    sortValue: (row) => row.display_name.toLowerCase(),
    minWidth: "16rem",
    render: (row) => (
      <Link href={`/admin/customers/${row.id}`} className="group flex items-center gap-3">
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-xl text-xs font-semibold",
            row.stats.isClient ? "bg-primary/15 text-primary ring-1 ring-primary/25" : "bg-muted/40 text-muted-foreground"
          )}
        >
          {initials(row.display_name)}
        </span>
        <span className="min-w-0">
          <span className="block truncate font-medium group-hover:text-primary">
            {row.display_name}
            {row.status === "archived" ? (
              <span className="ml-2 rounded-full border border-border/50 px-1.5 py-px text-[10px] text-muted-foreground">
                Archived
              </span>
            ) : null}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {formatCustomerNumber(row.customer_number)}
            {row.company_name ? ` · ${row.company_name}` : ""}
            {` · ${row.primary_email}`}
          </span>
        </span>
      </Link>
    ),
  },
  {
    id: "kind",
    label: "Type",
    sortable: true,
    sortValue: (row) => CUSTOMER_KIND_LABELS[row.kind],
    render: (row) => (
      <div className="space-y-1 text-xs">
        <div>{CUSTOMER_KIND_LABELS[row.kind]}</div>
        <div className="flex flex-wrap gap-1">
          <span className="rounded-full border border-border/50 px-1.5 py-px uppercase text-muted-foreground">
            {row.preferred_language}
          </span>
          {row.has_portal ? (
            <span className="rounded-full border border-primary/30 bg-primary/10 px-1.5 py-px text-primary">Portal</span>
          ) : null}
        </div>
      </div>
    ),
  },
  {
    id: "activity",
    label: "Activity",
    sortable: true,
    sortType: "number",
    sortValue: (row) => row.stats.jobs * 100 + row.stats.quotes * 10 + row.stats.estimates,
    render: (row) => (
      <div className="text-xs text-muted-foreground">
        <div>
          {row.stats.jobs} job{row.stats.jobs === 1 ? "" : "s"} · {row.stats.invoices} invoice
          {row.stats.invoices === 1 ? "" : "s"}
        </div>
        <div>
          {row.stats.quotes} quote{row.stats.quotes === 1 ? "" : "s"} · {row.stats.estimates} request
          {row.stats.estimates === 1 ? "" : "s"}
        </div>
      </div>
    ),
  },
  {
    id: "next",
    label: "Next event",
    sortable: true,
    sortType: "date",
    sortValue: (row) => row.stats.nextEventDate ?? row.stats.lastEventDate,
    render: (row) =>
      row.stats.nextEventDate ? (
        <span className="text-xs">{formatShortDate(row.stats.nextEventDate)}</span>
      ) : (
        <span className="text-xs text-muted-foreground">
          {row.stats.lastEventDate ? `Last ${formatShortDate(row.stats.lastEventDate)}` : "—"}
        </span>
      ),
  },
  {
    id: "lifetime",
    label: "Lifetime paid",
    sortable: true,
    sortType: "number",
    sortValue: (row) => row.stats.lifetimePaidCents,
    render: (row) => (
      <span className="tabular-nums text-muted-foreground">{formatCadFromCents(row.stats.lifetimePaidCents)}</span>
    ),
  },
  {
    id: "owing",
    label: "Owing",
    sortable: true,
    sortType: "number",
    sortValue: (row) => row.stats.outstandingCents,
    render: (row) =>
      row.stats.outstandingCents > 0 ? (
        <div className="text-right tabular-nums sm:text-left">
          <div className="font-medium">{formatCadFromCents(row.stats.outstandingCents)}</div>
          {row.stats.overdueCents > 0 ? (
            <div className="text-xs text-destructive">{formatCadFromCents(row.stats.overdueCents)} overdue</div>
          ) : null}
        </div>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    id: "actions",
    label: "",
    render: (row) => (
      <Button asChild size="sm" variant="outline">
        <Link href={`/admin/customers/${row.id}`}>Open</Link>
      </Button>
    ),
  },
];

function List({ rows }: { rows: AdminCustomerListRow[] }) {
  return (
    <PortalListView
      rows={rows}
      columns={columns}
      rowKey={(row) => row.id}
      getSearchText={(row) =>
        [
          formatCustomerNumber(row.customer_number),
          row.display_name,
          row.company_name,
          row.primary_email,
          row.phone,
          ...row.tags,
        ]
          .filter(Boolean)
          .join(" ")
      }
      getStatus={(row) => row.kind}
      statusOptions={KIND_OPTIONS}
      statusLabel="Type"
      allStatusLabel="All types"
      searchLabel="Search customers"
      searchPlaceholder="Name, company, email, phone or C-1001"
      itemLabel="Customers"
      resultNoun="customers"
      extraKeys={["owing", "overdue", "clients", "archived"]}
      filterRow={(row, state) => {
        if (state.extras.archived !== "1" && row.status === "archived") return false;
        if (state.extras.owing === "1" && row.stats.outstandingCents <= 0) return false;
        if (state.extras.overdue === "1" && row.stats.overdueCents <= 0) return false;
        if (state.extras.clients === "1" && !row.stats.isClient) return false;
        return true;
      }}
      renderFiltersExtras={({ state, setExtra }) => (
        <>
          <PortalListFilterToggle
            label="Money owing"
            checked={state.extras.owing === "1"}
            onCheckedChange={(checked) => setExtra("owing", checked ? "1" : null)}
          />
          <PortalListFilterToggle
            label="Overdue"
            checked={state.extras.overdue === "1"}
            onCheckedChange={(checked) => setExtra("overdue", checked ? "1" : null)}
          />
          <PortalListFilterToggle
            label="Booked clients"
            checked={state.extras.clients === "1"}
            onCheckedChange={(checked) => setExtra("clients", checked ? "1" : null)}
          />
          <PortalListFilterToggle
            label="Show archived"
            checked={state.extras.archived === "1"}
            onCheckedChange={(checked) => setExtra("archived", checked ? "1" : null)}
          />
        </>
      )}
      empty="No customers match these filters."
    />
  );
}

export function AdminCustomersList({ rows }: { rows: AdminCustomerListRow[] }) {
  return (
    <PortalListSuspense>
      <List rows={rows} />
    </PortalListSuspense>
  );
}
