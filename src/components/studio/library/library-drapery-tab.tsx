"use client";

import { useMemo, useState } from "react";
import {
  DRAPE_COLORS,
  DRAPE_FABRICS,
  createStudioItemId,
  createStudioObject,
  getDrapeColorHex,
  getStudioObjectOption,
  type DrapeColor,
  type DrapeFabric,
  type DrapeRunType,
  type StudioDesignJson,
  type StudioDrapeRun,
  type StudioObjectType,
} from "@/data/studio";
import { getWallSegments } from "@/lib/studio-geometry";
import {
  STUDIO_TREATMENT_TOOLS,
  createStudioTreatment,
  type StudioTreatmentTool,
} from "@/lib/studio-treatments";
import { cn } from "@/lib/utils";
import {
  AppWindow,
  ArrowRight,
  Columns3,
  DoorOpen,
  Flower2,
  GalleryHorizontalEnd,
  Lightbulb,
  PaintBucket,
  PanelsTopLeft,
  RectangleHorizontal,
  Sparkles,
  SplitSquareHorizontal,
  Wand2,
  Waves,
  type LucideIcon,
} from "lucide-react";
import { OpeningPresetGrid, filterOpeningPresets } from "../openings/opening-preset-grid";
import { StudioTip } from "../studio-tip";
import type { StudioSelection } from "../studio-types";
import { CeilingStyleArt } from "./ceiling-style-art";
import { STUDIO_OBJECT_ICONS } from "./studio-library-icons";
import {
  findFreeStudioSpot,
  formatStudioFeet,
  formatStudioFootprint,
  startStudioObjectDrag,
} from "./studio-library-placement";
import {
  ChoiceTile,
  LibraryCard,
  LibrarySectionHeading,
  LibraryTile,
  matchesLibraryQuery,
} from "./studio-library-ui";

export type StudioDrapeStyle = { fabric: DrapeFabric; color: DrapeColor };

export const DEFAULT_DRAPE_STYLE: StudioDrapeStyle = {
  fabric: "velvet",
  color: "ivory",
};

const RUN_TOOLS: Array<{
  type: DrapeRunType;
  label: string;
  description: string;
  icon: LucideIcon;
}> = [
  { type: "wall_drape", label: "Full wall", description: "Corner to corner", icon: PanelsTopLeft },
  { type: "partial_drape", label: "Partial wall", description: "Centre half", icon: GalleryHorizontalEnd },
  { type: "backdrop", label: "Backdrop", description: "Feature panel", icon: RectangleHorizontal },
  { type: "divider", label: "Divider", description: "Split the room", icon: SplitSquareHorizontal },
];

const TREATMENT_ICONS: Record<string, LucideIcon> = {
  full_backdrop: PanelsTopLeft,
  side_tiebacks: Columns3,
  entrance_reveal: DoorOpen,
  top_swag: Waves,
  ceremony_arch: Sparkles,
  door_window_surround: AppWindow,
  layered_swag: GalleryHorizontalEnd,
  floral_header: Flower2,
  uplights: Lightbulb,
};

// The legacy "ceiling_drape" object stays loadable; new ceilings come from the Ceiling tab.
const FREESTANDING: StudioObjectType[] = ["drape_backdrop"];

const RUN_LABELS: Record<DrapeRunType, string> = {
  wall_drape: "Wall drape",
  partial_drape: "Partial wall drape",
  backdrop: "Backdrop",
  divider: "Room divider",
};

export function fabricSwatch(fabric: DrapeFabric, hex: string): string {
  switch (fabric) {
    case "velvet":
    case "velour":
      return `radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.28), transparent 55%), repeating-linear-gradient(90deg, rgba(0,0,0,0.28) 0 3px, transparent 3px 8px), ${hex}`;
    case "sheer":
    case "chiffon":
      return `repeating-linear-gradient(90deg, rgba(255,255,255,0.35) 0 2px, transparent 2px 7px), linear-gradient(${hex}aa, ${hex}66)`;
    case "satin":
      return `linear-gradient(115deg, ${hex} 30%, rgba(255,255,255,0.55) 48%, ${hex} 66%)`;
    case "sequin":
      return `radial-gradient(circle, rgba(255,255,255,0.7) 1px, transparent 1.5px) 0 0 / 5px 5px, ${hex}`;
    default:
      return `repeating-linear-gradient(90deg, rgba(0,0,0,0.18) 0 2px, transparent 2px 9px), ${hex}`;
  }
}

function toolMatches(query: string, ...fields: string[]) {
  return matchesLibraryQuery(query, ...fields, "drape drapery curtain");
}

