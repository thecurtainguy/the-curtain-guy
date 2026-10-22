"use client";

import { Input } from "@/components/ui/input";
import {
  DRAPE_COLORS,
  DRAPE_FABRICS,
  getDrapeColorHex,
  type DrapeColor,
  type DrapeFabric,
  type DrapeHardware,
} from "@/data/studio";
import { cn } from "@/lib/utils";
import {
  Ban,
  BrickWall,
  Check,
  Columns3,
  Minus,
  PanelTop,
  Plus,
  type LucideIcon,
} from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { StudioTip } from "../../studio-tip";
import { mix, shade } from "../color-utils";

export const HARDWARE_META: Record<
  DrapeHardware,
  { icon: LucideIcon; description: string }
> = {
  pipe_and_drape: {
    icon: Columns3,
    description: "Weighted bases, uprights every 8–10′",
  },
  ceiling_track: { icon: PanelTop, description: "Slim track, clean header" },
  wall_mount: { icon: BrickWall, description: "Hidden hardware, fabric only" },
};

export const FABRIC_NOTES: Record<DrapeFabric, string> = {
  velvet: "Deep pile, rich sheen",
  velour: "Plush, softer nap",
  poly: "Matte premier weave",
  sheer: "Airy, light-filtering",
  satin: "Liquid gloss",
  chiffon: "Floating translucency",
  sequin: "Sparkling glamour",
};

/** CSS-only fabric preview: folds, sheen and surface character. */
export function fabricSwatchStyle(fabric: DrapeFabric, hex: string): CSSProperties {
  const dark = (k: number) => shade(hex, k);
  const folds = (lo: number, hi: number, width = 14) =>
    `repeating-linear-gradient(90deg, ${dark(lo)} 0px, ${dark(hi)} ${width * 0.45}px, ${dark(lo + 0.08)} ${width * 0.7}px, ${dark(lo)} ${width}px)`;
  switch (fabric) {
    case "velvet":
    case "velour":
      return {
        backgroundImage: [
          "radial-gradient(ellipse at 28% 18%, rgba(255,255,255,0.22), transparent 55%)",
          folds(0.42, fabric === "velvet" ? 1.08 : 1.02),
        ].join(","),
      };
    case "satin":
      return {
        backgroundImage: [
          `repeating-linear-gradient(90deg, transparent 0px, transparent 7px, ${mix(hex, "#ffffff", 0.55)} 9px, transparent 11px, transparent 14px)`,
          folds(0.5, 1.2),
        ].join(","),
      };
    case "poly":
      return {
        backgroundImage: [
          "repeating-linear-gradient(0deg, rgba(0,0,0,0.08) 0 1px, transparent 1px 3px)",
          folds(0.62, 1.04),
        ].join(","),
      };
    case "sequin":
      return {
        backgroundImage: [
          `radial-gradient(circle at 35% 35%, ${mix(hex, "#ffffff", 0.7)} 0.6px, ${dark(1.05)} 1.4px, ${dark(0.55)} 2.4px, transparent 2.6px)`,
          folds(0.4, 0.9),
        ].join(","),
        backgroundSize: "5px 5px, auto",
      };
    case "sheer":
    case "chiffon":
      return {
        backgroundImage: [
          `repeating-linear-gradient(90deg, ${mix(hex, "#ffffff", 0.2)}66 0px, ${hex}${fabric === "sheer" ? "40" : "59"} 7px, ${mix(hex, "#ffffff", 0.3)}80 14px)`,
          "linear-gradient(135deg, rgba(255,255,255,0.05), rgba(0,0,0,0.25))",
        ].join(","),
      };
  }
}

function SelectionRing({ selected, className }: { selected: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-full border transition-all duration-200",
        selected
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border/60 bg-background/70 text-transparent",
        className
      )}
    >
      <Check className="size-3" strokeWidth={3} />
    </span>
  );
}

/** Editorial inspector card with a gold icon badge header. */
export function InspectorSection({
  icon: Icon,
  eyebrow,
  title,
  aside,
  children,
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border/40 bg-card/25">
      <div className="flex items-center gap-3 border-b border-border/40 bg-[radial-gradient(ellipse_at_top_left,oklch(0.76_0.15_88/14%),transparent_70%)] px-3.5 py-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/20">
          <Icon className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[0.6rem] font-semibold tracking-[0.2em] text-primary uppercase">
            {eyebrow}
          </p>
          <h3 className="font-heading text-sm leading-tight text-foreground">{title}</h3>
        </div>
        {aside}
      </div>
      <div className="space-y-3.5 p-3.5">{children}</div>
    </section>
  );
}

export function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/40 bg-background/40 px-2.5 py-2">
      <p className="text-[0.58rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-0.5 font-heading text-sm text-foreground">{value}</p>
    </div>
  );
}

