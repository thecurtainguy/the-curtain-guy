"use client";

import type { DrapeColor } from "@/data/studio";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { FabricQuality } from "../../fabric/materials";
import { rng } from "../../texture-utils";
import type { CeilingFabricPiece } from "./build";
import { getStarlightMaterial } from "./materials";

/** Stars per square foot of fabric, and a hard cap per design. */
const STAR_DENSITY: Record<FabricQuality, { perSqFt: number; max: number }> = {
  draft: { perSqFt: 0.35, max: 2500 },
  high: { perSqFt: 0.9, max: 7000 },
  ultra: { perSqFt: 1.5, max: 14000 },
};

/** Stars hang this far below the fabric so they read on the underside, feet. */
const UNDERSIDE_OFFSET = 0.035;

const noRaycast = () => null;

/** Area-weighted random points on the fabric's triangles. */
function sampleStars(pieces: CeilingFabricPiece[], quality: FabricQuality, seed: number) {
  const triangles: Array<{ geometry: THREE.BufferGeometry; a: number; b: number; c: number }> = [];
  const cumulative: number[] = [];
  let total = 0;
  const va = new THREE.Vector3();
  const vb = new THREE.Vector3();
  const vc = new THREE.Vector3();
  for (const { geometry } of pieces) {
    const position = geometry.attributes.position as THREE.BufferAttribute;
    const index = geometry.index;
    if (!index) continue;
    for (let i = 0; i < index.count; i += 3) {
      const a = index.getX(i);
      const b = index.getX(i + 1);
      const c = index.getX(i + 2);
      va.fromBufferAttribute(position, a);
      vb.fromBufferAttribute(position, b);
      vc.fromBufferAttribute(position, c);
      const area = vb.sub(va).cross(vc.sub(va)).length() / 2;
      if (area <= 0) continue;
      total += area;
      triangles.push({ geometry, a, b, c });
      cumulative.push(total);
    }
  }
  const { perSqFt, max } = STAR_DENSITY[quality] ?? STAR_DENSITY.high;
  const count = Math.min(max, Math.round(total * perSqFt));
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const rand = rng(seed);
  for (let i = 0; i < count; i++) {
    const target = rand() * total;
    let lo = 0;
    let hi = cumulative.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cumulative[mid] < target) lo = mid + 1;
      else hi = mid;
    }
    const tri = triangles[lo];
    const position = tri.geometry.attributes.position as THREE.BufferAttribute;
    let r1 = rand();
    let r2 = rand();
    if (r1 + r2 > 1) {
      r1 = 1 - r1;
      r2 = 1 - r2;
    }
    va.fromBufferAttribute(position, tri.a);
    vb.fromBufferAttribute(position, tri.b);
    vc.fromBufferAttribute(position, tri.c);
    const x = va.x + (vb.x - va.x) * r1 + (vc.x - va.x) * r2;
    const y = va.y + (vb.y - va.y) * r1 + (vc.y - va.y) * r2;
    const z = va.z + (vb.z - va.z) * r1 + (vc.z - va.z) * r2;
    positions[i * 3] = x;
    positions[i * 3 + 1] = y - UNDERSIDE_OFFSET;
    positions[i * 3 + 2] = z;
    // Mostly faint pinpoints with the odd bright star.
    const brightness = 0.35 + Math.pow(rand(), 3) * 1.6;
    colors[i * 3] = brightness;
    colors[i * 3 + 1] = brightness;
    colors[i * 3 + 2] = brightness;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.computeBoundingSphere();
  return geometry;
}

/** Fibre-optic starlight woven into the fabric: tiny HDR points bloom picks up. */
export function CeilingStarlight({
  pieces,
  quality,
  color,
  seed,
  faded,
}: {
  pieces: CeilingFabricPiece[];
  quality: FabricQuality;
  color: DrapeColor;
  seed: number;
  faded: boolean;
}) {
  const geometry = useMemo(() => sampleStars(pieces, quality, seed), [pieces, quality, seed]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <points
      geometry={geometry}
      material={getStarlightMaterial(color, faded)}
      renderOrder={4}
      raycast={noRaycast}
      frustumCulled={false}
    />
  );
}
