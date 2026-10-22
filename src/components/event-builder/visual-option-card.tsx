"use client";

import type { ReactNode } from "react";
import { SelectionCheck } from "@/components/event-builder/selection-check";
import { cn } from "@/lib/utils";

type VisualOptionCardProps = {
  title: string;
  description?: string;
  /** Art, swatch or photo shown in the card header. */
  media: ReactNode;
  /** Small overlay in the media corner (e.g. dimensions). */
  badge?: ReactNode;
  selected: boolean;
  onSelect: () => void;
  mode?: "single" | "multi";
  mediaClassName?: string;
  className?: string;
  ariaLabel?: string;
};

/**
 * OptionCard with a visual header: rounded-2xl tile, art on top, title and
 * description below, and the gold selection ring in the corner.
 */
export function VisualOptionCard({
  title,
  description,
  media,
  badge,
  selected,
  onSelect,
  mode = "single",
  mediaClassName,
  className,
  ariaLabel,
}: VisualOptionCardProps) {
  return (
    <button
      type="button"
      role={mode === "multi" ? "checkbox" : "radio"}
      aria-checked={selected}
      aria-label={ariaLabel}
      onClick={onSelect}
      className={cn(
        "group relative flex w-full min-w-0 flex-col overflow-hidden rounded-2xl border text-left transition-all duration-200 motion-reduce:transition-none",
        "border-border/40 bg-card/35 hover:-translate-y-px hover:border-primary/30 hover:bg-card/55 active:scale-[0.99] motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100",
        "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
        selected &&
          "border-primary/55 bg-primary/10 shadow-[inset_0_0_0_1px_oklch(0.76_0.15_88/22%)]",
        className
      )}
    >
      <span
        className={cn(
          "relative block h-24 w-full overflow-hidden border-b border-border/30",
          mediaClassName
        )}
      >
        {media}
        {badge ? (
          <span className="absolute bottom-2 left-2 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white/90 tabular-nums backdrop-blur-sm">
            {badge}
          </span>
        ) : null}
        <SelectionCheck
          selected={selected}
          size="sm"
          className="absolute right-2 top-2 shadow-sm backdrop-blur-sm"
        />
      </span>
      <span className="block min-w-0 p-3">
        <span className="block truncate text-sm font-medium text-foreground">{title}</span>
        {description ? (
          <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-muted-foreground">
            {description}
          </span>
        ) : null}
      </span>
    </button>
  );
}
