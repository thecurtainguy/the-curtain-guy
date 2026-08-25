"use client";

import { PortalDataTable } from "./portal-data-table";
import { PortalListActionBar } from "./portal-list-action-bar";
import { PortalPagination } from "./portal-pagination";
import {
  usePortalListRows,
  usePortalListState,
} from "./use-portal-list-state";
import type { PortalListColumn, PortalListState, PortalStatusOption } from "./types";
import { cn } from "@/lib/utils";

export function PortalListView<T>({
  rows,
  columns,
  rowKey,
  getSearchText,
  getStatus,
  statusOptions,
  searchLabel,
  searchPlaceholder,
  statusLabel,
  allStatusLabel,
  empty,
  itemLabel = "Rows",
  resultNoun = "results",
  preserveKeys,
  extraKeys,
  filterRow,
  renderFiltersExtras,
  toolbarActions,
  renderCards,
  className,
}: {
  rows: T[];
  columns: PortalListColumn<T>[];
  rowKey: (row: T) => string;
  getSearchText?: (row: T) => string;
  getStatus?: (row: T) => string;
  statusOptions?: PortalStatusOption[];
  searchLabel?: string;
  searchPlaceholder?: string;
  statusLabel?: string;
  allStatusLabel?: string;
  empty?: React.ReactNode;
  itemLabel?: string;
  resultNoun?: string;
  preserveKeys?: string[];
  extraKeys?: string[];
  filterRow?: (row: T, state: PortalListState) => boolean;
  renderFiltersExtras?: (args: {
    state: PortalListState;
    setExtra: (key: string, value: string | null) => void;
  }) => React.ReactNode;
  toolbarActions?: React.ReactNode;
  /** When set, renders a card/grid layout instead of the data table. */
  renderCards?: (pageRows: T[]) => React.ReactNode;
  className?: string;
}) {
  const list = usePortalListState({ preserveKeys, extraKeys });
  const {
    filteredRows,
    pageRows,
    rangeStart,
    rangeEnd,
    safePage,
  } = usePortalListRows({
    rows,
    columns,
    state: list.state,
    getSearchText,
    getStatus,
    filterRow,
  });

  const actionBar = (
    <PortalListActionBar
      search={list.searchDraft}
      onSearchChange={list.setSearch}
      searchLabel={searchLabel}
      searchPlaceholder={searchPlaceholder}
      status={list.state.status}
      statusOptions={statusOptions}
      onStatusChange={list.setStatus}
      statusLabel={statusLabel}
      allStatusLabel={allStatusLabel}
      extras={renderFiltersExtras?.({
        state: list.state,
        setExtra: list.setExtra,
      })}
      showClear={list.hasActiveFilters}
      onClear={list.clearFilters}
      rangeStart={rangeStart}
      rangeEnd={rangeEnd}
      totalRows={filteredRows.length}
      resultNoun={resultNoun}
      actions={toolbarActions}
    />
  );

  const pagination = (
    <PortalPagination
      currentPage={safePage}
      totalItems={filteredRows.length}
      itemsPerPage={list.state.pageSize}
      onPageChange={list.setPage}
      onPageSizeChange={list.setPageSize}
      itemLabel={itemLabel}
    />
  );

  return (
    <div className={cn("space-y-4", className)}>
      {renderCards ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {actionBar}
          <div className="p-4 sm:p-5">
            {pageRows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/30 px-6 py-14 text-center text-muted-foreground">
                {empty ?? "No results."}
              </div>
            ) : (
              renderCards(pageRows)
            )}
          </div>
          {pagination}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {actionBar}
          <PortalDataTable
            columns={columns}
            rows={pageRows}
            rowKey={rowKey}
            sort={list.state.sort}
            onSortChange={list.setSortColumn}
            empty={empty}
            className="rounded-none border-0 bg-transparent shadow-none"
            footer={pagination}
          />
        </div>
      )}
    </div>
  );
}
