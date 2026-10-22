"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DRAPE_COLORS, type DrapeColor } from "@/data/studio";
import { inchesToFeetLabel } from "@/lib/studio-geometry";
import { cn } from "@/lib/utils";
import { Check, Minus, Plus, type LucideIcon } from "lucide-react";
import { useId, useState } from "react";
import { StudioTip } from "../studio-tip";

/** Card shell with a gold icon badge header — the inspector's building block. */
export function InspectorSection({
  icon: Icon,
  eyebrow,
  title,
  action,
  children,
  className,
}: {
  icon: LucideIcon;
  eyebrow?: string;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-border/40 bg-card/25",
        className
      )}
    >
      <div className="flex items-center gap-2.5 border-b border-border/40 bg-[radial-gradient(circle_at_top_right,color-mix(in_oklch,var(--primary)_12%,transparent),transparent_65%)] px-3 py-2.5">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
          <Icon className="size-3.5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          {eyebrow ? (
            <p className="text-[0.58rem] font-semibold tracking-[0.2em] text-primary uppercase">
              {eyebrow}
            </p>
          ) : null}
          <h3 className="truncate font-heading text-sm leading-tight">
            {title}
          </h3>
        </div>
        {action}
      </div>
      <div className="space-y-3 p-3">{children}</div>
    </section>
  );
}

export function FieldLabel({
  htmlFor,
  children,
  hint,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  hint?: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <Label
        htmlFor={htmlFor}
        className="text-[0.68rem] font-medium tracking-wide text-muted-foreground"
      >
        {children}
      </Label>
      {hint ? (
        <span className="text-[0.62rem] text-muted-foreground/80">{hint}</span>
      ) : null}
    </div>
  );
}

/** Accepts 12' 6", 12ft 6in, 12 6, 12.5 (feet) or 150" / 150in. */
export function parseFeetInches(raw: string): number | null {
  const text = raw
    .trim()
    .toLowerCase()
    .replaceAll("′", "'")
    .replaceAll("″", '"')
    .replaceAll("’", "'")
    .replaceAll("”", '"')
    .replace(/^[−–]/, "-");
  if (!text) return null;
  const negative = text.startsWith("-");
  const body = (negative ? text.slice(1) : text).trim();
  const num = "(\\d+(?:\\.\\d+)?|\\.\\d+)";
  let inches: number | null = null;
  let match = body.match(
    new RegExp(`^${num}\\s*(?:'|ft|feet|foot)\\s*(?:${num}\\s*(?:"|in|inch|inches)?)?$`)
  );
  if (match) {
    inches = Number(match[1]) * 12 + (match[2] ? Number(match[2]) : 0);
  } else if ((match = body.match(new RegExp(`^${num}\\s*(?:"|in|inch|inches)$`)))) {
    inches = Number(match[1]);
  } else if ((match = body.match(new RegExp(`^${num}\\s+${num}$`)))) {
    inches = Number(match[1]) * 12 + Number(match[2]);
  } else if ((match = body.match(new RegExp(`^${num}$`)))) {
    inches = Number(match[1]) * 12;
  }
  if (inches === null || !Number.isFinite(inches)) return null;
  return negative ? -inches : inches;
}

/** "Opening height" → "opening height"; keeps single-letter axes ("X position"). */
function inSentence(label: string) {
  return /^\S{2,}/.test(label) ? label.charAt(0).toLowerCase() + label.slice(1) : label;
}

function clamp(value: number, min?: number, max?: number) {
  let next = value;
  if (min !== undefined) next = Math.max(min, next);
  if (max !== undefined) next = Math.min(max, next);
  return next;
}

/**
 * Feet-and-inches stepper. Typing commits whenever the text parses; arrows
 * and the −/+ buttons step by `step` inches (Shift = 1″).
 */
