"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, PanelsTopLeft } from "lucide-react";
import { StudioDesignCard } from "@/components/studio/studio-design-card";
import {
  PortalListSuspense,
  PortalListView,
  buildPageList,
  type PortalListColumn,
  type PortalStatusOption,
} from "@/components/portal/list";
import { StudioLeadCard } from "@/components/admin/studio-leads/studio-lead-card";
import { StudioLeadsFilters } from "@/components/admin/studio-leads/studio-leads-filters";
import {
  buildStudioLeadsHref,
  hasActiveStudioLeadFilters,
  type StudioLeadFilters,
  type StudioLeadListItem,
} from "@/components/admin/studio-leads/studio-leads-shared";
import {
  STUDIO_STATUSES,
  type StudioDesignRow,
  type StudioDesignStatus,
} from "@/data/studio";
import { Button } from "@/components/ui/button";

const STATUS_OPTIONS: PortalStatusOption[] = STUDIO_STATUSES.map((status) => ({
  value: status,
  label: status[0].toUpperCase() + status.slice(1),
}));

/** Columns unused for card layout but required for shared sort plumbing. */
const columns: PortalListColumn<StudioDesignRow>[] = [
  {
    id: "title",
    label: "Title",
    sortable: true,
    sortValue: (row) => row.title,
    render: () => null,
  },
  {
    id: "status",
    label: "Status",
    sortable: true,
    sortValue: (row) => row.status,
    render: () => null,
  },
  {
    id: "updated",
    label: "Updated",
    sortable: true,
    sortType: "date",
    sortValue: (row) => row.updated_at,
    render: () => null,
  },
];

function List({
  rows,
  hrefPrefix,
  loadError,
  emptyActionHref,
  emptyActionLabel,
}: {
  rows: StudioDesignRow[];
  hrefPrefix: string;
  loadError?: string | null;
  emptyActionHref: string;
  emptyActionLabel: string;
}) {
  if (loadError) {
    return (
      <div className="rounded-3xl border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">
        {loadError}
      </div>
    );
  }

  return (
    <PortalListView
      rows={rows}
      columns={columns}
      rowKey={(row) => row.id}
      getSearchText={(row) =>
        [row.title, row.opportunity_ref, row.id].filter(Boolean).join(" ")
      }
      getStatus={(row) => row.status}
      statusOptions={STATUS_OPTIONS}
      searchLabel="Search title, reference, customer, or venue"
      searchPlaceholder="Ballroom or TCG-10001"
      allStatusLabel="All designs"
      extraKeys={["estimateId", "quoteId", "jobId"]}
      preserveKeys={["estimateId", "quoteId", "jobId"]}
      filterRow={(row, state) => {
        if (
          state.extras.estimateId &&
          row.estimate_request_id !== state.extras.estimateId
        ) {
          return false;
        }
        if (state.extras.quoteId && row.quote_id !== state.extras.quoteId) {
          return false;
        }
        if (state.extras.jobId && row.job_id !== state.extras.jobId) {
          return false;
        }
        return true;
      }}
      itemLabel="Cards"
      empty={
        <div className="space-y-4">
          <p className="font-heading text-xl font-semibold text-foreground">
            No room designs yet.
          </p>
          <p className="text-sm text-muted-foreground">
            Start a design here or create one from an estimate or job.
          </p>
          <Button asChild>
            <Link href={emptyActionHref}>{emptyActionLabel}</Link>
          </Button>
        </div>
      }
      renderCards={(pageRows) => (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {pageRows.map((design) => (
            <StudioDesignCard
              key={design.id}
              design={design}
              href={`${hrefPrefix}/${design.id}`}
            />
          ))}
        </div>
      )}
    />
  );
}

