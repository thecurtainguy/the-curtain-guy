"use client";

import { getDrapeColorHex, type DrapeColor } from "@/data/studio";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { mix, rng } from "../texture-utils";
import type { FabricQuality } from "./materials";

let bloomGeometry: THREE.BufferGeometry | null = null;
let leafGeometry: THREE.BufferGeometry | null = null;
let bloomMaterial: THREE.MeshStandardMaterial | null = null;
let leafMaterial: THREE.MeshStandardMaterial | null = null;

/** Ruffled, rose-like bloom (shared for the page lifetime). */
function getBloomGeometry() {
  if (bloomGeometry) return bloomGeometry;
  const base = mergeVertices(new THREE.IcosahedronGeometry(1, 3));
  const position = base.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < position.count; i++) {
    v.fromBufferAttribute(position, i);
    const angle = Math.atan2(v.z, v.x);
    const swirl = Math.sin(angle * 5 + v.y * 7) * 0.09;
    const ruffle = Math.sin(v.x * 9) * Math.sin(v.y * 11) * Math.sin(v.z * 7) * 0.06;
    const cup = v.y > 0.55 ? -(v.y - 0.55) * 0.5 : 0;
    v.multiplyScalar(1 + swirl + ruffle + cup);
    v.y *= 0.78;
    position.setXYZ(i, v.x, v.y, v.z);
  }
  base.computeVertexNormals();
  bloomGeometry = base;
  return base;
}

function getLeafGeometry() {
  if (leafGeometry) return leafGeometry;
  const geometry = new THREE.SphereGeometry(1, 10, 6);
  const position = geometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < position.count; i++) {
    const z = position.getZ(i);
    const taper = 1 - Math.pow(Math.abs(z), 1.6) * 0.85;
    position.setX(i, position.getX(i) * 0.42 * taper);
    position.setY(i, position.getY(i) * 0.06 + z * z * 0.12);
  }
  geometry.computeVertexNormals();
  leafGeometry = geometry;
  return geometry;
}

function getBloomMaterial() {
  bloomMaterial ??= new THREE.MeshStandardMaterial({
    color: "#ffffff",
    roughness: 0.62,
    metalness: 0,
  });
  return bloomMaterial;
}

function getLeafMaterial() {
  leafMaterial ??= new THREE.MeshStandardMaterial({
    color: "#ffffff",
    roughness: 0.55,
    metalness: 0,
    side: THREE.DoubleSide,
  });
  return leafMaterial;
}

const GREENS = ["#3d5a36", "#4f6d3c", "#6b8a55", "#2c4629", "#8aa293", "#77917f"];

const DENSITY: Record<FabricQuality, number> = { draft: 3, high: 6, ultra: 9 };

export type FloralSpec =
  | {
      kind: "band";
      x0: number;
      x1: number;
      y: number;
      z: number;
      /** Vertical band thickness, feet. */
      thickness?: number;
    }
  | {
      kind: "cluster";
      x: number;
      y: number;
      z: number;
      radius: number;
    };

function gaussian(rand: () => number) {
  return (rand() + rand() + rand() - 1.5) / 1.5;
}