export function LengthField({
  label,
  value,
  onChange,
  step = 12,
  min,
  max,
  disabled,
  hint,
}: {
  label: string;
  value: number;
  onChange: (inches: number) => void;
  step?: number;
  min?: number;
  max?: number;
  disabled?: boolean;
  hint?: React.ReactNode;
}) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const invalid = draft !== null && parseFeetInches(draft) === null;
  const fineHint = step > 1 ? " · Shift-click for 1″" : "";

  function apply(next: number) {
    const rounded = Math.round(clamp(next, min, max) * 100) / 100;
    if (rounded !== value) onChange(rounded);
  }

  function stepBy(direction: 1 | -1, fine: boolean) {
    setDraft(null);
    if (fine || step <= 0) {
      apply(value + direction);
      return;
    }
    apply(
      direction > 0
        ? Math.floor(value / step + 1e-6) * step + step
        : Math.ceil(value / step - 1e-6) * step - step
    );
  }

  return (
    <div className="space-y-1">
      <FieldLabel htmlFor={id} hint={hint}>
        {label}
      </FieldLabel>
      <div
        className={cn(
          "flex h-8 items-center rounded-xl border border-border/50 bg-background/50 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15",
          invalid && "border-destructive/60",
          disabled && "opacity-50"
        )}
      >
        <StudioTip label={`Decrease ${inSentence(label)}${fineHint}`} disabled={disabled}>
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            onClick={(event) => stepBy(-1, event.shiftKey)}
            className="flex h-full w-6 shrink-0 items-center justify-center rounded-l-xl text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary disabled:pointer-events-none"
            aria-label={`Decrease ${label}`}
          >
            <Minus className="size-3" aria-hidden="true" />
          </button>
        </StudioTip>
        <input
          id={id}
          inputMode="decimal"
          disabled={disabled}
          value={draft ?? inchesToFeetLabel(value)}
          aria-invalid={invalid || undefined}
          onFocus={(event) => {
            setDraft(inchesToFeetLabel(value));
            event.currentTarget.select();
          }}
          onChange={(event) => {
            setDraft(event.target.value);
            const parsed = parseFeetInches(event.target.value);
            if (parsed !== null) apply(parsed);
          }}
          onBlur={() => setDraft(null)}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
            if (event.key === "Escape") {
              setDraft(null);
              event.currentTarget.blur();
            }
            if (event.key === "ArrowUp" || event.key === "ArrowDown") {
              event.preventDefault();
              stepBy(event.key === "ArrowUp" ? 1 : -1, event.shiftKey);
            }
          }}
          className="h-full min-w-0 flex-1 bg-transparent text-center font-mono text-xs tabular-nums outline-none"
        />
        <StudioTip label={`Increase ${inSentence(label)}${fineHint}`} disabled={disabled}>
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            onClick={(event) => stepBy(1, event.shiftKey)}
            className="flex h-full w-6 shrink-0 items-center justify-center rounded-r-xl text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary disabled:pointer-events-none"
            aria-label={`Increase ${label}`}
          >
            <Plus className="size-3" aria-hidden="true" />
          </button>
        </StudioTip>
      </div>
    </div>
  );
}

/** Integer stepper (seats, counts). */
export function NumberStepper({
  label,
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  suffix,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  disabled?: boolean;
}) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const set = (next: number) => {
    const clamped = clamp(Math.round(next), min, max);
    if (clamped !== value) onChange(clamped);
  };
  return (
    <div className="space-y-1">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div
        className={cn(
          "flex h-9 items-center gap-1 rounded-xl border border-border/50 bg-background/50 p-1",
          disabled && "opacity-50"
        )}
      >
        <StudioTip label={`Decrease ${inSentence(label)}`} disabled={disabled}>
          <span className="inline-flex">
            <button
              type="button"
              disabled={disabled || value <= min}
              onClick={() => {
                setDraft(null);
                set(value - step);
              }}
              className="flex size-7 items-center justify-center rounded-lg bg-card/60 text-muted-foreground transition-colors hover:bg-primary/15 hover:text-primary disabled:opacity-40"
              aria-label={`Decrease ${label}`}
            >
              <Minus className="size-3.5" aria-hidden="true" />
            </button>
          </span>
        </StudioTip>
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          value={draft ?? value}
          onChange={(event) => {
            setDraft(event.target.value);
            const parsed = Number(event.target.value);
            if (event.target.value !== "" && Number.isFinite(parsed)) set(parsed);
          }}
          onBlur={() => setDraft(null)}
          className="input-no-spin h-full min-w-0 flex-1 bg-transparent text-center font-heading text-base tabular-nums outline-none"
        />
        {suffix ? (
          <span className="pr-1 text-[0.65rem] text-muted-foreground">
            {suffix}
          </span>
        ) : null}
        <StudioTip label={`Increase ${inSentence(label)}`} disabled={disabled}>
          <span className="inline-flex">
            <button
              type="button"
              disabled={disabled || (max !== undefined && value >= max)}
              onClick={() => {
                setDraft(null);
                set(value + step);
              }}
              className="flex size-7 items-center justify-center rounded-lg bg-card/60 text-muted-foreground transition-colors hover:bg-primary/15 hover:text-primary disabled:opacity-40"
              aria-label={`Increase ${label}`}
            >
              <Plus className="size-3.5" aria-hidden="true" />
            </button>
          </span>
        </StudioTip>
      </div>
    </div>
  );
}

