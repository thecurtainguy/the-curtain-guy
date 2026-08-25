"use client";

import { Button } from "@/components/ui/button";
import {
  STUDIO_OBJECT_OPTIONS,
  createStudioItemId,
  type DrapeRunType,
  type StudioDesignJson,
  type StudioObjectType,
} from "@/data/studio";
import {
  getStudioBounds,
  getWallSegments,
} from "@/lib/studio-geometry";
import {
  AppWindow,
  DoorOpen,
  GalleryHorizontalEnd,
  PanelsTopLeft,
  RectangleHorizontal,
  SplitSquareHorizontal,
  Table2,
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
  stage: AppWindow,
  dance_floor: RectangleHorizontal,
  entrance_marker: DoorOpen,
  table_area: Table2,
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

  function addObject(type: StudioObjectType) {
    const option = STUDIO_OBJECT_OPTIONS.find((item) => item.type === type);
    if (!option) return;
    const bounds = getStudioBounds(design.room.floor);
    const id = createStudioItemId("object");
    onChange({
      ...design,
      objects: [
        ...design.objects,
        {
          ...option,
          id,
          x: bounds.centerX,
          z: bounds.centerZ,
          rotation: 0,
        },
      ],
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
            Placeholders
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {STUDIO_OBJECT_OPTIONS.map((option) => (
            <ToolButton
              key={option.type}
              icon={objectIcons[option.type]}
              label={option.label}
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
  onClick,
}: {
  icon: typeof AppWindow;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      className="h-auto min-w-0 flex-col gap-1.5 rounded-2xl py-3 text-xs"
    >
      <Icon className="size-4 text-primary" aria-hidden="true" />
      <span className="truncate">{label}</span>
    </Button>
  );
}