function buildFlorals(
  spec: FloralSpec,
  color: string,
  seed: number,
  quality: FabricQuality
) {
  const rand = rng(seed);
  const palette = [
    color,
    mix(color, "#ffffff", 0.35),
    mix(color, "#f3e6da", 0.55),
    "#f5efe4",
    mix(color, "#000000", 0.18),
    mix(color, "#f6d6d0", 0.3),
  ];
  const density = DENSITY[quality] ?? DENSITY.high;
  const blooms: Array<{ p: THREE.Vector3; s: number; c: string }> = [];
  const leaves: Array<{ p: THREE.Vector3; s: number; c: string }> = [];

  if (spec.kind === "band") {
    const length = Math.max(0.5, spec.x1 - spec.x0);
    const thickness = spec.thickness ?? 0.9;
    const clusters = Math.max(2, Math.round(length / 1.8));
    const count = Math.round(length * density);
    for (let i = 0; i < count; i++) {
      const cluster = Math.floor(rand() * clusters);
      const cx = spec.x0 + ((cluster + 0.5) / clusters) * length;
      const x = Math.min(spec.x1, Math.max(spec.x0, cx + gaussian(rand) * (length / clusters) * 0.75));
      blooms.push({
        p: new THREE.Vector3(
          x,
          spec.y + gaussian(rand) * thickness * 0.4,
          spec.z + 0.08 + rand() * 0.22
        ),
        s: 0.1 + rand() * 0.13,
        c: palette[Math.floor(rand() * palette.length)],
      });
    }
    for (let i = 0; i < Math.round(count * 1.7); i++) {
      leaves.push({
        p: new THREE.Vector3(
          spec.x0 + rand() * length,
          spec.y + gaussian(rand) * thickness * 0.62,
          spec.z + rand() * 0.24
        ),
        s: 0.16 + rand() * 0.22,
        c: GREENS[Math.floor(rand() * GREENS.length)],
      });
    }
  } else {
    const count = Math.round(spec.radius * spec.radius * density * 5);
    for (let i = 0; i < count; i++) {
      const theta = rand() * Math.PI * 2;
      const r = Math.sqrt(rand()) * spec.radius;
      blooms.push({
        p: new THREE.Vector3(
          spec.x + Math.cos(theta) * r,
          spec.y + Math.sin(theta) * r * 0.75,
          spec.z + 0.1 + (1 - r / spec.radius) * spec.radius * 0.35
        ),
        s: 0.11 + rand() * 0.14,
        c: palette[Math.floor(rand() * palette.length)],
      });
    }
    for (let i = 0; i < Math.round(count * 1.6); i++) {
      const theta = rand() * Math.PI * 2;
      const r = Math.sqrt(rand()) * spec.radius * 1.35;
      leaves.push({
        p: new THREE.Vector3(
          spec.x + Math.cos(theta) * r,
          spec.y + Math.sin(theta) * r * 0.8,
          spec.z + rand() * 0.25
        ),
        s: 0.18 + rand() * 0.25,
        c: GREENS[Math.floor(rand() * GREENS.length)],
      });
    }
  }

  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const scale = new THREE.Vector3();
  const tint = new THREE.Color();

  const bloomMesh = new THREE.InstancedMesh(
    getBloomGeometry(),
    getBloomMaterial(),
    Math.max(1, blooms.length)
  );
  blooms.forEach((bloom, index) => {
    // Faces turned toward the room with a little scatter.
    euler.set(Math.PI / 2 - 0.5 + rand() * 0.6, rand() * Math.PI * 2, (rand() - 0.5) * 0.6);
    quaternion.setFromEuler(euler);
    scale.setScalar(bloom.s);
    matrix.compose(bloom.p, quaternion, scale);
    bloomMesh.setMatrixAt(index, matrix);
    bloomMesh.setColorAt(index, tint.set(bloom.c));
  });
  bloomMesh.count = blooms.length;

  const leafMesh = new THREE.InstancedMesh(
    getLeafGeometry(),
    getLeafMaterial(),
    Math.max(1, leaves.length)
  );
  leaves.forEach((leaf, index) => {
    euler.set((rand() - 0.5) * 1.6, rand() * Math.PI * 2, (rand() - 0.5) * 1.6);
    quaternion.setFromEuler(euler);
    scale.setScalar(leaf.s);
    matrix.compose(leaf.p, quaternion, scale);
    leafMesh.setMatrixAt(index, matrix);
    leafMesh.setColorAt(index, tint.set(leaf.c));
  });
  leafMesh.count = leaves.length;

  for (const mesh of [bloomMesh, leafMesh]) {
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = quality !== "draft";
    mesh.receiveShadow = true;
    mesh.computeBoundingSphere();
  }
  return { bloomMesh, leafMesh };
}

/** Instanced floral garland / cluster: blooms in the accent colour + greenery. */
export function FloralArrangement({
  spec,
  color,
  seed,
  quality,
}: {
  spec: FloralSpec;
  color: DrapeColor;
  seed: number;
  quality: FabricQuality;
}) {
  const specKey = JSON.stringify(spec);
  const hex = getDrapeColorHex(color);
  const meshes = useMemo(
    () => buildFlorals(JSON.parse(specKey) as FloralSpec, hex, seed, quality),
    [hex, quality, seed, specKey]
  );
  useEffect(
    () => () => {
      meshes.bloomMesh.dispose();
      meshes.leafMesh.dispose();
    },
    [meshes]
  );
  return (
    <group>
      <primitive object={meshes.leafMesh} />
      <primitive object={meshes.bloomMesh} />
    </group>
  );
}