export function SliderField({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (value: number) => string;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  const id = useId();
  const percent = ((value - min) / (max - min)) * 100;
  return (
    <div className="space-y-1.5">
      <FieldLabel htmlFor={id} hint={<span className="font-mono text-primary">{format(value)}</span>}>
        {label}
      </FieldLabel>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full accent-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50 [&::-moz-range-thumb]:size-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-background [&::-moz-range-thumb]:bg-primary [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-background [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-[0_0_0_3px_color-mix(in_oklch,var(--primary)_25%,transparent)]"
        style={{
          background: `linear-gradient(to right, var(--primary) ${percent}%, color-mix(in oklch, var(--border) 70%, transparent) ${percent}%)`,
        }}
      />
    </div>
  );
}

/** Compact OptionCard-style tile with a visual (icon or swatch) + selection ring. */
export function ChoiceTile({
  label,
  description,
  icon: Icon,
  swatch,
  selected,
  onSelect,
  disabled,
  className,
}: {
  label: string;
  description?: string;
  icon?: LucideIcon;
  /** CSS background for a material sample. */
  swatch?: string;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "group relative flex min-w-0 items-center gap-2 rounded-xl border p-2 text-left transition-all duration-200 motion-reduce:transition-none",
        "border-border/40 bg-card/35 hover:border-primary/30 hover:bg-card/60 active:scale-[0.99]",
        "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-50",
        selected &&
          "border-primary/50 bg-primary/10 shadow-[inset_0_0_0_1px_oklch(0.76_0.15_88/20%)]",
        className
      )}
    >
      {swatch ? (
        <span
          className={cn(
            "size-7 shrink-0 rounded-lg ring-1 ring-border/50 shadow-inner",
            selected && "ring-primary/60"
          )}
          style={{ background: swatch }}
          aria-hidden="true"
        />
      ) : Icon ? (
        <span
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-lg transition-colors",
            selected
              ? "bg-primary/20 text-primary"
              : "bg-primary/10 text-primary/80 group-hover:text-primary"
          )}
        >
          <Icon className="size-3.5" aria-hidden="true" />
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.72rem] font-medium leading-tight text-foreground">
          {label}
        </span>
        {description ? (
          <span className="block truncate text-[0.62rem] leading-tight text-muted-foreground">
            {description}
          </span>
        ) : null}
      </span>
      <SelectionRing selected={selected} />
    </button>
  );
}

export function SelectionRing({
  selected,
  className,
}: {
  selected: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex size-4 shrink-0 items-center justify-center rounded-full border transition-all duration-200",
        selected
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border/60 bg-background/50 text-transparent",
        className
      )}
      aria-hidden="true"
    >
      <Check className="size-2.5" strokeWidth={3} />
    </span>
  );
}

/** Drape colour swatch cards in a dense grid, with an optional "none" card. */
export function SwatchGrid({
  value,
  onChange,
  noneLabel,
  label,
  mixed,
}: {
  value: DrapeColor | null | undefined;
  onChange: (value: DrapeColor | null) => void;
  /** When set, renders a leading "none" card that selects `null`. */
  noneLabel?: string;
  label: string;
  /** Multi-selection with differing values. */
  mixed?: boolean;
}) {
  const current = DRAPE_COLORS.find((color) => color.value === value);
  return (
    <div className="space-y-1.5">
      <FieldLabel
        hint={
          mixed ? (
            "Mixed"
          ) : (
            <span className="text-foreground/80">
              {value === null ? noneLabel : current?.label ?? "Default"}
            </span>
          )
        }
      >
        {label}
      </FieldLabel>
      <div
        role="radiogroup"
        aria-label={label}
        className="grid grid-cols-6 gap-1.5"
      >
        {noneLabel ? (
          <SwatchButton
            label={noneLabel}
            selected={!mixed && value === null}
            onSelect={() => onChange(null)}
            background="repeating-linear-gradient(135deg, transparent 0 5px, color-mix(in oklch, var(--muted-foreground) 35%, transparent) 5px 6px)"
          />
        ) : null}
        {DRAPE_COLORS.map((color) => (
          <SwatchButton
            key={color.value}
            label={color.label}
            selected={!mixed && value === color.value}
            onSelect={() => onChange(color.value)}
            background={color.hex}
          />
        ))}
      </div>
    </div>
  );
}

