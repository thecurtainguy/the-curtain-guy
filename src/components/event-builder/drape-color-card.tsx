"use client";

import type { DrapeColor } from "@/data/studio";
import { SelectionCheck } from "@/components/event-builder/selection-check";
import { cn } from "@/lib/utils";

type DrapeColorCardProps = {
  value: DrapeColor;
  label: string;
  hex: string;
  selected: boolean;
  onSelect: () => void;
};

export function DrapeColorCard({
  value,
  label,
  hex,
  selected,
  onSelect,
}: DrapeColorCardProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={label}
      onClick={onSelect}
      className={cn(
        "group relative flex flex-col items-center gap-2 rounded-2xl border p-3 transition-all duration-200 motion-reduce:transition-none",
        "border-border/40 bg-card/35 hover:border-primary/30 hover:bg-card/55 hover:-translate-y-px active:scale-[0.99]",
        "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
        selected &&
          "border-primary/50 bg-primary/10 shadow-[inset_0_0_0_1px_oklch(0.76_0.15_88/20%)]"
      )}
    >
      <SelectionCheck
        selected={selected}
        className="absolute right-2 top-2 shadow-sm backdrop-blur-sm"
        size="sm"
      />
      <span
        className={cn(
          "size-12 rounded-full ring-2 ring-border/40 shadow-inner transition-all",
          selected && "ring-primary/60 ring-offset-2 ring-offset-background"
        )}
        style={{ backgroundColor: hex }}
      />
      <span className="text-xs font-medium text-foreground">{label}</span>
    </button>
  );
}
