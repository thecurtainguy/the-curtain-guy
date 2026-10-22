"use client";

import type { StudioFloorFinish, StudioPoint } from "@/data/studio";
import type { StudioBounds } from "@/lib/studio-geometry";
import { useThree } from "@react-three/fiber";
import { lazy, memo, Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { getStudioQualityPreset } from "./engine-quality";
import {
  FLOOR_FINISHES,
  useVenueTextures,
  type VenueQuality,
  type VenueTextureSet,
} from "./scene-finishes";
import { buildBandGeometry } from "./venue/band-geometry";
import { getVenueEnvironment } from "./venue/environment";
import { getGlowFadeTexture } from "./venue/textures";
import { SCALE } from "./venue/wall-geometry";

const IdleReflectorMaterial = lazy(() =>
  import("./venue/idle-reflector").then((module) => ({ default: module.IdleReflectorMaterial }))
);

/** Width (inches) of the soft occlusion band where floor meets wall. */
const CONTACT_BAND_IN = 22;
const noRaycast = () => null;

const REFLECTOR_STRENGTH: Partial<Record<StudioFloorFinish, number>> = {
  white_marble: 1.6,
  polished_concrete: 0.9,
  black_event: 1.3,
};

const REFLECTOR_BLUR: [number, number] = [200, 80];

function FloorPhysicalMaterial({
  finish,
  textures,
  normalScale,
  envMap,
}: {
  finish: StudioFloorFinish;
  textures: VenueTextureSet;
  normalScale: THREE.Vector2;
  envMap: THREE.Texture;
}) {
  const appearance = FLOOR_FINISHES[finish];
  return (
    <meshPhysicalMaterial
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
  );
}

/**
 * Room floor. UVs are world feet (ShapeGeometry uses shape coordinates), so
 * the procedural maps land at true plank / tile scale. Maps refine in place
 * (flat colour → preview → full size) as the texture worker delivers them.
 */
export const StudioFloor = memo(function StudioFloor({
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
  const meshRef = useRef<THREE.Mesh>(null);

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
  const preset = getStudioQualityPreset(quality);
  const textures = useVenueTextures({ group: "floor", finish }, quality);
  const normalScale = useMemo(
    () => new THREE.Vector2(appearance.normalScale, appearance.normalScale),
    [appearance.normalScale],
  );
  const reflector =
    preset.reflector === "idle" && appearance.reflective
      ? (REFLECTOR_STRENGTH[finish] ?? 1)
      : null;
  const physical = (
    <FloorPhysicalMaterial
      finish={finish}
      textures={textures}
      normalScale={normalScale}
      envMap={envMap}
    />
  );

  return (
    <>
      <mesh
        ref={meshRef}
        geometry={geometry}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        onClick={(event) => {
          event.stopPropagation();
          onClearSelection();
        }}
      >
        {reflector !== null ? (
          <Suspense fallback={physical}>
            <IdleReflectorMaterial
              target={meshRef}
              map={textures.map}
              normalMap={textures.normalMap}
              normalScale={normalScale}
              roughnessMap={textures.roughnessMap}
              envMap={envMap}
              envMapIntensity={appearance.envMapIntensity * 0.6}
              resolution={preset.reflectorResolution}
              blur={REFLECTOR_BLUR}
              mixBlur={0.9}
              mixStrength={reflector}
              mixContrast={1}
              depthScale={0.5}
              minDepthThreshold={0.35}
              maxDepthThreshold={1.25}
            />
          </Suspense>
        ) : (
          physical
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
});