export function countDraperyMatches(query: string): number {
  return (
    RUN_TOOLS.filter((tool) => toolMatches(query, tool.label, tool.description, "wall run")).length +
    filterOpeningPresets(query).length +
    STUDIO_TREATMENT_TOOLS.filter((tool) => toolMatches(query, tool.label, tool.description, "treatment")).length +
    FREESTANDING.filter((type) => {
      const option = getStudioObjectOption(type);
      return toolMatches(query, option?.label ?? type, option?.description ?? "");
    }).length +
    (toolMatches(query, "drape every wall perimeter") ? 1 : 0)
  );
}

export function LibraryDraperyTab({
  design,
  onChange,
  selection,
  onSelect,
  onSelectMany,
  style,
  onStyleChange,
  query,
  idPrefix,
  onOpenCeiling,
}: {
  design: StudioDesignJson;
  onChange: (design: StudioDesignJson) => void;
  selection: StudioSelection;
  onSelect: (selection: StudioSelection) => void;
  onSelectMany: (ids: string[]) => void;
  style: StudioDrapeStyle;
  onStyleChange: (style: StudioDrapeStyle) => void;
  query: string;
  idPrefix: string;
  /** Switches the library to the Ceiling tab. */
  onOpenCeiling?: () => void;
}) {
  const [notice, setNotice] = useState<string | null>(null);
  const [pickedWall, setPickedWall] = useState(0);
  const searching = query.trim().length > 0;
  const floor = design.room.floor;
  const walls = useMemo(() => getWallSegments(floor), [floor]);
  const selectedWall =
    selection?.kind === "wall"
      ? selection.index
      : selection?.kind === "drape"
        ? design.drapeRuns.find((run) => run.id === selection.id)?.wallIndex
        : selection?.kind === "treatment"
          ? design.treatments.find((treatment) => treatment.id === selection.id)?.anchor.wallIndex
          : selection?.kind === "opening"
            ? design.openings.find((opening) => opening.id === selection.id)?.wallIndex
            : undefined;
  const candidate = selectedWall ?? pickedWall;
  const targetWall = walls[candidate] ? candidate : 0;
  const wall = walls[targetWall] ?? walls[0];
  const drapeHeight = Math.min(design.room.wallHeight, 240);
  const colorLabel =
    DRAPE_COLORS.find((option) => option.value === style.color)?.label ?? style.color;
  const fabricLabel =
    DRAPE_FABRICS.find((option) => option.value === style.fabric)?.label ?? style.fabric;

  function addDrape(type: DrapeRunType) {
    if (!wall) return;
    const partial = type === "partial_drape" || type === "backdrop";
    const id = createStudioItemId("drape");
    onChange({
      ...design,
      drapeRuns: [
        ...design.drapeRuns,
        {
          id,
          type,
          wallIndex: wall.index,
          startOffset: partial ? wall.length * 0.25 : 0,
          endOffset: partial ? wall.length * 0.75 : wall.length,
          height: drapeHeight,
          fabric: style.fabric,
          color: style.color,
          fullness: 2,
          label:
            type === "wall_drape" ? `Wall ${wall.index + 1} drape` : RUN_LABELS[type],
        },
      ],
    });
    onSelect({ kind: "drape", id });
  }

  function drapeEveryWall() {
    const covered = (index: number, length: number) =>
      design.drapeRuns.some(
        (run) =>
          run.wallIndex === index && run.endOffset - run.startOffset >= length * 0.9
      );
    const runs: StudioDrapeRun[] = walls
      .filter((segment) => segment.length >= 12 && !covered(segment.index, segment.length))
      .map((segment) => ({
        id: createStudioItemId("drape"),
        type: "wall_drape",
        wallIndex: segment.index,
        startOffset: 0,
        endOffset: segment.length,
        height: drapeHeight,
        fabric: style.fabric,
        color: style.color,
        fullness: 2,
        label: `Wall ${segment.index + 1} drape`,
      }));
    if (runs.length === 0) {
      setNotice("Every wall is already draped.");
      return;
    }
    if (design.drapeRuns.length + runs.length > 200) {
      setNotice("That would exceed the 200 drape-run limit.");
      return;
    }
    setNotice(`Draped ${runs.length} wall${runs.length === 1 ? "" : "s"} in ${colorLabel.toLowerCase()} ${fabricLabel.toLowerCase()}.`);
    onChange({ ...design, drapeRuns: [...design.drapeRuns, ...runs] });
    onSelectMany(runs.map((run) => run.id));
  }

  function addTreatment(tool: StudioTreatmentTool) {
    if (!tool.preset) return;
    const treatment = createStudioTreatment(design, targetWall, tool.preset);
    if (!treatment) return;
    const styled = { ...treatment, color: style.color };
    onChange({ ...design, treatments: [...design.treatments, styled] });
    onSelect({ kind: "treatment", id: styled.id });
  }

  function addFreestanding(type: StudioObjectType) {
    const option = getStudioObjectOption(type);
    const spot = findFreeStudioSpot(design, option?.width ?? 120, option?.depth ?? 24);
    const object = createStudioObject(type, spot, {
      fabric: style.fabric,
      drapeColor: style.color,
    });
    onChange({ ...design, objects: [...design.objects, object] });
    onSelect({ kind: "object", id: object.id });
  }

  const runTools = RUN_TOOLS.filter((tool) =>
    toolMatches(query, tool.label, tool.description, "wall run")
  );
  const openingMatches = filterOpeningPresets(query).length;
  const treatmentTools = STUDIO_TREATMENT_TOOLS.filter((tool) =>
    toolMatches(query, tool.label, tool.description, "treatment")
  );
  const freestanding = FREESTANDING.filter((type) => {
    const option = getStudioObjectOption(type);
    return toolMatches(query, option?.label ?? type, option?.description ?? "");
  });
  const showEveryWall = toolMatches(query, "drape every wall perimeter");

  return (
    <div className="space-y-3">
      {!searching ? (
        <LibraryCard aria-labelledby={`${idPrefix}-style-heading`}>
          <LibrarySectionHeading
            icon={PaintBucket}
            eyebrow="Quick style"
            title={`${colorLabel} ${fabricLabel.toLowerCase()}`}
            id={`${idPrefix}-style-heading`}
          />
          <div
            className="grid grid-cols-4 gap-1.5"
            role="radiogroup"
            aria-label="Drape fabric"
          >
            {DRAPE_FABRICS.map((fabric) => (
              <ChoiceTile
                key={fabric.value}
                compact
                selected={style.fabric === fabric.value}
                onSelect={() => onStyleChange({ ...style, fabric: fabric.value })}
                label={fabric.label.replace(" premier", "")}
                preview={
                  <span
                    className="block h-5 rounded-md border border-white/10"
                    style={{
                      background: fabricSwatch(fabric.value, getDrapeColorHex(style.color)),
                    }}
                  />
                }
              />
            ))}
          </div>
          <div
            className="grid grid-cols-10 gap-1.5 @lg:grid-cols-[repeat(auto-fill,1.75rem)] @lg:gap-2.5"
            role="radiogroup"
            aria-label="Drape colour"
          >
            {DRAPE_COLORS.map((color) => {
              const selected = style.color === color.value;
              return (
                <StudioTip key={color.value} label={color.label}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={color.label}
                    onClick={() => onStyleChange({ ...style, color: color.value })}
                    className={cn(
                      "relative aspect-square w-full rounded-full border border-white/15 shadow-inner transition-transform hover:z-10 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 motion-reduce:hover:scale-100",
                      selected &&
                        "ring-2 ring-primary ring-offset-2 ring-offset-background"
                    )}
                    style={{ backgroundColor: color.hex }}
                  />
                </StudioTip>
              );
            })}
          </div>
        </LibraryCard>
      ) : null}

      {!searching && walls.length > 0 ? (
        <LibraryCard aria-labelledby={`${idPrefix}-wall-heading`}>
          <LibrarySectionHeading
            icon={RectangleHorizontal}
            eyebrow="Target wall"
            title={`Wall ${targetWall + 1} · ${formatStudioFeet(wall?.length ?? 0)}`}
            id={`${idPrefix}-wall-heading`}
          />
          <div
            className="grid grid-cols-4 gap-1.5"
            role="radiogroup"
            aria-labelledby={`${idPrefix}-wall-heading`}
          >
            {walls.map((segment) => (
              <ChoiceTile
                key={segment.index}
                compact
                selected={segment.index === targetWall}
                onSelect={() => {
                  setPickedWall(segment.index);
                  onSelect({ kind: "wall", index: segment.index });
                }}
                label={`Wall ${segment.index + 1}`}
                description={formatStudioFeet(segment.length)}
              />
            ))}
          </div>
        </LibraryCard>
      ) : null}

      {showEveryWall ? (
        <button
          type="button"
          onClick={drapeEveryWall}
          className="group relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border border-primary/35 bg-gradient-to-br from-primary/20 via-primary/8 to-transparent p-3 text-left transition-all hover:border-primary/60 hover:from-primary/25 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
        >
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/10 shadow-inner"
            style={{ background: fabricSwatch(style.fabric, getDrapeColorHex(style.color)) }}
          >
            <Wand2 className="size-4 text-white drop-shadow" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-heading text-sm text-foreground">
              Drape every wall
            </span>
            <span className="block truncate text-[0.62rem] text-muted-foreground">
              {walls.length} walls · {colorLabel} {fabricLabel.toLowerCase()} · one click
            </span>
          </span>
        </button>
      ) : null}
      {notice ? (
        <p role="status" className="px-1 text-[0.62rem] text-primary/90">
          {notice}
        </p>
      ) : null}

      {runTools.length > 0 ? (
        <LibraryCard aria-labelledby={`${idPrefix}-runs-heading`}>
          <LibrarySectionHeading
            icon={PanelsTopLeft}
            eyebrow="Wall drape runs"
            title="Pipe & drape"
            id={`${idPrefix}-runs-heading`}
          />
          <div className="grid grid-cols-2 gap-1.5">
            {runTools.map((tool) => (
              <LibraryTile
                key={tool.type}
                icon={tool.icon}
                label={tool.label}
                description={tool.description}
                meta={`Wall ${targetWall + 1}`}
                onClick={() => addDrape(tool.type)}
              />
            ))}
          </div>
        </LibraryCard>
      ) : null}

      {treatmentTools.length > 0 ? (
        <LibraryCard aria-labelledby={`${idPrefix}-treatments-heading`}>
          <LibrarySectionHeading
            icon={Sparkles}
            eyebrow="Treatments"
            title="Classic arrangements"
            id={`${idPrefix}-treatments-heading`}
          />
          <div className="grid grid-cols-2 gap-1.5">
            {treatmentTools.map((tool) => (
              <LibraryTile
                key={tool.key}
                icon={TREATMENT_ICONS[tool.key] ?? Sparkles}
                label={tool.label}
                description={tool.description}
                disabled={!tool.preset}
                onClick={() => addTreatment(tool)}
              />
            ))}
          </div>
        </LibraryCard>
      ) : null}

      {freestanding.length > 0 ? (
        <LibraryCard aria-labelledby={`${idPrefix}-freestanding-heading`}>
          <LibrarySectionHeading
            icon={GalleryHorizontalEnd}
            eyebrow="Anywhere in the room"
            title="Freestanding drapery"
            id={`${idPrefix}-freestanding-heading`}
          />
          <div className="grid grid-cols-2 gap-1.5">
            {freestanding.map((type) => {
              const option = getStudioObjectOption(type);
              return (
                <LibraryTile
                  key={type}
                  icon={STUDIO_OBJECT_ICONS[type]}
                  label={option?.label ?? type}
                  description={option?.description}
                  meta={option ? formatStudioFootprint(option.width, option.depth) : undefined}
                  onClick={() => addFreestanding(type)}
                  onDragStart={(event) => startStudioObjectDrag(event, type)}
                />
              );
            })}
          </div>
        </LibraryCard>
      ) : null}

      {!searching && onOpenCeiling ? (
        <button
          type="button"
          onClick={onOpenCeiling}
          className="group relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border border-border/40 bg-card/25 p-2 pr-3 text-left transition-all hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
        >
          <span className="h-11 w-16 shrink-0 overflow-hidden rounded-xl border border-border/40">
            <CeilingStyleArt style="starburst" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[0.58rem] font-semibold tracking-[0.2em] text-primary uppercase">
              Overhead
            </span>
            <span className="block font-heading text-sm leading-tight text-foreground">
              Ceiling drapery
            </span>
            <span className="block truncate text-[0.62rem] text-muted-foreground">
              Starbursts, tents, billows & signature looks
            </span>
          </span>
          <ArrowRight
            className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary motion-reduce:group-hover:translate-x-0"
            aria-hidden
          />
        </button>
      ) : null}

      {openingMatches > 0 ? (
        <LibraryCard aria-labelledby={`${idPrefix}-openings-heading`}>
          <LibrarySectionHeading
            icon={DoorOpen}
            eyebrow={`Openings · Wall ${targetWall + 1}`}
            title="Doors & windows"
            id={`${idPrefix}-openings-heading`}
          />
          <OpeningPresetGrid
            design={design}
            wall={wall ? { index: wall.index, length: wall.length } : undefined}
            onChange={onChange}
            onSelect={onSelect}
            query={query}
            idPrefix={`${idPrefix}-openings`}
          />
        </LibraryCard>
      ) : null}
    </div>
  );
}
