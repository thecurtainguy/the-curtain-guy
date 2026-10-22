"use client";

import { useState } from "react";
import { useBrandConfirm } from "@/components/ui/brand-dialog";
import { Input } from "@/components/ui/input";
import type { StudioDesignJson, StudioRoomShape } from "@/data/studio";
import { getWallSegments, updateTemplateRoomDimensions } from "@/lib/studio-geometry";
import { cn } from "@/lib/utils";
import {
  ArrowUpFromLine,
  Building2,
  GlassWater,
  Hand,
  MoveHorizontal,
  MoveVertical,
  Ruler,
  Scan,
  Shapes,
  SquareDashed,
  Theater,
  Users,
} from "lucide-react";
import {
  ChoiceTile,
  DimensionControl,
  DraftNumberInput,
  LibraryCard,
  LibrarySectionHeading,
  StatTile,
} from "./library/studio-library-ui";
import {
  ROOM_MAX_FEET,
  ROOM_MIN_FEET,
  WALL_HEIGHT_MAX_FEET,
  WALL_HEIGHT_MIN_FEET,
  changeRoomShape,
  getStudioRoomStats,
  scaleCustomRoom,
  setCustomWallLength,
  shapeChangeClearsWallItems,
} from "./library/studio-room-tools";
import { VenuePresetGrid } from "./library/venue-preset-grid";
import { RoomOpeningsSection } from "./openings/room-openings-section";
import type { StudioSelection } from "./studio-types";

type RoomSetupPanelProps = {
  design: StudioDesignJson;
  onChange: (design: StudioDesignJson) => void;
  idPrefix: string;
  /** Falls back to the Studio editor context when omitted. */
  selection?: StudioSelection;
  onSelect?: (selection: StudioSelection) => void;
};

const SHAPES: Array<{
  value: StudioRoomShape;
  label: string;
  description: string;
  path: string;
}> = [
  {
    value: "rectangle",
    label: "Rectangle",
    description: "Classic hall",
    path: "M6 6 H58 V38 H6 Z",
  },
  {
    value: "l_shape",
    label: "L-shape",
    description: "With cutout",
    path: "M6 6 H58 V22 H36 V38 H6 Z",
  },
  {
    value: "custom",
    label: "Free-form",
    description: "Drag corners",
    path: "M14 6 H50 L58 18 V38 H24 L6 28 V14 Z",
  },
];

function formatNumber(value: number) {
  return Math.round(value).toLocaleString("en-US");
}

function RoomOutlineThumb({ design }: { design: StudioDesignJson }) {
  const walls = getWallSegments(design.room.floor);
  const xs = design.room.floor.map((point) => point.x);
  const zs = design.room.floor.map((point) => point.z);
  const minX = Math.min(...xs);
  const minZ = Math.min(...zs);
  const width = Math.max(1, Math.max(...xs) - minX);
  const depth = Math.max(1, Math.max(...zs) - minZ);
  const pad = Math.max(width, depth) * 0.12;
  const points = design.room.floor
    .map((point) => `${point.x - minX},${point.z - minZ}`)
    .join(" ");
  const labelSize = Math.max(width, depth) * 0.065;
  return (
    <svg
      viewBox={`${-pad} ${-pad} ${width + pad * 2} ${depth + pad * 2}`}
      className="h-24 w-full text-primary"
      role="img"
      aria-label={`${design.room.name} outline with ${walls.length} walls`}
    >
      <polygon
        points={points}
        className="fill-primary/12"
        stroke="currentColor"
        strokeWidth={Math.max(width, depth) * 0.012}
        strokeLinejoin="round"
      />
      {walls.map((wall) => (
        <text
          key={wall.index}
          x={wall.center.x - minX}
          y={wall.center.z - minZ}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={labelSize}
          className="fill-foreground/80 font-semibold"
        >
          {wall.index + 1}
        </text>
      ))}
    </svg>
  );
}

function WallLengthRow({
  index,
  length,
  onCommit,
}: {
  index: number;
  length: number;
  onCommit: (inches: number) => void;
}) {
  const rounded = Math.round(length);
  const feet = Math.floor(rounded / 12);
  const inches = rounded % 12;
  return (
    <li className="flex items-center gap-2 rounded-xl border border-border/40 bg-background/30 px-2 py-1.5">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[0.62rem] font-semibold text-primary">
        {index + 1}
      </span>
      <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
        Wall {index + 1}
      </span>
      <DraftNumberInput
        value={feet}
        suffix="ft"
        ariaLabel={`Wall ${index + 1} feet`}
        className="w-16"
        onCommit={(next) => onCommit(Math.round(next * 12) + inches)}
      />
      <DraftNumberInput
        value={inches}
        suffix="in"
        ariaLabel={`Wall ${index + 1} inches`}
        className="w-13"
        onCommit={(next) =>
          onCommit(feet * 12 + Math.min(11, Math.max(0, Math.round(next))))
        }
      />
    </li>
  );
}

