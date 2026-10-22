"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  CEILING_DRAPE_STYLES,
  CEILING_LIGHT_STYLES,
  DRAPE_COLORS,
  DRAPE_FABRICS,
  STUDIO_MAX_CEILING_DRAPES,
  getCeilingDrapes,
  getDrapeColorHex,
  type CeilingDrapeStyle,
  type StudioCeilingDrape,
  type StudioDesignJson,
} from "@/data/studio";
import {
  STUDIO_CEILING_PRESETS,
  type StudioCeilingPreset,
} from "@/data/studio-ceiling-presets";
import { getEventCatalogImage } from "@/data/event-builder/catalog-images";
import { addCeilingDrape, createCeilingDrape } from "@/lib/studio-ceiling";
import { cn } from "@/lib/utils";
import {
  Crosshair,
  Crown,
  LampCeiling,
  Layers,
  MousePointerClick,
  Plus,
  X,
} from "lucide-react";
import {
  armCeilingPlacement,
  disarmCeilingPlacement,
  useCeilingPlacement,
  type CeilingPlacementRequest,
} from "../editor/ceiling-placement-store";
import {
  useOptionalStudioEditorActions,
  useOptionalStudioView,
} from "../editor/studio-editor-context";
import { getCeilingStyleLabel } from "../inspector/studio-item-meta";
import type { StudioSelection } from "../studio-types";
import { CeilingStyleArt } from "./ceiling-style-art";
import {
  LibraryCard,
  LibrarySectionHeading,
  SelectionDot,
  matchesLibraryQuery,
} from "./studio-library-ui";

type CeilingOverrides = CeilingPlacementRequest["overrides"];

const HERO_IMAGE = getEventCatalogImage("coming_ceiling_drape");

function filterStyles(query: string) {
  return CEILING_DRAPE_STYLES.filter((style) =>
    matchesLibraryQuery(query, style.label, style.description, style.value, "ceiling overhead drape")
  );
}

function filterPresets(query: string) {
  return STUDIO_CEILING_PRESETS.filter((preset) =>
    matchesLibraryQuery(
      query,
      preset.label,
      preset.description,
      preset.style,
      preset.overrides.fabric ?? "",
      preset.overrides.color ?? "",
      preset.overrides.lights ?? "",
      "ceiling overhead drape look preset"
    )
  );
}

export function countCeilingMatches(query: string): number {
  return filterStyles(query).length + filterPresets(query).length;
}

function optionLabel<T extends string>(
  options: ReadonlyArray<{ value: T; label: string }>,
  value: T | undefined
) {
  return options.find((option) => option.value === value)?.label;
}

function isArmed(
  armed: CeilingPlacementRequest | null,
  style: CeilingDrapeStyle,
  label: string
) {
  return armed?.style === style && armed.label === label;
}

