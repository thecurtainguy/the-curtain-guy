"use client";

import { useMemo, useState } from "react";
import { DoorOpen } from "lucide-react";
import type { StudioDesignJson } from "@/data/studio";
import { getWallSegments } from "@/lib/studio-geometry";
import {
  useOptionalStudioEditorActions,
  useOptionalStudioSelection,
} from "../editor/studio-editor-context";
import { formatStudioFeet } from "../library/studio-library-placement";
import {
  ChoiceTile,
  LibraryCard,
  LibrarySectionHeading,
} from "../library/studio-library-ui";
import type { StudioSelection } from "../studio-types";
import { OpeningPresetGrid } from "./opening-preset-grid";
import { OpeningSummary } from "./opening-summary";
import { OpeningWallMap } from "./opening-wall-map";

/**
 * Room-tab card for placing doors and windows. Selection comes from props
 * when given, otherwise from the Studio editor context.
 */
export function RoomOpeningsSection({
  design,
  onChange,
  idPrefix,
  selection: selectionProp,
  onSelect: onSelectProp,
}: {
  design: StudioDesignJson;
  onChange: (design: StudioDesignJson) => void;
  idPrefix: string;
  selection?: StudioSelection;
  onSelect?: (selection: StudioSelection) => void;
}) {
  const editor = useOptionalStudioEditorActions();
  const selectionState = useOptionalStudioSelection();
  const selection = selectionProp !== undefined ? selectionProp : selectionState?.selection ?? null;
  const onSelect = onSelectProp ?? (editor ? (next: StudioSelection) => editor.select(next) : undefined);
  const [pickedWall, setPickedWall] = useState(0);
  const floor = design.room.floor;
  const walls = useMemo(() => getWallSegments(floor), [floor]);

  const selectedWall =
    selection?.kind === "wall"
      ? selection.index
      : selection?.kind === "opening"
        ? design.openings.find((opening) => opening.id === selection.id)?.wallIndex
        : undefined;
  const candidate = selectedWall ?? pickedWall;
  const targetWall = walls[candidate] ? candidate : 0;
  const wall = walls[targetWall];
  const onWall = design.openings.filter((opening) => opening.wallIndex === targetWall).length;

  function pickWall(index: number) {
    setPickedWall(index);
    onSelect?.({ kind: "wall", index });
  }

  const headingId = `${idPrefix}-heading`;
  const wallHeadingId = `${idPrefix}-wall-heading`;

  return (
    <LibraryCard aria-labelledby={headingId} className="@container">
      <LibrarySectionHeading
        icon={DoorOpen}
        eyebrow="Architecture"
        title="Doors & windows"
        id={headingId}
      />

      <OpeningSummary
        design={design}
        onSelectIds={editor ? (ids) => editor.selectIds(ids) : undefined}
      />

      {walls.length > 0 ? (
        <div className="space-y-2 rounded-xl border border-border/40 bg-background/25 p-2">
          <div className="flex items-baseline justify-between gap-2 px-0.5">
            <p
              id={wallHeadingId}
              className="text-[0.58rem] font-semibold tracking-[0.18em] text-primary uppercase"
            >
              Target wall
            </p>
            <p className="truncate text-[0.6rem] text-muted-foreground tabular-nums">
              Wall {targetWall + 1} · {formatStudioFeet(wall?.length ?? 0)}
              {onWall > 0 ? ` · ${onWall} placed` : ""}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-2 @md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] @md:items-center">
            <div className="rounded-lg border border-border/30 bg-background/40 p-1">
              <OpeningWallMap
                design={design}
                walls={walls}
                targetWall={targetWall}
                onPickWall={pickWall}
                className="h-20"
              />
            </div>
            <div className="@container">
              <div
                className="grid grid-cols-3 gap-1.5 @xs:grid-cols-4 @md:grid-cols-6 @2xl:grid-cols-8"
                role="radiogroup"
                aria-labelledby={wallHeadingId}
              >
                {walls.map((segment) => (
                  <ChoiceTile
                    key={segment.index}
                    compact
                    selected={segment.index === targetWall}
                    onSelect={() => pickWall(segment.index)}
                    label={`Wall ${segment.index + 1}`}
                    description={formatStudioFeet(segment.length)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <OpeningPresetGrid
        design={design}
        wall={wall ? { index: wall.index, length: wall.length } : undefined}
        onChange={onChange}
        onSelect={onSelect}
        idPrefix={idPrefix}
      />
    </LibraryCard>
  );
}
