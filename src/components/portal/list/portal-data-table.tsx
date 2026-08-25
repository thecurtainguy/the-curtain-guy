"use client";

import { cn } from "@/lib/utils";
import type { PortalListColumn, PortalSortState, PortalSortType } from "./types";

function sortGlyph(
  sortType: PortalSortType,
  active: boolean,
  direction: "asc" | "desc" | null
): string {
  if (!active || !direction) {
    if (sortType === "number") return "0↓";
    if (sortType === "date") return "↕";
    return "A↓";
  }
  if (sortType === "number") return direction === "asc" ? "0↑" : "9↓";
  if (sortType === "date") return direction === "asc" ? "↑" : "↓";
  return direction === "asc" ? "A↑" : "Z↓";
}

export function PortalDataTable<T>({
  columns,
  rows,
  rowKey,
  sort,
  onSortChange,
  empty,
  footer,
  onRowClick,
  className,
}: {
  columns: PortalListColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  sort?: PortalSortState | null;
  onSortChange?: (columnId: string) => void;
  empty?: React.ReactNode;
  footer?: React.ReactNode;
  onRowClick?: (row: T) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-card shadow-sm",
        className
      )}
    >
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              {columns.map((column) => {
                const align =
                  column.align === "right"
                    ? "text-right"
                    : column.align === "center"
                      ? "text-center"
                      : "text-left";
                const isActive = sort?.columnId === column.id;
                const sortType = column.sortType ?? "text";
                return (
                  <th
                    key={column.id}
                    className={cn("px-4 py-3 font-medium", align, column.className)}
                    style={column.minWidth ? { minWidth: column.minWidth } : undefined}
                    aria-sort={
                      column.sortable
                        ? isActive
                          ? sort?.direction === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                        : undefined
                    }
                  >
                    {column.sortable && onSortChange ? (
                      <button
                        type="button"
                        onClick={() => onSortChange(column.id)}
                        className={cn(
                          "inline-flex items-center gap-1.5 transition-colors hover:text-foreground",
                          isActive && "text-foreground"
                        )}
                      >
                        <span>{column.label}</span>
                        <span
                          className={cn(
                            "font-mono text-[10px] normal-case tracking-normal",
                            isActive ? "text-primary" : "text-muted-foreground/80"
                          )}
                          aria-hidden
                        >
                          {sortGlyph(sortType, Boolean(isActive), sort?.direction ?? null)}
                        </span>
                      </button>
                    ) : (
                      column.label
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-muted-foreground"
                >
                  {empty ?? "No results."}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={rowKey(row)}
                  className={cn(
                    "border-t border-border transition-colors hover:bg-muted/40",
                    onRowClick && "cursor-pointer"
                  )}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((column) => {
                    const align =
                      column.align === "right"
                        ? "text-right"
                        : column.align === "center"
                          ? "text-center"
                          : "text-left";
                    return (
                      <td
                        key={column.id}
                        className={cn("px-4 py-3 align-top", align, column.className)}
                      >
                        {column.render(row)}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {footer}
    </div>
  );
}
