"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function PortalListToolbar({
  search,
  onSearchChange,
  searchPlaceholder = "Search…",
  searchLabel = "Search",
  rangeStart,
  rangeEnd,
  totalRows,
  actions,
  className,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  searchLabel?: string;
  rangeStart: number;
  rangeEnd: number;
  totalRows: number;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className="min-w-0 flex-1 space-y-2">
        <label htmlFor="portal-list-q" className="text-xs text-muted-foreground">
          {searchLabel}
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="portal-list-q"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-9"
          />
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-3">
        <p className="text-xs text-muted-foreground tabular-nums">
          {totalRows === 0
            ? "No results"
            : `Showing ${rangeStart}–${rangeEnd} of ${totalRows}`}
        </p>
        {actions}
      </div>
    </div>
  );
}
