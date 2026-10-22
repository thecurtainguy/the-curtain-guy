"use client";

import { useMemo } from "react";
import Image from "next/image";
import { CloudSun, MapPin, Plus, Sparkles } from "lucide-react";
import {
  EVENT_CATALOG_CATEGORIES,
  getSelectableCatalogItems,
} from "@/data/event-builder/catalog";
import type { EventBuilderBrief } from "@/data/event-builder/brief";
import type { StudioDesignJson } from "@/data/studio";
import { STUDIO_CEILING_PRESETS } from "@/data/studio-ceiling-presets";
import {
  addCatalogItemWithLook,
  addCeilingPresetWithLook,
} from "@/lib/event-builder/build-starter-design";
import { computeEventWallRoles, getWallRoleForIndex } from "@/lib/event-builder/wall-roles";
import { getWallSegments } from "@/lib/studio-geometry";
import { CeilingStyleArt } from "@/components/studio/library/ceiling-style-art";
import { LibraryCard, LibrarySectionHeading } from "@/components/studio/library/studio-library-ui";
import type { StudioSelection } from "@/components/studio/studio-types";
import { useWizardCatalog } from "@/components/event-builder/use-wizard-catalog";
import { useWizardCopy } from "@/components/event-builder/wizard-copy";
import { cn } from "@/lib/utils";

type EventPresetLibraryProps = {
  design: StudioDesignJson;
  onChange: (design: StudioDesignJson) => void;
  selection: StudioSelection;
  onSelect: (selection: StudioSelection) => void;
  brief: EventBuilderBrief;
  idPrefix: string;
};

/** Studio library "Event" tab: the wizard's setups and ceiling looks, placed with the brief's styling. */
export function EventPresetLibrary({
  design,
  onChange,
  selection,
  onSelect,
  brief,
  idPrefix,
}: EventPresetLibraryProps) {
  const copy = useWizardCopy();
  const catalog = useWizardCatalog();
  const walls = getWallSegments(design.room.floor);
  const selectedWall =
    selection?.kind === "wall" && walls[selection.index] ? selection.index : undefined;
  const roles = useMemo(() => computeEventWallRoles(design.room.floor), [design.room.floor]);
  const selectedRole = selectedWall !== undefined ? getWallRoleForIndex(roles, selectedWall) : null;

  const groups = useMemo(() => {
    const items = getSelectableCatalogItems().filter((item) => item.apply && !item.briefOnly);
    return EVENT_CATALOG_CATEGORIES.map((category) => ({
      id: category.id,
      label: catalog.categories.find((entry) => entry.id === category.id)?.label ?? category.label,
      items: items.filter((item) => item.category === category.id).map(catalog.localizeItem),
    })).filter((group) => group.items.length > 0);
  }, [catalog]);

  function addSetup(itemId: string) {
    const next = addCatalogItemWithLook(design, brief, itemId, selectedWall);
    if (!next) return;
    onChange(next);
    const known = new Set(design.treatments.map((treatment) => treatment.id));
    const added = next.treatments.find((treatment) => !known.has(treatment.id));
    if (added) onSelect({ kind: "treatment", id: added.id });
  }

  function addCeiling(presetId: string) {
    const next = addCeilingPresetWithLook(design, brief, presetId);
    if (!next) return;
    onChange(next);
    const drapes = next.ceilingDrapes ?? [];
    const added = drapes[drapes.length - 1];
    if (added) onSelect({ kind: "ceiling", id: added.id });
  }

  const target =
    selectedWall === undefined
      ? copy.studio.autoPlacement
      : copy.studio.wallTarget(selectedWall + 1, selectedRole ? copy.walls[selectedRole] : null);

  return (
    <div className="space-y-3">
      <LibraryCard aria-labelledby={`${idPrefix}-heading`}>
        <LibrarySectionHeading
          icon={Sparkles}
          eyebrow={copy.studio.eyebrow}
          title={copy.studio.title}
          id={`${idPrefix}-heading`}
        />
        <p
          className={cn(
            "inline-flex max-w-full items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px]",
            selectedWall === undefined
              ? "border-border/40 text-muted-foreground"
              : "border-primary/35 bg-primary/10 text-foreground"
          )}
        >
          <MapPin className="size-3 shrink-0 text-primary" aria-hidden />
          <span className="truncate">{target}</span>
        </p>
      </LibraryCard>

      {groups.map((group) => (
        <LibraryCard key={group.id} aria-label={group.label}>
          <p className="text-[0.6rem] font-semibold tracking-[0.2em] text-primary uppercase">
            {group.label}
          </p>
          <div className="grid gap-2 @xl:grid-cols-2 @4xl:grid-cols-3">
            {group.items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => addSetup(item.id)}
                className="group flex w-full gap-3 rounded-2xl border border-border/40 bg-card/30 p-2 text-left transition-colors hover:border-primary/35 hover:bg-card/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="relative size-14 shrink-0 overflow-hidden rounded-xl">
                  <Image src={item.image} alt="" fill className="object-cover" sizes="56px" />
                </span>
                <span className="min-w-0 flex-1 py-0.5">
                  <span className="block text-xs font-semibold leading-snug">{item.label}</span>
                  <span className="mt-0.5 line-clamp-2 block text-[10px] text-muted-foreground">
                    {item.description}
                  </span>
                  {selectedWall === undefined && catalog.placementLabel(item) ? (
                    <span className="mt-1 block text-[10px] text-primary">
                      {catalog.placementLabel(item)}
                    </span>
                  ) : null}
                </span>
                <span className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-full border border-primary/40 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Plus className="size-3.5" aria-hidden />
                </span>
              </button>
            ))}
          </div>
        </LibraryCard>
      ))}

      <LibraryCard aria-labelledby={`${idPrefix}-ceiling-heading`}>
        <LibrarySectionHeading
          icon={CloudSun}
          eyebrow={copy.steps.ceiling.label}
          title={copy.studio.ceilingTitle}
          id={`${idPrefix}-ceiling-heading`}
        />
        <div className="grid grid-cols-2 gap-2 @xl:grid-cols-4 @4xl:grid-cols-6">
          {STUDIO_CEILING_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => addCeiling(preset.id)}
              className="group overflow-hidden rounded-2xl border border-border/40 bg-card/30 text-left transition-colors hover:border-primary/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="relative block h-16 border-b border-border/30 bg-background/50">
                <CeilingStyleArt
                  style={preset.style}
                  color={preset.overrides.color}
                  accentColor={preset.overrides.accentColor}
                  lights={preset.overrides.lights}
                  lightColor={preset.overrides.lightColor}
                  hubDecor={preset.overrides.hubDecor}
                  className="absolute inset-0 h-full w-full"
                />
                <span className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full border border-primary/40 bg-background/70 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Plus className="size-3" aria-hidden />
                </span>
              </span>
              <span className="block truncate px-2 py-1.5 text-[11px] font-medium">
                {preset.label}
              </span>
            </button>
          ))}
        </div>
      </LibraryCard>
    </div>
  );
}
