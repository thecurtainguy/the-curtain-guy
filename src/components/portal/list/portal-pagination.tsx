"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { buildPageList } from "./list-utils";
import { PORTAL_PAGE_SIZE_OPTIONS } from "./types";

export function PortalPagination({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  onPageSizeChange,
  itemLabel = "Rows",
  pageSizeOptions = [...PORTAL_PAGE_SIZE_OPTIONS],
  className,
}: {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  itemLabel?: string;
  pageSizeOptions?: number[];
  className?: string;
}) {
  if (totalItems === 0) return null;

  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const pages = buildPageList(currentPage, totalPages);
  const rangeStart = (currentPage - 1) * itemsPerPage + 1;
  const rangeEnd = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-t border-border bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <label className="inline-flex items-center gap-2">
          <span>{itemLabel} per page</span>
          <select
            value={itemsPerPage}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="h-8 rounded-lg border border-input bg-background px-2 text-xs text-foreground"
            aria-label={`${itemLabel} per page`}
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
        <span aria-live="polite">
          {rangeStart}–{rangeEnd} of {totalItems}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="size-4" />
        </Button>
        {pages.map((entry, index) =>
          entry === "ellipsis" ? (
            <span
              key={`e-${index}`}
              className="px-1.5 text-xs text-muted-foreground"
              aria-hidden
            >
              …
            </span>
          ) : (
            <Button
              key={entry}
              type="button"
              variant={entry === currentPage ? "default" : "outline"}
              size="sm"
              className="min-w-8 px-2"
              aria-current={entry === currentPage ? "page" : undefined}
              onClick={() => onPageChange(entry)}
            >
              {entry}
            </Button>
          )
        )}
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          aria-label="Next page"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
