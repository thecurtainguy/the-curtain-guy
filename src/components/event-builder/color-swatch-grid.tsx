"use client";

import { Ban } from "lucide-react";
import type { DrapeColor } from "@/data/studio";
import { getDrapeColorHex } from "@/data/studio";
import { SelectionCheck } from "@/components/event-builder/selection-check";
import { useLocalizedDrapeColors } from "@/lib/i18n/event-builder";
import { cn } from "@/lib/utils";

type ColorSwatchGridProps = {
  colors: readonly DrapeColor[];
  value: DrapeColor | null;
  onChange: (value: DrapeColor | null) => void;
  /** Label for an extra "none / off" tile; omitted = no such tile. */
  noneLabel?: string;
  ariaLabel: string;
  /** Halo the swatch like a light wash instead of fabric. */
  glow?: boolean;
};

/** Selectable colour tiles (swatch, label, gold selection ring). */
export function ColorSwatchGrid({
  colors,
  value,
  onChange,
  noneLabel,
  ariaLabel,
  glow = false,
}: ColorSwatchGridProps) {
  const localized = useLocalizedDrapeColors();
  const labelFor = (color: DrapeColor) =>
    localized.find((entry) => entry.value === color)?.label ?? color;

  const tileClass = (selected: boolean) =>
    cn(
      "group relative flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-2.5 transition-all duration-200 motion-reduce:transition-none",
      "border-border/40 bg-card/35 hover:-translate-y-px hover:border-primary/30 hover:bg-card/55 active:scale-[0.99] motion-reduce:hover:translate-y-0",
      "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
      selected && "border-primary/50 bg-primary/10 shadow-[inset_0_0_0_1px_oklch(0.76_0.15_88/20%)]"
    );

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8"
    >
      {noneLabel ? (
        <button
          type="button"
          role="radio"
          aria-checked={value === null}
          onClick={() => onChange(null)}
          className={tileClass(value === null)}
        >
          <SelectionCheck selected={value === null} size="sm" className="absolute right-1.5 top-1.5 size-4" />
          <span className="flex size-9 items-center justify-center rounded-full border border-dashed border-border/70 text-muted-foreground">
            <Ban className="size-4" aria-hidden />
          </span>
          <span className="w-full truncate text-center text-[11px] font-medium">{noneLabel}</span>
        </button>
      ) : null}
      {colors.map((color) => {
        const selected = value === color;
        const hex = getDrapeColorHex(color);
        return (
          <button
            key={color}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(color)}
            className={tileClass(selected)}
          >
            <SelectionCheck selected={selected} size="sm" className="absolute right-1.5 top-1.5 size-4" />
            <span
              className={cn(
                "size-9 rounded-full ring-2 ring-border/40 shadow-inner transition-all",
                selected && "ring-primary/60 ring-offset-2 ring-offset-background"
              )}
              style={{
                backgroundColor: hex,
                boxShadow: glow ? `0 0 14px 3px ${hex}99` : undefined,
              }}
            />
            <span className="w-full truncate text-center text-[11px] font-medium">
              {labelFor(color)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
