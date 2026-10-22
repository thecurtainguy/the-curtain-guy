"use client";

import { useId, useState } from "react";
import { Check, GripVertical, Plus, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { StudioTip } from "../studio-tip";

export function matchesLibraryQuery(query: string, ...fields: string[]) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const haystack = fields.join(" ").toLowerCase().replaceAll("_", " ");
  return needle.split(/\s+/).every((word) => haystack.includes(word));
}

export function LibrarySectionHeading({
  icon: Icon,
  eyebrow,
  title,
  id,
  action,
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  id?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[0.6rem] font-semibold tracking-[0.2em] text-primary uppercase">
          {eyebrow}
        </p>
        <h3 id={id} className="truncate font-heading text-base leading-tight">
          {title}
        </h3>
      </div>
      {action}
    </div>
  );
}

export function LibraryCard({
  children,
  className,
  ...props
}: React.ComponentProps<"section">) {
  return (
    <section
      className={cn(
        "space-y-3 rounded-2xl border border-border/40 bg-card/25 p-3",
        className
      )}
      {...props}
    >
      {children}
    </section>
  );
}

export function SelectionDot({
  selected,
  className,
}: {
  selected: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors",
        selected
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border/60 bg-background/70 text-transparent",
        className
      )}
    >
      <Check className="size-2.5" strokeWidth={3.5} />
    </span>
  );
}

/** Action tile: click to add; optionally draggable onto the plan. */
export function LibraryTile({
  icon: Icon,
  label,
  description,
  meta,
  disabled,
  onClick,
  onDragStart,
  className,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  description?: string;
  meta?: string;
  disabled?: boolean;
  onClick: () => void;
  onDragStart?: (event: React.DragEvent<HTMLButtonElement>) => void;
  className?: string;
  accent?: React.ReactNode;
}) {
  const draggable = Boolean(onDragStart) && !disabled;
  return (
    <StudioTip label={draggable ? `${label} — click to add or drag onto the plan` : label}>
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        draggable={draggable}
        onDragStart={draggable ? onDragStart : undefined}
        className={cn(
          "group relative flex min-w-0 flex-col gap-2 rounded-2xl border border-border/40 bg-card/30 p-2.5 text-left transition-all duration-200 motion-reduce:transition-none",
          "hover:-translate-y-px hover:border-primary/35 hover:bg-primary/5 active:scale-[0.99] motion-reduce:hover:translate-y-0",
          "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
          "disabled:pointer-events-none disabled:opacity-45",
          draggable && "cursor-grab active:cursor-grabbing",
          className
        )}
      >
        <span className="flex items-start justify-between gap-1">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
            <Icon className="size-4" aria-hidden />
          </span>
          {accent ??
            (draggable ? (
              <GripVertical
                className="size-3.5 text-muted-foreground/50 transition-colors group-hover:text-primary/70"
                aria-hidden
              />
            ) : (
              <Plus
                className="size-3.5 text-muted-foreground/50 transition-colors group-hover:text-primary/70"
                aria-hidden
              />
            ))}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-xs font-semibold text-foreground">
            {label}
          </span>
          {description ? (
            <span className="mt-0.5 block truncate text-[0.62rem] leading-tight text-muted-foreground">
              {description}
            </span>
          ) : null}
          {meta ? (
            <span className="mt-1 block text-[0.6rem] font-medium tracking-wide text-primary/80 tabular-nums">
              {meta}
            </span>
          ) : null}
        </span>
      </button>
    </StudioTip>
  );
}

/** Radio-style choice tile with a selection circle. */
export function ChoiceTile({
  selected,
  onSelect,
  label,
  description,
  icon: Icon,
  preview,
  className,
  compact,
  tip,
}: {
  selected: boolean;
  onSelect: () => void;
  label: string;
  description?: string;
  icon?: LucideIcon;
  preview?: React.ReactNode;
  className?: string;
  compact?: boolean;
  /** Branded tooltip, e.g. the full name when the tile label is abbreviated. */
  tip?: React.ReactNode;
}) {
  return (
    <StudioTip label={tip}>
      <button
        type="button"
        role="radio"
        aria-checked={selected}
        onClick={onSelect}
        className={cn(
          "group relative flex min-w-0 flex-col gap-1.5 rounded-2xl border text-left transition-all duration-200 motion-reduce:transition-none",
          compact ? "p-1.5" : "p-2.5",
          "border-border/40 bg-card/30 hover:border-primary/30 hover:bg-card/55",
          "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
          selected &&
            "border-primary/55 bg-primary/10 shadow-[inset_0_0_0_1px_oklch(0.76_0.15_88/20%)]",
          className
        )}
      >
        <SelectionDot
          selected={selected}
          className="absolute top-1.5 right-1.5 z-10 shadow-sm"
        />
        {preview}
        {Icon ? (
          <span
            className={cn(
              "flex size-7 items-center justify-center rounded-lg transition-colors",
              selected ? "bg-primary/20 text-primary" : "bg-primary/10 text-primary/80"
            )}
          >
            <Icon className="size-3.5" aria-hidden />
          </span>
        ) : null}
        <span className="min-w-0 pr-3">
          <span
            className={cn(
              "block truncate font-medium text-foreground",
              compact ? "text-[0.62rem]" : "text-xs"
            )}
          >
            {label}
          </span>
          {description ? (
            <span className="mt-0.5 block truncate text-[0.6rem] leading-tight text-muted-foreground">
              {description}
            </span>
          ) : null}
        </span>
      </button>
    </StudioTip>
  );
}

