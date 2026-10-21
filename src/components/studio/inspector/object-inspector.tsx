"use client";

import { Textarea } from "@/components/ui/textarea";
import {
  DANCE_FLOOR_FINISHES,
  DEFAULT_CHAIR_STYLE,
  DRAPE_FABRICS,
  FABRIC_OBJECT_TYPES,
  GENERIC_OBJECT_FINISHES,
  LIGHT_OBJECT_TYPES,
  LINEN_OBJECT_TYPES,
  SEATED_OBJECT_TYPES,
  STUDIO_CHAIR_STYLES,
  STUDIO_MAX_SEATING_COUNT,
  STUDIO_OBJECT_NOTES_MAX_LENGTH,
  getStudioObjectOption,
  type DanceFloorFinish,
  type GenericStudioObjectFinish,
  type StudioDesignJson,
  type StudioObject,
} from "@/data/studio";
import { inchesToFeetLabel } from "@/lib/studio-geometry";
import {
  STUDIO_MAX_COORDINATE,
  STUDIO_OBJECT_MIN_DIMENSIONS,
  getStudioObjectBoundsResult,
} from "@/lib/studio-interactions";
import {
  Armchair,
  Lightbulb,
  Lock,
  Move3d,
  NotebookPen,
  Palette,
  PanelsTopLeft,
  RotateCw,
  Shirt,
  Sparkles,
  TriangleAlert,
  Users,
} from "lucide-react";
import { useStudioEditor } from "../editor/studio-editor-context";
import {
  ChoiceTile,
  InspectorSection,
  LengthField,
  NumberStepper,
  SliderField,
  SwatchGrid,
} from "./inspector-ui";
import { ItemHeader, StatusChip } from "./item-header";
import { RotationControl } from "./rotation-control";
import {
  CHAIR_STYLE_SWATCHES,
  DANCE_FLOOR_SWATCHES,
  FABRIC_DESCRIPTIONS,
  GENERIC_FINISH_SWATCHES,
  STUDIO_OBJECT_ICONS,
  fabricSwatch,
  getObjectCategoryLabel,
  getObjectTypeLabel,
} from "./studio-item-meta";
import { TintField } from "./tint-field";

