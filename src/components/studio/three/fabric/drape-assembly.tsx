"use client";

import { useIsStudioHovered } from "@/components/studio/editor/hover-store";
import {
  useOptionalStudioSelection,
  useOptionalStudioSettings,
} from "@/components/studio/editor/studio-editor-context";
import type {
  DrapeColor,
  DrapeFabric,
  DrapeHardware,
  StudioPoint,
} from "@/data/studio";
import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { getStudioQualityPreset } from "../engine-quality";
import {
  bayBreaks,
  createPleatedRunGeometry,
  foldDepth,
  pocketFrontZ,
  pocketTopY,
} from "./geometry";
import {
  CeilingTrack,
  CROSSBAR_RADIUS,
  PipeAndDrapeHardware,
  UplightRow,
  uplightPositions,
  useDisposeGeometry,
} from "./hardware";
import {
  getFabricMaterialForQuality,
  getRimMaterial,
  isTranslucentFabric,
  type FabricQuality,
} from "./materials";

export type FabricHighlight = "selected" | "hover" | null;

/** Selection / hover / quality / layer state from the Studio editor, if any. */
export function useFabricEditorState(
  id: string,
  fallbackSelected = false
): { highlight: FabricHighlight; quality: FabricQuality } {
  const selection = useOptionalStudioSelection();
  const settings = useOptionalStudioSettings();
  const selected = selection ? selection.selectedIds.includes(id) : fallbackSelected;
  const hovered = useIsStudioHovered(selection ? id : null);
  return {
    highlight: selected ? "selected" : hovered ? "hover" : null,
    quality: settings?.quality ?? "high",
  };
}

/** A geometry rebuild landing within this window of the previous one is "live". */
const SETTLE_MS = 120;

/**
 * Tessellation profile for a Studio quality, dropping to draft density while
 * `key` (the geometry inputs) keeps changing — e.g. an inspector slider drag —
 * and rebuilding at full density once it has been still for SETTLE_MS. A
 * single discrete change builds at full density straight away.
 */
export function useSettledFabricProfile(key: string, quality: FabricQuality): FabricQuality {
  const profile = getStudioQualityPreset(quality).fabricProfile;
  const [track, setTrack] = useState({ key, stable: key, live: false });
  let current = track;
  if (track.key !== key) {
    current = { key, stable: track.stable, live: track.live || track.key !== track.stable };
    setTrack(current);
  }
  const pending = current.live || current.key !== current.stable;
  useEffect(() => {
    if (!pending) return;
    const timer = window.setTimeout(
      () => setTrack((state) => ({ key: state.key, stable: state.key, live: false })),
      SETTLE_MS
    );
    return () => window.clearTimeout(timer);
  }, [pending, current.key]);
  return current.live ? "draft" : profile;
}

export function useFabricLayerVisible(layer: "drapes" | "treatments") {
  const settings = useOptionalStudioSettings();
  return settings ? settings.layers[layer] !== false : true;
}

/** +1 when the floor polygon winds so that each wall's local +Z faces inside. */
export function interiorSign(floor: StudioPoint[]): 1 | -1 {
  let area = 0;
  for (let index = 0; index < floor.length; index++) {
    const current = floor[index];
    const next = floor[(index + 1) % floor.length];
    area += current.x * next.z - next.x * current.z;
  }
  return area >= 0 ? 1 : -1;
}

/** Fabric mesh plus an optional additive gold fresnel overlay. */
export function FabricMesh({
  geometry,
  material,
  highlight,
  position,
  rotation,
}: {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  highlight?: FabricHighlight;
  position?: [number, number, number];
  rotation?: [number, number, number];
}) {
  const translucent = material.transparent;
  return (
    <group position={position} rotation={rotation}>
      <mesh
        geometry={geometry}
        material={material}
        castShadow={!translucent}
        receiveShadow
        renderOrder={translucent ? 2 : 0}
      />
      {highlight ? (
        <mesh
          geometry={geometry}
          material={getRimMaterial(highlight)}
          renderOrder={6}
        />
      ) : null}
    </group>
  );
}

const floorMaterials = new Map<"line" | "glow", THREE.MeshBasicMaterial>();

function getFloorMaterial(kind: "line" | "glow") {
  let material = floorMaterials.get(kind);
  if (!material) {
    material = new THREE.MeshBasicMaterial({
      color:
        kind === "line"
          ? new THREE.Color("#e2b85c").multiplyScalar(1.4)
          : new THREE.Color("#d4af55"),
      transparent: true,
      opacity: kind === "line" ? 0.95 : 0.16,
      depthWrite: false,
      toneMapped: false,
    });
    floorMaterials.set(kind, material);
  }
  return material;
}

