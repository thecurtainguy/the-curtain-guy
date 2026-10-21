"use client";

import {
  getStudioMaterials,
  getStudioWallDisplay,
  type StudioDesignJson,
} from "@/data/studio";
import type { StudioBounds } from "@/lib/studio-geometry";
import type { StudioSelection } from "../studio-types";
import { StudioFloor } from "./floor";
import { StudioWalls } from "./walls";

/** Floor, walls, openings, ceiling and architectural trim for the room. */
export function StudioVenue({
  design,
  bounds,
  selection,
  onSelect,
}: {
  design: StudioDesignJson;
  bounds: StudioBounds;
  selection: StudioSelection;
  onSelect: (selection: StudioSelection) => void;
}) {
  const materials = getStudioMaterials(design);
  const wallDisplay = getStudioWallDisplay(design.view);
  return (
    <>
      <StudioFloor
        floor={design.room.floor}
        bounds={bounds}
        finish={materials.floor}
        onClearSelection={() => onSelect(null)}
      />
      <StudioWalls
        design={design}
        bounds={bounds}
        selection={selection}
        onSelect={onSelect}
        transparent={wallDisplay === "glass"}
        finish={materials.walls}
      />
    </>
  );
}