function LeadsPagination({
  filters,
  page,
  pageCount,
}: {
  filters: StudioLeadFilters;
  page: number;
  pageCount: number;
}) {
  if (pageCount <= 1) return null;
  const pages = buildPageList(page, pageCount);
  const linkClass =
    "inline-flex h-9 min-w-9 items-center justify-center rounded-full border px-3 text-sm transition-colors";
  return (
    <nav aria-label="Studio leads pages" className="flex flex-wrap items-center justify-center gap-1.5">
      {page > 1 ? (
        <Link
          href={buildStudioLeadsHref(filters, { page: page - 1 })}
          scroll={false}
          className={`${linkClass} border-border/50 text-muted-foreground hover:border-primary/40 hover:text-foreground`}
        >
          <ChevronLeft className="size-4" aria-hidden />
          <span className="sr-only">Previous page</span>
        </Link>
      ) : null}
      {pages.map((entry, index) =>
        entry === "ellipsis" ? (
          <span key={`ellipsis-${index}`} className="px-1 text-muted-foreground">
            …
          </span>
        ) : (
          <Link
            key={entry}
            href={buildStudioLeadsHref(filters, { page: entry })}
            scroll={false}
            aria-current={entry === page ? "page" : undefined}
            className={
              entry === page
                ? `${linkClass} border-primary/55 bg-primary/15 font-semibold text-primary`
                : `${linkClass} border-border/50 text-muted-foreground hover:border-primary/40 hover:text-foreground`
            }
          >
            {entry}
          </Link>
        )
      )}
      {page < pageCount ? (
        <Link
          href={buildStudioLeadsHref(filters, { page: page + 1 })}
          scroll={false}
          className={`${linkClass} border-border/50 text-muted-foreground hover:border-primary/40 hover:text-foreground`}
        >
          <ChevronRight className="size-4" aria-hidden />
          <span className="sr-only">Next page</span>
        </Link>
      ) : null}
    </nav>
  );
}

/** Owner Studio leads pipeline: server-filtered, server-paginated lead cards. */
export function AdminStudioList({
  leads,
  total,
  page,
  pageCount,
  filters,
  truncated = false,
  loadError,
}: {
  leads: StudioLeadListItem[];
  total: number;
  page: number;
  pageCount: number;
  filters: StudioLeadFilters;
  truncated?: boolean;
  loadError?: string | null;
}) {
  return (
    <div className="space-y-5">
      <StudioLeadsFilters filters={filters} total={total} />
      {loadError ? (
        <div className="rounded-3xl border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">
          {loadError}
        </div>
      ) : leads.length === 0 ? (
        <div className="relative overflow-hidden rounded-3xl border border-border/40 bg-card/25 p-8 text-center">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(212,175,55,0.14),transparent_60%)]"
            aria-hidden
          />
          <span className="relative mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/25">
            <PanelsTopLeft className="size-5" aria-hidden />
          </span>
          <p className="relative mt-4 font-heading text-xl font-semibold text-foreground">
            {hasActiveStudioLeadFilters(filters) ? "No leads match these filters." : "No studio leads yet."}
          </p>
          <p className="relative mt-1 text-sm text-muted-foreground">
            Every room drawn in the Studio or event builder shows up here.
          </p>
          <div className="relative mt-5 flex justify-center gap-2">
            {hasActiveStudioLeadFilters(filters) ? (
              <Button asChild variant="outline">
                <Link href="/admin/studio">Clear filters</Link>
              </Button>
            ) : null}
            <Button asChild>
              <Link href="/studio/new">Create room design</Link>
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-4 2xl:grid-cols-2">
            {leads.map((lead) => (
              <StudioLeadCard key={lead.id} lead={lead} />
            ))}
          </div>
          {truncated ? (
            <p className="text-center text-xs text-muted-foreground">
              Stage results are limited to the most recent leads — narrow the date range for older ones.
            </p>
          ) : null}
          <LeadsPagination filters={filters} page={page} pageCount={pageCount} />
        </>
      )}
    </div>
  );
}

export function AccountStudioList({
  rows,
  loadError,
}: {
  rows: StudioDesignRow[];
  loadError?: string | null;
}) {
  return (
    <PortalListSuspense>
      <List
        rows={rows}
        hrefPrefix="/account/studio"
        loadError={loadError}
        emptyActionHref="/studio/new"
        emptyActionLabel="Draw your room"
      />
    </PortalListSuspense>
  );
}

export type { StudioDesignStatus };
