"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EstimateOption } from "@/data/estimate";

type OptionCardProps = {
  option: EstimateOption;
  selected: boolean;
  onSelect: () => void;
  mode?: "single" | "multi";
  className?: string;
};

export function OptionCard({
  option,
  selected,
  onSelect,
  mode = "single",
  className,
}: OptionCardProps) {
  const Icon = option.icon;

  return (
    <button
      type="button"
      role={mode === "multi" ? "checkbox" : "radio"}
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "group relative flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-all duration-200",
        "border-border/40 bg-card/40 hover:border-primary/30 hover:bg-card/60",
        "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
        selected &&
          "border-primary/50 bg-primary/10 shadow-[inset_0_0_0_1px_oklch(0.76_0.15_88/20%)]",
        className
      )}
    >
      {Icon && (
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-xl transition-colors",
            selected
              ? "bg-primary/20 text-primary"
              : "bg-primary/10 text-primary/80 group-hover:text-primary"
          )}
        >
          <Icon className="size-4" />
        </span>
      )}

      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-foreground">
          {option.label}
        </span>
        {option.description && (
          <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
            {option.description}
          </span>
        )}
      </span>

      <span
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full border transition-all duration-200",
          selected
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border/60 bg-background/50 text-transparent"
        )}
        aria-hidden
      >
        <Check className="size-3" strokeWidth={3} />
      </span>
    </button>
  );
}
