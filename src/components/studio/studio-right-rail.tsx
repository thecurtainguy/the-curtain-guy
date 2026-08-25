"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type {
  StudioDesignJson,
  StudioObject,
  StudioOpening,
} from "@/data/studio";
import {
  calculateDrapeLength,
  calculateRoomAreaSquareFeet,
  getWallSegments,
  inchesToFeetLabel,
} from "@/lib/studio-geometry";
import {
  Box,
  CheckCircle2,
  Clock3,
  DoorOpen,
  PanelsTopLeft,
  ScissorsLineDashed,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { DrapeRunEditor } from "./drape-run-editor";
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
    if (!window.confirm("Remove this item from the studio design?")) return;
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
  idPrefix,
}: {
  design: StudioDesignJson;
  object: StudioObject;
  onChange: (design: StudioDesignJson) => void;
  idPrefix: string;
}) {
  const fieldId = (name: string) => `${idPrefix}-${name}-${object.id}`;
  function update(patch: Partial<StudioObject>) {
    onChange({
      ...design,
      objects: design.objects.map((item) =>
        item.id === object.id ? { ...item, ...patch } : item
      ),
    });
  }

  return (
    <div className="space-y-4">
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
              min={key === "x" || key === "z" ? undefined : 0}
              value={feetValue(object[key])}
              onChange={(event) =>
                update({
                  [key]:
                    key === "x" || key === "z"
                      ? signedFeetInput(event.target.value, object[key])
                      : feetInput(event.target.value, object[key]),
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
