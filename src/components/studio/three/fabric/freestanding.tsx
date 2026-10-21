"use client";

import { getDrapeColorHex, type StudioObject } from "@/data/studio";

const SCALE = 1 / 12;

/**
 * Freestanding pipe-and-drape backdrop in object-local space: origin at the
 * footprint center on the floor, width along +X, depth along +Z (feet units).
 * The parent group applies position and rotation.
 */
export function FreestandingDrapeModel({ object }: { object: StudioObject }) {
  const width = Math.max(0.5, object.width * SCALE);
  const height = Math.max(0.5, object.height * SCALE);
  return (
    <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
      <boxGeometry args={[width, height, 0.08]} />
      <meshStandardMaterial
        color={getDrapeColorHex(object.drapeColor ?? "ivory")}
        roughness={0.85}
      />
    </mesh>
  );
}

/**
 * Ceiling canopy in object-local space: footprint centered on origin; fabric
 * hangs from `wallHeight` (feet) down by the object's `height`.
 */
export function CeilingDrapeModel({
  object,
  wallHeight,
}: {
  object: StudioObject;
  wallHeight: number;
}) {
  const width = Math.max(0.5, object.width * SCALE);
  const depth = Math.max(0.5, object.depth * SCALE);
  const drop = Math.max(0.2, object.height * SCALE);
  return (
    <mesh position={[0, wallHeight - drop / 2, 0]}>
      <boxGeometry args={[width, 0.05, depth]} />
      <meshStandardMaterial
        color={getDrapeColorHex(object.drapeColor ?? "white")}
        roughness={0.8}
        transparent
        opacity={0.75}
      />
    </mesh>
  );
}
