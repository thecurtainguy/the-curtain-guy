"use client";

import { Button } from "@/components/ui/button";
import {
  STUDIO_OBJECT_OPTIONS,
  createStudioItemId,
  type DrapeRunType,
  type StudioDesignJson,
  type StudioObject,
  type StudioObjectType,
} from "@/data/studio";
import {
  getStudioBounds,
  getWallSegments,
} from "@/lib/studio-geometry";
import {
  STUDIO_TREATMENT_TOOLS,
  createStudioTreatment,
} from "@/lib/studio-treatments";
import {
  AppWindow,
  Columns3,
  Circle,
  Disc3,
  DoorOpen,
  Flower2,
  GalleryHorizontalEnd,
  Grid2X2,
  Lightbulb,
  Martini,
  Music2,
  PanelsTopLeft,
  RectangleHorizontal,
  Sofa,
  Sparkles,
  SplitSquareHorizontal,
  Table2,
  Warehouse,
  Waves,
} from "lucide-react";
import { RoomSetupPanel } from "./room-setup-panel";
import type { StudioSelection } from "./studio-types";

type StudioLeftRailProps = {
  design: StudioDesignJson;
  onChange: (design: StudioDesignJson) => void;
  selection: StudioSelection;
  onSelect: (selection: StudioSelection) => void;
  idPrefix: string;
};

const objectIcons: Record<StudioObjectType, typeof AppWindow> = {
  stage: Warehouse,
  dance_floor: Disc3,
  entrance_marker: DoorOpen,
  round_table: Circle,
  rectangle_table: Table2,
  cocktail_table: Martini,
  table_area: Grid2X2,
  dj_booth: Music2,
  bar: AppWindow,
  lounge_area: Sofa,
};

const objectDescriptions: Record<StudioObjectType, string> = {
  stage: "Raised platform",
  dance_floor: "Nine finish presets",
  entrance_marker: "Upright wayfinding",
  round_table: "Circular guest table",
  rectangle_table: "Banquet table",
  cocktail_table: "High-top table",
  table_area: "Flexible seating zone",
  dj_booth: "Music station",
  bar: "Service counter",
  lounge_area: "Soft seating zone",
};

