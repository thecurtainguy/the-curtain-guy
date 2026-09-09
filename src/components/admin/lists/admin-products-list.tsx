"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, ExternalLink } from "lucide-react";
import {
  ProductAvailabilityBadge,
  ProductKindBadge,
} from "@/components/products/product-status-badges";
import {
  PortalListSuspense,
  PortalListView,
  type PortalListColumn,
  type PortalStatusOption,
} from "@/components/portal/list";
import {
  PRODUCT_AVAILABILITY_LABELS,
  PRODUCT_AVAILABILITY_STATUSES,
  PRODUCT_KIND_LABELS,
  formatProductPriceCents,
  getProductCategoryLabel,
  type ProductAvailabilityStatus,
  type ProductKind,
} from "@/data/products";
import { cn } from "@/lib/utils";

export type AdminProductListRow = {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  kind: ProductKind;
  category: string;
  default_unit_price_cents: number;
  quantity_on_hand: number;
  availability_status: ProductAvailabilityStatus;
  is_active: boolean;
  is_public: boolean;
  ready_for_public: boolean;
  missing_setup: string[];
  image_url: string | null;
  image_alt: string | null;
  unit_label: string;
  created_at: string;
};

const KIND_OPTIONS: PortalStatusOption[] = [
  { value: "product", label: PRODUCT_KIND_LABELS.product },
  { value: "service", label: PRODUCT_KIND_LABELS.service },
];

const RENTALS_FILTERS = [
  { value: "", label: "All" },
  { value: "public", label: "Public" },
  { value: "incomplete_public", label: "Incomplete public" },
  { value: "ready", label: "Ready for Rentals" },
] as const;

