"use client";

import { cn } from "@/lib/utils";
import { Grid2x2, LampCeiling } from "lucide-react";
import type { PlanSurface } from "./ceiling-plan-store";

const OPTIONS: Array<{ value: PlanSurface; label: string; title: string; icon: typeof Grid2x2 }> = [
  { value: "floor", label: "Floor", title: "Edit the floor plan", icon: Grid2x2 },
  { value: "ceiling", label: "Ceiling", title: "Edit ceiling drape designs (reflected ceiling plan)", icon: LampCeiling },
];

/** Floor / Ceiling plan switch in the plan chrome (matches the zoom controls). */
export function PlanSurfaceToggle({
  value,
  ceilingCount,
  onChange,
}: {
  value: PlanSurface;
  ceilingCount: number;
  onChange: (value: PlanSurface) => void;
}) {
  return (
    <div
      className="pointer-events-auto flex items-center gap-0.5 rounded-2xl border border-border/60 bg-background/95 p-1 shadow-lg"
      role="radiogroup"
      aria-label="Plan surface"
    >
      {OPTIONS.map((option) => {
        const active = option.value === value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={option.title}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
            )}
          >
            <Icon className="size-4" aria-hidden />
            {option.label}
            {option.value === "ceiling" && ceilingCount > 0 ? (
              <span
                className={cn(
                  "min-w-4 rounded-full px-1 text-[0.6rem] leading-4 tabular-nums",
                  active ? "bg-primary-foreground/20" : "bg-primary/15 text-primary"
                )}
              >
                {ceilingCount}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
