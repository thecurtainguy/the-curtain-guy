"use client";

import { inchesToFeetLabel } from "@/lib/studio-geometry";
import { cn } from "@/lib/utils";
import { StudioTip } from "../studio-tip";
import { FieldLabel } from "./inspector-ui";

/** Compact standard-size picks under a LengthField; the current size glows gold. */
export function OpeningSizePicks({
  label,
  values,
  value,
  max,
  disabled,
  tooLarge = "Too large for this wall",
  onPick,
}: {
  label: string;
  /** Inches. */
  values: readonly number[];
  value: number;
  /** Picks above this are disabled. */
  max: number;
  disabled?: boolean;
  tooLarge?: string;
  onPick: (inches: number) => void;
}) {
  return (
    <div className="space-y-1">
      <FieldLabel>{label}</FieldLabel>
      <div role="group" aria-label={label} className="flex flex-wrap gap-1">
        {values.map((inches) => {
          const active = Math.abs(value - inches) < 0.5;
          const fits = inches <= max + 0.001;
          const text = inches === 0 ? "Floor" : inchesToFeetLabel(inches);
          return (
            <StudioTip key={inches} label={fits ? null : tooLarge}>
              <span className="inline-flex">
                <button
                  type="button"
                  aria-pressed={active}
                  disabled={disabled || !fits}
                  onClick={() => onPick(inches)}
                  className={cn(
                    "h-7 min-w-11 rounded-xl border px-2 font-mono text-[0.65rem] tabular-nums transition-colors",
                    "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-40",
                    active
                      ? "border-primary/60 bg-primary/15 text-primary shadow-[inset_0_0_0_1px_oklch(0.76_0.15_88/20%)]"
                      : "border-border/40 bg-card/35 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                  )}
                >
                  {text}
                </button>
              </span>
            </StudioTip>
          );
        })}
      </div>
    </div>
  );
}
