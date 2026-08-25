"use client";

import { useThree } from "@react-three/fiber";
import type { StudioDesignJson } from "@/data/studio";
import { getStudioBounds } from "@/lib/studio-geometry";
import { useEffect, useMemo } from "react";
import type { StudioSelection } from "../studio-types";
import { StudioCameraControls } from "./camera-controls";
import { StudioDrapes } from "./drapes";
import { StudioFloor } from "./floor";
import { StudioObjects } from "./objects";
import { StudioWalls } from "./walls";

export function RoomScene({
  design,
  selection,
  onSelect,
  transparentWalls,
  resetSignal,
  fitSignal,
  darkTheme,
}: {
  design: StudioDesignJson;
  selection: StudioSelection;
  onSelect: (selection: StudioSelection) => void;
  transparentWalls: boolean;
  resetSignal: number;
  fitSignal: number;
  darkTheme: boolean;
}) {
  const bounds = useMemo(
    () => getStudioBounds(design.room.floor),
    [design.room.floor]
  );
  const { invalidate } = useThree();

  useEffect(() => {
    invalidate();
  }, [darkTheme, design, invalidate, selection, transparentWalls]);

  return (
    <>
      <ambientLight
        intensity={darkTheme ? 0.62 : 0.82}
        color={darkTheme ? "#f8ead0" : "#fff9ed"}
      />
      <hemisphereLight
        intensity={0.72}
        color="#fff1cf"
        groundColor={darkTheme ? "#362f27" : "#b5aa98"}
      />
      <directionalLight
        position={[12, 24, 8]}
        intensity={1.2}
        color="#ffe1a8"
      />
      <pointLight position={[-14, 10, -12]} intensity={0.5} color="#cda85e" />

      <StudioFloor
        floor={design.room.floor}
        bounds={bounds}
        darkTheme={darkTheme}
        onClearSelection={() => onSelect(null)}
      />
      <StudioWalls
        design={design}
        bounds={bounds}
        selection={selection}
        onSelect={onSelect}
        transparent={transparentWalls}
        darkTheme={darkTheme}
      />
      <StudioDrapes
        design={design}
        bounds={bounds}
        selection={selection}
        onSelect={onSelect}
      />
      <StudioObjects
        design={design}
        bounds={bounds}
        selection={selection}
        onSelect={onSelect}
        darkTheme={darkTheme}
      />
      <StudioCameraControls
        bounds={bounds}
        wallHeight={design.room.wallHeight}
        resetSignal={resetSignal}
        fitSignal={fitSignal}
      />
    </>
  );
}