export function FieldLabel({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-[0.65rem] font-semibold tracking-[0.14em] text-muted-foreground uppercase"
    >
      {children}
    </label>
  );
}

/** OptionCard-style selectable tile (icon, title, description, selection circle). */
export function OptionTile({
  icon: Icon,
  label,
  description,
  selected,
  onSelect,
  role = "radio",
  compact = false,
  leading,
}: {
  icon?: LucideIcon;
  label: string;
  description?: string;
  selected: boolean;
  onSelect: () => void;
  role?: "radio" | "checkbox" | "switch";
  compact?: boolean;
  leading?: ReactNode;
}) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "group relative flex w-full items-start gap-2.5 rounded-2xl border text-left transition-all duration-200 motion-reduce:transition-none",
        compact ? "p-2.5" : "p-3",
        "border-border/40 bg-card/40 hover:-translate-y-px hover:border-primary/30 hover:bg-card/60 active:scale-[0.99] motion-reduce:hover:translate-y-0",
        "focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none",
        selected &&
          "border-primary/50 bg-primary/10 shadow-[inset_0_0_0_1px_oklch(0.76_0.15_88/20%)]"
      )}
    >
      {leading}
      {Icon ? (
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-xl transition-colors",
            selected ? "bg-primary/20 text-primary" : "bg-primary/10 text-primary/80 group-hover:text-primary"
          )}
        >
          <Icon className="size-4" aria-hidden />
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-medium text-foreground">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-[0.68rem] leading-snug text-muted-foreground">
            {description}
          </span>
        ) : null}
      </span>
      <SelectionRing selected={selected} />
    </button>
  );
}

