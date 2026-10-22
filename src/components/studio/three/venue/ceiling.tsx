"use client";

import type {
  StudioCeilingFinish,
  StudioLightingMood,
  StudioPoint,
  StudioWallFinish,
} from "@/data/studio";
import type { StudioBounds } from "@/lib/studio-geometry";
import { useFrame } from "@react-three/fiber";
import { memo, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { LIGHTING_MOODS } from "../lighting-moods";
import { useVenueTextures, type VenueQuality } from "../scene-finishes";
import {
  buildCeilingArchitecture,
  disposeCeilingBuild,
  resolveCeilingArchitecture,
  type CeilingArchitecture,
  type CeilingInstances,
  type CeilingMaterialKey,
} from "./ceiling-architecture";
import { CEILING_AO_RAMP, getCeilingAoTexture } from "./ceiling-textures";
import { disposeLater } from "./dispose-later";
import type { VenueMapSpec } from "./texture-gen";
import { getGlowFadeTexture, getHaloTexture } from "./textures";
import { SCALE } from "./wall-geometry";

const noRaycast = () => null;

function surfaceSpec(arch: CeilingArchitecture): VenueMapSpec {
  switch (arch) {
    case "beams":
      return { group: "ceiling", finish: "planks" };
    case "truss":
      return { group: "ceiling", finish: "deck" };
    case "black":
      return { group: "wall", finish: "black_box" };
    case "tent":
      return { group: "wall", finish: "tent_canvas" };
    default:
      return { group: "wall", finish: "white_plaster" };
  }
}

/* Ceilings face down, so only the hemisphere ground colour and the environment light them. */
const SURFACE_TINT: Record<CeilingArchitecture, string> = {
  tray: "#756d64",
  plain: "#756d64",
  flat: "#756d64",
  coffered: "#7a7268",
  beams: "#8a8277",
  truss: "#ffffff",
  black: "#8e8e8e",
  tent: "#d9d1c2",
};

const DARK_TRIM = new Set<CeilingArchitecture>(["black", "truss"]);

function CeilingInstancedPart({
  part,
  material,
}: {
  part: CeilingInstances;
  material: THREE.Material;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    part.matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [part]);
  return (
    <instancedMesh
      ref={ref}
      args={[part.geometry, undefined, part.matrices.length]}
      material={material}
      raycast={noRaycast}
    />
  );
}

/**
 * Event-venue ceiling seen from inside, in the chosen architecture (tray with
 * cove wash, flat, coffered, timber beams, industrial truss, black-out or
 * the tent canvas). Crease occlusion is baked through `uv1`; fixture lenses
 * are HDR (> 1) so bloom catches them. Never pickable (see ceiling-pick.ts),
 * never casts or receives shadows; hidden when the camera rises above it.
 */
export const VenueCeiling = memo(function VenueCeiling({
  floor,
  bounds,
  wallHeightIn,
  wallFinish,
  ceilingFinish = "auto",
  lighting,
  quality,
}: {
  floor: StudioPoint[];
  bounds: StudioBounds;
  wallHeightIn: number;
  wallFinish: StudioWallFinish;
  ceilingFinish?: StudioCeilingFinish;
  lighting: StudioLightingMood;
  quality: VenueQuality;
}) {
  const group = useRef<THREE.Group>(null);
  const height = wallHeightIn * SCALE;
  const rig = LIGHTING_MOODS[lighting] ?? LIGHTING_MOODS.neutral;
  const arch = resolveCeilingArchitecture(ceilingFinish, wallFinish, floor, bounds, wallHeightIn);

  const build = useMemo(
    () => buildCeilingArchitecture(arch, floor, bounds, wallHeightIn, wallFinish),
    [arch, floor, bounds, wallHeightIn, wallFinish]
  );
  useEffect(() => () => disposeCeilingBuild(build), [build]);

  const surfaceAo = build.surfaceAo;
  const surfaceAoKey = surfaceAo
    ? `${surfaceAo.edgeU}:${surfaceAo.falloffU}:${surfaceAo.edgeV}:${surfaceAo.falloffV}`
    : "";

  // Timber and steel maps are generated on first use, so only request what this finish shows.
  const surface = useVenueTextures(surfaceSpec(arch), quality);
  const timber = useVenueTextures(arch === "beams" ? { group: "ceiling", finish: "timber" } : null, quality);
  const steel = useVenueTextures(arch === "truss" ? { group: "ceiling", finish: "steel" } : null, quality);
  const duct = useVenueTextures(arch === "truss" ? { group: "ceiling", finish: "duct" } : null, quality);

  const structure = useMemo(() => {
    const ramp = getCeilingAoTexture(CEILING_AO_RAMP);
    const surfaceProps = {
      map: surface.map,
      normalMap: surface.normalMap,
      roughnessMap: surface.roughnessMap,
      roughness: 1,
      metalness: arch === "truss" ? 0.35 : 0,
      color: SURFACE_TINT[arch],
      normalScale: new THREE.Vector2(arch === "truss" ? 1.3 : 1, arch === "truss" ? 1.3 : 1),
    };
    const out: Partial<Record<CeilingMaterialKey, THREE.Material>> = {
      surface: new THREE.MeshStandardMaterial({
        ...surfaceProps,
        aoMap: surfaceAo ? getCeilingAoTexture(surfaceAo) : null,
      }),
      surfaceTrim: new THREE.MeshStandardMaterial({ ...surfaceProps, aoMap: ramp }),
    };
    if (timber) {
      out.timber = new THREE.MeshStandardMaterial({
        map: timber.map,
        normalMap: timber.normalMap,
        roughnessMap: timber.roughnessMap,
        roughness: 1,
        aoMap: ramp,
      });
    }
    if (steel && duct) {
      out.steel = new THREE.MeshStandardMaterial({
        map: steel.map,
        normalMap: steel.normalMap,
        roughnessMap: steel.roughnessMap,
        roughness: 1,
        metalness: 0.55,
        aoMap: ramp,
      });
      out.alu = new THREE.MeshStandardMaterial({
        color: "#c9ccd0",
        roughnessMap: steel.roughnessMap,
        roughness: 0.55,
        metalness: 0.9,
      });
      out.duct = new THREE.MeshStandardMaterial({
        map: duct.map,
        normalMap: duct.normalMap,
        roughnessMap: duct.roughnessMap,
        roughness: 1,
        metalness: 0.85,
      });
      out.shade = new THREE.MeshStandardMaterial({
        color: "#1d2622",
        metalness: 0.35,
        roughness: 0.38,
        side: THREE.DoubleSide,
      });
    }
    return out;
    // surfaceAoKey stands in for the surfaceAo object, which is rebuilt with the geometry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arch, surfaceAoKey, surface, timber, steel, duct]);

  const accents = useMemo(() => {
    const tent = arch === "tent";
    const boost = THREE.MathUtils.clamp(rig.uplightBoost, 0.5, 1.8);
    const cove = new THREE.Color(rig.environment.accent).lerp(new THREE.Color(rig.practicalWarmth), 0.35);
    const lens = new THREE.Color(rig.practicalWarmth).lerp(new THREE.Color("#ffffff"), 0.35);
    const additive = {
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    } as const;
    return {
      glow: new THREE.MeshBasicMaterial({
        ...additive,
        map: getGlowFadeTexture(),
        color: cove.clone().multiplyScalar((tent ? 0.22 : 0.42) * boost),
      }),
      led: new THREE.MeshBasicMaterial({
        color: cove.clone().multiplyScalar(2.4 * boost),
        toneMapped: false,
      }),
      lens: new THREE.MeshBasicMaterial({
        color: lens.clone().multiplyScalar((arch === "black" ? 0.9 : 1.25) + 0.35 * rig.practicalBoost),
        toneMapped: false,
      }),
      bezel: new THREE.MeshStandardMaterial({
        color: DARK_TRIM.has(arch) ? "#1a1918" : "#d8d2c8",
        metalness: 0.4,
        roughness: 0.45,
      }),
      halo: new THREE.MeshBasicMaterial({
        ...additive,
        map: getHaloTexture(),
        color: lens.clone().multiplyScalar((arch === "black" ? 0.1 : 0.16) * rig.practicalBoost),
      }),
      shadeLining: new THREE.MeshBasicMaterial({
        color: lens.clone().multiplyScalar(0.55 + 0.25 * rig.practicalBoost),
        toneMapped: false,
        side: THREE.DoubleSide,
      }),
      bulb: new THREE.MeshBasicMaterial({
        color: lens.clone().multiplyScalar(2.2 + 0.6 * rig.practicalBoost),
        toneMapped: false,
      }),
    };
  }, [rig, arch]);

  useEffect(() => () => disposeLater(Object.values(structure)), [structure]);
  useEffect(() => () => disposeLater(Object.values(accents)), [accents]);

  const materialFor = (key: CeilingMaterialKey): THREE.Material =>
    structure[key] ?? accents[key as keyof typeof accents] ?? structure.surface!;

  useFrame(({ camera }) => {
    const g = group.current;
    if (!g) return;
    const show = camera.position.y < height - 0.05;
    if (g.visible !== show) g.visible = show;
  });

  return (
    <group ref={group}>
      {build.meshes.map((part) => (
        <mesh
          key={part.key}
          geometry={part.geometry}
          material={materialFor(part.material)}
          renderOrder={part.renderOrder ?? 0}
          raycast={noRaycast}
        />
      ))}
      {build.instances.map((part) => (
        <CeilingInstancedPart key={part.key} part={part} material={materialFor(part.material)} />
      ))}
    </group>
  );
});
