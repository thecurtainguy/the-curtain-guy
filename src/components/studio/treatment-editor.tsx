"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectInput } from "@/components/ui/select-input";
import { Textarea } from "@/components/ui/textarea";
import {
  DRAPE_HARDWARE,
  STUDIO_FRAME_FINISHES,
  STUDIO_TREATMENT_TYPES,
  createStudioItemId,
  type DrapeHardware,
  type StudioDesignJson,
  type StudioFrameFinish,
  type StudioTreatment,
  type StudioTreatmentType,
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
import {
  Blinds,
  Columns3,
  Copy,
  Flower2,
  Frame,
  Layers,
  Lightbulb,
  PanelsTopLeft,
  Ruler,
  Scissors,
  Sparkles,
  Spline,
  RectangleHorizontal,
  Ribbon,
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
  Stepper,
} from "./three/fabric/fabric-controls";
import {
  feetInput,
  feetValue,
  type StudioSelection,
} from "./studio-types";

const TYPE_META: Record<
  StudioTreatmentType,
  { icon: LucideIcon; description: string }
> = {
  full_pleated_backdrop: { icon: PanelsTopLeft, description: "Pleated fabric wall" },
  side_tieback_panels: { icon: Blinds, description: "Framed reveal, tied back" },
  top_swag_valance: { icon: Spline, description: "Scalloped header" },
  layered_swag: { icon: Layers, description: "Two-tone scallops, tails" },
  ceremony_arch: { icon: Frame, description: "Frame, panels & swag" },
};

const FRAME_SWATCH: Record<StudioFrameFinish, string> = {
  gold: "linear-gradient(135deg,#f0cf7f,#b98b3d 55%,#7c5a22)",
  black: "linear-gradient(135deg,#45423e,#1d1c1b)",
  wood: "repeating-linear-gradient(100deg,#8a6040 0 3px,#6f4a2d 3px 6px)",
  white: "linear-gradient(135deg,#ffffff,#e4dfd4)",
};

/** "rod" = decorative curtain rod (stored as no explicit hardware). */
type HeaderChoice = DrapeHardware | "rod";

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
  const type = treatment.type;
  const sideTreatment = type === "side_tieback_panels";
  const archTreatment = type === "ceremony_arch";
  const backdropTreatment = type === "full_pleated_backdrop";
  const swagType = type === "top_swag_valance" || type === "layered_swag";
  const showSwagCount = swagType || ((sideTreatment || backdropTreatment) && treatment.hasTopSwag);
  const showSwagDrop = swagType || treatment.hasTopSwag;
  const showTieback = (sideTreatment || archTreatment) && treatment.hasTiebacks;
  const wallHeightFt = feetValue(design.room.wallHeight);

  function update(patch: Partial<StudioTreatment>) {
    onChange(replaceStudioTreatment(design, { ...treatment, ...patch }));
  }

  function updateAnchor(patch: Partial<StudioTreatment["anchor"]>) {
    update({ anchor: { ...treatment.anchor, ...patch } });
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

  const headerChoice: HeaderChoice = backdropTreatment
    ? (treatment.hardware ?? (treatment.hasTopPipe ? "pipe_and_drape" : "wall_mount"))
    : sideTreatment
      ? (treatment.hardware ?? "pipe_and_drape")
      : (treatment.hardware ?? "rod");
  const headerOptions: Array<{ value: HeaderChoice; label: string; icon: LucideIcon; description: string }> = [
    ...(swagType
      ? [
          {
            value: "rod" as const,
            label: "Decorative rod",
            icon: Ribbon,
            description: "Rod with ball finials",
          },
        ]
      : []),
    ...DRAPE_HARDWARE.map((option) => ({
      value: option.value,
      label: option.label,
      icon: HARDWARE_META[option.value].icon,
      description: HARDWARE_META[option.value].description,
    })),
  ];

  function setHeader(choice: HeaderChoice) {
    if (choice === "rod") {
      update({ hardware: undefined });
      return;
    }
    update({
      hardware: choice,
      ...(backdropTreatment ? { hasTopPipe: choice === "pipe_and_drape" } : {}),
    });
  }

  return (
    <div className="space-y-3.5">
      <div className="overflow-hidden rounded-2xl border border-border/40 bg-[radial-gradient(ellipse_at_top_right,oklch(0.76_0.15_88/16%),transparent_65%)] p-3.5">
        <p className="text-[0.6rem] font-semibold tracking-[0.2em] text-primary uppercase">
          {STUDIO_TREATMENT_TYPE_LABELS[type]} · Wall {treatment.anchor.wallIndex + 1}
        </p>
        <Input
          id={fieldId("label")}
          aria-label="Treatment label"
          value={treatment.label}
          onChange={(event) => {
            if (event.target.value.trim()) update({ label: event.target.value });
          }}
          className="mt-2 h-9 rounded-xl border-border/40 bg-background/50 font-heading text-base"
        />
        <div className="mt-3 grid grid-cols-3 gap-2">
          <StatTile label="Span" value={inchesToFeetLabel(span)} />
          <StatTile label="Height" value={inchesToFeetLabel(treatment.height)} />
          <StatTile label="Fullness" value={`${treatment.fullness}×`} />
        </div>
      </div>

      <InspectorSection icon={Sparkles} eyebrow="Arrangement" title="Treatment style">
        <div role="radiogroup" aria-label="Treatment type" className="grid grid-cols-2 gap-2">
          {STUDIO_TREATMENT_TYPES.map((item) => (
            <OptionTile
              key={item}
              compact
              icon={TYPE_META[item].icon}
              label={STUDIO_TREATMENT_TYPE_LABELS[item]}
              description={TYPE_META[item].description}
              selected={type === item}
              onSelect={() =>
                update({
                  type: item,
                  ...(item === "layered_swag" && !treatment.swagCount
                    ? { swagCount: 3 }
                    : {}),
                })
              }
            />
          ))}
        </div>
      </InspectorSection>

      <InspectorSection icon={Ruler} eyebrow="Placement" title="Wall & dimensions">
        <div className="space-y-1.5">
          <FieldLabel htmlFor={fieldId("wall")}>Wall anchor</FieldLabel>
          <SelectInput
            id={fieldId("wall")}
            value={String(treatment.anchor.wallIndex)}
            onChange={(next) => {
              const wallIndex = Number(next);
              const nextWall = walls[wallIndex];
              const width = Math.min(span, nextWall?.length ?? span);
              const startOffset = Math.max(0, ((nextWall?.length ?? width) - width) / 2);
              update({
                anchor: {
                  kind: "wall",
                  wallIndex,
                  startOffset,
                  endOffset: startOffset + width,
                },
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
              step={0.5}
              value={feetValue(treatment.anchor.startOffset)}
              onChange={(event) =>
                updateAnchor({
                  startOffset: feetInput(event.target.value, treatment.anchor.startOffset),
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
              step={0.5}
              value={feetValue(treatment.anchor.endOffset)}
              onChange={(event) =>
                updateAnchor({
                  endOffset: feetInput(event.target.value, treatment.anchor.endOffset),
                })
              }
              className="input-no-spin h-8 rounded-xl"
            />
          </div>
        </div>
        <RangeField
          id={fieldId("width")}
          label="Span"
          value={feetValue(span)}
          min={2}
          max={feetValue(wall?.length ?? span)}
          onChange={(feet) =>
            updateAnchor({
              endOffset: treatment.anchor.startOffset + Math.max(12, feet * 12),
            })
          }
        />
        <RangeField
          id={fieldId("height")}
          label="Height"
          value={feetValue(treatment.height)}
          min={4}
          max={Math.max(4.5, wallHeightFt)}
          onChange={(feet) =>
            update({ height: Math.min(600, Math.max(12, feet * 12)) })
          }
        />
        {sideTreatment ? (
          <RangeField
            id={fieldId("opening")}
            label="Center opening"
            value={feetValue(treatment.openingWidth)}
            min={1}
            max={Math.max(1.5, feetValue(span) - 1)}
            onChange={(feet) => update({ openingWidth: Math.max(0, feet * 12) })}
          />
        ) : null}
        {showTieback ? (
          <RangeField
            id={fieldId("tieback")}
            label="Tieback height"
            value={feetValue(treatment.tiebackHeight)}
            min={1.5}
            max={Math.max(2, feetValue(treatment.height) * 0.9)}
            onChange={(feet) => update({ tiebackHeight: Math.max(0, feet * 12) })}
          />
        ) : null}
      </InspectorSection>

      <InspectorSection icon={Scissors} eyebrow="Fabric" title="Textile & colour">
        <FabricPicker
          value={treatment.fabric}
          color={treatment.color}
          onChange={(fabric) => update({ fabric })}
        />
        <ColorSwatchGrid
          label="Primary colour"
          value={treatment.color}
          onChange={(color) => {
            if (color) update({ color });
          }}
        />
        <ColorSwatchGrid
          label="Accent · ties, swags & florals"
          value={treatment.secondaryColor}
          onChange={(secondaryColor) => {
            if (secondaryColor) update({ secondaryColor });
          }}
        />
        <FullnessField
          id={fieldId("fullness")}
          value={treatment.fullness}
          onChange={(fullness) => update({ fullness })}
        />
      </InspectorSection>

      {archTreatment ? (
        <InspectorSection icon={Frame} eyebrow="Structure" title="Arch frame finish">
          <div role="radiogroup" aria-label="Frame finish" className="grid grid-cols-2 gap-2">
            {STUDIO_FRAME_FINISHES.map((finish) => (
              <OptionTile
                key={finish.value}
                compact
                label={finish.label}
                selected={treatment.frameFinish === finish.value}
                onSelect={() => update({ frameFinish: finish.value })}
                leading={
                  <span
                    aria-hidden
                    className="size-8 shrink-0 rounded-xl ring-1 ring-border/50"
                    style={{ background: FRAME_SWATCH[finish.value] }}
                  />
                }
              />
            ))}
          </div>
        </InspectorSection>
      ) : (
        <InspectorSection icon={Columns3} eyebrow="Hardware" title="How it hangs">
          <div role="radiogroup" aria-label="Hardware" className="space-y-2">
            {headerOptions.map((option) => (
              <OptionTile
                key={option.value}
                compact
                icon={option.icon}
                label={option.label}
                description={option.description}
                selected={headerChoice === option.value}
                onSelect={() => setHeader(option.value)}
              />
            ))}
          </div>
        </InspectorSection>
      )}

      <InspectorSection icon={Flower2} eyebrow="Finishing" title="Layers & details">
        <div className="grid grid-cols-2 gap-2">
          {!backdropTreatment ? (
            <OptionTile
              role="switch"
              compact
              icon={RectangleHorizontal}
              label="Backdrop behind"
              selected={treatment.hasBackdrop}
              onSelect={() => update({ hasBackdrop: !treatment.hasBackdrop })}
            />
          ) : null}
          {sideTreatment || archTreatment ? (
            <OptionTile
              role="switch"
              compact
              icon={Ribbon}
              label="Tiebacks"
              selected={treatment.hasTiebacks}
              onSelect={() => update({ hasTiebacks: !treatment.hasTiebacks })}
            />
          ) : null}
          {!swagType ? (
            <OptionTile
              role="switch"
              compact
              icon={Spline}
              label="Top swag"
              selected={treatment.hasTopSwag}
              onSelect={() => update({ hasTopSwag: !treatment.hasTopSwag })}
            />
          ) : null}
          <OptionTile
            role="switch"
            compact
            icon={Flower2}
            label="Floral header"
            selected={treatment.hasFloralHeader}
            onSelect={() => update({ hasFloralHeader: !treatment.hasFloralHeader })}
          />
        </div>
        {showSwagCount ? (
          <Stepper
            label="Swag scallops"
            hint={type === "layered_swag" ? "Front layer; accent layer interleaves" : undefined}
            value={treatment.swagCount ?? (type === "layered_swag" ? 3 : 1)}
            min={1}
            max={8}
            onChange={(swagCount) => update({ swagCount })}
          />
        ) : null}
        {showSwagDrop ? (
          <RangeField
            id={fieldId("swag")}
            label="Swag drop"
            value={feetValue(treatment.swagDrop)}
            min={0.5}
            max={6}
            onChange={(feet) => update({ swagDrop: Math.max(0, feet * 12) })}
          />
        ) : null}
      </InspectorSection>

      <InspectorSection icon={Lightbulb} eyebrow="Lighting" title="Uplight wash">
        <ColorSwatchGrid
          label="Uplight colour"
          value={treatment.uplightColor}
          noneLabel="No uplights"
          onChange={(uplightColor) => update({ uplightColor })}
        />
      </InspectorSection>

      <div className="space-y-1.5">
        <FieldLabel htmlFor={fieldId("notes")}>Treatment notes</FieldLabel>
        <Textarea
          id={fieldId("notes")}
          rows={3}
          value={treatment.notes}
          placeholder="Fabric, hardware, access, or setup notes…"
          onChange={(event) => update({ notes: event.target.value })}
          className="rounded-xl"
        />
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full rounded-xl"
        onClick={duplicate}
      >
        <Copy aria-hidden="true" />
        Duplicate treatment
      </Button>
    </div>
  );
}
