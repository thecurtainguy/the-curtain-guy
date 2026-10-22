"use client";

import type { StudioOpeningStyle } from "@/data/studio";
import {
  STUDIO_OPENING_PRESETS,
  type StudioOpeningPreset,
  type StudioOpeningPresetGroup,
} from "@/data/studio-openings";
import { cn } from "@/lib/utils";
import { OpeningStyleGlyph } from "../openings/opening-style-glyph";
import { SelectionRing } from "./inspector-ui";

const GROUPS: { group: StudioOpeningPresetGroup; label: string }[] = [
  { group: "doors", label: "Doors & entrances" },
  { group: "windows", label: "Windows" },
];

/** Style tiles (elevation glyph + size line) grouped doors / windows. */
export function OpeningStylePicker({
  value,
  disabled,
  onSelect,
}: {
  value: StudioOpeningStyle;
  disabled?: boolean;
  onSelect: (preset: StudioOpeningPreset) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Opening style" className="space-y-3">
      {GROUPS.map(({ group, label }) => (
        <div key={group} className="space-y-1.5">
          <p className="text-[0.58rem] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
            {label}
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {STUDIO_OPENING_PRESETS.filter((preset) => preset.group === group).map(
              (preset) => (
                <OpeningStyleTile
                  key={preset.style}
                  preset={preset}
                  selected={preset.style === value}
                  disabled={disabled}
                  onSelect={() => onSelect(preset)}
                />
              )
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function OpeningStyleTile({
  preset,
  selected,
  disabled,
  onSelect,
}: {
  preset: StudioOpeningPreset;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "group relative flex min-w-0 flex-col items-stretch gap-1.5 rounded-2xl border p-1.5 text-left transition-all duration-200 motion-reduce:transition-none",
        "border-border/40 bg-card/35 hover:border-primary/30 hover:bg-card/60 active:scale-[0.99]",
        "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-50",
        selected &&
          "border-primary/50 bg-primary/10 shadow-[inset_0_0_0_1px_oklch(0.76_0.15_88/20%)]"
      )}
    >
      <span
        className={cn(
          "flex h-14 items-center justify-center rounded-xl border bg-[radial-gradient(circle_at_50%_30%,color-mix(in_oklch,var(--primary)_14%,transparent),transparent_70%)] transition-colors",
          selected
            ? "border-primary/30 text-primary"
            : "border-border/30 text-primary/70 group-hover:text-primary"
        )}
      >
        <OpeningStyleGlyph style={preset.style} className="size-12" />
      </span>
      <span className="min-w-0 px-0.5 pb-0.5">
        <span className="block truncate text-[0.7rem] font-medium leading-tight text-foreground">
          {preset.label}
        </span>
        <span className="line-clamp-2 text-[0.6rem] leading-tight text-muted-foreground">
          {preset.description}
        </span>
      </span>
      <SelectionRing selected={selected} className="absolute top-2.5 right-2.5" />
    </button>
  );
}
