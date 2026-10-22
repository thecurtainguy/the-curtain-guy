"use client";

import type { ReactNode } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { hashSeed, rng } from "../texture-utils";
import { BatchFrameProvider, useBatchedPart, useBatchFrame, useChildFrame } from "./batch";
import { cachedGeometry, mergeLoose, placed, q, UNIT } from "./geometry";
import { MAT, petalMixMaterial } from "./materials";

type Vec3 = [number, number, number];

/** Parts smaller than this (bounding radius, feet) skip the shadow pass unless asked. */
const SMALL_PART_RADIUS = 0.4;

function castsByDefault(geometry: THREE.BufferGeometry, scale: Vec3 | number | undefined) {
  if (!geometry.boundingSphere) geometry.computeBoundingSphere();
  const factor =
    scale === undefined
      ? 1
      : typeof scale === "number"
        ? Math.abs(scale)
        : Math.max(Math.abs(scale[0]), Math.abs(scale[1]), Math.abs(scale[2]));
  return (geometry.boundingSphere?.radius ?? 0) * factor >= SMALL_PART_RADIUS;
}

/**
 * Mesh using shared geometry + material (never disposed). Inside a batched
 * object it becomes one instance of a shared InstancedMesh instead. Shadows
 * default to on for large parts and off for small ones.
 */
export function Part({
  geometry,
  material,
  position,
  scale,
  rotation,
  cast,
  receive = true,
  renderOrder,
}: {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  position?: Vec3;
  scale?: Vec3 | number;
  rotation?: Vec3;
  cast?: boolean;
  receive?: boolean;
  renderOrder?: number;
}) {
  const castShadow = cast ?? castsByDefault(geometry, scale);
  const frame = useBatchFrame();
  const batched = useBatchedPart(
    renderOrder === undefined ? frame : null,
    geometry,
    material,
    castShadow,
    receive,
    { position, rotation, scale }
  );
  if (batched) return null;
  return (
    <mesh
      geometry={geometry}
      material={material}
      position={position}
      scale={scale}
      rotation={rotation}
      castShadow={castShadow}
      receiveShadow={receive}
      renderOrder={renderOrder}
    />
  );
}

/** `<group>` that also carries its transform into batched parts below it. */
export function Group({
  position,
  rotation,
  scale,
  children,
}: {
  position?: Vec3;
  rotation?: Vec3;
  scale?: Vec3 | number;
  children: ReactNode;
}) {
  const frame = useChildFrame({ position, rotation, scale });
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {frame ? <BatchFrameProvider frame={frame}>{children}</BatchFrameProvider> : children}
    </group>
  );
}

export const FLORAL_PALETTES = {
  romantic: ["#f4ede2", "#e7c3c0", "#d9b48a"],
  ivory: ["#f6f1e7", "#ece2cf", "#f9f6ef"],
  blush: ["#efcfcb", "#dfa7a5", "#f5e7de"],
  jewel: ["#7a1f33", "#c9a24a", "#efe4d4"],
} as const;

export type FloralPalette = keyof typeof FLORAL_PALETTES;

/**
 * Merged blossom + foliage mound: one vertex-coloured blossom mesh and one
 * foliage mesh. Geometry is cached per (seed, size, palette) so a room full of
 * identical centrepieces shares two geometries.
 */
export function FloralCluster({
  radius,
  height,
  seed = 1,
  palette = "romantic",
  spreadX = 1,
  density = 1,
  position,
  rotation,
}: {
  radius: number;
  height: number;
  seed?: number;
  palette?: FloralPalette;
  /** Stretch along X (garlands / runners). */
  spreadX?: number;
  density?: number;
  position?: Vec3;
  rotation?: Vec3;
}) {
  const colors = FLORAL_PALETTES[palette];
  const key = `floral:${seed}:${q(radius)}:${q(height)}:${q(spreadX)}:${density}`;
  const geometries = cachedFloral(key, radius, height, seed, spreadX, density, colors);
  return (
    <Group position={position} rotation={rotation}>
      <Part geometry={geometries.blossoms} material={petalMixMaterial(colors)} cast={false} />
      <Part geometry={geometries.leaves} material={MAT.leaf("#3f6339")} cast={false} />
    </Group>
  );
}

