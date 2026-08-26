"use client";

import type { LucideIcon } from "lucide-react";
import { SelectionBadge, SelectionCheck } from "@/components/event-builder/selection-check";
import { cn } from "@/lib/utils";

type ChoiceCardProps = {
  label: string;
  description?: string;
  icon?: LucideIcon;
  selected: boolean;
  onSelect: () => void;
  className?: string;
  layout?: "horizontal" | "stacked";
  /** When set on stacked cards, shows count in badge when not selected. */
  selectionCount?: number;
  /** Overrides default aria-label (visible label only). */
  ariaLabel?: string;
};

export function ChoiceCard({
  label,
  description,
  icon: Icon,
  selected,
  onSelect,
  className,
  layout = "horizontal",
  selectionCount = 0,
  ariaLabel,
}: ChoiceCardProps) {
  const isStacked = layout === "stacked";

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={ariaLabel ?? label}
      onClick={onSelect}
      className={cn(
        "group relative w-full rounded-2xl border p-4 text-left transition-all duration-200 motion-reduce:transition-none",
        "border-border/40 bg-card/40 hover:border-primary/30 hover:bg-card/60 hover:-translate-y-px active:scale-[0.99]",
        "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
        selected &&
          "border-primary/50 bg-primary/10 shadow-[inset_0_0_0_1px_oklch(0.76_0.15_88/20%)]",
        isStacked && "flex flex-col items-center gap-2 text-center",
        !isStacked && "flex items-start gap-3",
        className
      )}
    >
      {isStacked ? (
        <SelectionBadge
          active={selected}
          count={selectionCount}
          className="absolute right-3 top-3"
        />
      ) : null}

      {Icon ? (
        <span
          className={cn(
            "flex shrink-0 items-center justify-center rounded-xl transition-colors",
            isStacked ? "size-10" : "size-9",
            selected
              ? "bg-primary/20 text-primary"
              : "bg-primary/10 text-primary/80 group-hover:text-primary"
          )}
        >
          <Icon className="size-4" />
        </span>
      ) : null}

      <span className={cn("min-w-0", isStacked && "w-full", !isStacked && "flex-1")}>
        <span className="block text-sm font-medium text-foreground">{label}</span>
        {description ? (
          <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
            {description}
          </span>
        ) : null}
      </span>

      {!isStacked ? (
        <SelectionCheck selected={selected} className="shrink-0" size="sm" />
      ) : null}
    </button>
  );
}

type ActionChoiceCardProps = {
  label: string;
  description?: string;
  icon?: LucideIcon;
  onClick: () => void;
  className?: string;
};

/** One-shot action card (e.g. apply a bundle) — not a persistent selection. */
export function ActionChoiceCard({
  label,
  description,
  icon: Icon,
  onClick,
  className,
}: ActionChoiceCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex w-full items-start gap-3 rounded-2xl border border-primary/30 bg-[radial-gradient(circle_at_0%_0%,color-mix(in_oklch,var(--primary)_12%,transparent),transparent_55%)] p-4 text-left transition-all duration-200",
        "hover:border-primary/45 hover:bg-primary/10 hover:-translate-y-px active:scale-[0.99]",
        "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
        className
      )}
    >
      {Icon ? (
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Icon className="size-4" />
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-foreground">{label}</span>
        {description ? (
          <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
            {description}
          </span>
        ) : null}
      </span>
      <span
        className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-background/80 text-sm font-semibold text-primary"
        aria-hidden
      >
        +
      </span>
    </button>
  );
}
