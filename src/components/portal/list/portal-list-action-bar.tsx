"use client";

import { ChevronDown, Filter, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { PortalStatusOption } from "./types";

export function PortalListActionBar({
  search,
  onSearchChange,
  searchPlaceholder = "Search…",
  searchLabel = "Search",
  status,
  statusOptions,
  onStatusChange,
  statusLabel = "Status",
  allStatusLabel = "All",
  extras,
  onClear,
  showClear = false,
  rangeStart,
  rangeEnd,
  totalRows,
  resultNoun = "results",
  actions,
  className,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  searchLabel?: string;
  status: string;
  statusOptions?: PortalStatusOption[];
  onStatusChange?: (value: string) => void;
  statusLabel?: string;
  allStatusLabel?: string;
  extras?: React.ReactNode;
  onClear?: () => void;
  showClear?: boolean;
  rangeStart: number;
  rangeEnd: number;
  totalRows: number;
  resultNoun?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  const activeStatus = statusOptions?.find((option) => option.value === status);
  const hasStatusFilters = Boolean(statusOptions?.length);
  const hasSearch = search.trim().length > 0;

  return (
    <div
      className={cn(
        "border-b border-border bg-gradient-to-br from-primary/[0.06] via-card to-card",
        className
      )}
    >
      <div className="flex flex-col gap-2.5 px-3 py-3 sm:px-4 lg:flex-row lg:items-center lg:gap-3">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="portal-list-q"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchLabel}
            className={cn(
              "h-9 border-border bg-background pl-9 shadow-none",
              hasSearch ? "pr-9" : "pr-3"
            )}
          />
          {hasSearch ? (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {hasStatusFilters ? (
            <label className="relative inline-flex items-center">
              <Filter className="pointer-events-none absolute left-2.5 size-3.5 text-muted-foreground" />
              <select
                id="portal-list-status"
                value={status}
                onChange={(e) => onStatusChange?.(e.target.value)}
                aria-label={statusLabel}
                className="h-9 appearance-none rounded-lg border border-border bg-background py-0 pl-8 pr-8 text-sm text-foreground outline-none transition-colors hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                <option value="">
                  {statusLabel}: {allStatusLabel}
                </option>
                {statusOptions!.map((option) => (
                  <option key={option.value} value={option.value}>
                    {statusLabel}: {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 size-3.5 text-muted-foreground" />
            </label>
          ) : null}

          {extras}

          {showClear && onClear ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="h-9 gap-1.5 px-2.5 text-muted-foreground"
            >
              <X className="size-3.5" />
              Clear
            </Button>
          ) : null}

          {actions}
        </div>

        <div className="flex shrink-0 items-center gap-2 lg:ml-auto">
          <span
            className="inline-flex h-9 items-center rounded-lg border border-border bg-background px-3 text-xs tabular-nums text-muted-foreground"
            aria-live="polite"
          >
            {totalRows === 0
              ? `0 ${resultNoun}`
              : `${rangeStart}–${rangeEnd} of ${totalRows}`}
          </span>
        </div>
      </div>

      {activeStatus || hasSearch ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-border px-3 py-2 sm:px-4">
          <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Active
          </span>
          {hasSearch ? (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary/12 px-2.5 py-1 text-xs text-primary ring-1 ring-primary/30 transition-colors hover:bg-primary/18"
            >
              Search: {search}
              <X className="size-3" />
            </button>
          ) : null}
          {activeStatus ? (
            <button
              type="button"
              onClick={() => onStatusChange?.("")}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary/12 px-2.5 py-1 text-xs text-primary ring-1 ring-primary/30 transition-colors hover:bg-primary/18"
            >
              {statusLabel}: {activeStatus.label}
              <X className="size-3" />
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Compact pill toggle for list filter extras (upcoming/past, etc.). */
export function PortalListFilterToggle({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "inline-flex h-9 items-center rounded-lg border px-3 text-sm transition-colors",
        checked
          ? "border-primary/50 bg-primary/12 text-primary"
          : "border-border bg-background text-muted-foreground hover:text-foreground"
      )}
    >
      {label}
    </button>
  );
}
