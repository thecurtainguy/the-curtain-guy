import type { ReactNode } from "react";

export type PortalSortType = "text" | "number" | "date";
export type PortalSortDirection = "asc" | "desc";

export type PortalSortState = {
  columnId: string;
  direction: PortalSortDirection;
};

export type PortalListColumn<T> = {
  id: string;
  label: string;
  sortable?: boolean;
  /** Drives A↓/Z↓ / 0↓/9↓ / date arrows in the header. Default `text`. */
  sortType?: PortalSortType;
  /** Value used for sorting. Falls back to stringifying cell content when omitted. */
  sortValue?: (row: T) => string | number | null | undefined;
  align?: "left" | "right" | "center";
  minWidth?: string;
  className?: string;
  render: (row: T) => ReactNode;
};

export type PortalStatusOption = {
  value: string;
  label: string;
};

export type PortalListState = {
  q: string;
  status: string;
  sort: PortalSortState | null;
  page: number;
  pageSize: number;
  extras: Record<string, string>;
};

export const PORTAL_PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
export const PORTAL_DEFAULT_PAGE_SIZE = 10;
