"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  comparePortalSortValues,
  cyclePortalSort,
  paginateRows,
  parsePortalListState,
  portalListStateToSearchParams,
} from "./list-utils";
import type {
  PortalListColumn,
  PortalListState,
  PortalStatusOption,
} from "./types";

type UsePortalListStateOptions = {
  /** URL keys synced into `state.extras` (e.g. upcoming, estimateId). */
  extraKeys?: string[];
  /** Extra keys that survive Clear filters (relation IDs, etc.). */
  preserveKeys?: string[];
  debounceMs?: number;
};

export function usePortalListState(options?: UsePortalListStateOptions) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const extraKey = options?.extraKeys?.join(",") ?? "";
  const preserveKey = options?.preserveKeys?.join(",") ?? "";
  const debounceMs = options?.debounceMs ?? 250;

  const state = useMemo(
    () =>
      parsePortalListState(searchParams, {
        extraKeys: extraKey ? extraKey.split(",") : undefined,
      }),
    [searchParams, extraKey]
  );

  const [searchDraft, setSearchDraft] = useState(state.q);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextSync = useRef(false);

  useEffect(() => {
    if (skipNextSync.current) {
      skipNextSync.current = false;
      return;
    }
    setSearchDraft(state.q);
  }, [state.q]);

  const replaceState = useCallback(
    (next: PortalListState) => {
      const params = portalListStateToSearchParams(next, {
        extraKeys: extraKey ? extraKey.split(",") : undefined,
      });
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [extraKey, pathname, router]
  );

  const patchState = useCallback(
    (
      patch: Partial<PortalListState> & {
        extrasPatch?: Record<string, string | null>;
      }
    ) => {
      const { extrasPatch, ...rest } = patch;
      const extras = { ...state.extras };
      if (extrasPatch) {
        for (const [key, value] of Object.entries(extrasPatch)) {
          if (value == null || value === "") delete extras[key];
          else extras[key] = value;
        }
      }
      const resetsPage =
        rest.q !== undefined ||
        rest.status !== undefined ||
        rest.sort !== undefined ||
        rest.pageSize !== undefined ||
        Boolean(extrasPatch);
      replaceState({
        ...state,
        ...rest,
        extras,
        page: rest.page ?? (resetsPage ? 1 : state.page),
      });
    },
    [replaceState, state]
  );

  const setSearch = useCallback(
    (value: string) => {
      setSearchDraft(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        skipNextSync.current = true;
        patchState({ q: value.trim(), page: 1 });
      }, debounceMs);
    },
    [debounceMs, patchState]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const setStatus = useCallback(
    (status: string) => patchState({ status, page: 1 }),
    [patchState]
  );

  const setSortColumn = useCallback(
    (columnId: string) => {
      patchState({ sort: cyclePortalSort(state.sort, columnId), page: 1 });
    },
    [patchState, state.sort]
  );

  const setPage = useCallback(
    (page: number) => patchState({ page }),
    [patchState]
  );

  const setPageSize = useCallback(
    (pageSize: number) => patchState({ pageSize, page: 1 }),
    [patchState]
  );

  const setExtra = useCallback(
    (key: string, value: string | null) => {
      patchState({ extrasPatch: { [key]: value }, page: 1 });
    },
    [patchState]
  );

  const clearFilters = useCallback(() => {
    setSearchDraft("");
    const preserved = Object.fromEntries(
      (preserveKey ? preserveKey.split(",") : [])
        .filter((key) => state.extras[key])
        .map((key) => [key, state.extras[key]])
    );
    replaceState({
      q: "",
      status: "",
      sort: state.sort,
      page: 1,
      pageSize: state.pageSize,
      extras: preserved,
    });
  }, [preserveKey, replaceState, state.extras, state.pageSize, state.sort]);

  const preservedSet = useMemo(
    () => new Set(preserveKey ? preserveKey.split(",") : []),
    [preserveKey]
  );

  const hasActiveFilters =
    Boolean(state.q || state.status) ||
    Object.entries(state.extras).some(
      ([key, value]) => Boolean(value) && !preservedSet.has(key)
    );

  return {
    state,
    searchDraft,
    setSearch,
    setStatus,
    setSortColumn,
    setPage,
    setPageSize,
    setExtra,
    clearFilters,
    hasActiveFilters,
  };
}

export function usePortalListRows<T>({
  rows,
  columns,
  state,
  getSearchText,
  getStatus,
  filterRow,
}: {
  rows: T[];
  columns: PortalListColumn<T>[];
  state: PortalListState;
  getSearchText?: (row: T) => string;
  getStatus?: (row: T) => string;
  filterRow?: (row: T, state: PortalListState) => boolean;
}) {
  return useMemo(() => {
    const needle = state.q.trim().toLowerCase();
    let next = rows;

    if (needle && getSearchText) {
      next = next.filter((row) =>
        getSearchText(row).toLowerCase().includes(needle)
      );
    }

    if (state.status && getStatus) {
      next = next.filter((row) => getStatus(row) === state.status);
    }

    if (filterRow) {
      next = next.filter((row) => filterRow(row, state));
    }

    if (state.sort) {
      const column = columns.find((col) => col.id === state.sort!.columnId);
      if (column?.sortValue) {
        const sortType = column.sortType ?? "text";
        const direction = state.sort.direction;
        next = [...next].sort((a, b) =>
          comparePortalSortValues(
            column.sortValue!(a),
            column.sortValue!(b),
            direction,
            sortType
          )
        );
      }
    }

    const paged = paginateRows(next, state.page, state.pageSize);
    return {
      filteredRows: next,
      ...paged,
      safePage: Math.min(
        Math.max(1, state.page),
        Math.max(1, Math.ceil(next.length / state.pageSize) || 1)
      ),
    };
  }, [columns, filterRow, getSearchText, getStatus, rows, state]);
}

export type { PortalStatusOption };