/** Gold floor rule under a selected run — reads well from any camera. */
export function SelectionFloorLine({
  length,
  z,
  highlight,
}: {
  length: number;
  z: number;
  highlight: FabricHighlight;
}) {
  if (!highlight) return null;
  const strong = highlight === "selected";
  return (
    <group position={[0, 0.012, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh material={getFloorMaterial("glow")} renderOrder={1}>
        <planeGeometry args={[length + 0.4, strong ? 0.9 : 0.5]} />
      </mesh>
      {strong ? (
        <mesh material={getFloorMaterial("line")} renderOrder={2}>
          <planeGeometry args={[length + 0.2, 0.05]} />
        </mesh>
      ) : null}
    </group>
  );
}

export type DrapeAssemblyProps = {
  /** Run length along local X, feet (centered on 0). */
  length: number;
  /** Top of fabric above the floor, feet. */
  height: number;
  fabric: DrapeFabric;
  color: DrapeColor;
  fullness: number;
  hardware: DrapeHardware;
  puddle?: boolean;
  seed: number;
  quality: FabricQuality;
  /** Plane of the pipe uprights / mount, feet along local Z. */
  baseZ: number;
  uplightColor?: DrapeColor | null;
  highlight?: FabricHighlight;
  /** Max spacing between uprights / panel seams. */
  maxBay?: number;
  /** Hide hardware (e.g. when another assembly provides it). */
  hideHardware?: boolean;
};

/** Default hardware plane distance from a wall for each mounting style. */
export function wallStandoff(hardware: DrapeHardware) {
  return hardware === "pipe_and_drape" ? 0.66 : 0.28;
}

/** Fabric front face z for an assembly, for placing tiebacks / florals / lights. */
export function assemblyFrontZ(hardware: DrapeHardware, baseZ: number) {
  return hardware === "pipe_and_drape"
    ? pocketFrontZ(baseZ, CROSSBAR_RADIUS)
    : baseZ + 0.05;
}

/**
 * Pleated drape run with its hardware: pipe & drape (uprights, base plates,
 * crossbars, rod pocket), slim ceiling track, or concealed wall mount.
 */
export function DrapeAssembly({
  length,
  height,
  fabric,
  color,
  fullness,
  hardware,
  puddle = false,
  seed,
  quality,
  baseZ,
  uplightColor,
  highlight = null,
  maxBay = 10,
  hideHardware = false,
}: DrapeAssemblyProps) {
  const pipe = hardware === "pipe_and_drape";
  const breaks = useMemo(() => bayBreaks(length, maxBay), [length, maxBay]);
  const bay = length / Math.max(1, breaks.length - 1);
  const sagPerBay = pipe ? Math.min(0.06, 0.0045 * bay) : 0;
  const crossbarY = pipe ? height - CROSSBAR_RADIUS - 0.012 : height;
  const frontZ = assemblyFrontZ(hardware, baseZ);
  const amplitude = foldDepth(fullness);
  const profile = useSettledFabricProfile(
    `${length}|${height}|${fullness}|${hardware}|${puddle}|${seed}|${maxBay}|${baseZ}`,
    quality
  );

  const geometry = useMemo(
    () =>
      createPleatedRunGeometry({
        length,
        breaks: bayBreaks(length, maxBay),
        height: pipe ? pocketTopY(crossbarY, CROSSBAR_RADIUS) : height,
        fullness,
        seed,
        quality: profile,
        z: frontZ,
        pipeRadius: pipe ? CROSSBAR_RADIUS : undefined,
        sagPerBay,
        puddle: puddle ? 0.8 : 0,
      }),
    [crossbarY, frontZ, fullness, height, length, maxBay, pipe, puddle, profile, sagPerBay, seed]
  );
  useDisposeGeometry(geometry);

  const material = getFabricMaterialForQuality(fabric, color, uplightColor, quality);
  const translucent = isTranslucentFabric(fabric);

  return (
    <group>
      <FabricMesh geometry={geometry} material={material} highlight={highlight} />
      {!hideHardware && pipe ? (
        <PipeAndDrapeHardware
          breaks={breaks}
          crossbarY={crossbarY}
          crossbarZs={[baseZ]}
          uprightZ={baseZ}
          sagPerBay={sagPerBay}
        />
      ) : null}
      {!hideHardware && hardware === "ceiling_track" ? (
        <CeilingTrack length={length} y={height + 0.03} z={baseZ} />
      ) : null}
      {uplightColor ? (
        <UplightRow
          positions={uplightPositions(length)}
          color={uplightColor}
          z={frontZ + amplitude + (puddle ? 1.15 : 0.75)}
          fabricZ={frontZ + amplitude * 0.9 + (translucent ? 0.02 : 0.06)}
          washHeight={Math.min(height, 9)}
        />
      ) : null}
      <SelectionFloorLine
        length={length}
        z={frontZ + amplitude + (puddle ? 1 : 0.3)}
        highlight={highlight}
      />
    </group>
  );
}
