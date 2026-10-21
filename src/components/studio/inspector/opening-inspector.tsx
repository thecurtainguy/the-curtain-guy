"use client";

import {
  STUDIO_OPENING_TYPES,
  type StudioDesignJson,
  type StudioOpening,
} from "@/data/studio";
import { getWallSegments, inchesToFeetLabel } from "@/lib/studio-geometry";
import { cn } from "@/lib/utils";
import { DoorOpen, Lock, PanelsTopLeft, Ruler } from "lucide-react";
import { useStudioEditor } from "../editor/studio-editor-context";
import { updateOpening } from "../studio-types";
import {
  ChoiceTile,
  InspectorSection,
  LengthField,
  SelectionRing,
} from "./inspector-ui";
import { ItemHeader, StatusChip } from "./item-header";
import { STUDIO_OPENING_META } from "./studio-item-meta";

const DEFAULT_OPENING_HEIGHT = { door: 84, entrance: 96, window: 60 } as const;
const DEFAULT_SILL = { door: 0, entrance: 0, window: 36 } as const;

export function OpeningInspector({
  design,
  opening,
  onChange,
}: {
  design: StudioDesignJson;
  opening: StudioOpening;
  onChange: (design: StudioDesignJson) => void;
}) {
  const { settings } = useStudioEditor();
  const walls = getWallSegments(design.room.floor);
  const wall = walls[opening.wallIndex];
  const wallLength = wall?.length ?? opening.offset + opening.width;
  const locked = Boolean(opening.locked);
  const step = settings.snapEnabled ? settings.snapIncrement : 1;
  const meta = STUDIO_OPENING_META[opening.type];
  const update = (patch: Partial<StudioOpening>) =>
    onChange(updateOpening(design, opening.id, patch));
  const openingHeight =
    opening.openingHeight ?? DEFAULT_OPENING_HEIGHT[opening.type];
  const sillHeight = opening.sillHeight ?? DEFAULT_SILL[opening.type];

  return (
    <div className="space-y-3">
      <ItemHeader
        icon={meta.icon}
        eyebrow={`Opening · Wall ${opening.wallIndex + 1}`}
        label={opening.label}
        onLabelChange={(label) => update({ label })}
        locked={locked}
        hidden={opening.hidden}
        meta={<StatusChip>{inchesToFeetLabel(opening.width)} wide</StatusChip>}
      />

      {locked ? (
        <div className="flex items-center gap-2 rounded-2xl border border-primary/25 bg-primary/5 px-3 py-2 text-[0.7rem] text-muted-foreground">
          <Lock className="size-3.5 text-primary" aria-hidden="true" />
          Locked — unlock to move or resize.
        </div>
      ) : null}

      <InspectorSection icon={DoorOpen} eyebrow="Type" title="Opening style">
        <div role="radiogroup" aria-label="Opening type" className="grid gap-1.5">
          {STUDIO_OPENING_TYPES.map((type) => (
            <ChoiceTile
              key={type}
              icon={STUDIO_OPENING_META[type].icon}
              label={STUDIO_OPENING_META[type].label}
              description={STUDIO_OPENING_META[type].description}
              selected={opening.type === type}
              disabled={locked}
              onSelect={() => update({ type })}
            />
          ))}
        </div>
      </InspectorSection>

      <InspectorSection
        icon={PanelsTopLeft}
        eyebrow="Placement"
        title={`Wall ${opening.wallIndex + 1} · ${inchesToFeetLabel(wallLength)}`}
      >
        <div
          role="radiogroup"
          aria-label="Wall"
          className="grid max-h-40 grid-cols-3 gap-1.5 overflow-y-auto pr-0.5"
        >
          {walls.map((item) => {
            const selected = item.index === opening.wallIndex;
            return (
              <button
                key={item.index}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={locked}
                onClick={() =>
                  update({
                    wallIndex: item.index,
                    offset: Math.max(0, item.length / 2 - opening.width / 2),
                    width: Math.min(opening.width, item.length),
                  })
                }
                className={cn(
                  "relative flex flex-col items-start rounded-xl border p-2 text-left transition-colors disabled:opacity-50",
                  "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
                  selected
                    ? "border-primary/50 bg-primary/10"
                    : "border-border/40 bg-card/35 hover:border-primary/30"
                )}
              >
                <SelectionRing selected={selected} className="absolute top-1.5 right-1.5" />
                <span className="text-[0.7rem] font-medium">Wall {item.index + 1}</span>
                <span className="text-[0.6rem] text-muted-foreground">
                  {inchesToFeetLabel(item.length)}
                </span>
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <LengthField
            label="Offset"
            hint="from wall start"
            value={opening.offset}
            step={step}
            min={0}
            max={Math.max(0, wallLength - opening.width)}
            disabled={locked}
            onChange={(offset) => update({ offset })}
          />
          <LengthField
            label="Width"
            value={opening.width}
            step={step}
            min={12}
            max={wallLength}
            disabled={locked}
            onChange={(width) => update({ width })}
          />
        </div>
        <WallPositionBar
          wallLength={wallLength}
          offset={opening.offset}
          width={opening.width}
        />
      </InspectorSection>

      <InspectorSection icon={Ruler} eyebrow="Elevation" title="Heights">
        <div className="grid grid-cols-2 gap-2">
          <LengthField
            label="Opening height"
            value={openingHeight}
            step={step}
            min={12}
            max={Math.min(600, design.room.wallHeight)}
            disabled={locked}
            onChange={(next) => update({ openingHeight: next })}
          />
          {opening.type === "window" ? (
            <LengthField
              label="Sill height"
              value={sillHeight}
              step={step}
              min={0}
              max={Math.max(0, design.room.wallHeight - openingHeight)}
              disabled={locked}
              onChange={(next) => update({ sillHeight: next })}
            />
          ) : null}
        </div>
      </InspectorSection>
    </div>
  );
}

function WallPositionBar({
  wallLength,
  offset,
  width,
}: {
  wallLength: number;
  offset: number;
  width: number;
}) {
  const safe = Math.max(1, wallLength);
  return (
    <div className="space-y-1" aria-hidden="true">
      <div className="relative h-2.5 overflow-hidden rounded-full bg-muted/50">
        <div
          className="absolute inset-y-0 rounded-full bg-gradient-to-r from-primary/70 to-primary"
          style={{
            left: `${(offset / safe) * 100}%`,
            width: `${Math.max(1, (width / safe) * 100)}%`,
          }}
        />
      </div>
      <div className="flex justify-between text-[0.58rem] text-muted-foreground">
        <span>Start</span>
        <span>{inchesToFeetLabel(wallLength)}</span>
      </div>
    </div>
  );
}
