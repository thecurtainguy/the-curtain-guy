"use client";

import Link from "next/link";
import { StudioDesignCard } from "@/components/studio/studio-design-card";
import {
  PortalListSuspense,
  PortalListView,
  type PortalListColumn,
  type PortalStatusOption,
} from "@/components/portal/list";
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

export function AdminStudioList({
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
        hrefPrefix="/admin/studio"
        loadError={loadError}
        emptyActionHref="/studio/new"
        emptyActionLabel="Create room design"
      />
    </PortalListSuspense>
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
