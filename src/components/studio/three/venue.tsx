"use client";

import {
  getStudioMaterials,
  getStudioWallDisplay,
  type StudioDesignJson,
  type StudioPoint,
} from "@/data/studio";
import type { StudioBounds } from "@/lib/studio-geometry";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect } from "react";
import { useOptionalStudioEditor } from "../editor/studio-editor-context";
import type { StudioSelection } from "../studio-types";
import { StudioFloor } from "./floor";
import {
  getCameraInsideRoom,
  nextCameraInside,
  setCameraInsideRoom,
  useCameraInsideRoom,
} from "./venue/camera-inside-store";
import { VenueCeiling } from "./venue/ceiling";
import { VenueGround } from "./venue/ground";
import { SCALE } from "./venue/wall-geometry";
import { StudioWalls } from "./walls";

/** Tracks whether the camera stands inside the room (with hysteresis). */
function VenueCameraProbe({
  floor,
  bounds,
  wallHeightIn,
}: {
  floor: StudioPoint[];
  bounds: StudioBounds;
  wallHeightIn: number;
}) {
  const invalidate = useThree((state) => state.invalidate);
  useFrame(({ camera }) => {
    const next = nextCameraInside(
      getCameraInsideRoom(),
      floor,
      wallHeightIn,
      camera.position.x / SCALE + bounds.centerX,
      camera.position.y / SCALE,
      camera.position.z / SCALE + bounds.centerZ
    );
    if (setCameraInsideRoom(next)) invalidate();
  });
  useEffect(() => () => void setCameraInsideRoom(false), []);
  return null;
}

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
  const editor = useOptionalStudioEditor();
  const quality = editor?.settings.quality ?? "high";
  const showOpenings = editor?.settings.layers.openings ?? true;
  const setHoveredId = editor?.setHoveredId;
  const materials = getStudioMaterials(design);
  const inside = useCameraInsideRoom();
  const requestedDisplay = getStudioWallDisplay(design.view);
  const wallDisplay = inside
    ? requestedDisplay === "glass"
      ? "glass"
      : "full"
    : requestedDisplay;
  const showCeiling = inside
    ? design.view.showCeiling !== false
    : Boolean(design.view.showCeiling) &&
      (wallDisplay === "full" || wallDisplay === "glass");

  return (
    <>
      <VenueCameraProbe
        floor={design.room.floor}
        bounds={bounds}
        wallHeightIn={design.room.wallHeight}
      />
      <VenueGround
        floor={design.room.floor}
        bounds={bounds}
        floorFinish={materials.floor}
      />
      <StudioFloor
        floor={design.room.floor}
        bounds={bounds}
        finish={materials.floor}
        quality={quality}
        onClearSelection={() => onSelect(null)}
      />
      <StudioWalls
        design={design}
        bounds={bounds}
        selection={selection}
        onSelect={onSelect}
        display={wallDisplay}
        finish={materials.walls}
        lighting={materials.lighting}
        quality={quality}
        showOpenings={showOpenings}
        selectedIds={editor?.selectedIds}
        hoveredId={editor?.hoveredId}
        cameraInside={inside}
        onHoverOpening={
          setHoveredId
            ? (id) => {
                if (id) setHoveredId(id);
                else if (editor?.hoveredId) setHoveredId(null);
              }
            : undefined
        }
      />
      {showCeiling ? (
        <VenueCeiling
          floor={design.room.floor}
          bounds={bounds}
          wallHeightIn={design.room.wallHeight}
          wallFinish={materials.walls}
          lighting={materials.lighting}
          quality={quality}
        />
      ) : null}
    </>
  );
}
