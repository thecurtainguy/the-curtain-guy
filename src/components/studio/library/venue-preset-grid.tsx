"use client";

import { useBrandConfirm } from "@/components/ui/brand-dialog";
import { getStudioMaterials, type StudioDesignJson } from "@/data/studio";
import {
  STUDIO_VENUE_PRESETS,
  type StudioVenuePreset,
} from "@/data/studio-venue-presets";
import { cn } from "@/lib/utils";
import { Building2 } from "lucide-react";
import { StudioTip } from "../studio-tip";
import { STUDIO_VENUE_ICONS } from "./studio-library-icons";
import { SelectionDot, matchesLibraryQuery } from "./studio-library-ui";
import {
  applyVenuePreset,
  venuePresetClearsWallItems,
} from "./studio-room-tools";

export function filterVenuePresets(query: string) {
  return STUDIO_VENUE_PRESETS.filter((preset) =>
    matchesLibraryQuery(
      query,
      preset.label,
      preset.description,
      preset.shape,
      preset.floorFinish,
      preset.wallFinish,
      "venue room preset"
    )
  );
}

function isPresetActive(design: StudioDesignJson, preset: StudioVenuePreset) {
  const materials = getStudioMaterials(design);
  if (design.room.name !== preset.roomName) return false;
  if (design.room.shape !== preset.shape) return false;
  if (materials.floor !== preset.floorFinish) return false;
  if (preset.shape === "custom") return true;
  const dims = design.room.templateDimensions;
  return dims?.width === preset.width && dims?.length === preset.length;
}

export function VenuePresetGrid({
  design,
  onChange,
  query = "",
}: {
  design: StudioDesignJson;
  onChange: (design: StudioDesignJson) => void;
  query?: string;
}) {
  const [confirm, confirmDialog] = useBrandConfirm();
  const presets = filterVenuePresets(query);

  async function apply(preset: StudioVenuePreset) {
    if (
      venuePresetClearsWallItems(design, preset) &&
      !(await confirm({
        icon: Building2,
        eyebrow: "Venue preset",
        title: `Switch to ${preset.label}?`,
        description:
          "This venue has a different wall layout, so current drape runs, treatments and door markers will be removed. Furniture is kept and re-fitted.",
        confirmLabel: "Apply venue",
      }))
    ) {
      return;
    }
    onChange(applyVenuePreset(design, preset));
  }

  if (presets.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-2 gap-2 @xl:grid-cols-3 @3xl:grid-cols-4 @6xl:grid-cols-6">
        {presets.map((preset) => {
          const Icon = STUDIO_VENUE_ICONS[preset.icon];
          const active = isPresetActive(design, preset);
          return (
            <StudioTip key={preset.key} label={preset.description}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => void apply(preset)}
                className={cn(
                  "group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border text-left transition-all duration-200 motion-reduce:transition-none",
                  "border-border/40 bg-card/30 hover:-translate-y-px hover:border-primary/35 motion-reduce:hover:translate-y-0",
                  "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
                  active &&
                    "border-primary/55 shadow-[inset_0_0_0_1px_oklch(0.76_0.15_88/25%)]"
                )}
              >
                <span
                  className="relative flex h-14 items-end p-2"
                  style={{ background: preset.backdrop }}
                >
                  <span className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                  <span className="relative flex size-7 items-center justify-center rounded-lg border border-white/15 bg-black/35 text-primary backdrop-blur-sm">
                    <Icon className="size-3.5" aria-hidden />
                  </span>
                  <span className="relative ml-auto rounded-md bg-black/45 px-1.5 py-0.5 text-[0.58rem] font-medium text-white/90 tabular-nums backdrop-blur-sm">
                    {Math.round(preset.width / 12)}×{Math.round(preset.length / 12)}′
                  </span>
                  <SelectionDot
                    selected={active}
                    className="absolute top-1.5 right-1.5"
                  />
                </span>
                <span className="min-w-0 p-2">
                  <span className="block truncate text-xs font-semibold text-foreground">
                    {preset.label}
                  </span>
                  <span className="mt-0.5 block truncate text-[0.6rem] text-muted-foreground">
                    {preset.description}
                  </span>
                </span>
              </button>
            </StudioTip>
          );
        })}
      </div>
      {confirmDialog}
    </>
  );
}
