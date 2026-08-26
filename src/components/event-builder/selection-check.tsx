"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type SelectionCheckProps = {
  selected: boolean;
  className?: string;
  size?: "sm" | "md";
};

export function SelectionCheck({
  selected,
  className,
  size = "md",
}: SelectionCheckProps) {
  const dimension = size === "sm" ? "size-5" : "size-6";
  const iconSize = size === "sm" ? "size-3" : "size-3.5";

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border transition-all duration-200",
        dimension,
        selected
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border/60 bg-background/85 text-transparent",
        className
      )}
      aria-hidden
    >
      <Check className={iconSize} strokeWidth={3} />
    </span>
  );
}

type SelectionBadgeProps = {
  /** Active tab / primary selection — shows checkmark. */
  active?: boolean;
  /** Selected items in this group (shown when not active). */
  count?: number;
  className?: string;
  size?: "sm" | "md";
};

/** Check when active; count badge when items selected; empty ring otherwise. */
export function SelectionBadge({
  active = false,
  count = 0,
  className,
  size = "sm",
}: SelectionBadgeProps) {
  const dimension = size === "sm" ? "size-5" : "size-6";

  if (active) {
    return (
      <SelectionCheck
        selected
        size={size}
        className={cn("shadow-sm backdrop-blur-sm", className)}
      />
    );
  }

  if (count > 0) {
    return (
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full border border-primary bg-primary text-[10px] font-bold leading-none text-primary-foreground shadow-sm backdrop-blur-sm",
          dimension,
          className
        )}
        aria-hidden
      >
        {count}
      </span>
    );
  }

  return (
    <SelectionCheck
      selected={false}
      size={size}
      className={cn("shadow-sm backdrop-blur-sm", className)}
    />
  );
}
