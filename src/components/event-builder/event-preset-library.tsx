"use client";

import Image from "next/image";
import {
  getSelectableCatalogItems,
  type EventCatalogItem,
} from "@/data/event-builder/catalog";
import type { EventBuilderBrief } from "@/data/event-builder/brief";
import type { StudioDesignJson } from "@/data/studio";
import { createStudioTreatment } from "@/lib/studio-treatments";
import { getWallSegments } from "@/lib/studio-geometry";
import type { StudioSelection } from "@/components/studio/studio-types";

type EventPresetLibraryProps = {
  design: StudioDesignJson;
  onChange: (design: StudioDesignJson) => void;
  selection: StudioSelection;
  onSelect: (selection: StudioSelection) => void;
  brief: EventBuilderBrief;
};

export function EventPresetLibrary({
  design,
  onChange,
  selection,
  onSelect,
  brief,
}: EventPresetLibraryProps) {
  const walls = getWallSegments(design.room.floor);
  const selectedWall =
    selection?.kind === "wall" && walls[selection.index]
      ? selection.index
      : 0;

  const presets = getSelectableCatalogItems().filter(
    (item) => item.apply && !item.briefOnly
  );

  function addFromCatalog(item: EventCatalogItem) {
    if (!item.apply) return;
    const presetMap: Record<string, Parameters<typeof createStudioTreatment>[2]> = {
      backdrop_full: "full_backdrop",
      backdrop_head_table: "full_backdrop",
      backdrop_stage: "full_backdrop",
      entrance_door_drape: "side_tiebacks",
      entrance_tunnel: "entrance_reveal",
      ceremony_chuppah: "ceremony_arch",
      top_swag: "top_swag",
    };

    const preset = presetMap[item.id];
    if (preset) {
      const wallIndex =
        item.id === "backdrop_head_table" ? 2 : selectedWall;
      const treatment = createStudioTreatment(design, wallIndex, preset);
      if (!treatment) return;
      onChange({
        ...design,
        treatments: [...design.treatments, treatment],
      });
      onSelect({ kind: "treatment", id: treatment.id });
      return;
    }

    onChange(item.apply(design, brief));
  }

  return (
    <div className="flex h-full flex-col gap-3 p-3">
      <div>
        <p className="text-[0.58rem] font-semibold tracking-[0.22em] text-primary uppercase">
          Event setups
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Tap to add setups to your room.
        </p>
      </div>
      <div className="grid gap-2 overflow-y-auto pr-1">
        {presets.slice(0, 10).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => addFromCatalog(item)}
            className="group flex gap-3 rounded-2xl border border-border/40 bg-card/30 p-2 text-left transition-colors hover:border-primary/35 hover:bg-card/50"
          >
            <div className="relative size-14 shrink-0 overflow-hidden rounded-xl">
              <Image
                src={item.image}
                alt=""
                fill
                className="object-cover"
                sizes="56px"
              />
            </div>
            <div className="min-w-0 py-0.5">
              <p className="text-xs font-semibold leading-snug">{item.label}</p>
              <p className="mt-0.5 line-clamp-2 text-[10px] text-muted-foreground">
                {item.description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
