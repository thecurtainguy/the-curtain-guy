import {
  PORTAL_DEFAULT_PAGE_SIZE,
  PORTAL_PAGE_SIZE_OPTIONS,
  type PortalListState,
  type PortalSortDirection,
  type PortalSortState,
} from "./types";

const PAGE_SIZE_SET = new Set<number>(PORTAL_PAGE_SIZE_OPTIONS);

export function parsePortalListState(
  params: URLSearchParams | Record<string, string | string[] | undefined>,
  options?: { extraKeys?: string[] }
): PortalListState {
  const get = (key: string): string => {
    if (params instanceof URLSearchParams) {
      return params.get(key)?.trim() ?? "";
    }
    const raw = params[key];
    if (Array.isArray(raw)) return (raw[0] ?? "").trim();
    return (raw ?? "").trim();
  };

  const sortColumn = get("sort");
  const orderRaw = get("order").toLowerCase();
  const order: PortalSortDirection | null =
    orderRaw === "asc" || orderRaw === "desc" ? orderRaw : null;
  const sort: PortalSortState | null =
    sortColumn && order ? { columnId: sortColumn, direction: order } : null;

  const pageRaw = Number.parseInt(get("page") || "1", 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;

  const sizeRaw = Number.parseInt(get("size") || String(PORTAL_DEFAULT_PAGE_SIZE), 10);
  const pageSize = PAGE_SIZE_SET.has(sizeRaw) ? sizeRaw : PORTAL_DEFAULT_PAGE_SIZE;

  const extras: Record<string, string> = {};
  for (const key of options?.extraKeys ?? []) {
    const value = get(key);
    if (value) extras[key] = value;
  }

  return {
    q: get("q"),
    status: get("status"),
    sort,
    page,
    pageSize,
    extras,
  };
}

export function portalListStateToSearchParams(
  state: PortalListState,
  options?: { extraKeys?: string[] }
): URLSearchParams {
  const params = new URLSearchParams();
  if (state.q) params.set("q", state.q);
  if (state.status) params.set("status", state.status);
  if (state.sort) {
    params.set("sort", state.sort.columnId);
    params.set("order", state.sort.direction);
  }
  if (state.page > 1) params.set("page", String(state.page));
  if (state.pageSize !== PORTAL_DEFAULT_PAGE_SIZE) {
    params.set("size", String(state.pageSize));
  }
  for (const key of options?.extraKeys ?? []) {
    const value = state.extras[key];
    if (value) params.set(key, value);
  }
  return params;
}

export function cyclePortalSort(
  current: PortalSortState | null,
  columnId: string
): PortalSortState | null {
  if (!current || current.columnId !== columnId) {
    return { columnId, direction: "asc" };
  }
  if (current.direction === "asc") {
    return { columnId, direction: "desc" };
  }
  return null;
}

export function comparePortalSortValues(
  a: string | number | null | undefined,
  b: string | number | null | undefined,
  direction: PortalSortDirection,
  sortType: "text" | "number" | "date" = "text"
): number {
  const empty = direction === "asc" ? 1 : -1;
  if (a == null || a === "") return b == null || b === "" ? 0 : empty;
  if (b == null || b === "") return -empty;

  let result = 0;
  if (sortType === "number") {
    result = Number(a) - Number(b);
  } else if (sortType === "date") {
    const aTime = typeof a === "number" ? a : Date.parse(String(a));
    const bTime = typeof b === "number" ? b : Date.parse(String(b));
    result = (Number.isFinite(aTime) ? aTime : 0) - (Number.isFinite(bTime) ? bTime : 0);
  } else {
    result = String(a).localeCompare(String(b), undefined, {
      numeric: true,
      sensitivity: "base",
    });
  }

  return direction === "asc" ? result : -result;
}

export function paginateRows<T>(
  rows: T[],
  page: number,
  pageSize: number
): { pageRows: T[]; totalPages: number; rangeStart: number; rangeEnd: number } {
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize) || 1);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize);
  return {
    pageRows,
    totalPages,
    rangeStart: rows.length === 0 ? 0 : start + 1,
    rangeEnd: rows.length === 0 ? 0 : start + pageRows.length,
  };
}

export function buildPageList(
  currentPage: number,
  totalPages: number
): (number | "ellipsis")[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const entries: (number | "ellipsis")[] = [1];
  const leftBoundary = Math.max(2, currentPage - 1);
  const rightBoundary = Math.min(totalPages - 1, currentPage + 1);

  if (leftBoundary > 2) entries.push("ellipsis");
  for (let p = leftBoundary; p <= rightBoundary; p++) entries.push(p);
  if (rightBoundary < totalPages - 1) entries.push("ellipsis");
  entries.push(totalPages);
  return entries;
}