const columns: PortalListColumn<AdminProductListRow>[] = [
  {
    id: "item",
    label: "Item",
    sortable: true,
    sortValue: (row) => row.name,
    render: (row) => (
      <div className="flex min-w-0 items-center gap-3">
        <div className="relative size-12 shrink-0 overflow-hidden rounded-xl border border-border/40 bg-[#f5efe0] dark:bg-primary/10">
          {row.image_url ? (
            <Image
              src={row.image_url}
              alt={row.image_alt || row.name}
              fill
              className="object-cover"
              sizes="48px"
              unoptimized
            />
          ) : null}
        </div>
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Link
              href={`/admin/products/${row.id}`}
              className="font-medium text-primary hover:underline"
            >
              {row.name}
            </Link>
            <a
              href={`/rentals/${row.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-full border border-border/50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
              title="Preview on site"
            >
              <ExternalLink className="size-3" aria-hidden />
              Preview
            </a>
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {row.sku ? `SKU ${row.sku}` : "No SKU"}
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "kind",
    label: "Kind",
    sortable: true,
    sortValue: (row) => row.kind,
    render: (row) => <ProductKindBadge kind={row.kind} />,
  },
  {
    id: "category",
    label: "Category",
    sortable: true,
    sortValue: (row) => row.category,
    render: (row) => (
      <span className="text-muted-foreground">
        {getProductCategoryLabel(row.category)}
      </span>
    ),
  },
  {
    id: "price",
    label: "Price",
    sortable: true,
    sortType: "number",
    sortValue: (row) => row.default_unit_price_cents,
    render: (row) => (
      <span className="tabular-nums text-foreground">
        {formatProductPriceCents(row.default_unit_price_cents)}
        <span className="text-xs text-muted-foreground">
          {" "}
          / {row.unit_label}
        </span>
      </span>
    ),
  },
  {
    id: "qty",
    label: "Qty",
    sortable: true,
    sortType: "number",
    sortValue: (row) => (row.kind === "service" ? -1 : row.quantity_on_hand),
    render: (row) => (
      <span className="tabular-nums text-muted-foreground">
        {row.kind === "service" ? "—" : row.quantity_on_hand}
      </span>
    ),
  },
  {
    id: "availability",
    label: "Availability",
    sortable: true,
    sortValue: (row) => row.availability_status,
    render: (row) =>
      row.kind === "service" ? (
        <span className="text-xs text-muted-foreground">Not tracked</span>
      ) : (
        <ProductAvailabilityBadge status={row.availability_status} />
      ),
  },
  {
    id: "public",
    label: "Public",
    sortable: true,
    sortValue: (row) => (row.is_public ? 1 : 0),
    render: (row) => (
      <span
        className={
          row.is_public
            ? "text-xs font-medium text-primary"
            : "text-xs text-muted-foreground"
        }
      >
        {row.is_public ? "Yes" : "No"}
      </span>
    ),
  },
  {
    id: "catalog_ready",
    label: "Catalog ready",
    sortable: true,
    sortValue: (row) => (row.ready_for_public ? 1 : 0),
    render: (row) => (
      <span
        className={
          row.ready_for_public
            ? "text-xs font-medium text-emerald-700 dark:text-emerald-300"
            : "text-xs text-muted-foreground"
        }
      >
        {row.ready_for_public ? "Ready" : "Not ready"}
      </span>
    ),
  },
  {
    id: "missing_setup",
    label: "Missing setup",
    sortable: true,
    sortValue: (row) => row.missing_setup.length,
    render: (row) =>
      row.missing_setup.length === 0 ? (
        <span className="text-xs text-muted-foreground">—</span>
      ) : (
        <span
          className="line-clamp-2 text-xs text-amber-800 dark:text-amber-200"
          title={row.missing_setup.join(" · ")}
        >
          {row.missing_setup.slice(0, 2).join(" · ")}
          {row.missing_setup.length > 2
            ? ` +${row.missing_setup.length - 2}`
            : ""}
        </span>
      ),
  },
  {
    id: "active",
    label: "Active",
    sortable: true,
    sortValue: (row) => (row.is_active ? 1 : 0),
    render: (row) => (
      <span
        className={
          row.is_active
            ? "text-xs font-medium text-emerald-700 dark:text-emerald-300"
            : "text-xs text-muted-foreground"
        }
      >
        {row.is_active ? "Yes" : "No"}
      </span>
    ),
  },
];

const filterSelectClass =
  "h-9 w-full min-w-[9.5rem] appearance-none rounded-lg border border-border bg-background py-0 pl-3 pr-8 text-sm text-foreground outline-none transition-colors hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40";

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="relative inline-flex min-w-[9.5rem] items-center">
      <select
        aria-label={label}
        className={filterSelectClass}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 size-3.5 text-muted-foreground" />
    </label>
  );
}

function List({ rows }: { rows: AdminProductListRow[] }) {
  return (
    <PortalListView
      rows={rows}
      columns={columns}
      rowKey={(row) => row.id}
      getSearchText={(row) =>
        [
          row.name,
          row.sku,
          row.category,
          row.kind,
          row.unit_label,
          ...row.missing_setup,
        ]
          .filter(Boolean)
          .join(" ")
      }
      getStatus={(row) => row.kind}
      statusOptions={KIND_OPTIONS}
      statusLabel="Kind"
      allStatusLabel="All kinds"
      searchLabel="Search name or SKU"
      searchPlaceholder="Ivory drape, SKU…"
      extraKeys={["availability", "active", "rentals"]}
      filterRow={(row, state) => {
        const availability = state.extras.availability;
        if (availability && row.availability_status !== availability) {
          return false;
        }
        const active = state.extras.active;
        if (active === "active" && !row.is_active) return false;
        if (active === "inactive" && row.is_active) return false;

        const rentals = state.extras.rentals;
        if (rentals === "public" && !row.is_public) return false;
        if (
          rentals === "incomplete_public" &&
          !(row.is_public && !row.ready_for_public)
        ) {
          return false;
        }
        if (rentals === "ready" && !row.ready_for_public) return false;
        return true;
      }}
      renderFiltersExtras={({ state, setExtra }) => (
        <>
          <div className="flex flex-wrap items-center gap-1.5">
            {RENTALS_FILTERS.map((filter) => {
              const selected = (state.extras.rentals ?? "") === filter.value;
              return (
                <button
                  key={filter.value || "all"}
                  type="button"
                  onClick={() => setExtra("rentals", filter.value || null)}
                  className={cn(
                    "inline-flex h-8 items-center rounded-lg border px-2.5 text-xs font-medium transition-colors",
                    selected
                      ? "border-primary/50 bg-primary/15 text-primary"
                      : "border-border/50 bg-background/50 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                  )}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
          <FilterSelect
            label="Availability"
            value={state.extras.availability ?? ""}
            onChange={(value) => setExtra("availability", value || null)}
          >
            <option value="">Availability: All</option>
            {PRODUCT_AVAILABILITY_STATUSES.map((status) => (
              <option key={status} value={status}>
                Availability: {PRODUCT_AVAILABILITY_LABELS[status]}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect
            label="Active"
            value={state.extras.active ?? ""}
            onChange={(value) => setExtra("active", value || null)}
          >
            <option value="">Active: All</option>
            <option value="active">Active: Yes</option>
            <option value="inactive">Active: No</option>
          </FilterSelect>
        </>
      )}
      toolbarActions={
        <Link
          href="/admin/products/new"
          className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Add item
        </Link>
      }
      empty={
        rows.length === 0 ? (
          <>
            No inventory items yet.{" "}
            <Link href="/admin/products/new" className="text-primary hover:underline">
              Add item
            </Link>
          </>
        ) : (
          "No inventory items match these filters."
        )
      }
      itemLabel="Items"
    />
  );
}

export function AdminProductsList({ rows }: { rows: AdminProductListRow[] }) {
  return (
    <PortalListSuspense>
      <List rows={rows} />
    </PortalListSuspense>
  );
}