const treatmentIcons: Record<string, typeof AppWindow> = {
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

export function StudioLeftRail({
  design,
  onChange,
  selection,
  onSelect,
  idPrefix,
}: StudioLeftRailProps) {
  const walls = getWallSegments(design.room.floor);
  const selectedWall =
    selection?.kind === "wall" && walls[selection.index]
      ? selection.index
      : 0;

  function addDrape(type: DrapeRunType) {
    const wall = walls[selectedWall] ?? walls[0];
    if (!wall) return;
    const partial = type === "partial_drape" || type === "backdrop";
    const startOffset = partial ? wall.length * 0.25 : 0;
    const endOffset = partial ? wall.length * 0.75 : wall.length;
    const id = createStudioItemId("drape");
    onChange({
      ...design,
      drapeRuns: [
        ...design.drapeRuns,
        {
          id,
          type,
          wallIndex: wall.index,
          startOffset,
          endOffset,
          height: Math.min(design.room.wallHeight, 144),
          fabric: "velvet",
          color: "ivory",
          fullness: 2,
          label:
            type === "wall_drape"
              ? `Wall ${wall.index + 1} drape`
              : type === "partial_drape"
                ? "Partial wall drape"
                : type === "backdrop"
                  ? "Backdrop"
                  : "Room divider",
        },
      ],
    });
    onSelect({ kind: "drape", id });
  }

  function addOpening() {
    const wall = walls[selectedWall] ?? walls[0];
    if (!wall) return;
    const id = createStudioItemId("opening");
    onChange({
      ...design,
      openings: [
        ...design.openings,
        {
          id,
          type: "door",
          wallIndex: wall.index,
          offset: Math.max(0, wall.length / 2 - 18),
          width: Math.min(36, wall.length),
          label: "Door",
        },
      ],
    });
    onSelect({ kind: "opening", id });
  }

  function addTreatment(preset: NonNullable<(typeof STUDIO_TREATMENT_TOOLS)[number]["preset"]>) {
    const treatment = createStudioTreatment(design, selectedWall, preset);
    if (!treatment) return;
    onChange({
      ...design,
      treatments: [...design.treatments, treatment],
    });
    onSelect({ kind: "treatment", id: treatment.id });
  }

  function addObject(type: StudioObjectType) {
    const option = STUDIO_OBJECT_OPTIONS.find((item) => item.type === type);
    if (!option) return;
    const bounds = getStudioBounds(design.room.floor);
    const id = createStudioItemId("object");
    const nextObject: StudioObject =
      option.type === "dance_floor"
        ? {
            ...option,
            id,
            x: bounds.centerX,
            z: bounds.centerZ,
            rotation: 0,
            notes: "",
            finish: option.finish,
          }
        : {
            ...option,
            id,
            x: bounds.centerX,
            z: bounds.centerZ,
            rotation: 0,
            notes: "",
            finish: "natural_wood",
          };
    onChange({
      ...design,
      objects: [...design.objects, nextObject],
    });
    onSelect({ kind: "object", id });
  }

  return (
    <aside className="h-full overflow-y-auto bg-card/35 p-4">
      <RoomSetupPanel
        design={design}
        onChange={onChange}
        idPrefix={`${idPrefix}-room`}
      />

      <div className="my-5 h-px bg-border/60" />

      <section
        className="space-y-3"
        aria-labelledby={`${idPrefix}-draping-heading`}
      >
        <div>
          <p className="text-[0.65rem] font-semibold tracking-[0.22em] text-primary uppercase">
            Draping
          </p>
          <h2
            id={`${idPrefix}-draping-heading`}
            className="font-heading text-lg"
          >
            Add a treatment
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Select a wall first, or items will begin on Wall 1.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <ToolButton
            icon={PanelsTopLeft}
            label="Full wall"
            onClick={() => addDrape("wall_drape")}
          />
          <ToolButton
            icon={GalleryHorizontalEnd}
            label="Partial wall"
            onClick={() => addDrape("partial_drape")}
          />
          <ToolButton
            icon={RectangleHorizontal}
            label="Backdrop"
            onClick={() => addDrape("backdrop")}
          />
          <ToolButton
            icon={SplitSquareHorizontal}
            label="Divider"
            onClick={() => addDrape("divider")}
          />
          <ToolButton icon={DoorOpen} label="Door marker" onClick={addOpening} />
        </div>
      </section>

      <div className="my-5 h-px bg-border/60" />

      <section
        className="space-y-3"
        aria-labelledby={`${idPrefix}-treatments-heading`}
      >
        <div>
          <p className="text-[0.65rem] font-semibold tracking-[0.22em] text-primary uppercase">
            Drape Treatments
          </p>
          <h2
            id={`${idPrefix}-treatments-heading`}
            className="font-heading text-lg"
          >
            Classic arrangements
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Build a composed luxury look on the selected wall.
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          {STUDIO_TREATMENT_TOOLS.map((tool) => (
            <ToolButton
              key={tool.key}
              icon={treatmentIcons[tool.key] ?? Sparkles}
              label={tool.label}
              description={tool.description}
              layout="row"
              disabled={!tool.preset}
              onClick={() => {
                if (tool.preset) addTreatment(tool.preset);
              }}
            />
          ))}
        </div>
      </section>

      <div className="my-5 h-px bg-border/60" />

      <section
        className="space-y-3"
        aria-labelledby={`${idPrefix}-objects-heading`}
      >
        <div>
          <p className="text-[0.65rem] font-semibold tracking-[0.22em] text-primary uppercase">
            Layout
          </p>
          <h2
            id={`${idPrefix}-objects-heading`}
            className="font-heading text-lg"
          >
            Event object library
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Place furniture, production, and guest-flow zones, then refine them
            in the inspector.
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          {STUDIO_OBJECT_OPTIONS.map((option) => (
            <ToolButton
              key={option.type}
              icon={objectIcons[option.type]}
              label={option.label}
              description={objectDescriptions[option.type]}
              layout="row"
              onClick={() => addObject(option.type)}
            />
          ))}
        </div>
      </section>
    </aside>
  );
}

function ToolButton({
  icon: Icon,
  label,
  description,
  layout = "tile",
  disabled = false,
  onClick,
}: {
  icon: typeof AppWindow;
  label: string;
  description?: string;
  layout?: "tile" | "row";
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      disabled={disabled}
      className={
        layout === "row"
          ? "group h-auto w-full min-w-0 items-center justify-start gap-3 rounded-2xl border-border/50 bg-background/35 px-3 py-2.5 text-left text-xs hover:border-primary/35 hover:bg-primary/5 disabled:border-border/30 disabled:bg-background/20 disabled:opacity-55"
          : "group h-auto min-w-0 items-start justify-start gap-2 rounded-2xl border-border/50 bg-background/35 px-3 py-3 text-left text-xs hover:border-primary/35 hover:bg-primary/5"
      }
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold whitespace-normal text-foreground">
          {label}
        </span>
        {description ? (
          <span className="mt-0.5 block text-[0.62rem] leading-tight font-normal text-muted-foreground">
            {description}
          </span>
        ) : null}
      </span>
    </Button>
  );
}
