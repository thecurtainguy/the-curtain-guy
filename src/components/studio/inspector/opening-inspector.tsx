"use client";

import type { StudioDesignJson, StudioOpening } from "@/data/studio";
import {
  OPENING_QUICK_HEIGHTS,
  OPENING_QUICK_WIDTHS,
  getOpeningPresetSize,
  getOpeningStyle,
  getOpeningStylePreset,
  type StudioOpeningPreset,
} from "@/data/studio-openings";
import { getWallSegments, inchesToFeetLabel } from "@/lib/studio-geometry";
import { cn } from "@/lib/utils";
import { DoorOpen, Lock, PanelsTopLeft, Ruler } from "lucide-react";
import { useMemo } from "react";
import {
  useStudioSettings,
  type StudioCommitOptions,
} from "../editor/studio-editor-context";
import { updateOpening } from "../studio-types";
import { InspectorSection, LengthField, SelectionRing } from "./inspector-ui";
import { ItemHeader, StatusChip } from "./item-header";
import { OpeningDressSection } from "./opening-dress-section";
import { OpeningSizePicks } from "./opening-size-picks";
import { OpeningStylePicker } from "./opening-style-picker";
import { STUDIO_OPENING_META } from "./studio-item-meta";

const DEFAULT_OPENING_HEIGHT = { door: 84, entrance: 96, window: 60 } as const;
const DEFAULT_SILL = { door: 0, entrance: 0, window: 36 } as const;
const QUICK_SILLS = [0, 6, 24, 30, 36, 42] as const;

export function OpeningInspector({
  design,
  opening,
  onChange,
}: {
  design: StudioDesignJson;
  opening: StudioOpening;
  onChange: (design: StudioDesignJson, options?: StudioCommitOptions) => void;
}) {
  const settings = useStudioSettings();
  const floor = design.room.floor;
  const walls = useMemo(() => getWallSegments(floor), [floor]);
  const wall = walls[opening.wallIndex];
  const wallLength = wall?.length ?? opening.offset + opening.width;
  const locked = Boolean(opening.locked);
  const step = settings.snapEnabled ? settings.snapIncrement : 1;
  const meta = STUDIO_OPENING_META[opening.type];
  const update = (patch: Partial<StudioOpening>) =>
    onChange(updateOpening(design, opening.id, patch), {
      coalesceKey: `opening:${opening.id}:${Object.keys(patch).join(",")}`,
    });
  const openingHeight =
    opening.openingHeight ?? DEFAULT_OPENING_HEIGHT[opening.type];
  const sillHeight = opening.sillHeight ?? DEFAULT_SILL[opening.type];
  const wallHeight = design.room.wallHeight;
  const stylePreset = getOpeningStylePreset(opening);
  const maxOpeningHeight = Math.max(12, wallHeight - sillHeight);
  const maxSill = Math.max(0, wallHeight - openingHeight);

  /** Offset that keeps the opening's current centre, clamped inside the wall. */
  const centredOffset = (width: number) =>
    Math.min(
      Math.max(0, wallLength - width),
      Math.max(0, opening.offset + opening.width / 2 - width / 2)
    );

  const setWidth = (next: number) => {
    const width = Math.max(12, Math.min(next, wallLength));
    update({ width, offset: centredOffset(width) });
  };

  const applyStyle = (preset: StudioOpeningPreset) => {
    const size = getOpeningPresetSize(preset, wallHeight, wallLength);
    update({
      type: preset.type,
      style: preset.style,
      ...size,
      offset: centredOffset(size.width),
    });
  };

  return (
    <div className="space-y-3">
      <ItemHeader
        icon={meta.icon}
        eyebrow={`Opening · Wall ${opening.wallIndex + 1}`}
        label={opening.label}
        onLabelChange={(label) => update({ label })}
        locked={locked}
        hidden={opening.hidden}
        meta={
          <StatusChip>
            {stylePreset.label} · {inchesToFeetLabel(opening.width)}
          </StatusChip>
        }
      />

      {locked ? (
        <div className="flex items-center gap-2 rounded-2xl border border-primary/25 bg-primary/5 px-3 py-2 text-[0.7rem] text-muted-foreground">
          <Lock className="size-3.5 text-primary" aria-hidden="true" />
          Locked — unlock to move or resize.
        </div>
      ) : null}

      <InspectorSection icon={DoorOpen} eyebrow="Type" title="Opening style">
        <OpeningStylePicker
          value={getOpeningStyle(opening)}
          disabled={locked}
          onSelect={applyStyle}
        />
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
            onChange={setWidth}
          />
        </div>
        <OpeningSizePicks
          label="Standard widths"
          values={OPENING_QUICK_WIDTHS[opening.type]}
          value={opening.width}
          max={wallLength}
          disabled={locked}
          onPick={setWidth}
        />
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
            max={maxOpeningHeight}
            disabled={locked}
            onChange={(next) => update({ openingHeight: next })}
          />
          {opening.type === "window" ? (
            <LengthField
              label="Sill height"
              value={sillHeight}
              step={step}
              min={0}
              max={maxSill}
              disabled={locked}
              onChange={(next) => update({ sillHeight: next })}
            />
          ) : null}
        </div>
        <OpeningSizePicks
          label="Standard heights"
          values={OPENING_QUICK_HEIGHTS[opening.type]}
          value={openingHeight}
          max={maxOpeningHeight}
          disabled={locked}
          tooLarge="Taller than the wall allows above the sill"
          onPick={(next) => update({ openingHeight: Math.min(next, maxOpeningHeight) })}
        />
        {opening.type === "window" ? (
          <OpeningSizePicks
            label="Sill heights"
            values={QUICK_SILLS}
            value={sillHeight}
            max={maxSill}
            disabled={locked}
            tooLarge="Window would pass the top of the wall"
            onPick={(next) => update({ sillHeight: Math.min(next, maxSill) })}
          />
        ) : null}
      </InspectorSection>

      <OpeningDressSection design={design} opening={opening} onChange={onChange} />
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
