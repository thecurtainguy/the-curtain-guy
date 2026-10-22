"use client";

import type { StudioObject } from "@/data/studio";
import { useMemo } from "react";
import { hashSeed } from "../texture-utils";
import {
  DrapeAssembly,
  FabricMesh,
  useFabricEditorState,
  useSettledFabricProfile,
} from "./drape-assembly";
import { canopyCenterY, createCanopyGeometry } from "./geometry";
import { useDisposeGeometry } from "./hardware";
import { getFabricMaterialForQuality, getHardwareMaterial } from "./materials";

const SCALE = 1 / 12;

/**
 * Freestanding pipe-and-drape backdrop in object-local space: origin at the
 * footprint center on the floor, width along +X, depth along +Z (feet units).
 * The parent group applies position and rotation.
 */
export function FreestandingDrapeModel({ object }: { object: StudioObject }) {
  const { highlight, quality } = useFabricEditorState(object.id);
  const seed = useMemo(() => hashSeed(object.id), [object.id]);
  return (
    <DrapeAssembly
      length={Math.max(0.5, object.width * SCALE)}
      height={Math.max(0.5, object.height * SCALE)}
      fabric={object.fabric ?? "velvet"}
      color={object.drapeColor ?? "ivory"}
      fullness={object.fullness ?? 2}
      hardware="pipe_and_drape"
      seed={seed}
      quality={quality}
      baseZ={0}
      highlight={highlight}
    />
  );
}

/**
 * Ceiling canopy in object-local space: footprint centered on origin; fabric
 * hangs from `wallHeight` (feet) down by the object's `height`, radiating
 * from a central medallion to perimeter attachment points.
 */
export function CeilingDrapeModel({
  object,
  wallHeight,
}: {
  object: StudioObject;
  wallHeight: number;
}) {
  const { highlight, quality } = useFabricEditorState(object.id);
  const width = Math.max(0.5, object.width * SCALE);
  const depth = Math.max(0.5, object.depth * SCALE);
  const drop = Math.max(0.3, Math.min(wallHeight - 1, object.height * SCALE));
  const top = wallHeight - 0.02;
  const fullness = object.fullness ?? 2;
  const seed = useMemo(() => hashSeed(object.id), [object.id]);
  const profile = useSettledFabricProfile(
    `${width}|${depth}|${top}|${drop}|${fullness}|${seed}`,
    quality
  );

  const geometry = useMemo(
    () =>
      createCanopyGeometry({
        width,
        depth,
        top,
        drop,
        fullness,
        seed,
        quality: profile,
      }),
    [depth, drop, fullness, profile, seed, top, width]
  );
  useDisposeGeometry(geometry);

  const material = getFabricMaterialForQuality(
    object.fabric ?? "chiffon",
    object.drapeColor ?? "white",
    null,
    quality
  );
  const centerY = canopyCenterY(top, drop);
  const gold = getHardwareMaterial("gold");

  return (
    <group>
      <FabricMesh geometry={geometry} material={material} highlight={highlight} />
      <group position={[0, centerY, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={gold} castShadow>
          <torusGeometry args={[0.32, 0.045, 12, 40]} />
        </mesh>
        <mesh position={[0, -0.04, 0]} material={gold}>
          <cylinderGeometry args={[0.3, 0.2, 0.08, 32]} />
        </mesh>
        <mesh position={[0, -0.14, 0]} material={gold}>
          <sphereGeometry args={[0.09, 16, 12]} />
        </mesh>
        <mesh position={[0, (top - centerY) / 2, 0]} material={gold}>
          <cylinderGeometry args={[0.018, 0.018, Math.max(0.05, top - centerY), 8]} />
        </mesh>
      </group>
    </group>
  );
}
