"use client";

import { Button } from "@/components/ui/button";
import { SelectInput } from "@/components/ui/select-input";
import { cn } from "@/lib/utils";
import type { PortalStatusOption } from "./types";

export function PortalListFilters({
  status,
  statusOptions,
  onStatusChange,
  statusLabel = "Status",
  allLabel = "All",
  extras,
  onClear,
  showClear = false,
  className,
}: {
  status: string;
  statusOptions?: PortalStatusOption[];
  onStatusChange?: (value: string) => void;
  statusLabel?: string;
  allLabel?: string;
  extras?: React.ReactNode;
  onClear?: () => void;
  showClear?: boolean;
  className?: string;
}) {
  if (!statusOptions?.length && !extras) return null;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end",
        className
      )}
    >
      {statusOptions?.length ? (
        <div className="space-y-2 sm:w-48">
          <label htmlFor="portal-list-status" className="text-xs text-muted-foreground">
            {statusLabel}
          </label>
          <SelectInput
            id="portal-list-status"
            value={status}
            onChange={(next) => onStatusChange?.(next)}
            allowClear
            placeholder={allLabel}
            options={statusOptions.map((option) => ({
              value: option.value,
              label: option.label,
            }))}
          />
        </div>
      ) : null}
      {extras}
      {showClear && onClear ? (
        <Button type="button" variant="ghost" size="sm" onClick={onClear}>
          Clear filters
        </Button>
      ) : null}
    </div>
  );
}
