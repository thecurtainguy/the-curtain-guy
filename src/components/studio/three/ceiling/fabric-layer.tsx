"use client";

import { useOptionalStudioSettings } from "@/components/studio/editor/studio-editor-context";
import {
  getCeilingDrapes,
  type StudioCeilingDrape,
  type StudioDesignJson,
  type StudioPoint,
} from "@/data/studio";
import type { StudioBounds } from "@/lib/studio-geometry";
import { ceilingUsesHub } from "@/lib/studio-ceiling";
import { memo, useEffect, useMemo } from "react";
import type * as THREE from "three";
import {
  useFabricEditorState,
  useSettledFabricProfile,
  type FabricHighlight,
} from "../fabric/drape-assembly";
import { getRimMaterial } from "../fabric/materials";
import { hashSeed } from "../texture-utils";
import { useCameraInsideRoom } from "../venue/camera-inside-store";
import {
  buildCeilingFabric,
  ceilingDrapeFromKey,
  ceilingGeometryKey,
  disposeCeilingFabric,
} from "./fabric/build";
import { CeilingHubDecor } from "./fabric/hub-decor";
import { getCeilingFabricMaterial, getFadedMaterial } from "./fabric/materials";
import { CeilingStarlight } from "./fabric/starlight";

const noRaycast = () => null;

function CeilingFabricMesh({
  geometry,
  material,
  highlight,
}: {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  highlight: FabricHighlight;
}) {
  return (
    <>
      <mesh
        geometry={geometry}
        material={material}
        receiveShadow={!material.transparent}
        renderOrder={material.transparent ? 2 : 0}
        raycast={noRaycast}
      />
      {highlight ? (
        <mesh
          geometry={geometry}
          material={getRimMaterial(highlight)}
          renderOrder={6}
          raycast={noRaycast}
        />
      ) : null}
    </>
  );
}

const CeilingDrapeFabric = memo(function CeilingDrapeFabric({
  drape,
  floor,
  wallHeight,
  centerX,
  centerZ,
  inside,
}: {
  drape: StudioCeilingDrape;
  floor: StudioPoint[];
  wallHeight: number;
  centerX: number;
  centerZ: number;
  inside: boolean;
}) {
  const { highlight, quality } = useFabricEditorState(drape.id);
  const geometryKey = ceilingGeometryKey(drape);
  const profile = useSettledFabricProfile(geometryKey, quality);
  const build = useMemo(
    () =>
      buildCeilingFabric(
        ceilingDrapeFromKey(geometryKey),
        floor,
        wallHeight,
        centerX,
        centerZ,
        profile
      ),
    [geometryKey, floor, wallHeight, centerX, centerZ, profile]
  );
  useEffect(() => () => disposeCeilingFabric(build), [build]);

  // From outside / above the room the ceiling layer is ghosted so the floor
  // plan stays readable; selecting the design shows it at full strength.
  const faded = !inside && highlight !== "selected";

  return (
    <group>
      {build.pieces.map((piece, index) => {
        const base = getCeilingFabricMaterial(
          drape.fabric,
          piece.color,
          drape.uplightColor,
          quality
        );
        return (
          <CeilingFabricMesh
            key={`${piece.color}:${index}`}
            geometry={piece.geometry}
            material={faded ? getFadedMaterial(base) : base}
            highlight={highlight}
          />
        );
      })}
      {drape.lights === "starlight" ? (
        <CeilingStarlight
          pieces={build.pieces}
          quality={quality}
          color={drape.lightColor}
          seed={hashSeed(drape.id) ^ 0x51ed}
          faded={faded}
        />
      ) : null}
      {build.hub && ceilingUsesHub(drape.type) ? (
        <CeilingHubDecor
          drape={drape}
          hub={build.hub}
          ceilingY={build.ceilingY}
          quality={quality}
          decor={drape.hubDecor}
        />
      ) : null}
    </group>
  );
});

/** Fabric meshes for every ceiling drape design. */
export function CeilingFabricLayer({
  design,
  bounds,
}: {
  design: StudioDesignJson;
  bounds: StudioBounds;
}) {
  const settings = useOptionalStudioSettings();
  const inside = useCameraInsideRoom();
  const visible = settings ? settings.layers.ceiling !== false : true;
  if (!visible) return null;
  const drapes = getCeilingDrapes(design).filter((drape) => !drape.hidden);
  if (drapes.length === 0) return null;
  return (
    <group name="ceiling-fabric">
      {drapes.map((drape) => (
        <CeilingDrapeFabric
          key={drape.id}
          drape={drape}
          floor={design.room.floor}
          wallHeight={design.room.wallHeight}
          centerX={bounds.centerX}
          centerZ={bounds.centerZ}
          inside={inside}
        />
      ))}
    </group>
  );
}
