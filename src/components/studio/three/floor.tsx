"use client";

import type { StudioFloorFinish, StudioPoint } from "@/data/studio";
import type { StudioBounds } from "@/lib/studio-geometry";
import { MeshReflectorMaterial } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import {
  FLOOR_FINISHES,
  getFloorTextures,
  type VenueQuality,
} from "./scene-finishes";
import { buildBandGeometry } from "./venue/band-geometry";
import { getVenueEnvironment } from "./venue/environment";
import { getGlowFadeTexture } from "./venue/textures";
import { SCALE } from "./venue/wall-geometry";

/** Width (inches) of the soft occlusion band where floor meets wall. */
const CONTACT_BAND_IN = 22;
const noRaycast = () => null;

const REFLECTOR_STRENGTH: Partial<Record<StudioFloorFinish, number>> = {
  white_marble: 1.6,
  polished_concrete: 0.9,
  black_event: 1.3,
};

/**
 * Room floor. UVs are world feet (ShapeGeometry uses shape coordinates), so
 * the procedural maps land at true plank / tile scale.
 */
export function StudioFloor({
  floor,
  bounds,
  finish,
  quality = "high",
  onClearSelection,
}: {
  floor: StudioPoint[];
  bounds: StudioBounds;
  finish: StudioFloorFinish;
  quality?: VenueQuality;
  onClearSelection: () => void;
}) {
  const gl = useThree((state) => state.gl);
  const envMap = useMemo(() => getVenueEnvironment(gl), [gl]);

  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    floor.forEach((point, index) => {
      const x = (point.x - bounds.centerX) * SCALE;
      const y = -(point.z - bounds.centerZ) * SCALE;
      if (index === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    });
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }, [bounds.centerX, bounds.centerZ, floor]);

  const contact = useMemo(
    () => buildBandGeometry(floor, CONTACT_BAND_IN, 0.004, bounds, "up"),
    [floor, bounds],
  );

  useEffect(() => {
    return () => {
      geometry.dispose();
      contact?.dispose();
    };
  }, [geometry, contact]);

  const appearance = FLOOR_FINISHES[finish];
  const textures = getFloorTextures(finish, quality);
  const normalScale = useMemo(
    () => new THREE.Vector2(appearance.normalScale, appearance.normalScale),
    [appearance.normalScale],
  );
  const reflector =
    quality === "ultra" && appearance.reflective
      ? (REFLECTOR_STRENGTH[finish] ?? 1)
      : null;

  return (
    <>
      <mesh
        geometry={geometry}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        onClick={(event) => {
          event.stopPropagation();
          onClearSelection();
        }}
      >
        {reflector !== null ? (
          <MeshReflectorMaterial
            key={`reflector-${finish}`}
            map={textures.map}
            normalMap={textures.normalMap}
            normalScale={normalScale}
            roughnessMap={textures.roughnessMap}
            roughness={1}
            metalness={0}
            envMap={envMap}
            envMapIntensity={appearance.envMapIntensity * 0.6}
            resolution={1024}
            blur={[320, 110]}
            mixBlur={0.9}
            mixStrength={reflector}
            mixContrast={1}
            mirror={0}
            depthScale={0.5}
            minDepthThreshold={0.35}
            maxDepthThreshold={1.25}
          />
        ) : (
          <meshPhysicalMaterial
            key={`physical-${finish}`}
            map={textures.map}
            normalMap={textures.normalMap}
            normalScale={normalScale}
            roughnessMap={textures.roughnessMap}
            roughness={1}
            metalness={appearance.metalness}
            clearcoat={appearance.clearcoat}
            clearcoatRoughness={appearance.clearcoatRoughness}
            sheen={appearance.sheen ?? 0}
            sheenRoughness={0.8}
            sheenColor="#d8d2c8"
            envMap={envMap}
            envMapIntensity={appearance.envMapIntensity}
          />
        )}
      </mesh>
      {contact ? (
        <mesh geometry={contact} raycast={noRaycast} renderOrder={1}>
          <meshBasicMaterial
            color="#000000"
            alphaMap={getGlowFadeTexture()}
            transparent
            opacity={finish === "lawn" ? 0.25 : 0.4}
            depthWrite={false}
            polygonOffset
            polygonOffsetFactor={-2}
            polygonOffsetUnits={-2}
          />
        </mesh>
      ) : null}
    </>
  );
}