export function LibraryCeilingTab({
  design,
  onChange,
  selection,
  onSelect,
  query,
  idPrefix,
}: {
  design: StudioDesignJson;
  onChange: (design: StudioDesignJson) => void;
  selection: StudioSelection;
  onSelect: (selection: StudioSelection) => void;
  query: string;
  idPrefix: string;
}) {
  const editor = useOptionalStudioEditorActions();
  const viewMode = useOptionalStudioView()?.viewMode;
  const armed = useCeilingPlacement();
  const [notice, setNotice] = useState<string | null>(null);
  const searching = query.trim().length > 0;
  const drapes = getCeilingDrapes(design);
  const full = drapes.length >= STUDIO_MAX_CEILING_DRAPES;
  const styles = filterStyles(query);
  const presets = filterPresets(query);

  useEffect(() => {
    if (!armed) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") disarmCeilingPlacement();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [armed]);

  function add(style: CeilingDrapeStyle, overrides: CeilingOverrides = {}) {
    if (full) {
      setNotice(`A design can hold up to ${STUDIO_MAX_CEILING_DRAPES} ceiling designs.`);
      return;
    }
    disarmCeilingPlacement();
    const drape = createCeilingDrape(style, design.room.floor, overrides);
    onChange(addCeilingDrape(design, drape));
    onSelect({ kind: "ceiling", id: drape.id });
    setNotice(`Added ${drape.label} to the ceiling.`);
    if (editor && viewMode !== "2d") {
      editor.sendCanvasCommand({ type: "camera", view: "ceiling" });
    }
  }

  function place(style: CeilingDrapeStyle, label: string, overrides: CeilingOverrides = {}) {
    if (isArmed(armed, style, label)) {
      disarmCeilingPlacement();
      return;
    }
    if (full) {
      setNotice(`A design can hold up to ${STUDIO_MAX_CEILING_DRAPES} ceiling designs.`);
      return;
    }
    setNotice(null);
    armCeilingPlacement({ style, label, overrides });
    if (editor && viewMode === "3d") {
      editor.sendCanvasCommand({ type: "camera", view: "ceiling" });
    }
  }

  return (
    <div className="space-y-3">
      {!searching ? (
        <section
          aria-labelledby={`${idPrefix}-hero-heading`}
          className="relative overflow-hidden rounded-2xl border border-primary/25"
        >
          <div className="relative h-28">
            <Image
              src={HERO_IMAGE.src}
              alt={HERO_IMAGE.alt}
              fill
              sizes="320px"
              className="object-cover"
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-background via-background/55 to-background/10"
              aria-hidden
            />
            <div
              className="absolute inset-0 bg-[radial-gradient(ellipse_at_0%_100%,color-mix(in_oklch,var(--primary)_22%,transparent),transparent_60%)]"
              aria-hidden
            />
            <div className="absolute inset-x-3 bottom-2.5 flex items-end gap-2.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-primary/35 bg-black/45 text-primary backdrop-blur-sm">
                <LampCeiling className="size-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-[0.58rem] font-semibold tracking-[0.22em] text-primary uppercase">
                  Overhead
                </p>
                <h3
                  id={`${idPrefix}-hero-heading`}
                  className="font-heading text-lg leading-tight text-foreground"
                >
                  Ceiling drapery
                </h3>
              </div>
            </div>
          </div>
          <div className="space-y-2 bg-card/40 px-3 pt-2 pb-3">
            <p className="text-[0.66rem] leading-snug text-muted-foreground">
              Starbursts, tents, billows and cascades — sized to this room.
            </p>
            <div className="flex flex-wrap gap-1">
              <HeroChip icon={Layers}>
                {drapes.length} / {STUDIO_MAX_CEILING_DRAPES} in room
              </HeroChip>
              <HeroChip icon={LampCeiling}>{CEILING_DRAPE_STYLES.length} styles</HeroChip>
              <HeroChip icon={Crown}>{STUDIO_CEILING_PRESETS.length} looks</HeroChip>
            </div>
          </div>
        </section>
      ) : null}

      {armed ? (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-2xl border border-primary/45 bg-gradient-to-br from-primary/20 via-primary/8 to-transparent p-3"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary">
            <MousePointerClick className="size-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-foreground">
              Placing {armed.label}
            </p>
            <p className="text-[0.62rem] leading-snug text-muted-foreground">
              Click the ceiling in 3D, or inside the room on the 2D plan. Esc cancels.
            </p>
          </div>
          <button
            type="button"
            onClick={disarmCeilingPlacement}
            aria-label="Cancel placement"
            className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-border/40 bg-background/50 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        </div>
      ) : null}

      {notice ? (
        <p role="status" className="px-1 text-[0.62rem] text-primary/90">
          {notice}
        </p>
      ) : null}

      {styles.length > 0 ? (
        <LibraryCard aria-labelledby={`${idPrefix}-styles-heading`}>
          <LibrarySectionHeading
            icon={LampCeiling}
            eyebrow="Ceiling styles"
            title="Choose a silhouette"
            id={`${idPrefix}-styles-heading`}
          />
          {!searching ? (
            <p className="text-[0.62rem] leading-snug text-muted-foreground">
              <span className="font-medium text-foreground/85">Add</span> centres it in
              the room · <span className="font-medium text-foreground/85">Place</span>{" "}
              lets you click where it goes.
            </p>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            {styles.map((style) => {
              const inRoom = drapes.filter((drape) => drape.type === style.value).length;
              return (
                <CeilingActionCard
                  key={style.value}
                  art={<CeilingStyleArt style={style.value} />}
                  label={style.label}
                  description={style.description}
                  badge={inRoom > 0 ? `×${inRoom}` : undefined}
                  armed={isArmed(armed, style.value, style.label)}
                  disabled={full}
                  onAdd={() => add(style.value)}
                  onPlace={() => place(style.value, style.label)}
                />
              );
            })}
          </div>
        </LibraryCard>
      ) : null}

      {presets.length > 0 ? (
        <LibraryCard aria-labelledby={`${idPrefix}-presets-heading`}>
          <LibrarySectionHeading
            icon={Crown}
            eyebrow="Signature looks"
            title="Styled by The Curtain Guy"
            id={`${idPrefix}-presets-heading`}
          />
          <div className="grid grid-cols-2 gap-2">
            {presets.map((preset) => (
              <PresetCard
                key={preset.id}
                preset={preset}
                armed={isArmed(armed, preset.style, preset.label)}
                disabled={full}
                onAdd={() => add(preset.style, preset.overrides)}
                onPlace={() => place(preset.style, preset.label, preset.overrides)}
              />
            ))}
          </div>
        </LibraryCard>
      ) : null}

      {!searching && drapes.length > 0 ? (
        <LibraryCard aria-labelledby={`${idPrefix}-room-heading`}>
          <LibrarySectionHeading
            icon={Layers}
            eyebrow="In this room"
            title={`${drapes.length} ceiling design${drapes.length === 1 ? "" : "s"}`}
            id={`${idPrefix}-room-heading`}
          />
          <ul className="space-y-1">
            {drapes.map((drape) => (
              <InRoomRow
                key={drape.id}
                drape={drape}
                selected={selection?.kind === "ceiling" && selection.id === drape.id}
                onSelect={() => onSelect({ kind: "ceiling", id: drape.id })}
              />
            ))}
          </ul>
        </LibraryCard>
      ) : null}
    </div>
  );
}

function HeroChip({
  icon: Icon,
  children,
}: {
  icon: typeof Layers;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[0.58rem] font-medium text-foreground/85 tabular-nums">
      <Icon className="size-2.5 text-primary" aria-hidden />
      {children}
    </span>
  );
}

function CardActions({
  label,
  armed,
  disabled,
  onAdd,
  onPlace,
}: {
  label: string;
  armed: boolean;
  disabled: boolean;
  onAdd: () => void;
  onPlace: () => void;
}) {
  const base =
    "flex h-7 items-center justify-center gap-1 rounded-lg border text-[0.62rem] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-40";
  return (
    <div className="grid grid-cols-2 gap-1 px-1.5 pb-1.5">
      <button
        type="button"
        onClick={onAdd}
        disabled={disabled}
        aria-label={`Add ${label} centred in the room`}
        className={cn(
          base,
          "border-primary/35 bg-primary/15 text-primary hover:bg-primary/25"
        )}
      >
        <Plus className="size-3" aria-hidden />
        Add
      </button>
      <button
        type="button"
        onClick={onPlace}
        disabled={disabled && !armed}
        aria-pressed={armed}
        aria-label={armed ? `Cancel placing ${label}` : `Place ${label} by clicking the room`}
        className={cn(
          base,
          armed
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border/50 bg-background/40 text-muted-foreground hover:border-primary/35 hover:text-primary"
        )}
      >
        <Crosshair className="size-3" aria-hidden />
        {armed ? "Placing" : "Place"}
      </button>
    </div>
  );
}

function CeilingActionCard({
  art,
  label,
  description,
  badge,
  armed,
  disabled,
  onAdd,
  onPlace,
}: {
  art: React.ReactNode;
  label: string;
  description: string;
  badge?: string;
  armed: boolean;
  disabled: boolean;
  onAdd: () => void;
  onPlace: () => void;
}) {
  return (
    <div
      className={cn(
        "group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-card/30 transition-all duration-200 motion-reduce:transition-none",
        "border-border/40 hover:border-primary/35",
        armed && "border-primary/60 shadow-[inset_0_0_0_1px_oklch(0.76_0.15_88/25%)]"
      )}
    >
      <div className="relative h-16 overflow-hidden border-b border-border/30">
        {art}
        <SelectionDot selected={armed} className="absolute top-1.5 right-1.5" />
        {badge ? (
          <span className="absolute bottom-1 left-1.5 rounded-md bg-black/55 px-1.5 py-0.5 text-[0.55rem] font-semibold text-primary tabular-nums backdrop-blur-sm">
            {badge} in room
          </span>
        ) : null}
      </div>
      <div className="min-w-0 px-2 pt-1.5 pb-1.5">
        <p className="truncate text-xs font-semibold text-foreground">{label}</p>
        <p className="mt-0.5 line-clamp-2 text-[0.6rem] leading-tight text-muted-foreground">
          {description}
        </p>
      </div>
      <div className="mt-auto">
        <CardActions
          label={label}
          armed={armed}
          disabled={disabled}
          onAdd={onAdd}
          onPlace={onPlace}
        />
      </div>
    </div>
  );
}

function PresetCard({
  preset,
  armed,
  disabled,
  onAdd,
  onPlace,
}: {
  preset: StudioCeilingPreset;
  armed: boolean;
  disabled: boolean;
  onAdd: () => void;
  onPlace: () => void;
}) {
  const { overrides } = preset;
  const color = overrides.color ?? "white";
  const fabric = optionLabel(DRAPE_FABRICS, overrides.fabric)?.replace(" premier", "");
  const colorLabel = optionLabel(DRAPE_COLORS, color);
  const lights =
    overrides.lights && overrides.lights !== "none"
      ? optionLabel(CEILING_LIGHT_STYLES, overrides.lights)
      : undefined;
  return (
    <div
      className={cn(
        "group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-card/30 transition-all duration-200 motion-reduce:transition-none",
        "border-border/40 hover:border-primary/35",
        armed && "border-primary/60 shadow-[inset_0_0_0_1px_oklch(0.76_0.15_88/25%)]"
      )}
    >
      <div className="relative h-20 overflow-hidden border-b border-border/30">
        <CeilingStyleArt
          style={preset.style}
          color={color}
          accentColor={overrides.accentColor}
          lights={overrides.lights}
          lightColor={overrides.lightColor}
          hubDecor={overrides.hubDecor}
          title={`${preset.label} preview`}
        />
        {overrides.uplightColor ? (
          <span
            className="pointer-events-none absolute inset-x-0 bottom-0 h-6 opacity-60"
            style={{
              background: `linear-gradient(to top, ${getDrapeColorHex(overrides.uplightColor)}, transparent)`,
            }}
            aria-hidden
          />
        ) : null}
        <SelectionDot selected={armed} className="absolute top-1.5 right-1.5" />
      </div>
      <div className="min-w-0 space-y-1 px-2 pt-1.5 pb-1.5">
        <p className="truncate text-xs font-semibold text-foreground">{preset.label}</p>
        <p className="line-clamp-2 text-[0.6rem] leading-tight text-muted-foreground">
          {preset.description}
        </p>
        <div className="flex flex-wrap gap-1">
          <span className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-background/50 px-1.5 py-px text-[0.55rem] text-foreground/80">
            <span
              className="size-2 rounded-full ring-1 ring-white/15"
              style={{ backgroundColor: getDrapeColorHex(color) }}
              aria-hidden
            />
            {colorLabel} {fabric?.toLowerCase()}
          </span>
          {lights ? (
            <span className="rounded-full border border-primary/25 bg-primary/10 px-1.5 py-px text-[0.55rem] text-primary">
              {lights}
            </span>
          ) : null}
        </div>
      </div>
      <div className="mt-auto">
        <CardActions
          label={preset.label}
          armed={armed}
          disabled={disabled}
          onAdd={onAdd}
          onPlace={onPlace}
        />
      </div>
    </div>
  );
}

function InRoomRow({
  drape,
  selected,
  onSelect,
}: {
  drape: StudioCeilingDrape;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className={cn(
          "flex w-full items-center gap-2 rounded-xl border p-1 pr-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
          selected
            ? "border-primary/50 bg-primary/10"
            : "border-transparent hover:border-border/50 hover:bg-card/50",
          drape.hidden && "opacity-55"
        )}
      >
        <span className="h-8 w-12 shrink-0 overflow-hidden rounded-lg border border-border/40">
          <CeilingStyleArt
            style={drape.type}
            color={drape.color}
            accentColor={drape.accentColor}
            hubDecor={drape.hubDecor}
          />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-medium text-foreground">
            {drape.label}
          </span>
          <span className="block truncate text-[0.6rem] text-muted-foreground">
            {getCeilingStyleLabel(drape.type)}
            {drape.hidden ? " · hidden" : ""}
            {drape.locked ? " · locked" : ""}
          </span>
        </span>
        <SelectionDot selected={selected} />
      </button>
    </li>
  );
}
