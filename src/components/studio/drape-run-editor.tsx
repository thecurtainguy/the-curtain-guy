"use client";

import { Input } from "@/components/ui/input";
import { SelectInput } from "@/components/ui/select-input";
import { Textarea } from "@/components/ui/textarea";
import {
  DRAPE_HARDWARE,
  DRAPE_RUN_TYPES,
  type StudioDesignJson,
  type StudioDrapeRun,
} from "@/data/studio";
import {
  drapeRunUsesDoorGaps,
  getBlockingDoors,
  getDrapeRunHungLength,
} from "@/lib/studio-door-gaps";
import { cn } from "@/lib/utils";
import {
  clampDrapeRunToWall,
  getWallSegments,
  inchesToFeetLabel,
} from "@/lib/studio-geometry";
import {
  Columns3,
  DoorOpen,
  GalleryHorizontalEnd,
  Lightbulb,
  PanelsTopLeft,
  Ruler,
  Scissors,
  RectangleHorizontal,
  SquareSplitHorizontal,
  WavesHorizontal,
  type LucideIcon,
} from "lucide-react";
import {
  ColorSwatchGrid,
  FabricPicker,
  FieldLabel,
  FullnessField,
  HARDWARE_META,
  InspectorSection,
  OptionTile,
  RangeField,
  StatTile,
} from "./three/fabric/fabric-controls";
import { feetInput, feetValue } from "./studio-types";

type DrapeRunEditorProps = {
  design: StudioDesignJson;
  run: StudioDrapeRun;
  onChange: (design: StudioDesignJson) => void;
  idPrefix: string;
};

const runLabels: Record<StudioDrapeRun["type"], string> = {
  wall_drape: "Full wall drape",
  partial_drape: "Partial wall drape",
  backdrop: "Backdrop",
  divider: "Divider",
};

const runTypeMeta: Record<
  StudioDrapeRun["type"],
  { icon: LucideIcon; description: string }
> = {
  wall_drape: { icon: PanelsTopLeft, description: "Corner to corner" },
  partial_drape: { icon: GalleryHorizontalEnd, description: "A section of wall" },
  backdrop: { icon: RectangleHorizontal, description: "Feature focal point" },
  divider: { icon: SquareSplitHorizontal, description: "Splits the space" },
};