export function FabricPicker({
  value,
  color,
  onChange,
  label = "Fabric",
}: {
  value: DrapeFabric;
  color: DrapeColor;
  onChange: (fabric: DrapeFabric) => void;
  label?: string;
}) {
  const hex = getDrapeColorHex(color);
  return (
    <div className="space-y-2">
      <FieldLabel>{label}</FieldLabel>
      <div role="radiogroup" aria-label={label} className="grid grid-cols-2 gap-2">
        {DRAPE_FABRICS.map((fabric) => {
          const selected = fabric.value === value;
          return (
            <button
              key={fabric.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(fabric.value)}
              className={cn(
                "group relative overflow-hidden rounded-2xl border text-left transition-all duration-200 motion-reduce:transition-none",
                "border-border/40 bg-card/40 hover:-translate-y-px hover:border-primary/30 active:scale-[0.99]",
                "focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none",
                selected &&
                  "border-primary/50 bg-primary/10 shadow-[inset_0_0_0_1px_oklch(0.76_0.15_88/20%)]"
              )}
            >
              <span
                className="block h-11 w-full border-b border-border/30 bg-background"
                style={fabricSwatchStyle(fabric.value, hex)}
                aria-hidden
              />
              <span className="block px-2.5 py-2">
                <span className="block text-xs font-medium text-foreground">{fabric.label}</span>
                <span className="block truncate text-[0.62rem] text-muted-foreground">
                  {FABRIC_NOTES[fabric.value]}
                </span>
              </span>
              <SelectionRing
                selected={selected}
                className="absolute top-1.5 right-1.5 shadow-sm backdrop-blur-sm"
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ColorSwatchGrid({
  value,
  onChange,
  label,
  noneLabel,
}: {
  value: DrapeColor | null;
  onChange: (color: DrapeColor | null) => void;
  label: string;
  /** When set, a leading "none" tile is offered. */
  noneLabel?: string;
}) {
  const active = DRAPE_COLORS.find((item) => item.value === value);
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <FieldLabel>{label}</FieldLabel>
        <span className="text-[0.68rem] text-foreground/80">
          {active?.label ?? noneLabel ?? ""}
        </span>
      </div>
      <div
        role="radiogroup"
        aria-label={label}
        className="grid grid-cols-6 gap-1.5 @lg:grid-cols-[repeat(auto-fill,2.75rem)] @lg:gap-2"
      >
        {noneLabel ? (
          <StudioTip label={noneLabel}>
            <button
              type="button"
              role="radio"
              aria-checked={value === null}
              aria-label={noneLabel}
              onClick={() => onChange(null)}
              className={cn(
                "flex aspect-square items-center justify-center rounded-xl border border-border/40 bg-card/40 text-muted-foreground transition-all hover:border-primary/30",
                "focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none",
                value === null && "border-primary/60 bg-primary/10 text-primary"
              )}
            >
              <Ban className="size-4" aria-hidden />
            </button>
          </StudioTip>
        ) : null}
        {DRAPE_COLORS.map((color) => {
          const selected = color.value === value;
          return (
            <StudioTip key={color.value} label={color.label}>
              <button
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={color.label}
                onClick={() => onChange(color.value)}
                className={cn(
                  "group relative flex aspect-square items-center justify-center rounded-xl border border-border/40 bg-card/40 p-1 transition-all hover:-translate-y-px hover:border-primary/30",
                  "focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none",
                  selected && "border-primary/60 bg-primary/10"
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "size-full rounded-full shadow-inner ring-1 ring-white/10",
                    selected && "ring-2 ring-primary/70"
                  )}
                  style={{
                    background: `radial-gradient(circle at 32% 28%, ${mix(color.hex, "#ffffff", 0.35)}, ${color.hex} 55%, ${shade(color.hex, 0.62)})`,
                  }}
                />
                {selected ? (
                  <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                    <Check className="size-2.5" strokeWidth={3} aria-hidden />
                  </span>
                ) : null}
              </button>
            </StudioTip>
          );
        })}
      </div>
    </div>
  );
}

/** Slider + numeric input pair. `value` is in display units (feet, ×, …). */
export function RangeField({
  id,
  label,
  value,
  min,
  max,
  step = 0.5,
  unit = "ft",
  marks,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  marks?: Array<{ value: number; label: string }>;
  onChange: (value: number) => void;
}) {
  const safeMax = Math.max(min + step, max);
  const clamped = Math.min(safeMax, Math.max(min, value));
  const percent = ((clamped - min) / (safeMax - min)) * 100;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <div className="flex items-center gap-1">
          <Input
            id={id}
            type="number"
            value={Math.round(value * 100) / 100}
            min={min}
            max={safeMax}
            step={step}
            onChange={(event) => {
              const next = Number(event.target.value);
              if (Number.isFinite(next)) onChange(next);
            }}
            className="input-no-spin h-7 w-16 rounded-lg px-2 text-right text-xs"
          />
          <span className="w-4 text-[0.65rem] text-muted-foreground">{unit}</span>
        </div>
      </div>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={safeMax}
        step={step}
        value={clamped}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full accent-primary"
        style={{
          background: `linear-gradient(90deg, var(--primary) ${percent}%, color-mix(in oklch, var(--border) 70%, transparent) ${percent}%)`,
        }}
      />
      {marks ? (
        <div className="relative h-3.5">
          {marks.map((mark) => {
            const left = ((mark.value - min) / (safeMax - min)) * 100;
            const active = Math.abs(mark.value - clamped) < step / 2;
            return (
              <button
                key={mark.value}
                type="button"
                onClick={() => onChange(mark.value)}
                className={cn(
                  "absolute -translate-x-1/2 text-[0.58rem] tracking-wide whitespace-nowrap transition-colors hover:text-primary",
                  active ? "font-semibold text-primary" : "text-muted-foreground"
                )}
                style={{ left: `${Math.min(92, Math.max(8, left))}%` }}
              >
                {mark.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export const FULLNESS_MARKS = [
  { value: 1.5, label: "Tailored 1.5×" },
  { value: 2, label: "Classic 2×" },
  { value: 2.5, label: "Lush 2.5×" },
  { value: 3, label: "Opulent 3×" },
];

export function FullnessField({
  id,
  value,
  onChange,
}: {
  id: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <RangeField
      id={id}
      label="Fullness"
      value={value}
      min={1.5}
      max={3}
      step={0.25}
      unit="×"
      marks={FULLNESS_MARKS}
      onChange={(next) => onChange(Math.min(4, Math.max(1, next)))}
    />
  );
}

export function Stepper({
  label,
  value,
  min,
  max,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/40 bg-background/35 p-2.5">
      <div className="min-w-0">
        <FieldLabel>{label}</FieldLabel>
        {hint ? <p className="mt-0.5 text-[0.65rem] text-muted-foreground">{hint}</p> : null}
      </div>
      <div className="flex items-center gap-1.5">
        <StudioTip label={`Fewer ${label.toLowerCase()}`}>
          <span className="inline-flex">
            <button
              type="button"
              aria-label={`Decrease ${label}`}
              disabled={value <= min}
              onClick={() => onChange(Math.max(min, value - 1))}
              className="flex size-7 items-center justify-center rounded-lg border border-border/50 bg-card/50 text-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-40"
            >
              <Minus className="size-3.5" aria-hidden />
            </button>
          </span>
        </StudioTip>
        <span className="w-6 text-center font-heading text-base text-primary" aria-live="polite">
          {value}
        </span>
        <StudioTip label={`More ${label.toLowerCase()}`}>
          <span className="inline-flex">
            <button
              type="button"
              aria-label={`Increase ${label}`}
              disabled={value >= max}
              onClick={() => onChange(Math.min(max, value + 1))}
              className="flex size-7 items-center justify-center rounded-lg border border-border/50 bg-card/50 text-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-40"
            >
              <Plus className="size-3.5" aria-hidden />
            </button>
          </span>
        </StudioTip>
      </div>
    </div>
  );
}