export function ObjectInspector({
  design,
  object,
  onChange,
}: {
  design: StudioDesignJson;
  object: StudioObject;
  onChange: (design: StudioDesignJson) => void;
}) {
  const { settings, beginTransaction, preview, endTransaction } =
    useStudioEditor();
  const option = getStudioObjectOption(object.type);
  const minimums = STUDIO_OBJECT_MIN_DIMENSIONS[object.type];
  const bounds = getStudioObjectBoundsResult(object, design.room.floor);
  const locked = Boolean(object.locked);
  const lengthStep = settings.snapEnabled ? settings.snapIncrement : 1;
  const seated = SEATED_OBJECT_TYPES.includes(object.type);
  const showsChairStyle = seated || object.type === "chair";
  const linen = LINEN_OBJECT_TYPES.includes(object.type);
  const light = LIGHT_OBJECT_TYPES.includes(object.type);
  const fabric = FABRIC_OBJECT_TYPES.includes(object.type);
  const elevated =
    object.type === "chandelier" || object.type === "ceiling_drape";
  const showsFinish = !fabric && object.type !== "uplight";

  function withPatch(patch: Partial<StudioObject>): StudioDesignJson {
    return {
      ...design,
      objects: design.objects.map((item) =>
        item.id === object.id ? ({ ...item, ...patch } as StudioObject) : item
      ),
    };
  }
  const update = (patch: Partial<StudioObject>) => onChange(withPatch(patch));

  const linenValue =
    object.linenColor === undefined
      ? (option?.linenColor ?? null)
      : object.linenColor;
  const chairStyle = object.chairStyle ?? option?.chairStyle ?? DEFAULT_CHAIR_STYLE;
  const drapeColor = object.drapeColor ?? option?.drapeColor ?? "ivory";
  const fabricValue = object.fabric ?? option?.fabric ?? "velvet";

  return (
    <div className="space-y-3">
      <ItemHeader
        icon={STUDIO_OBJECT_ICONS[object.type]}
        eyebrow={`${getObjectCategoryLabel(object.type)} · ${getObjectTypeLabel(object.type)}`}
        label={object.label}
        onLabelChange={(label) => update({ label })}
        locked={locked}
        hidden={object.hidden}
        meta={
          <>
            <StatusChip>
              {inchesToFeetLabel(object.width)} × {inchesToFeetLabel(object.depth)}
            </StatusChip>
            {seated ? (
              <StatusChip icon={Users}>{object.seatingCount ?? 0} seats</StatusChip>
            ) : null}
          </>
        }
      />

      {!bounds.contained && bounds.warning ? (
        <div
          className="flex gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300"
          role="status"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{bounds.warning}</span>
        </div>
      ) : null}

      {locked ? (
        <div className="flex items-center gap-2 rounded-2xl border border-primary/25 bg-primary/5 px-3 py-2 text-[0.7rem] text-muted-foreground">
          <Lock className="size-3.5 text-primary" aria-hidden="true" />
          Locked — unlock to move, resize or rotate.
        </div>
      ) : null}

      <InspectorSection icon={Move3d} eyebrow="Transform" title="Position & size">
        <div className="grid grid-cols-2 gap-2">
          <LengthField
            label="X position"
            value={object.x}
            step={lengthStep}
            min={-STUDIO_MAX_COORDINATE}
            max={STUDIO_MAX_COORDINATE}
            disabled={locked}
            onChange={(x) => update({ x })}
          />
          <LengthField
            label="Z position"
            value={object.z}
            step={lengthStep}
            min={-STUDIO_MAX_COORDINATE}
            max={STUDIO_MAX_COORDINATE}
            disabled={locked}
            onChange={(z) => update({ z })}
          />
          <LengthField
            label="Width"
            value={object.width}
            step={lengthStep}
            min={minimums.width}
            max={STUDIO_MAX_COORDINATE}
            disabled={locked}
            onChange={(width) => update({ width })}
          />
          <LengthField
            label="Depth"
            value={object.depth}
            step={lengthStep}
            min={minimums.depth}
            max={STUDIO_MAX_COORDINATE}
            disabled={locked}
            onChange={(depth) => update({ depth })}
          />
          <LengthField
            label="Height"
            value={object.height}
            step={lengthStep}
            min={0}
            max={600}
            disabled={locked}
            onChange={(height) => update({ height })}
          />
          {elevated ? (
            <LengthField
              label="Elevation"
              hint="to bottom"
              value={object.elevation ?? option?.elevation ?? 0}
              step={lengthStep}
              min={0}
              max={Math.min(600, design.room.wallHeight)}
              disabled={locked}
              onChange={(elevation) => update({ elevation })}
            />
          ) : null}
        </div>
        <p className="text-[0.62rem] text-muted-foreground">
          Type 12&apos; 6&quot;, 150&quot; or 12.5 · ↑/↓ steps {inchesToFeetLabel(lengthStep)} · Shift = 1″
        </p>
      </InspectorSection>

      <InspectorSection icon={RotateCw} eyebrow="Transform" title="Rotation">
        <RotationControl
          value={object.rotation}
          snapStep={settings.snapEnabled ? settings.rotationSnap : 0}
          disabled={locked}
          onChange={(rotation) => update({ rotation })}
          onGestureStart={beginTransaction}
          onGesturePreview={(rotation) => preview(withPatch({ rotation }))}
          onGestureEnd={endTransaction}
        />
      </InspectorSection>

      {seated || showsChairStyle ? (
        <InspectorSection icon={Armchair} eyebrow="Guests" title="Seating">
          {seated ? (
            <NumberStepper
              label="Seats"
              value={object.seatingCount ?? 0}
              min={0}
              max={STUDIO_MAX_SEATING_COUNT}
              suffix="guests"
              onChange={(seatingCount) => update({ seatingCount })}
            />
          ) : null}
          {showsChairStyle ? (
            <div
              role="radiogroup"
              aria-label="Chair style"
              className="grid grid-cols-2 gap-1.5"
            >
              {STUDIO_CHAIR_STYLES.filter(
                (style) => seated || style.value !== "none"
              ).map((style) => (
                <ChoiceTile
                  key={style.value}
                  label={style.label}
                  swatch={CHAIR_STYLE_SWATCHES[style.value]}
                  selected={chairStyle === style.value}
                  onSelect={() => update({ chairStyle: style.value })}
                />
              ))}
            </div>
          ) : null}
        </InspectorSection>
      ) : null}

      {linen ? (
        <InspectorSection icon={Shirt} eyebrow="Tablescape" title="Table linen">
          <SwatchGrid
            label="Linen colour"
            noneLabel="Bare"
            value={linenValue}
            onChange={(linenColor) => update({ linenColor })}
          />
        </InspectorSection>
      ) : null}

      {light ? (
        <InspectorSection icon={Lightbulb} eyebrow="Lighting" title="Light colour">
          <SwatchGrid
            label="Glow"
            value={object.lightColor ?? option?.lightColor ?? "gold"}
            onChange={(lightColor) =>
              update({ lightColor: lightColor ?? undefined })
            }
          />
        </InspectorSection>
      ) : null}

      {fabric ? (
        <InspectorSection icon={PanelsTopLeft} eyebrow="Drapery" title="Fabric & colour">
          <div
            role="radiogroup"
            aria-label="Fabric"
            className="grid grid-cols-2 gap-1.5"
          >
            {DRAPE_FABRICS.map((item) => (
              <ChoiceTile
                key={item.value}
                label={item.label}
                description={FABRIC_DESCRIPTIONS[item.value]}
                swatch={fabricSwatch(item.value, drapeColor)}
                selected={fabricValue === item.value}
                onSelect={() => update({ fabric: item.value })}
              />
            ))}
          </div>
          <SwatchGrid
            label="Drape colour"
            value={drapeColor}
            onChange={(next) => update({ drapeColor: next ?? undefined })}
          />
          <SliderField
            label="Fullness"
            value={object.fullness ?? option?.fullness ?? 2}
            min={1}
            max={4}
            step={0.25}
            format={(value) => `${value.toFixed(2)}×`}
            onChange={(fullness) => update({ fullness })}
          />
        </InspectorSection>
      ) : null}

      {showsFinish ? (
        <InspectorSection icon={Sparkles} eyebrow="Material" title="Finish">
          <div
            role="radiogroup"
            aria-label="Finish"
            className="grid grid-cols-2 gap-1.5"
          >
            {object.type === "dance_floor"
              ? DANCE_FLOOR_FINISHES.map((finish) => (
                  <ChoiceTile
                    key={finish.value}
                    label={finish.label.replace(" (placeholder)", "")}
                    swatch={DANCE_FLOOR_SWATCHES[finish.value]}
                    selected={(object.finish ?? "white_gloss") === finish.value}
                    onSelect={() =>
                      update({ finish: finish.value as DanceFloorFinish })
                    }
                  />
                ))
              : GENERIC_OBJECT_FINISHES.map((finish) => (
                  <ChoiceTile
                    key={finish.value}
                    label={finish.label}
                    swatch={GENERIC_FINISH_SWATCHES[finish.value]}
                    selected={
                      (object.finish ?? option?.finish ?? "natural_wood") ===
                      finish.value
                    }
                    onSelect={() =>
                      update({
                        finish: finish.value as GenericStudioObjectFinish,
                      } as Partial<StudioObject>)
                    }
                  />
                ))}
          </div>
        </InspectorSection>
      ) : null}

      <InspectorSection icon={Palette} eyebrow="Colour" title="Custom tint">
        <TintField
          value={object.color}
          onChange={(color) => update({ color })}
        />
      </InspectorSection>

      <InspectorSection icon={NotebookPen} eyebrow="Crew" title="Object notes">
        <Textarea
          rows={3}
          maxLength={STUDIO_OBJECT_NOTES_MAX_LENGTH}
          value={object.notes ?? ""}
          placeholder="Placement, finish, or setup notes…"
          aria-label="Object notes"
          onChange={(event) => update({ notes: event.target.value })}
          className="rounded-xl bg-background/50 text-sm"
        />
      </InspectorSection>
    </div>
  );
}