export function DrapeRunEditor({
  design,
  run,
  onChange,
  idPrefix,
}: DrapeRunEditorProps) {
  const walls = getWallSegments(design.room.floor);
  const wall = walls[run.wallIndex];
  const fieldId = (name: string) => `${idPrefix}-${name}-${run.id}`;
  const span = run.endOffset - run.startOffset;
  const hardware = run.hardware ?? "pipe_and_drape";
  const wallHeightFt = feetValue(design.room.wallHeight);
  const doorCount = getBlockingDoors(
    design.openings,
    run.wallIndex,
    run.startOffset,
    run.endOffset
  ).length;
  const doorGaps = drapeRunUsesDoorGaps(run);
  const hung = getDrapeRunHungLength(run, design.openings);
  const trimmed = Math.round(hung) !== Math.round(span);

  function commit(nextRun: StudioDrapeRun) {
    const clamped = clampDrapeRunToWall(nextRun, design.room.floor);
    onChange({
      ...design,
      drapeRuns: design.drapeRuns.map((item) =>
        item.id === run.id ? clamped : item
      ),
    });
  }

  function update(patch: Partial<StudioDrapeRun>) {
    commit({ ...run, ...patch });
  }

  function setDoorGaps(on: boolean) {
    const nextRun = { ...run };
    if (on) delete nextRun.doorGaps;
    else nextRun.doorGaps = false;
    commit(nextRun);
  }

  return (
    <div className="space-y-3.5">
      <div className="overflow-hidden rounded-2xl border border-border/40 bg-[radial-gradient(ellipse_at_top_right,oklch(0.76_0.15_88/16%),transparent_65%)] p-3.5">
        <p className="text-[0.6rem] font-semibold tracking-[0.2em] text-primary uppercase">
          {runLabels[run.type]} · Wall {run.wallIndex + 1}
        </p>
        <Input
          id={fieldId("label")}
          aria-label="Drape label"
          value={run.label}
          onChange={(event) => {
            if (event.target.value.trim()) update({ label: event.target.value });
          }}
          className="mt-2 h-9 rounded-xl border-border/40 bg-background/50 font-heading text-base"
        />
        <div className="mt-3 grid grid-cols-3 gap-2">
          <StatTile label="Length" value={inchesToFeetLabel(span)} />
          <StatTile label="Height" value={inchesToFeetLabel(run.height)} />
          <StatTile label="Fullness" value={`${run.fullness}×`} />
        </div>
        {trimmed ? (
          <span className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[0.68rem] font-medium text-primary">
            <DoorOpen className="size-3.5" aria-hidden />
            Hung {inchesToFeetLabel(hung)} of {inchesToFeetLabel(span)}
          </span>
        ) : null}
      </div>

      <InspectorSection icon={Ruler} eyebrow="Placement" title="Run & dimensions">
        <div role="radiogroup" aria-label="Drape type" className="grid grid-cols-2 gap-2">
          {DRAPE_RUN_TYPES.map((type) => (
            <OptionTile
              key={type}
              compact
              icon={runTypeMeta[type].icon}
              label={runLabels[type]}
              description={runTypeMeta[type].description}
              selected={run.type === type}
              onSelect={() => update({ type })}
            />
          ))}
        </div>

        <div className="space-y-1.5">
          <FieldLabel htmlFor={fieldId("wall")}>Wall</FieldLabel>
          <SelectInput
            id={fieldId("wall")}
            value={String(run.wallIndex)}
            onChange={(next) => {
              const wallIndex = Number(next);
              const nextWall = walls[wallIndex];
              update({
                wallIndex,
                startOffset: 0,
                endOffset: Math.max(1, nextWall?.length ?? 1),
              });
            }}
            options={walls.map((item) => ({
              value: String(item.index),
              label: `Wall ${item.index + 1} · ${inchesToFeetLabel(item.length)}`,
            }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <FieldLabel htmlFor={fieldId("start")}>Start (ft)</FieldLabel>
            <Input
              id={fieldId("start")}
              type="number"
              min={0}
              step="0.5"
              value={feetValue(run.startOffset)}
              onChange={(event) =>
                update({
                  startOffset: feetInput(event.target.value, run.startOffset),
                })
              }
              className="input-no-spin h-8 rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <FieldLabel htmlFor={fieldId("end")}>End (ft)</FieldLabel>
            <Input
              id={fieldId("end")}
              type="number"
              min={0}
              step="0.5"
              value={feetValue(run.endOffset)}
              onChange={(event) =>
                update({ endOffset: feetInput(event.target.value, run.endOffset) })
              }
              className="input-no-spin h-8 rounded-xl"
            />
          </div>
        </div>

        <RangeField
          id={fieldId("span")}
          label="Span"
          value={feetValue(span)}
          min={1}
          max={feetValue(wall?.length ?? span)}
          onChange={(feet) =>
            update({ endOffset: run.startOffset + Math.max(12, feet * 12) })
          }
        />
        <RangeField
          id={fieldId("height")}
          label="Height"
          value={feetValue(run.height)}
          min={4}
          max={Math.max(4.5, wallHeightFt)}
          onChange={(feet) =>
            update({ height: Math.min(600, Math.max(12, feet * 12)) })
          }
        />
        <div
          inert={doorCount === 0}
          className={cn(doorCount === 0 && "opacity-50 saturate-50")}
        >
          <OptionTile
            role="switch"
            icon={DoorOpen}
            label="Keep doors clear"
            description={
              doorCount === 0
                ? "No doors on this run"
                : `Leave ${doorCount} door${doorCount === 1 ? "" : "s"} open on this wall`
            }
            selected={doorGaps}
            onSelect={() => setDoorGaps(!doorGaps)}
          />
        </div>
      </InspectorSection>

      <InspectorSection icon={Scissors} eyebrow="Fabric" title="Textile & colour">
        <FabricPicker
          value={run.fabric}
          color={run.color}
          onChange={(fabric) => update({ fabric })}
        />
        <ColorSwatchGrid
          label="Colour"
          value={run.color}
          onChange={(color) => {
            if (color) update({ color });
          }}
        />
        <FullnessField
          id={fieldId("fullness")}
          value={run.fullness}
          onChange={(fullness) => update({ fullness })}
        />
      </InspectorSection>

      <InspectorSection icon={Columns3} eyebrow="Hardware" title="How it hangs">
        <div role="radiogroup" aria-label="Hardware" className="space-y-2">
          {DRAPE_HARDWARE.map((option) => (
            <OptionTile
              key={option.value}
              compact
              icon={HARDWARE_META[option.value].icon}
              label={option.label}
              description={HARDWARE_META[option.value].description}
              selected={hardware === option.value}
              onSelect={() => update({ hardware: option.value })}
            />
          ))}
        </div>
        <OptionTile
          role="switch"
          icon={WavesHorizontal}
          label="Floor puddle"
          description="Extra length pools softly on the floor"
          selected={Boolean(run.puddle)}
          onSelect={() => update({ puddle: !run.puddle })}
        />
      </InspectorSection>

      <InspectorSection icon={Lightbulb} eyebrow="Lighting" title="Uplight wash">
        <ColorSwatchGrid
          label="Uplight colour"
          value={run.uplightColor ?? null}
          noneLabel="No uplights"
          onChange={(uplightColor) => update({ uplightColor })}
        />
      </InspectorSection>

      <div className="space-y-1.5">
        <FieldLabel htmlFor={fieldId("notes")}>Notes</FieldLabel>
        <Textarea
          id={fieldId("notes")}
          rows={3}
          value={run.notes ?? ""}
          placeholder="Hardware, pleating, access notes…"
          onChange={(event) => update({ notes: event.target.value })}
          className="rounded-xl"
        />
      </div>
    </div>
  );
}