/** Number input that only commits on blur / Enter, so typing isn't clamped mid-edit. */
export function DraftNumberInput({
  id,
  value,
  onCommit,
  suffix,
  ariaLabel,
  className,
  step = 1,
}: {
  id?: string;
  value: number;
  onCommit: (value: number) => void;
  suffix: string;
  ariaLabel?: string;
  className?: string;
  step?: number;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft === null) return;
    const parsed = Number(draft);
    setDraft(null);
    if (draft.trim() !== "" && Number.isFinite(parsed)) onCommit(parsed);
  };
  return (
    <span className={cn("relative block", className)}>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        step={step}
        aria-label={ariaLabel}
        value={draft ?? String(value)}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit();
          } else if (event.key === "Escape") {
            setDraft(null);
          }
        }}
        className="input-no-spin h-8 w-full rounded-lg border border-border/50 bg-background/50 pr-6 pl-2 text-xs tabular-nums text-foreground outline-none transition-colors focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring/30"
      />
      <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[0.6rem] text-muted-foreground">
        {suffix}
      </span>
    </span>
  );
}

export function RangeSlider({
  id,
  value,
  min,
  max,
  step,
  onChange,
  ariaLabel,
  ariaValueText,
}: {
  id?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  ariaLabel?: string;
  ariaValueText?: string;
}) {
  const percent = max > min ? ((Math.min(max, Math.max(min, value)) - min) / (max - min)) * 100 : 0;
  return (
    <input
      id={id}
      type="range"
      min={min}
      max={max}
      step={step}
      value={Math.min(max, Math.max(min, value))}
      aria-label={ariaLabel}
      aria-valuetext={ariaValueText}
      onChange={(event) => onChange(Number(event.target.value))}
      style={{
        background: `linear-gradient(to right, var(--primary) ${percent}%, color-mix(in oklch, var(--border) 70%, transparent) ${percent}%)`,
      }}
      className="h-1.5 w-full cursor-pointer appearance-none rounded-full accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 [&::-moz-range-thumb]:size-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-background [&::-moz-range-thumb]:bg-primary [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-background [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow"
    />
  );
}

/** Slider (feet) + precise ft / in inputs, all in inches. */
export function DimensionControl({
  label,
  icon: Icon,
  value,
  minFeet,
  maxFeet,
  onChange,
}: {
  label: string;
  icon?: LucideIcon;
  value: number;
  minFeet: number;
  maxFeet: number;
  onChange: (inches: number) => void;
}) {
  const id = useId();
  const min = minFeet * 12;
  const max = maxFeet * 12;
  const clamp = (inches: number) =>
    Math.round(Math.min(max, Math.max(min, inches)));
  const rounded = Math.round(value);
  const feet = Math.floor(rounded / 12);
  const inches = rounded % 12;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={`${id}-ft`}
          className="flex items-center gap-1.5 text-[0.68rem] font-medium text-muted-foreground"
        >
          {Icon ? <Icon className="size-3.5 text-primary" aria-hidden /> : null}
          {label}
        </label>
        <div className="flex items-center gap-1">
          <DraftNumberInput
            id={`${id}-ft`}
            value={feet}
            suffix="ft"
            ariaLabel={`${label} feet`}
            className="w-16"
            onCommit={(next) => onChange(clamp(Math.round(next * 12) + inches))}
          />
          <DraftNumberInput
            value={inches}
            suffix="in"
            ariaLabel={`${label} inches`}
            className="w-13"
            onCommit={(next) =>
              onChange(clamp(feet * 12 + Math.min(11, Math.max(0, Math.round(next)))))
            }
          />
        </div>
      </div>
      <RangeSlider
        value={rounded}
        min={min}
        max={max}
        step={6}
        ariaLabel={label}
        ariaValueText={`${feet} feet ${inches} inches`}
        onChange={(next) => onChange(clamp(next))}
      />
    </div>
  );
}

export function StatTile({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-border/40 bg-background/35 p-2">
      <div className="flex items-center gap-1 text-[0.58rem] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
        <Icon className="size-3 shrink-0 text-primary" aria-hidden />
        <span className="truncate">{label}</span>
      </div>
      <p className="mt-1 truncate font-heading text-sm leading-none text-foreground tabular-nums">
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 truncate text-[0.58rem] text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
