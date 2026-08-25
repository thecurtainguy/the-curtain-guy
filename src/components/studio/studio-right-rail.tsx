"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type {
  StudioObjectType,
  StudioDesignJson,
  StudioObject,
  StudioOpening,
} from "@/data/studio";
import {
  DANCE_FLOOR_FINISHES,
  GENERIC_OBJECT_FINISHES,
  STUDIO_MAX_SEATING_COUNT,
  STUDIO_OBJECT_OPTIONS,
  createStudioItemId,
} from "@/data/studio";
import {
  calculateDrapeLength,
  calculateRoomAreaSquareFeet,
  getWallSegments,
  inchesToFeetLabel,
} from "@/lib/studio-geometry";
import {
  STUDIO_OBJECT_MIN_DIMENSIONS,
  getStudioObjectBoundsResult,
} from "@/lib/studio-interactions";
import {
  Box,
  CheckCircle2,
  Clock3,
  Copy,
  DoorOpen,
  Minus,
  PanelsTopLeft,
  Plus,
  RotateCcw,
  ScissorsLineDashed,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { DrapeRunEditor } from "./drape-run-editor";
import { RoomFinishPanel } from "./room-finish-panel";
import { StudioEmptyState } from "./studio-empty-state";
import {
  feetInput,
  feetValue,
  parseNumber,
  signedFeetInput,
  type StudioSaveState,
  type StudioSelection,
  updateOpening,
} from "./studio-types";

type StudioRightRailProps = {
  design: StudioDesignJson;
  onChange: (design: StudioDesignJson) => void;
  selection: StudioSelection;
  onSelect: (selection: StudioSelection) => void;
  saveState: StudioSaveState;
  idPrefix: string;
};

const saveCopy: Record<StudioSaveState, string> = {
  idle: "Ready",
  dirty: "Unsaved changes",
  saving: "Saving…",
  saved: "Saved",
  error: "Save needs attention",
};

const seatingObjectTypes: StudioObjectType[] = [
  "round_table",
  "rectangle_table",
  "cocktail_table",
  "table_area",
  "lounge_area",
];

export function StudioRightRail({
  design,
  onChange,
  selection,
  onSelect,
  saveState,
  idPrefix,
}: StudioRightRailProps) {
  const walls = getWallSegments(design.room.floor);
  const selectedDrape =
    selection?.kind === "drape"
      ? design.drapeRuns.find((run) => run.id === selection.id)
      : undefined;
  const selectedObject =
    selection?.kind === "object"
      ? design.objects.find((object) => object.id === selection.id)
      : undefined;
  const selectedOpening =
    selection?.kind === "opening"
      ? design.openings.find((opening) => opening.id === selection.id)
      : undefined;
  const selectedWall =
    selection?.kind === "wall" ? walls[selection.index] : undefined;

  function remove(kind: "drape" | "object" | "opening", id: string) {
    if (
      kind !== "object" &&
      !window.confirm("Remove this item from the studio design?")
    ) {
      return;
    }
    onChange({
      ...design,
      drapeRuns:
        kind === "drape"
          ? design.drapeRuns.filter((item) => item.id !== id)
          : design.drapeRuns,
      objects:
        kind === "object"
          ? design.objects.filter((item) => item.id !== id)
          : design.objects,
      openings:
        kind === "opening"
          ? design.openings.filter((item) => item.id !== id)
          : design.openings,
    });
    onSelect(null);
  }

  return (
    <aside className="h-full overflow-y-auto bg-card/35 p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-[0.65rem] font-semibold tracking-[0.22em] text-primary uppercase">
            Inspector
          </p>
          <h2 className="font-heading text-lg">
            {selectedDrape
              ? "Drape run"
              : selectedObject
                ? "Room object"
                : selectedOpening
                  ? "Opening"
                  : selectedWall
                    ? `Wall ${selectedWall.index + 1}`
                    : "Design brief"}
          </h2>
        </div>
        <SavePill state={saveState} />
      </div>

      {selectedDrape && (
        <SelectedPanel
          icon={ScissorsLineDashed}
          onDelete={() => remove("drape", selectedDrape.id)}
        >
          <DrapeRunEditor
            design={design}
            run={selectedDrape}
            onChange={onChange}
            idPrefix={`${idPrefix}-drape`}
          />
        </SelectedPanel>
      )}

      {selectedObject && (
        <SelectedPanel
          icon={Box}
          onDelete={() => remove("object", selectedObject.id)}
        >
          <ObjectEditor
            design={design}
            object={selectedObject}
            onChange={onChange}
            onSelect={onSelect}
            idPrefix={`${idPrefix}-object`}
          />
        </SelectedPanel>
      )}

      {selectedOpening && (
        <SelectedPanel
          icon={DoorOpen}
          onDelete={() => remove("opening", selectedOpening.id)}
        >
          <OpeningEditor
            design={design}
            opening={selectedOpening}
            onChange={onChange}
            idPrefix={`${idPrefix}-opening`}
          />
        </SelectedPanel>
      )}

      {selectedWall && (
        <div className="space-y-4">
          <div className="rounded-3xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center gap-2 text-primary">
              <PanelsTopLeft className="size-4" aria-hidden="true" />
              <span className="text-xs font-semibold tracking-wider uppercase">
                Structural wall
              </span>
            </div>
            <p className="mt-3 font-heading text-2xl">
              {inchesToFeetLabel(selectedWall.length)}
            </p>
            <p className="text-xs text-muted-foreground">
              Click a treatment in the left rail to place it here.
            </p>
          </div>
        </div>
      )}

      {!selectedDrape && !selectedObject && !selectedOpening && !selectedWall && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Floor area" value={`${Math.round(calculateRoomAreaSquareFeet(design.room.floor)).toLocaleString()} ft²`} />
            <Stat label="Wall height" value={inchesToFeetLabel(design.room.wallHeight)} />
            <Stat label="Drape total" value={inchesToFeetLabel(calculateDrapeLength(design))} />
            <Stat label="Drape runs" value={String(design.drapeRuns.length)} />
          </div>
          <StudioEmptyState />
          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-design-notes`}>Design notes</Label>
            <Textarea
              id={`${idPrefix}-design-notes`}
              rows={4}
              value={design.notes}
              placeholder="Add access, setup, or venue notes…"
              onChange={(event) =>
                onChange({ ...design, notes: event.target.value })
              }
            />
          </div>
        </div>
      )}

      <div className="my-5 h-px bg-border/60" />
      <RoomFinishPanel
        design={design}
        onChange={onChange}
        idPrefix={`${idPrefix}-finish`}
      />
    </aside>
  );
}

function SelectedPanel({
  icon: Icon,
  onDelete,
  children,
}: {
  icon: typeof Box;
  onDelete: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-2xl border border-primary/20 bg-primary/5 p-2">
        <div className="flex items-center gap-2 text-xs font-medium">
          <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="size-4" aria-hidden="true" />
          </span>
          Selected
        </div>
        <Button
          type="button"
          variant="destructive"
          size="icon-sm"
          onClick={onDelete}
          aria-label="Delete selected item"
        >
          <Trash2 aria-hidden="true" />
        </Button>
      </div>
      {children}
    </div>
  );
}

function ObjectEditor({
  design,
  object,
  onChange,
  onSelect,
  idPrefix,
}: {
  design: StudioDesignJson;
  object: StudioObject;
  onChange: (design: StudioDesignJson) => void;
  onSelect: (selection: StudioSelection) => void;
  idPrefix: string;
}) {
  const fieldId = (name: string) => `${idPrefix}-${name}-${object.id}`;
  const minimums = STUDIO_OBJECT_MIN_DIMENSIONS[object.type];
  const boundsResult = getStudioObjectBoundsResult(object, design.room.floor);
  const typeLabel =
    STUDIO_OBJECT_OPTIONS.find((option) => option.type === object.type)?.label ??
    object.type.replaceAll("_", " ");
  const finishOptions =
    object.type === "dance_floor"
      ? DANCE_FLOOR_FINISHES
      : GENERIC_OBJECT_FINISHES;
  const showsSeating = seatingObjectTypes.includes(object.type);
  function update(patch: Partial<StudioObject>) {
    const nextObject = { ...object, ...patch } as StudioObject;
    onChange({
      ...design,
      objects: design.objects.map((item) =>
        item.id === object.id ? nextObject : item
      ),
    });
  }

  function duplicate() {
    const duplicateObject: StudioObject = {
      ...object,
      id: createStudioItemId("object"),
      label: `${object.label} copy`,
      x: object.x + 12,
      z: object.z + 12,
    };
    onChange({
      ...design,
      objects: [...design.objects, duplicateObject],
    });
    onSelect({ kind: "object", id: duplicateObject.id });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/60 bg-background/45 p-3">
        <p className="text-[0.62rem] font-semibold tracking-[0.18em] text-primary uppercase">
          {typeLabel}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Position {inchesToFeetLabel(object.x)}, {inchesToFeetLabel(object.z)}
        </p>
      </div>
      {!boundsResult.contained ? (
        <div
          className="flex gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300"
          role="status"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{boundsResult.warning}</span>
        </div>
      ) : null}
      <Field label="Label" id={fieldId("label")}>
        <Input
          id={fieldId("label")}
          value={object.label}
          onChange={(event) => update({ label: event.target.value })}
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        {([
          ["X position", "x"],
          ["Z position", "z"],
          ["Width", "width"],
          ["Depth", "depth"],
          ["Height", "height"],
        ] as const).map(([label, key]) => (
          <Field key={key} label={`${label} (ft)`} id={fieldId(key)}>
            <Input
              id={fieldId(key)}
              type="number"
              step="0.5"
              min={
                key === "x" || key === "z"
                  ? undefined
                  : key === "width"
                    ? feetValue(minimums.width)
                    : key === "depth"
                      ? feetValue(minimums.depth)
                      : 0
              }
              value={feetValue(object[key])}
              onChange={(event) =>
                update({
                  [key]:
                    key === "x" || key === "z"
                      ? signedFeetInput(event.target.value, object[key])
                      : key === "width"
                        ? Math.max(
                            minimums.width,
                            feetInput(event.target.value, object[key])
                          )
                        : key === "depth"
                          ? Math.max(
                              minimums.depth,
                              feetInput(event.target.value, object[key])
                            )
                          : Math.max(
                              0,
                              feetInput(event.target.value, object[key])
                            ),
                })
              }
              className="input-no-spin"
            />
          </Field>
        ))}
        <Field label="Rotation (°)" id={fieldId("rotation")}>
          <Input
            id={fieldId("rotation")}
            type="number"
            step="15"
            value={object.rotation}
            onChange={(event) =>
              update({
                rotation: parseNumber(event.target.value, object.rotation),
              })
            }
            className="input-no-spin"
          />
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => update({ rotation: object.rotation - 15 })}
          aria-label="Rotate object minus 15 degrees"
        >
          <Minus aria-hidden="true" />
          15°
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => update({ rotation: 0 })}
          aria-label="Reset object rotation"
        >
          <RotateCcw aria-hidden="true" />
          Reset
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => update({ rotation: object.rotation + 15 })}
          aria-label="Rotate object plus 15 degrees"
        >
          <Plus aria-hidden="true" />
          15°
        </Button>
      </div>
      <Field label="Finish" id={fieldId("finish")}>
        <select
          id={fieldId("finish")}
          value={
            object.finish ??
            (object.type === "dance_floor" ? "white_gloss" : "natural_wood")
          }
          onChange={(event) =>
            update({ finish: event.target.value as StudioObject["finish"] })
          }
          className="h-8 w-full rounded-2xl bg-input/50 px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {finishOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </Field>
      {showsSeating ? (
        <Field label="Seating count" id={fieldId("seating")}>
          <Input
            id={fieldId("seating")}
            type="number"
            min={0}
            max={STUDIO_MAX_SEATING_COUNT}
            step={1}
            value={object.seatingCount ?? 0}
            onChange={(event) =>
              update({
                seatingCount: Math.min(
                  STUDIO_MAX_SEATING_COUNT,
                  Math.max(0, Math.round(parseNumber(event.target.value, 0)))
                ),
              })
            }
            className="input-no-spin"
          />
        </Field>
      ) : null}
      <Field label="Object notes" id={fieldId("notes")}>
        <Textarea
          id={fieldId("notes")}
          rows={3}
          maxLength={1000}
          value={object.notes ?? ""}
          placeholder="Placement, finish, or setup notes…"
          onChange={(event) => update({ notes: event.target.value })}
        />
      </Field>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={duplicate}
      >
        <Copy aria-hidden="true" />
        Duplicate object
      </Button>
    </div>
  );
}

function OpeningEditor({
  design,
  opening,
  onChange,
  idPrefix,
}: {
  design: StudioDesignJson;
  opening: StudioOpening;
  onChange: (design: StudioDesignJson) => void;
  idPrefix: string;
}) {
  const walls = getWallSegments(design.room.floor);
  const wall = walls[opening.wallIndex];
  const fieldId = (name: string) => `${idPrefix}-${name}-${opening.id}`;

  function update(patch: Partial<StudioOpening>) {
    onChange(updateOpening(design, opening.id, patch));
  }

  return (
    <div className="space-y-4">
      <Field label="Label" id={fieldId("label")}>
        <Input
          id={fieldId("label")}
          value={opening.label}
          onChange={(event) => update({ label: event.target.value })}
        />
      </Field>
      <Field label="Wall" id={fieldId("wall")}>
        <select
          id={fieldId("wall")}
          value={opening.wallIndex}
          onChange={(event) => {
            const wallIndex = Number(event.target.value);
            const nextWall = walls[wallIndex];
            update({
              wallIndex,
              offset: Math.max(0, (nextWall?.length ?? 36) / 2 - 18),
              width: Math.min(opening.width, nextWall?.length ?? opening.width),
            });
          }}
          className="h-8 w-full rounded-2xl bg-input/50 px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {walls.map((item) => (
            <option key={item.index} value={item.index}>
              Wall {item.index + 1}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Offset (ft)" id={fieldId("offset")}>
          <Input
            id={fieldId("offset")}
            type="number"
            min={0}
            step="0.5"
            value={feetValue(opening.offset)}
            onChange={(event) =>
              update({
                offset: Math.min(
                  feetInput(event.target.value, opening.offset),
                  Math.max(0, (wall?.length ?? 1) - 1)
                ),
              })
            }
            className="input-no-spin"
          />
        </Field>
        <Field label="Width (ft)" id={fieldId("width")}>
          <Input
            id={fieldId("width")}
            type="number"
            min={1}
            step="0.5"
            value={feetValue(opening.width)}
            onChange={(event) =>
              update({
                width: Math.min(
                  Math.max(1, feetInput(event.target.value, opening.width)),
                  wall?.length ?? opening.width
                ),
              })
            }
            className="input-no-spin"
          />
        </Field>
      </div>
    </div>
  );
}

function Field({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/50 p-3">
      <p className="text-[0.65rem] tracking-wider text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1 font-heading text-lg">{value}</p>
    </div>
  );
}

function SavePill({ state }: { state: StudioSaveState }) {
  const Icon =
    state === "saved"
      ? CheckCircle2
      : state === "error"
        ? TriangleAlert
        : Clock3;
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border/60 bg-background/60 px-2 py-1 text-[0.62rem] text-muted-foreground"
      role="status"
    >
      <Icon className="size-3 text-primary" aria-hidden="true" />
      {saveCopy[state]}
    </span>
  );
}
