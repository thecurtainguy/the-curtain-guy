"use client";

import { Textarea } from "@/components/ui/textarea";
import {
  CEILING_COVERAGES,
  CEILING_DRAPE_STYLES,
  CEILING_HUB_DECOR,
  CEILING_LIGHT_STYLES,
  STUDIO_LABEL_MAX_LENGTH,
  STUDIO_NOTES_MAX_LENGTH,
  type CeilingCoverage,
  type CeilingHubDecor,
  type CeilingLightStyle,
  type StudioCeilingDrape,
  type StudioDesignJson,
} from "@/data/studio";
import {
  CEILING_STYLE_FIELDS,
  ceilingLowestDrop,
  changeCeilingDrapeStyle,
  estimateCeilingFabric,
  getCeilingOutline,
  moveCeilingDrape,
  normalizeCeilingRotation,
  updateCeilingDrape,
  type CeilingField,
} from "@/lib/studio-ceiling";
import { getPolygonCentroid, inchesToFeetLabel } from "@/lib/studio-geometry";
import { cn } from "@/lib/utils";
import {
  Anchor,
  CircleDot,
  CircleOff,
  Copy,
  Crosshair,
  Eye,
  EyeOff,
  Gem,
  Layers,
  LampCeiling,
  Lightbulb,
  LightbulbOff,
  LocateFixed,
  Lock,
  LockOpen,
  Maximize,
  Medal,
  NotebookPen,
  PanelTop,
  Flower2,
  Ruler,
  ScanEye,
  ShieldCheck,
  Sparkles,
  SquareDashed,
  Star,
  Sun,
  Trash2,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { useId, useMemo, useState } from "react";
import {
  useStudioEditorActions,
  useStudioSettings,
  useStudioView,
} from "../editor/studio-editor-context";
import { CeilingStyleArt } from "../library/ceiling-style-art";
import { FabricPicker, FullnessField } from "../three/fabric/fabric-controls";
import {
  ChoiceTile,
  IconAction,
  InspectorSection,
  LengthField,
  SelectionRing,
  SliderField,
  StatTile,
  SwatchGrid,
  ToggleRow,
} from "./inspector-ui";
import { StatusChip } from "./item-header";
import { RotationControl } from "./rotation-control";
import { getCeilingStyleLabel } from "./studio-item-meta";

type CeilingPatch = Partial<Omit<StudioCeilingDrape, "id">>;

const COVERAGE_META: Record<CeilingCoverage, { icon: LucideIcon; description: string }> = {
  room: { icon: Maximize, description: "Follows every wall" },
  area: { icon: SquareDashed, description: "A rectangle you size" },
};

const LIGHT_META: Record<CeilingLightStyle, { icon: LucideIcon; description: string }> = {
  none: { icon: LightbulbOff, description: "Fabric only" },
  fairy: { icon: Sparkles, description: "Twinkling micro-LEDs" },
  bistro: { icon: Lightbulb, description: "Warm festoon bulbs" },
  starlight: { icon: Star, description: "Pin-point star field" },
};

const HUB_META: Record<CeilingHubDecor, { icon: LucideIcon; description: string }> = {
  none: { icon: CircleOff, description: "Clean gather" },
  chandelier: { icon: Gem, description: "Crystal centrepiece" },
  floral_ring: { icon: Flower2, description: "Fresh floral wreath" },
  rosette: { icon: CircleDot, description: "Pleated fabric bloom" },
  medallion: { icon: Medal, description: "Gilded ceiling rose" },
};

/** Numeric geometry fields in display order (shown only when the style labels them). */
const GEOMETRY_FIELDS: Array<{
  field: Extract<CeilingField, "count" | "scallops" | "panelWidth" | "sag" | "hubDrop" | "edgeDrop">;
  kind: "count" | "length";
}> = [
  { field: "count", kind: "count" },
  { field: "scallops", kind: "count" },
  { field: "panelWidth", kind: "length" },
  { field: "sag", kind: "length" },
  { field: "hubDrop", kind: "length" },
  { field: "edgeDrop", kind: "length" },
];

const WARN_CLEARANCE = 96;
const MIN_CLEARANCE = 84;

export function CeilingInspector({
  design,
  drape,
  onChange,
}: {
  design: StudioDesignJson;
  drape: StudioCeilingDrape;
  onChange: (design: StudioDesignJson) => void;
}) {
  const {
    commit,
    setViewMode,
    sendCanvasCommand,
    beginTransaction,
    preview,
    endTransaction,
  } = useStudioEditorActions();
  const settings = useStudioSettings();
  const { viewMode } = useStudioView();
  const floor = design.room.floor;
  const fields = CEILING_STYLE_FIELDS[drape.type];
  const locked = Boolean(drape.locked);
  const lengthStep = settings.snapEnabled ? settings.snapIncrement : 1;
  const estimate = useMemo(() => estimateCeilingFabric(drape, floor), [drape, floor]);
  const lowest = ceilingLowestDrop(drape);
  const clearance = design.room.wallHeight - lowest;

  const withPatch = (patch: CeilingPatch) => updateCeilingDrape(design, drape.id, patch);
  const update = (patch: CeilingPatch) => onChange(withPatch(patch));
  /** Slider drags and typing coalesce into one undo step per field. */
  const slide = (key: string, patch: CeilingPatch) =>
    commit(withPatch(patch), { coalesceKey: `ceiling:${drape.id}:${key}` });

  function lookUp() {
    if (viewMode === "2d") setViewMode("split");
    sendCanvasCommand({ type: "camera", view: "ceiling" });
    // Canvas commands are a single slot; let the camera command land first.
    window.requestAnimationFrame(() =>
      window.requestAnimationFrame(() => sendCanvasCommand({ type: "focus_selection" }))
    );
  }

  function centreHub() {
    const centre = getPolygonCentroid(getCeilingOutline(drape, floor));
    update({ hubX: Math.round(centre.x), hubZ: Math.round(centre.z) });
  }

  function centreArea() {
    const centre = getPolygonCentroid(floor);
    update(moveCeilingDrape(drape, centre.x - drape.x, centre.z - drape.z));
  }

  const geometry = GEOMETRY_FIELDS.filter(({ field }) => fields.labels[field]);

  return (
    <div className="space-y-3">
      <CeilingHeader
        drape={drape}
        coveredSqFt={estimate.coveredSqFt}
        onLabelChange={(label) => slide("label", { label })}
        onLookUp={lookUp}
      />

      {locked ? (
        <div className="flex items-center gap-2 rounded-2xl border border-primary/25 bg-primary/5 px-3 py-2 text-[0.7rem] text-muted-foreground">
          <Lock className="size-3.5 text-primary" aria-hidden="true" />
          Locked — unlock to change coverage or shape.
        </div>
      ) : null}

      <ClearanceCallout
        clearance={clearance}
        drop={lowest}
        wallHeight={design.room.wallHeight}
      />

      <InspectorSection icon={LampCeiling} eyebrow="Silhouette" title="Ceiling style">
        <div role="radiogroup" aria-label="Ceiling style" className="grid grid-cols-3 gap-1.5">
          {CEILING_DRAPE_STYLES.map((style) => {
            const selected = drape.type === style.value;
            return (
              <button
                key={style.value}
                type="button"
                role="radio"
                aria-checked={selected}
                title={style.description}
                onClick={() =>
                  update(changeCeilingDrapeStyle(drape, style.value, floor))
                }
                className={cn(
                  "group relative flex min-w-0 flex-col overflow-hidden rounded-xl border text-left transition-all duration-200 motion-reduce:transition-none",
                  "border-border/40 bg-card/35 hover:border-primary/30",
                  "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
                  selected &&
                    "border-primary/55 bg-primary/10 shadow-[inset_0_0_0_1px_oklch(0.76_0.15_88/20%)]"
                )}
              >
                <span className="relative block h-11 overflow-hidden border-b border-border/30">
                  <CeilingStyleArt
                    style={style.value}
                    color={selected ? drape.color : undefined}
                    accentColor={selected ? drape.accentColor : undefined}
                  />
                  <SelectionRing
                    selected={selected}
                    className="absolute top-1 right-1 size-3.5 shadow-sm"
                  />
                </span>
                <span className="truncate px-1.5 py-1 text-[0.62rem] font-medium text-foreground">
                  {style.label}
                </span>
              </button>
            );
          })}
        </div>
      </InspectorSection>

      <InspectorSection
        icon={SquareDashed}
        eyebrow="Placement"
        title="Coverage"
        action={<StatusChip>{estimate.coveredSqFt.toLocaleString()} ft²</StatusChip>}
      >
        <div role="radiogroup" aria-label="Coverage" className="grid grid-cols-2 gap-1.5">
          {CEILING_COVERAGES.map((coverage) => (
            <ChoiceTile
              key={coverage.value}
              label={coverage.label}
              description={COVERAGE_META[coverage.value].description}
              icon={COVERAGE_META[coverage.value].icon}
              selected={drape.coverage === coverage.value}
              disabled={locked}
              onSelect={() => update({ coverage: coverage.value })}
            />
          ))}
        </div>
        {drape.coverage === "room" ? (
          <SliderField
            label="Inset from walls"
            value={drape.inset}
            min={0}
            max={120}
            step={3}
            disabled={locked}
            format={(inches) => (inches === 0 ? "Wall to wall" : inchesToFeetLabel(inches))}
            onChange={(inset) => slide("inset", { inset })}
          />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <LengthField
                label="Width"
                value={drape.width}
                step={lengthStep}
                min={12}
                max={120000}
                disabled={locked}
                onChange={(width) => slide("width", { width })}
              />
              <LengthField
                label="Depth"
                value={drape.depth}
                step={lengthStep}
                min={12}
                max={120000}
                disabled={locked}
                onChange={(depth) => slide("depth", { depth })}
              />
              <LengthField
                label="Centre X"
                value={drape.x}
                step={lengthStep}
                min={-120000}
                max={120000}
                disabled={locked}
                onChange={(x) => slide("move", moveCeilingDrape(drape, x - drape.x, 0))}
              />
              <LengthField
                label="Centre Z"
                value={drape.z}
                step={lengthStep}
                min={-120000}
                max={120000}
                disabled={locked}
                onChange={(z) => slide("move", moveCeilingDrape(drape, 0, z - drape.z))}
              />
            </div>
            <ActionButton icon={LocateFixed} disabled={locked} onClick={centreArea}>
              Centre area in room
            </ActionButton>
          </>
        )}
      </InspectorSection>

      <InspectorSection icon={PanelTop} eyebrow="Drapery" title="Fabric & colour">
        <FabricPicker
          value={drape.fabric}
          color={drape.color}
          onChange={(fabric) => update({ fabric })}
        />
        <SwatchGrid
          label="Colour"
          value={drape.color}
          onChange={(color) => {
            if (color) update({ color });
          }}
        />
        <SwatchGrid
          label="Accent panels"
          noneLabel="None"
          value={drape.accentColor}
          onChange={(accentColor) => update({ accentColor })}
        />
        <FullnessField
          id={`${drape.id}-fullness`}
          value={drape.fullness}
          onChange={(fullness) => slide("fullness", { fullness })}
        />
      </InspectorSection>

      {geometry.length > 0 || fields.labels.direction ? (
        <InspectorSection
          icon={Ruler}
          eyebrow={getCeilingStyleLabel(drape.type)}
          title="Shape & drops"
        >
          {geometry.map(({ field, kind }) => {
            const range = fields.ranges[field] ?? { min: 0, max: 120, step: 1 };
            const value = drape[field];
            return (
              <SliderField
                key={field}
                label={fields.labels[field] ?? field}
                value={value}
                min={range.min}
                max={range.max}
                step={range.step}
                disabled={locked}
                format={(next) => (kind === "count" ? String(next) : inchesToFeetLabel(next))}
                onChange={(next) => slide(field, { [field]: next } as CeilingPatch)}
              />
            );
          })}
          <p className="text-[0.62rem] text-muted-foreground">
            Drops are measured down from the ceiling.
          </p>
          {fields.labels.direction ? (
            <div className="space-y-2 rounded-xl border border-border/40 bg-background/30 p-2.5">
              <p className="text-[0.68rem] font-medium tracking-wide text-muted-foreground">
                {fields.labels.direction}
              </p>
              <RotationControl
                value={drape.rotation}
                snapStep={settings.snapEnabled ? settings.rotationSnap : 0}
                disabled={locked}
                onChange={(rotation) =>
                  slide("rotation", { rotation: normalizeCeilingRotation(rotation) })
                }
                onGestureStart={beginTransaction}
                onGesturePreview={(rotation) =>
                  preview(withPatch({ rotation: normalizeCeilingRotation(rotation) }))
                }
                onGestureEnd={endTransaction}
              />
            </div>
          ) : null}
        </InspectorSection>
      ) : null}

      {fields.labels.hub ? (
        <InspectorSection icon={Crosshair} eyebrow="Radial centre" title={fields.labels.hub}>
          <div className="grid grid-cols-2 gap-2">
            <LengthField
              label="X"
              value={drape.hubX}
              step={lengthStep}
              min={-120000}
              max={120000}
              disabled={locked}
              onChange={(hubX) => slide("hub", { hubX })}
            />
            <LengthField
              label="Z"
              value={drape.hubZ}
              step={lengthStep}
              min={-120000}
              max={120000}
              disabled={locked}
              onChange={(hubZ) => slide("hub", { hubZ })}
            />
          </div>
          <ActionButton icon={LocateFixed} disabled={locked} onClick={centreHub}>
            Centre in room
          </ActionButton>
          {fields.labels.hubDecor ? (
            <div className="space-y-1.5">
              <p className="text-[0.68rem] font-medium tracking-wide text-muted-foreground">
                {fields.labels.hubDecor}
              </p>
              <div
                role="radiogroup"
                aria-label={fields.labels.hubDecor}
                className="grid grid-cols-2 gap-1.5"
              >
                {CEILING_HUB_DECOR.map((decor) => (
                  <ChoiceTile
                    key={decor.value}
                    label={decor.label}
                    description={HUB_META[decor.value].description}
                    icon={HUB_META[decor.value].icon}
                    selected={drape.hubDecor === decor.value}
                    onSelect={() => update({ hubDecor: decor.value })}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </InspectorSection>
      ) : null}

      <InspectorSection icon={Sparkles} eyebrow="Atmosphere" title="Lights & wash">
        <div role="radiogroup" aria-label="Ceiling lights" className="grid grid-cols-2 gap-1.5">
          {CEILING_LIGHT_STYLES.map((light) => (
            <ChoiceTile
              key={light.value}
              label={light.label}
              description={LIGHT_META[light.value].description}
              icon={LIGHT_META[light.value].icon}
              selected={drape.lights === light.value}
              onSelect={() => update({ lights: light.value })}
            />
          ))}
        </div>
        {drape.lights !== "none" ? (
          <SwatchGrid
            label="Light colour"
            value={drape.lightColor}
            onChange={(lightColor) => {
              if (lightColor) update({ lightColor });
            }}
          />
        ) : null}
        <SwatchGrid
          label="Uplight wash"
          noneLabel="None"
          value={drape.uplightColor}
          onChange={(uplightColor) => update({ uplightColor })}
        />
        {drape.type !== "perimeter_swag" ? (
          <ToggleRow
            icon={Sun}
            label="Perimeter valance"
            description="Finishes the edge where fabric meets the walls"
            checked={drape.perimeterValance}
            onChange={(perimeterValance) => update({ perimeterValance })}
          />
        ) : null}
      </InspectorSection>

      <InspectorSection icon={Ruler} eyebrow="Production" title="Fabric estimate">
        <div className="grid grid-cols-2 gap-2">
          <StatTile icon={Ruler} label="Fabric" value={`${estimate.linearYards.toLocaleString()} yd`} />
          <StatTile icon={Layers} label="Pieces" value={estimate.pieces.toLocaleString()} />
          <StatTile icon={Anchor} label="Rigging pts" value={estimate.riggingPoints.toLocaleString()} />
          <StatTile
            icon={SquareDashed}
            label="Covered"
            value={`${estimate.coveredSqFt.toLocaleString()} ft²`}
          />
        </div>
        <p className="text-[0.62rem] text-muted-foreground">
          Includes fullness. Final yardage is confirmed on the site visit.
        </p>
      </InspectorSection>

      <InspectorSection icon={NotebookPen} eyebrow="Crew" title="Rigging notes">
        <Textarea
          rows={3}
          maxLength={STUDIO_NOTES_MAX_LENGTH}
          value={drape.notes}
          placeholder="Rigging points, venue rules, install order…"
          aria-label="Ceiling design notes"
          onChange={(event) => slide("notes", { notes: event.target.value })}
          className="rounded-xl bg-background/50 text-sm"
        />
      </InspectorSection>
    </div>
  );
}

function CeilingHeader({
  drape,
  coveredSqFt,
  onLabelChange,
  onLookUp,
}: {
  drape: StudioCeilingDrape;
  coveredSqFt: number;
  onLabelChange: (label: string) => void;
  onLookUp: () => void;
}) {
  const { commands } = useStudioEditorActions();
  const labelId = useId();
  // Saved designs reject empty labels, so blanks stay local until blur reverts them.
  const [draft, setDraft] = useState<string | null>(null);
  const locked = Boolean(drape.locked);
  const hidden = Boolean(drape.hidden);
  const coverage =
    CEILING_COVERAGES.find((option) => option.value === drape.coverage)?.label ?? drape.coverage;
  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/12 via-card/40 to-card/20">
      <div className="relative h-24 overflow-hidden border-b border-primary/15">
        <CeilingStyleArt
          style={drape.type}
          color={drape.color}
          accentColor={drape.accentColor}
          lights={drape.lights}
          lightColor={drape.lightColor}
          hubDecor={drape.hubDecor}
          title={`${getCeilingStyleLabel(drape.type)} preview`}
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-card/90 via-transparent to-transparent"
          aria-hidden="true"
        />
        <span className="absolute top-2 left-2 flex size-8 items-center justify-center rounded-xl border border-primary/30 bg-black/45 text-primary backdrop-blur-sm">
          <LampCeiling className="size-4" aria-hidden="true" />
        </span>
      </div>
      <div className="relative p-3 pt-2">
        <p className="text-[0.58rem] font-semibold tracking-[0.2em] text-primary uppercase">
          Ceiling · {getCeilingStyleLabel(drape.type)}
        </p>
        <label className="sr-only" htmlFor={labelId}>
          Ceiling design label
        </label>
        <input
          id={labelId}
          value={draft ?? drape.label}
          maxLength={STUDIO_LABEL_MAX_LENGTH}
          onChange={(event) => {
            const next = event.target.value;
            setDraft(next);
            if (next.trim()) onLabelChange(next);
          }}
          onBlur={() => setDraft(null)}
          className="-mx-1 w-full truncate rounded-lg bg-transparent px-1 font-heading text-lg leading-tight outline-none hover:bg-background/30 focus:bg-background/50 focus:ring-2 focus:ring-primary/20"
        />
        <div className="mt-1 flex flex-wrap items-center gap-1">
          <StatusChip icon={SquareDashed}>{coverage}</StatusChip>
          <StatusChip>{coveredSqFt.toLocaleString()} ft²</StatusChip>
          {locked ? <StatusChip icon={Lock}>Locked</StatusChip> : null}
          {hidden ? <StatusChip icon={EyeOff}>Hidden</StatusChip> : null}
        </div>
      </div>
      <div className="relative flex gap-1.5 border-t border-primary/15 bg-background/20 p-2">
        <button
          type="button"
          onClick={onLookUp}
          className="flex h-9 flex-[2] items-center justify-center gap-1.5 rounded-xl border border-primary/45 bg-primary/15 text-xs font-semibold text-primary transition-colors hover:bg-primary/25 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
        >
          <ScanEye className="size-4" aria-hidden="true" />
          Look up
        </button>
        <IconAction icon={Copy} label="Duplicate" shortcut="Ctrl D" onClick={commands.duplicate} />
        <IconAction
          icon={locked ? Lock : LockOpen}
          label={locked ? "Unlock" : "Lock in place"}
          shortcut="L"
          active={locked}
          onClick={() => commands.setLocked()}
        />
        <IconAction
          icon={hidden ? EyeOff : Eye}
          label={hidden ? "Show" : "Hide"}
          shortcut="H"
          active={hidden}
          onClick={() => commands.setHidden()}
        />
        <IconAction
          icon={Trash2}
          label={locked ? "Unlock to delete" : "Delete"}
          shortcut="Del"
          destructive
          disabled={locked}
          onClick={commands.remove}
        />
      </div>
    </div>
  );
}

function ClearanceCallout({
  clearance,
  drop,
  wallHeight,
}: {
  clearance: number;
  drop: number;
  wallHeight: number;
}) {
  const tone = clearance < MIN_CLEARANCE ? "error" : clearance < WARN_CLEARANCE ? "warn" : "ok";
  const above = Math.max(0, clearance);
  const dropPercent = wallHeight > 0 ? Math.min(100, Math.max(4, (drop / wallHeight) * 100)) : 0;
  const markPercent = wallHeight > 0 ? Math.min(100, (WARN_CLEARANCE / wallHeight) * 100) : 0;
  const Icon = tone === "ok" ? ShieldCheck : TriangleAlert;
  return (
    <div
      role="status"
      className={cn(
        "flex items-stretch gap-3 rounded-2xl border p-3",
        tone === "ok" && "border-primary/25 bg-primary/5",
        tone === "warn" && "border-amber-500/35 bg-amber-500/10",
        tone === "error" && "border-destructive/40 bg-destructive/10"
      )}
    >
      <div
        className="relative w-7 shrink-0 overflow-hidden rounded-lg border border-border/50 bg-background/50"
        aria-hidden="true"
      >
        <div
          className={cn(
            "absolute inset-x-0 top-0",
            tone === "error" ? "bg-destructive/60" : tone === "warn" ? "bg-amber-500/60" : "bg-primary/50"
          )}
          style={{ height: `${dropPercent}%` }}
        />
        <div
          className="absolute inset-x-0 border-t border-dashed border-foreground/40"
          style={{ bottom: `${markPercent}%` }}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "flex items-center gap-1 text-[0.58rem] font-semibold tracking-[0.18em] uppercase",
            tone === "ok" && "text-primary",
            tone === "warn" && "text-amber-600 dark:text-amber-300",
            tone === "error" && "text-destructive"
          )}
        >
          <Icon className="size-3" aria-hidden="true" />
          Head clearance
        </p>
        <p className="mt-0.5 font-heading text-lg leading-tight tabular-nums">
          {inchesToFeetLabel(above)}{" "}
          <span className="text-xs font-normal text-muted-foreground">above the floor</span>
        </p>
        <p className="text-[0.62rem] leading-snug text-muted-foreground">
          {tone === "error"
            ? "Under 7′ — too low over guests. Shorten the drops."
            : tone === "warn"
              ? "Under 8′ — tall guests may brush it."
              : `Lowest point hangs ${inchesToFeetLabel(drop)} below the ${inchesToFeetLabel(wallHeight)} ceiling.`}
        </p>
      </div>
    </div>
  );
}

function ActionButton({
  icon: Icon,
  disabled,
  onClick,
  children,
}: {
  icon: LucideIcon;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-8 w-full items-center justify-center gap-1.5 rounded-xl border border-border/40 bg-card/35 text-[0.68rem] font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-40"
    >
      <Icon className="size-3.5 text-primary" aria-hidden="true" />
      {children}
    </button>
  );
}