function SwatchButton({
  label,
  selected,
  onSelect,
  background,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
  background: string;
}) {
  return (
    <StudioTip label={label}>
      <button
        type="button"
        role="radio"
        aria-checked={selected}
        aria-label={label}
        onClick={onSelect}
        className={cn(
          "group relative flex aspect-square items-center justify-center rounded-xl border p-1 transition-all duration-200 motion-reduce:transition-none",
          "border-border/40 bg-card/35 hover:-translate-y-px hover:border-primary/30",
          "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
          selected && "border-primary/60 bg-primary/10"
        )}
      >
        <span
          className={cn(
            "size-full rounded-full shadow-inner ring-1 ring-border/50",
            selected && "ring-2 ring-primary/70"
          )}
          style={{ background }}
        />
        {selected ? (
          <span className="absolute -top-1 -right-1 flex size-3.5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
            <Check className="size-2.5" strokeWidth={3} aria-hidden="true" />
          </span>
        ) : null}
      </button>
    </StudioTip>
  );
}

export function StatTile({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border/40 bg-card/30 p-3",
        className
      )}
    >
      <div
        className="pointer-events-none absolute -top-6 -right-6 size-16 rounded-full bg-primary/10 blur-xl"
        aria-hidden="true"
      />
      <div className="flex items-center gap-1.5 text-primary">
        <Icon className="size-3.5" aria-hidden="true" />
        <p className="text-[0.58rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
          {label}
        </p>
      </div>
      <p className="mt-1.5 font-heading text-lg leading-none tabular-nums">
        {value}
      </p>
    </div>
  );
}

/** Square icon action with a tooltip. */
export function IconAction({
  icon: Icon,
  label,
  onClick,
  active,
  destructive,
  disabled,
  shortcut,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  active?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  shortcut?: string;
}) {
  return (
    <StudioTip label={label} shortcut={shortcut} side="bottom">
      {/* Span keeps the tooltip working while the button is disabled. */}
      <span className="flex min-w-9 flex-1">
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
          aria-pressed={active}
          className={cn(
            "flex h-9 min-w-9 flex-1 items-center justify-center rounded-xl border transition-all duration-200 motion-reduce:transition-none",
            "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-40",
            destructive
              ? "border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20"
              : active
                ? "border-primary/50 bg-primary/15 text-primary"
                : "border-border/40 bg-card/35 text-muted-foreground hover:border-primary/30 hover:text-primary"
          )}
        >
          <Icon className="size-4" aria-hidden="true" />
        </button>
      </span>
    </StudioTip>
  );
}

export function Keycap({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-current/25 bg-current/10 px-1 font-mono text-[0.62rem] leading-none font-medium",
        className
      )}
    >
      {children}
    </kbd>
  );
}

/** Switch-style toggle row (icon + label + track). */
export function ToggleRow({
  icon: Icon,
  label,
  description,
  checked,
  onChange,
}: {
  icon: LucideIcon;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition-colors",
        "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
        checked
          ? "border-primary/40 bg-primary/10"
          : "border-border/40 bg-card/30 hover:border-primary/25"
      )}
    >
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-lg",
          checked ? "bg-primary/20 text-primary" : "bg-muted/40 text-muted-foreground"
        )}
      >
        <Icon className="size-3.5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-medium">{label}</span>
        {description ? (
          <span className="block text-[0.62rem] text-muted-foreground">
            {description}
          </span>
        ) : null}
      </span>
      <span
        className={cn(
          "relative h-4.5 w-8 shrink-0 rounded-full transition-colors",
          checked ? "bg-primary" : "bg-muted"
        )}
        aria-hidden="true"
      >
        <span
          className={cn(
            "absolute top-0.5 size-3.5 rounded-full bg-background shadow transition-[left] duration-200",
            checked ? "left-4" : "left-0.5"
          )}
        />
      </span>
    </button>
  );
}

export function TextField({
  label,
  value,
  onChange,
  maxLength = 160,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  placeholder?: string;
}) {
  const id = useId();
  return (
    <div className="space-y-1">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 rounded-xl bg-background/50 text-sm"
      />
    </div>
  );
}