export function RoomSetupPanel({
  design,
  onChange,
  idPrefix,
  selection,
  onSelect,
}: RoomSetupPanelProps) {
  const [confirm, confirmDialog] = useBrandConfirm();
  const [wallError, setWallError] = useState<string | null>(null);
  const dimensions = design.room.templateDimensions;
  const fieldId = (name: string) => `${idPrefix}-${name}`;
  const stats = getStudioRoomStats(design);
  const isCustom = design.room.shape === "custom";
  const walls = getWallSegments(design.room.floor);

  async function setShape(shape: StudioRoomShape) {
    if (shape === design.room.shape) return;
    if (
      shapeChangeClearsWallItems(design, shape) &&
      !(await confirm({
        icon: Shapes,
        eyebrow: "Room setup",
        title: "Change the room shape?",
        description:
          "The wall layout changes, so drape runs, treatments and door markers will be removed. Furniture is kept.",
        confirmLabel: "Change shape",
        destructive: true,
      }))
    ) {
      return;
    }
    setWallError(null);
    onChange(changeRoomShape(design, shape));
  }

  function setDimensions(patch: {
    width?: number;
    length?: number;
    cutoutWidth?: number;
    cutoutDepth?: number;
  }) {
    const current = design.room.templateDimensions;
    const width = patch.width ?? current?.width ?? 720;
    const length = patch.length ?? current?.length ?? 480;
    const cutoutWidth = Math.min(
      width - 12,
      Math.max(12, patch.cutoutWidth ?? current?.cutoutWidth ?? width / 3)
    );
    const cutoutDepth = Math.min(
      length - 12,
      Math.max(12, patch.cutoutDepth ?? current?.cutoutDepth ?? length / 2)
    );
    onChange(
      updateTemplateRoomDimensions(design, {
        width,
        length,
        cutoutWidth,
        cutoutDepth,
        wallHeight: design.room.wallHeight,
      })
    );
  }

  function setWallHeight(inches: number) {
    onChange({
      ...design,
      room: {
        ...design.room,
        wallHeight: Math.min(600, Math.max(72, inches)),
      },
    });
  }

  function setWallLength(index: number, inches: number) {
    const next = setCustomWallLength(design, index, inches);
    if (!next) {
      setWallError(
        `Wall ${index + 1} can’t be that length — the walls would cross. Try a smaller change or drag corners in 2D.`
      );
      return;
    }
    setWallError(null);
    onChange(next);
  }

  return (
    <section
      className="space-y-3"
      aria-labelledby={fieldId("room-setup-heading")}
    >
      <LibrarySectionHeading
        icon={Ruler}
        eyebrow="Foundation"
        title="Room setup"
        id={fieldId("room-setup-heading")}
      />

      <div className="space-y-1.5">
        <div className="grid grid-cols-2 gap-1.5">
          <StatTile
            icon={Scan}
            label="Floor area"
            value={`${formatNumber(stats.areaSqFt)} ft²`}
            hint={`${Math.round(stats.width / 12)}′ × ${Math.round(stats.length / 12)}′ overall`}
          />
          <StatTile
            icon={SquareDashed}
            label="Perimeter"
            value={`${formatNumber(stats.perimeterFt)} ft`}
            hint={`${walls.length} walls to drape`}
          />
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <StatTile icon={Users} label="Banquet" value={`≈${formatNumber(stats.banquet)}`} hint="seated" />
          <StatTile icon={GlassWater} label="Cocktail" value={`≈${formatNumber(stats.cocktail)}`} hint="standing" />
          <StatTile icon={Theater} label="Theatre" value={`≈${formatNumber(stats.theatre)}`} hint="rows" />
        </div>
      </div>

      <LibraryCard aria-labelledby={fieldId("venue-heading")}>
        <LibrarySectionHeading
          icon={Building2}
          eyebrow="Start from a venue"
          title="Venue presets"
          id={fieldId("venue-heading")}
        />
        <VenuePresetGrid design={design} onChange={onChange} />
      </LibraryCard>

      <LibraryCard aria-labelledby={fieldId("shape-heading")}>
        <LibrarySectionHeading
          icon={Shapes}
          eyebrow="Floor plan"
          title="Room shape"
          id={fieldId("shape-heading")}
        />
        <div
          className="grid grid-cols-3 gap-1.5"
          role="radiogroup"
          aria-labelledby={fieldId("shape-heading")}
        >
          {SHAPES.map((shape) => (
            <ChoiceTile
              key={shape.value}
              selected={design.room.shape === shape.value}
              onSelect={() => void setShape(shape.value)}
              label={shape.label}
              description={shape.description}
              compact
              preview={
                <span className="flex items-center justify-center rounded-xl border border-border/30 bg-background/45 py-1.5">
                  <svg viewBox="0 0 64 44" className="h-8 w-12 text-primary" aria-hidden>
                    <path
                      d={shape.path}
                      className="fill-primary/18"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              }
            />
          ))}
        </div>
        {isCustom ? (
          <div className="flex gap-2 rounded-xl border border-primary/20 bg-primary/5 p-2.5">
            <Hand className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />
            <p className="text-[0.66rem] leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">Free-form room.</span>{" "}
              Drag corners on the 2D plan, or set exact wall lengths below.
            </p>
          </div>
        ) : null}
      </LibraryCard>

      <LibraryCard aria-labelledby={fieldId("size-heading")}>
        <LibrarySectionHeading
          icon={MoveHorizontal}
          eyebrow="Precise size"
          title="Dimensions"
          id={fieldId("size-heading")}
        />
        <div className="space-y-1.5">
          <label
            htmlFor={fieldId("room-name")}
            className="text-[0.68rem] font-medium text-muted-foreground"
          >
            Room name
          </label>
          <Input
            id={fieldId("room-name")}
            value={design.room.name}
            maxLength={160}
            className="h-8 text-xs"
            onChange={(event) =>
              onChange({
                ...design,
                room: { ...design.room, name: event.target.value },
              })
            }
          />
        </div>

        <DimensionControl
          label="Width"
          icon={MoveHorizontal}
          value={isCustom ? stats.width : (dimensions?.width ?? 720)}
          minFeet={ROOM_MIN_FEET}
          maxFeet={ROOM_MAX_FEET}
          onChange={(width) =>
            isCustom
              ? onChange(scaleCustomRoom(design, { width }))
              : setDimensions({ width })
          }
        />
        <DimensionControl
          label="Length"
          icon={MoveVertical}
          value={isCustom ? stats.length : (dimensions?.length ?? 480)}
          minFeet={ROOM_MIN_FEET}
          maxFeet={ROOM_MAX_FEET}
          onChange={(length) =>
            isCustom
              ? onChange(scaleCustomRoom(design, { length }))
              : setDimensions({ length })
          }
        />

        {design.room.shape === "l_shape" && dimensions ? (
          <div className="space-y-3 rounded-xl border border-border/40 bg-background/25 p-2.5">
            <p className="text-[0.6rem] font-semibold tracking-[0.16em] text-primary uppercase">
              L-shape cutout
            </p>
            <DimensionControl
              label="Cutout width"
              value={dimensions.cutoutWidth ?? 240}
              minFeet={1}
              maxFeet={Math.max(2, Math.floor((dimensions.width - 12) / 12))}
              onChange={(cutoutWidth) => setDimensions({ cutoutWidth })}
            />
            <DimensionControl
              label="Cutout depth"
              value={dimensions.cutoutDepth ?? 240}
              minFeet={1}
              maxFeet={Math.max(2, Math.floor((dimensions.length - 12) / 12))}
              onChange={(cutoutDepth) => setDimensions({ cutoutDepth })}
            />
          </div>
        ) : null}

        <DimensionControl
          label="Wall height"
          icon={ArrowUpFromLine}
          value={design.room.wallHeight}
          minFeet={WALL_HEIGHT_MIN_FEET}
          maxFeet={WALL_HEIGHT_MAX_FEET}
          onChange={setWallHeight}
        />
      </LibraryCard>

      <RoomOpeningsSection
        design={design}
        onChange={onChange}
        idPrefix={fieldId("openings")}
        selection={selection}
        onSelect={onSelect}
      />

      {isCustom ? (
        <LibraryCard aria-labelledby={fieldId("walls-heading")}>
          <LibrarySectionHeading
            icon={Ruler}
            eyebrow="Free-form"
            title="Wall lengths"
            id={fieldId("walls-heading")}
          />
          <div className="rounded-xl border border-border/30 bg-background/40 p-1.5">
            <RoomOutlineThumb design={design} />
          </div>
          <ol className="space-y-1.5">
            {walls.map((wall) => (
              <WallLengthRow
                key={wall.index}
                index={wall.index}
                length={wall.length}
                onCommit={(inches) => setWallLength(wall.index, inches)}
              />
            ))}
          </ol>
          {wallError ? (
            <p
              role="alert"
              className={cn(
                "rounded-xl border border-destructive/30 bg-destructive/10 p-2 text-[0.66rem] leading-relaxed text-destructive"
              )}
            >
              {wallError}
            </p>
          ) : null}
        </LibraryCard>
      ) : null}
      {confirmDialog}
    </section>
  );
}