function cachedFloral(
  key: string,
  radius: number,
  height: number,
  seed: number,
  spreadX: number,
  density: number,
  colors: readonly string[]
) {
  const blossoms = cachedGeometry(`${key}:blossoms:${colors.join(",")}`, () => {
    const tint = new THREE.Color();
    const groups = colors.map((hex, colorIndex) => {
      const random = rng(seed * 31 + colorIndex * 7 + 3);
      const area = Math.PI * radius * radius * spreadX;
      const count = Math.max(3, Math.round((area / 0.05) * density / colors.length));
      const parts: THREE.BufferGeometry[] = [];
      for (let i = 0; i < count; i++) {
        const angle = random() * Math.PI * 2;
        const rr = radius * Math.sqrt(random());
        const falloff = 1 - (rr / Math.max(radius, 0.01)) ** 2;
        const size = 0.07 + random() * 0.07;
        parts.push(
          placed(
            UNIT.sphere(10),
            [
              Math.cos(angle) * rr * spreadX,
              height * (0.35 + 0.65 * falloff) + random() * 0.04,
              Math.sin(angle) * rr,
            ],
            [size, size * 0.78, size],
            [random() * 0.6, random() * Math.PI, 0]
          )
        );
      }
      const group = mergeLoose(parts);
      parts.forEach((part) => part.dispose());
      tint.set(hex);
      const vertexColors = new Float32Array(group.attributes.position.count * 3);
      for (let i = 0; i < vertexColors.length; i += 3) {
        vertexColors[i] = tint.r;
        vertexColors[i + 1] = tint.g;
        vertexColors[i + 2] = tint.b;
      }
      group.setAttribute("color", new THREE.BufferAttribute(vertexColors, 3));
      return group;
    });
    const merged = mergeGeometries(groups, false) ?? new THREE.BufferGeometry();
    groups.forEach((group) => group.dispose());
    return merged;
  });
  const leaves = cachedGeometry(`${key}:leaves`, () => {
    const random = rng(seed * 17 + 11);
    const count = Math.max(6, Math.round(((Math.PI * radius * radius * spreadX) / 0.04) * density));
    const parts: THREE.BufferGeometry[] = [];
    for (let i = 0; i < count; i++) {
      const angle = random() * Math.PI * 2;
      const rr = radius * (0.55 + random() * 0.6);
      const size = 0.1 + random() * 0.1;
      parts.push(
        placed(
          UNIT.icosahedron(0),
          [
            Math.cos(angle) * rr * spreadX,
            height * (0.15 + random() * 0.4),
            Math.sin(angle) * rr,
          ],
          [size * 1.8, size * 0.25, size * 0.8],
          [random() * 0.8 - 0.4, -angle, random() * 0.6 - 0.3]
        )
      );
    }
    const merged = mergeLoose(parts);
    parts.forEach((part) => part.dispose());
    return merged;
  });
  return { blossoms, leaves };
}

/** Pillar / votive candles with emissive flames, merged per material. */
export function CandleGroup({
  candles,
  position,
  castShadow = false,
}: {
  candles: Array<{ x: number; z: number; height: number; radius: number; votive?: boolean }>;
  position?: Vec3;
  castShadow?: boolean;
}) {
  const key = candles
    .map((c) => `${q(c.x)},${q(c.z)},${q(c.height)},${q(c.radius)},${c.votive ? 1 : 0}`)
    .join("|");
  const wax = cachedGeometry(`candles-wax:${key}`, () =>
    mergeLoose(
      candles.map((c) =>
        placed(UNIT.cylinder(16), [c.x, c.height / 2, c.z], [c.radius, c.height, c.radius])
      )
    )
  );
  const flames = cachedGeometry(`candles-flame:${key}`, () =>
    mergeLoose(
      candles.map((c) =>
        placed(UNIT.sphere(8), [c.x, c.height + 0.045, c.z], [0.018, 0.05, 0.018])
      )
    )
  );
  const votives = candles.filter((c) => c.votive);
  const glass =
    votives.length > 0
      ? cachedGeometry(`candles-glass:${key}`, () =>
          mergeLoose(
            votives.map((c) =>
              placed(
                UNIT.cylinder(16),
                [c.x, c.height * 0.75, c.z],
                [c.radius + 0.03, c.height * 1.5, c.radius + 0.03]
              )
            )
          )
        )
      : null;
  return (
    <Group position={position}>
      <Part geometry={wax} material={MAT.candleWax()} cast={castShadow} />
      <Part geometry={flames} material={MAT.flame()} cast={false} receive={false} />
      {glass ? <Part geometry={glass} material={MAT.glass()} cast={false} /> : null}
    </Group>
  );
}

export const seedOf = (id: string) => hashSeed(id);
