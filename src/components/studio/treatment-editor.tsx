"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DRAPE_COLORS,
  DRAPE_FABRICS,
  STUDIO_FRAME_FINISHES,
  STUDIO_TREATMENT_TYPES,
  createStudioItemId,
  type StudioDesignJson,
  type StudioTreatment,
} from "@/data/studio";
import {
  clampTreatmentToWall,
  getWallSegments,
  inchesToFeetLabel,
} from "@/lib/studio-geometry";
import {
  STUDIO_TREATMENT_TYPE_LABELS,
  replaceStudioTreatment,
} from "@/lib/studio-treatments";
import { Copy } from "lucide-react";
import {
  feetInput,
  feetValue,
  parseNumber,
  type StudioSelection,
} from "./studio-types";

export function TreatmentEditor({
  design,
  treatment,
  onChange,
  onSelect,
  idPrefix,
}: {
  design: StudioDesignJson;
  treatment: StudioTreatment;
  onChange: (design: StudioDesignJson) => void;
  onSelect: (selection: StudioSelection) => void;
  idPrefix: string;
}) {
  const walls = getWallSegments(design.room.floor);
  const wall = walls[treatment.anchor.wallIndex];
  const span = treatment.anchor.endOffset - treatment.anchor.startOffset;
  const fieldId = (name: string) => `${idPrefix}-${name}-${treatment.id}`;
  const sideTreatment = treatment.type === "side_tieback_panels";
  const swagTreatment = treatment.type === "top_swag_valance";
  const archTreatment = treatment.type === "ceremony_arch";

  function update(patch: Partial<StudioTreatment>) {
    onChange(
      replaceStudioTreatment(design, {
        ...treatment,
        ...patch,
      })
    );
  }

  function updateAnchor(patch: Partial<StudioTreatment["anchor"]>) {
    update({
      anchor: {
        ...treatment.anchor,
        ...patch,
      },
    });
  }

  function duplicate() {
    const width = treatment.anchor.endOffset - treatment.anchor.startOffset;
    const shiftedStart = Math.min(
      Math.max(0, treatment.anchor.startOffset + 12),
      Math.max(0, (wall?.length ?? width) - width)
    );
    const copy = clampTreatmentToWall(
      {
        ...treatment,
        id: createStudioItemId("treatment"),
        label: `${treatment.label} copy`,
        anchor: {
          ...treatment.anchor,
          startOffset: shiftedStart,
          endOffset: shiftedStart + width,
        },
      },
      design.room.floor
    );
    onChange({ ...design, treatments: [...design.treatments, copy] });
    onSelect({ kind: "treatment", id: copy.id });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/60 bg-background/45 p-3">
        <p className="text-[0.62rem] font-semibold tracking-[0.18em] text-primary uppercase">
          {STUDIO_TREATMENT_TYPE_LABELS[treatment.type]}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Wall {treatment.anchor.wallIndex + 1} · {inchesToFeetLabel(span)}
        </p>
      </div>

      <Field label="Label" id={fieldId("label")}>
        <Input
          id={fieldId("label")}
          value={treatment.label}
          onChange={(event) => update({ label: event.target.value })}
        />
      </Field>

      <Field label="Treatment type" id={fieldId("type")}>
        <select
          id={fieldId("type")}
          value={treatment.type}
          onChange={(event) =>
            update({
              type: event.target.value as StudioTreatment["type"],
            })
          }
          className="h-8 w-full rounded-2xl border border-transparent bg-input/50 px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
        >
          {STUDIO_TREATMENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {STUDIO_TREATMENT_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Wall anchor" id={fieldId("wall")}>
        <select
          id={fieldId("wall")}
          value={treatment.anchor.wallIndex}
          onChange={(event) => {
            const wallIndex = Number(event.target.value);
            const nextWall = walls[wallIndex];
            const width = Math.min(span, nextWall?.length ?? span);
            const startOffset = Math.max(
              0,
              ((nextWall?.length ?? width) - width) / 2
            );
            update({
              anchor: {
                kind: "wall",
                wallIndex,
                startOffset,
                endOffset: startOffset + width,
              },
            });
          }}
          className="h-8 w-full rounded-2xl border border-transparent bg-input/50 px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
        >
          {walls.map((item) => (
            <option key={item.index} value={item.index}>
              Wall {item.index + 1} · {inchesToFeetLabel(item.length)}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <NumberField
          id={fieldId("start")}
          label="Start (ft)"
          value={feetValue(treatment.anchor.startOffset)}
          min={0}
          onChange={(value) =>
            updateAnchor({
              startOffset: feetInput(value, treatment.anchor.startOffset),
            })
          }
        />
        <NumberField
          id={fieldId("end")}
          label="End (ft)"
          value={feetValue(treatment.anchor.endOffset)}
          min={0}
          onChange={(value) =>
            updateAnchor({
              endOffset: feetInput(value, treatment.anchor.endOffset),
            })
          }
        />
        <NumberField
          id={fieldId("width")}
          label="Width (ft)"
          value={feetValue(span)}
          min={1 / 12}
          onChange={(value) =>
            updateAnchor({
              endOffset:
                treatment.anchor.startOffset +
                Math.max(1, feetInput(value, span)),
            })
          }
        />
        <NumberField
          id={fieldId("height")}
          label="Height (ft)"
          value={feetValue(treatment.height)}
          min={1 / 12}
          onChange={(value) =>
            update({ height: Math.max(1, feetInput(value, treatment.height)) })
          }
        />
        <NumberField
          id={fieldId("fullness")}
          label="Fullness"
          value={treatment.fullness}
          min={1}
          max={4}
          step={0.25}
          onChange={(value) =>
            update({
              fullness: Math.min(
                4,
                Math.max(1, parseNumber(value, treatment.fullness))
              ),
            })
          }
        />
        {sideTreatment || archTreatment ? (
          <NumberField
            id={fieldId("tieback")}
            label="Tieback (ft)"
            value={feetValue(treatment.tiebackHeight)}
            min={0}
            onChange={(value) =>
              update({
                tiebackHeight: feetInput(value, treatment.tiebackHeight),
              })
            }
          />
        ) : null}
        {sideTreatment ? (
          <NumberField
            id={fieldId("opening")}
            label="Opening (ft)"
            value={feetValue(treatment.openingWidth)}
            min={0}
            onChange={(value) =>
              update({
                openingWidth: feetInput(value, treatment.openingWidth),
              })
            }
          />
        ) : null}
        {swagTreatment || archTreatment || treatment.hasTopSwag ? (
          <NumberField
            id={fieldId("swag")}
            label="Swag drop (ft)"
            value={feetValue(treatment.swagDrop)}
            min={0}
            onChange={(value) =>
              update({ swagDrop: feetInput(value, treatment.swagDrop) })
            }
          />
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <SelectField
          id={fieldId("fabric")}
          label="Fabric"
          value={treatment.fabric}
          options={DRAPE_FABRICS}
          onChange={(value) =>
            update({ fabric: value as StudioTreatment["fabric"] })
          }
        />
        <SelectField
          id={fieldId("color")}
          label="Primary color"
          value={treatment.color}
          options={DRAPE_COLORS}
          onChange={(value) =>
            update({ color: value as StudioTreatment["color"] })
          }
        />
        {(sideTreatment || swagTreatment || archTreatment) && (
          <SelectField
            id={fieldId("secondary-color")}
            label="Accent color"
            value={treatment.secondaryColor}
            options={DRAPE_COLORS}
            onChange={(value) =>
              update({
                secondaryColor: value as StudioTreatment["secondaryColor"],
              })
            }
          />
        )}
        {archTreatment ? (
          <SelectField
            id={fieldId("frame")}
            label="Frame finish"
            value={treatment.frameFinish}
            options={STUDIO_FRAME_FINISHES}
            onChange={(value) =>
              update({
                frameFinish: value as StudioTreatment["frameFinish"],
              })
            }
          />
        ) : null}
      </div>

      <div className="rounded-2xl border border-border/60 bg-background/35 p-3">
        <p className="mb-2 text-[0.62rem] font-semibold tracking-[0.16em] text-primary uppercase">
          Treatment details
        </p>
        <div className="space-y-2">
          {treatment.type === "full_pleated_backdrop" ? (
            <Toggle
              id={fieldId("top-pipe")}
              label="Top pipe / track"
              checked={treatment.hasTopPipe}
              onChange={(hasTopPipe) => update({ hasTopPipe })}
            />
          ) : null}
          {sideTreatment ? (
            <Toggle
              id={fieldId("backdrop")}
              label="Backdrop behind"
              checked={treatment.hasBackdrop}
              onChange={(hasBackdrop) => update({ hasBackdrop })}
            />
          ) : null}
          {sideTreatment || archTreatment ? (
            <Toggle
              id={fieldId("top-swag")}
              label="Top swag"
              checked={treatment.hasTopSwag}
              onChange={(hasTopSwag) => update({ hasTopSwag })}
            />
          ) : null}
          {sideTreatment || archTreatment ? (
            <Toggle
              id={fieldId("tiebacks")}
              label="Tiebacks"
              checked={treatment.hasTiebacks}
              onChange={(hasTiebacks) => update({ hasTiebacks })}
            />
          ) : null}
        </div>
      </div>

      <Field label="Treatment notes" id={fieldId("notes")}>
        <Textarea
          id={fieldId("notes")}
          rows={3}
          value={treatment.notes}
          placeholder="Fabric, hardware, access, or setup notes…"
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
        Duplicate treatment
      </Button>
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

function NumberField({
  id,
  label,
  value,
  min,
  max,
  step = 0.5,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label} id={id}>
      <Input
        id={id}
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(event.target.value)}
        className="input-no-spin"
      />
    </Field>
  );
}

function SelectField({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label} id={id}>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 w-full rounded-2xl border border-transparent bg-input/50 px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

function Toggle({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-1 py-1 text-xs text-foreground"
    >
      <span>{label}</span>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 accent-primary"
      />
    </label>
  );
}
