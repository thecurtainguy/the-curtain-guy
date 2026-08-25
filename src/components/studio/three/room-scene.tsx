"use client";

import { useThree } from "@react-three/fiber";
import {
  getStudioMaterials,
  type StudioDesignJson,
} from "@/data/studio";
import { getStudioBounds } from "@/lib/studio-geometry";
import { useEffect, useMemo } from "react";
import type { StudioSelection } from "../studio-types";
import { StudioCameraControls } from "./camera-controls";
import { StudioDrapes } from "./drapes";
import { StudioFloor } from "./floor";
import { StudioObjects } from "./objects";
import { LIGHTING_MOODS } from "./scene-finishes";
import { StudioTreatments } from "./treatments";
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
  const materials = getStudioMaterials(design);
  const lighting = LIGHTING_MOODS[materials.lighting];
  const { invalidate } = useThree();
  const sceneSize = Math.max(bounds.width, bounds.depth) / 12;
  const wallHeight = design.room.wallHeight / 12;
  const shadowSpan = Math.max(14, sceneSize * 0.72);
  const lightHeight = Math.max(16, wallHeight * 1.7);

  useEffect(() => {
    invalidate();
  }, [darkTheme, design, invalidate, selection, transparentWalls]);

  return (
    <>
      <ambientLight
        intensity={lighting.ambientIntensity}
        color={lighting.ambientColor}
      />
      <hemisphereLight
        intensity={lighting.hemisphereIntensity}
        color={lighting.hemisphereSky}
        groundColor={lighting.hemisphereGround}
      />
      <directionalLight
        position={[sceneSize * 0.42, lightHeight, sceneSize * 0.32]}
        intensity={lighting.keyIntensity}
        color={lighting.keyColor}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-shadowSpan}
        shadow-camera-right={shadowSpan}
        shadow-camera-top={shadowSpan}
        shadow-camera-bottom={-shadowSpan}
        shadow-camera-near={0.5}
        shadow-camera-far={Math.max(80, sceneSize * 3)}
        shadow-bias={-0.00035}
        shadow-normalBias={0.025}
        shadow-radius={2.5}
      />
      <pointLight
        position={[-sceneSize * 0.38, wallHeight * 0.72, sceneSize * 0.28]}
        intensity={lighting.fillIntensity}
        color={lighting.fillColor}
        distance={Math.max(45, sceneSize * 2.2)}
        decay={1.25}
      />

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
        transparent={transparentWalls}
        finish={materials.walls}
      />
      <StudioDrapes
        design={design}
        bounds={bounds}
        selection={selection}
        onSelect={onSelect}
      />
      <StudioTreatments
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
