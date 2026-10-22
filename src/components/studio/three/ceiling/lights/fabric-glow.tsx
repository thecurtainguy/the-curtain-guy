"use client";

import { useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import * as THREE from "three";
import type { FabricGlowPatch } from "./plan";

const NO_RAYCAST = () => null;

function createPatchGeometry(patch: FabricGlowPatch) {
  const { size, positions, weights } = patch;
  const colors = new Float32Array(weights.length * 3);
  weights.forEach((weight, index) => colors.fill(weight, index * 3, index * 3 + 3));
  const indices: number[] = [];
  for (let j = 0; j < size - 1; j++) {
    for (let i = 0; i < size - 1; i++) {
      const a = j * size + i;
      const b = a + 1;
      const c = a + size;
      const d = c + 1;
      if (weights[a] + weights[b] + weights[c] + weights[d] <= 0) continue;
      indices.push(a, c, b, b, c, d);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}

/**
 * Additive light pool draped just under the fabric (uplight hits, the
 * chandelier's spill). Follows the fabric surface so it reads as light on
 * cloth, not a disc in the air.
 */
export function FabricGlow({
  patch,
  color,
  strength,
}: {
  patch: FabricGlowPatch;
  color: string;
  strength: number;
}) {
  const invalidate = useThree((state) => state.invalidate);
  const geometry = useMemo(() => createPatchGeometry(patch), [patch]);
  const [material] = useState(
    () =>
      new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        toneMapped: false,
        fog: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      })
  );
  useLayoutEffect(() => {
    material.color.set(color).multiplyScalar(strength);
    invalidate();
  }, [color, invalidate, material, strength]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);
  return (
    <mesh
      geometry={geometry}
      material={material}
      raycast={NO_RAYCAST}
      renderOrder={2}
      userData={{ noAO: true }}
    />
  );
}
