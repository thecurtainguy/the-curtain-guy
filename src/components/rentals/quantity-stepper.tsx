"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type QuantityStepperProps = {
  id?: string;
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  size?: "md" | "sm";
  className?: string;
  "aria-label"?: string;
};

export function QuantityStepper({
  id,
  value,
  onChange,
  min = 0,
  max = 9999,
  step = 1,
  unit,
  size = "md",
  className,
  "aria-label": ariaLabel,
}: QuantityStepperProps) {
  const safe = Number.isFinite(value) ? value : min;
  const canDec = safe - step >= min;
  const canInc = safe + step <= max;

  function setClamped(next: number) {
    const rounded = Math.round(next);
    onChange(Math.min(max, Math.max(min, rounded)));
  }

  const compact = size === "sm";

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-border/50 bg-background/70 shadow-[inset_0_1px_0_oklch(1_0_0/8%)]",
        "ring-1 ring-primary/10",
        compact ? "h-9" : "h-11",
        className
      )}
    >
      <button
        type="button"
        aria-label="Decrease"
        disabled={!canDec}
        onClick={() => setClamped(safe - step)}
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full text-primary transition-colors",
          "hover:bg-primary/10 active:scale-95 disabled:pointer-events-none disabled:opacity-35",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
          compact ? "size-9" : "size-11"
        )}
      >
        <Minus className={compact ? "size-3.5" : "size-4"} strokeWidth={2.5} />
      </button>

      <div className="min-w-[3.25rem] px-1 text-center">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          aria-label={ariaLabel}
          value={String(safe)}
          onChange={(e) => {
            const raw = e.target.value.replace(/[^\d]/g, "");
            if (raw === "") {
              onChange(min);
              return;
            }
            setClamped(Number.parseInt(raw, 10));
          }}
          className={cn(
            "w-full bg-transparent text-center font-heading font-semibold text-foreground outline-none",
            "tabular-nums tracking-tight",
            compact ? "text-sm" : "text-base"
          )}
        />
      </div>

      <button
        type="button"
        aria-label="Increase"
        disabled={!canInc}
        onClick={() => setClamped(safe + step)}
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full text-primary-foreground transition-colors",
          "bg-primary hover:bg-primary/90 active:scale-95 disabled:pointer-events-none disabled:opacity-35",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
          "m-0.5 shadow-sm",
          compact ? "size-8" : "size-10"
        )}
      >
        <Plus className={compact ? "size-3.5" : "size-4"} strokeWidth={2.5} />
      </button>

      {unit ? (
        <span className="pl-1.5 pr-4 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          {unit}
        </span>
      ) : (
        <span className="w-1.5" aria-hidden />
      )}
    </div>
  );
}
