"use client";

import { AppWindow, DoorOpen, Plus, type LucideIcon } from "lucide-react";
import type { StudioDesignJson, StudioOpeningStyle } from "@/data/studio";
import {
  STUDIO_OPENING_PRESETS,
  createOpeningFromPreset,
  getOpeningStyle,
  type StudioOpeningPreset,
  type StudioOpeningPresetGroup,
} from "@/data/studio-openings";
import { cn } from "@/lib/utils";
import { matchesLibraryQuery } from "../library/studio-library-ui";
import { StudioTip } from "../studio-tip";
import type { StudioSelection } from "../studio-types";
import { OpeningStyleGlyph } from "./opening-style-glyph";

/** Design validation rejects more openings than this. */
export const STUDIO_MAX_OPENINGS = 100;

const GROUPS: Array<{
  value: StudioOpeningPresetGroup;
  label: string;
  icon: LucideIcon;
  terms: string;
}> = [
  {
    value: "doors",
    label: "Doors & entrances",
    icon: DoorOpen,
    terms: "door doors entrance entry doorway",
  },
  {
    value: "windows",
    label: "Windows",
    icon: AppWindow,
    terms: "window windows glazing glass",
  },
];

const GROUP_TERMS = Object.fromEntries(
  GROUPS.map((group) => [group.value, group.terms])
) as Record<StudioOpeningPresetGroup, string>;

export function filterOpeningPresets(
  query: string,
  extraTerms = ""
): StudioOpeningPreset[] {
  return STUDIO_OPENING_PRESETS.filter((preset) =>
    matchesLibraryQuery(
      query,
      preset.label,
      preset.description,
      preset.type,
      GROUP_TERMS[preset.group],
      "opening architecture",
      extraTerms
    )
  );
}

export type OpeningTargetWall = { index: number; length: number };

/**
 * Door & window preset tiles, grouped. Clicking a tile drops the preset on
 * `wall` (auto-centred, clear of existing openings) and selects it.
 */
export function OpeningPresetGrid({
  design,
  wall,
  onChange,
  onSelect,
  query = "",
  searchTerms,
  idPrefix,
  className,
}: {
  design: StudioDesignJson;
  wall: OpeningTargetWall | undefined;
  onChange: (design: StudioDesignJson) => void;
  onSelect?: (selection: StudioSelection) => void;
  query?: string;
  /** Extra words every tile matches, e.g. the host tab's own keywords. */
  searchTerms?: string;
  idPrefix: string;
  className?: string;
}) {
  const presets = filterOpeningPresets(query, searchTerms);
  const full = design.openings.length >= STUDIO_MAX_OPENINGS;
  const wallLabel = wall ? `Wall ${wall.index + 1}` : "a wall";
  const placed = new Map<StudioOpeningStyle, number>();
  for (const opening of design.openings) {
    const style = getOpeningStyle(opening);
    placed.set(style, (placed.get(style) ?? 0) + 1);
  }

  function add(preset: StudioOpeningPreset) {
    if (!wall || full) return;
    const opening = createOpeningFromPreset(design, preset.style, wall.index, wall.length);
    onChange({ ...design, openings: [...design.openings, opening] });
    onSelect?.({ kind: "opening", id: opening.id });
  }

  return (
    <div className={cn("@container space-y-3", className)}>
      {GROUPS.map((group) => {
        const items = presets.filter((preset) => preset.group === group.value);
        if (items.length === 0) return null;
        const headingId = `${idPrefix}-${group.value}-heading`;
        const GroupIcon = group.icon;
        return (
          <div key={group.value} role="group" aria-labelledby={headingId} className="space-y-1.5">
            <p
              id={headingId}
              className="flex items-center gap-1.5 px-0.5 text-[0.58rem] font-semibold tracking-[0.18em] text-primary/90 uppercase"
            >
              <GroupIcon className="size-3" aria-hidden />
              {group.label}
              <span className="h-px flex-1 bg-border/50" aria-hidden />
              <span className="text-muted-foreground tabular-nums">{items.length}</span>
            </p>
            <div className="grid grid-cols-2 gap-1.5 @sm:grid-cols-3 @2xl:grid-cols-4 @5xl:grid-cols-6">
              {items.map((preset) => (
                <OpeningPresetTile
                  key={preset.style}
                  preset={preset}
                  count={placed.get(preset.style) ?? 0}
                  wallLabel={wallLabel}
                  disabled={!wall || full}
                  onAdd={() => add(preset)}
                />
              ))}
            </div>
          </div>
        );
      })}
      {full ? (
        <p
          role="status"
          className="rounded-xl border border-primary/25 bg-primary/5 p-2 text-[0.64rem] leading-relaxed text-muted-foreground"
        >
          <span className="font-medium text-foreground">
            {STUDIO_MAX_OPENINGS} openings placed — that’s the limit.
          </span>{" "}
          Remove one from the plan or the layers panel to add another.
        </p>
      ) : null}
    </div>
  );
}

function OpeningPresetTile({
  preset,
  count,
  wallLabel,
  disabled,
  onAdd,
}: {
  preset: StudioOpeningPreset;
  count: number;
  wallLabel: string;
  disabled: boolean;
  onAdd: () => void;
}) {
  return (
    <StudioTip
      label={disabled ? undefined : `Add ${preset.label.toLowerCase()} to ${wallLabel}`}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={onAdd}
        aria-label={`Add ${preset.label} (${preset.description}) to ${wallLabel}`}
        className={cn(
          "group relative flex min-w-0 flex-col gap-1.5 rounded-2xl border border-border/40 bg-card/30 p-1.5 text-left transition-all duration-200 motion-reduce:transition-none",
          "hover:-translate-y-px hover:border-primary/35 hover:bg-primary/5 active:scale-[0.99] motion-reduce:hover:translate-y-0",
          "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
          "disabled:pointer-events-none disabled:opacity-45"
        )}
      >
        <span className="relative flex h-14 items-center justify-center overflow-hidden rounded-xl border border-border/30 bg-background/45 bg-[radial-gradient(ellipse_at_50%_0%,color-mix(in_oklch,var(--primary)_14%,transparent),transparent_70%)] text-primary">
          <OpeningStyleGlyph
            style={preset.style}
            className="size-12 transition-transform duration-200 group-hover:scale-105 motion-reduce:group-hover:scale-100"
          />
          <span
            aria-hidden
            className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full border border-border/60 bg-background/70 text-muted-foreground transition-colors group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground"
          >
            <Plus className="size-2.5" strokeWidth={3.5} />
          </span>
          {count > 0 ? (
            <span className="absolute bottom-1 left-1 rounded-md bg-primary/15 px-1 text-[0.55rem] font-semibold text-primary tabular-nums">
              ×{count}
            </span>
          ) : null}
        </span>
        <span className="min-w-0 px-0.5 pb-0.5">
          <span className="block truncate text-[0.68rem] font-semibold text-foreground">
            {preset.label}
          </span>
          <span className="mt-0.5 block truncate text-[0.58rem] leading-tight text-muted-foreground">
            {preset.description}
          </span>
        </span>
      </button>
    </StudioTip>
  );
}
