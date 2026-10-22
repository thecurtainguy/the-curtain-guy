"use client";

import type { StudioChairStyle } from "@/data/studio";
import { useThree } from "@react-three/fiber";
import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import type { StudioQuality } from "../../editor/studio-editor-context";
import {
  cachedGeometry,
  lathe,
  mergeLoose,
  placed,
  roundedBox,
  UNIT,
} from "./geometry";
import { linenMaterial, MAT } from "./materials";

type Vec3 = [number, number, number];
type Part = { key: string; geometry: THREE.BufferGeometry; material: THREE.Material };

const UP = new THREE.Vector3(0, 1, 0);

function tube(a: Vec3, b: Vec3, radius: number, segments: number) {
  const start = new THREE.Vector3(...a);
  const end = new THREE.Vector3(...b);
  const dir = end.clone().sub(start);
  const length = dir.length();
  const matrix = new THREE.Matrix4().compose(
    start.clone().add(end).multiplyScalar(0.5),
    new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize()),
    new THREE.Vector3(radius, length, radius)
  );
  return UNIT.cylinder(segments).clone().applyMatrix4(matrix);
}

const box = (p: Vec3, s: Vec3, r: Vec3 = [0, 0, 0]) => placed(UNIT.box(), p, s, r);

const rbox = (
  p: Vec3,
  size: Vec3,
  radius: number,
  segments: number,
  r: Vec3 = [0, 0, 0]
) => placed(roundedBox(size[0], size[1], size[2], radius, segments), p, [1, 1, 1], r);

const mirrorX = (build: (sign: 1 | -1) => THREE.BufferGeometry[]) => [
  ...build(1),
  ...build(-1),
];

function detail(quality: StudioQuality) {
  return {
    tube: quality === "draft" ? 6 : quality === "ultra" ? 14 : 9,
    round: quality === "draft" ? 1 : quality === "ultra" ? 3 : 2,
  };
}

const IVORY = "#efe6d6";

/* ---- Chair models: seat centred on origin, backrest +Z, facing -Z ---- */

function chiavari(quality: StudioQuality, frame: THREE.Material): Part[] {
  const { tube: seg, round } = detail(quality);
  const post = (y: number): Vec3 => [
    0.55 - ((y - 1.45) / 1.55) * 0.03,
    y,
    0.52 + ((y - 1.45) / 1.55) * 0.16,
  ];
  const parts = mirrorX((s) => [
    tube([s * 0.62, 0, -0.6], [s * 0.56, 1.45, -0.52], 0.034, seg),
    tube([s * 0.6, 0, 0.62], [s * 0.55, 1.45, 0.52], 0.034, seg),
    tube([s * 0.55, 1.45, 0.52], [s * 0.52, 3.0, 0.68], 0.032, seg),
    tube([s * 0.6, 0.5, -0.58], [s * 0.58, 0.5, 0.58], 0.016, seg),
    tube([s * 0.6, 0.85, -0.56], [s * 0.57, 0.85, 0.56], 0.014, seg),
  ]);
  parts.push(
    tube([-0.6, 0.5, -0.58], [0.6, 0.5, -0.58], 0.016, seg),
    tube([-0.58, 0.5, 0.6], [0.58, 0.5, 0.6], 0.016, seg),
    rbox([0, 1.43, 0], [1.22, 0.08, 1.14], 0.03, round)
  );
  for (const y of [1.95, 2.45, 2.95]) {
    const [x, , z] = post(y);
    parts.push(tube([-x, y, z], [x, y, z], y > 2.9 ? 0.03 : 0.02, seg));
  }
  const low = post(1.95);
  const high = post(2.95);
  for (const x of [-0.34, -0.17, 0, 0.17, 0.34]) {
    parts.push(tube([x, 1.95, low[2]], [x, 2.95, high[2]], 0.014, Math.max(5, seg - 3)));
  }
  return [
    { key: "frame", geometry: mergeLoose(parts), material: frame },
    {
      key: "cushion",
      geometry: mergeLoose([rbox([0, 1.54, -0.02], [1.18, 0.13, 1.08], 0.05, round + 1)]),
      material: MAT.velvet(IVORY),
    },
  ];
}

function ghost(quality: StudioQuality): Part[] {
  const { tube: seg, round } = detail(quality);
  const torus = cachedGeometry("ghost-torus", () => new THREE.TorusGeometry(1, 0.075, 8, 40));
  const parts = mirrorX((s) => [
    tube([s * 0.62, 0, -0.62], [s * 0.55, 1.43, -0.52], 0.045, seg),
    tube([s * 0.6, 0, 0.68], [s * 0.55, 1.43, 0.52], 0.045, seg),
    tube([s * 0.52, 1.5, 0.56], [s * 0.42, 2.0, 0.64], 0.04, seg),
  ]);
  parts.push(
    rbox([0, 1.48, 0], [1.32, 0.1, 1.24], 0.045, round),
    placed(torus, [0, 2.4, 0.66], [0.5, 0.58, 0.5], [-0.1, 0, 0]),
    placed(UNIT.cylinder(24), [0, 2.4, 0.66], [0.47, 0.03, 0.55], [Math.PI / 2 - 0.1, 0, 0])
  );
  return [{ key: "frame", geometry: mergeLoose(parts), material: MAT.acrylic() }];
}

function crossBack(quality: StudioQuality): Part[] {
  const { round } = detail(quality);
  const angle = Math.atan2(1.15, 1.0);
  const parts = mirrorX((s) => [
    box([s * 0.6, 0.72, -0.56], [0.11, 1.44, 0.11]),
    box([s * 0.58, 1.5, 0.58], [0.11, 3.0, 0.11]),
    box([s * 0.6, 1.3, 0], [0.06, 0.14, 1.05]),
  ]);
  parts.push(
    box([0, 1.3, -0.56], [1.1, 0.14, 0.06]),
    box([0, 1.3, 0.58], [1.06, 0.14, 0.06]),
    box([0, 0.36, -0.56], [1.1, 0.06, 0.05]),
    box([0, 2.86, 0.58], [1.12, 0.22, 0.075]),
    box([0, 1.62, 0.58], [1.06, 0.08, 0.06]),
    box([0, 2.2, 0.58], [1.52, 0.07, 0.045], [0, 0, angle]),
    box([0, 2.2, 0.58], [1.52, 0.07, 0.045], [0, 0, -angle])
  );
  return [
    { key: "frame", geometry: mergeLoose(parts), material: MAT.wood("#6b4a2e") },
    {
      key: "seat",
      geometry: mergeLoose([box([0, 1.42, 0], [1.24, 0.07, 1.2])]),
      material: MAT.wood("#a8834f"),
    },
    {
      key: "cushion",
      geometry: mergeLoose([rbox([0, 1.5, -0.02], [1.12, 0.08, 1.02], 0.035, round)]),
      material: MAT.velvet(IVORY),
    },
  ];
}

function folding(quality: StudioQuality): Part[] {
  const { tube: seg, round } = detail(quality);
  const parts = mirrorX((s) => [
    tube([s * 0.6, 0, 0.5], [s * 0.56, 2.95, 0.7], 0.035, seg),
    tube([s * 0.6, 0, -0.62], [s * 0.6, 1.42, 0.28], 0.032, seg),
  ]);
  parts.push(
    tube([-0.6, 0.22, -0.48], [0.6, 0.22, -0.48], 0.02, seg),
    tube([-0.6, 0.22, 0.52], [0.6, 0.22, 0.52], 0.02, seg),
    rbox([0, 1.45, -0.02], [1.24, 0.1, 1.14], 0.04, round),
    rbox([0, 2.62, 0.66], [1.12, 0.42, 0.07], 0.03, round, [-0.07, 0, 0])
  );
  return [{ key: "frame", geometry: mergeLoose(parts), material: MAT.whiteResin() }];
}

function banquet(quality: StudioQuality): Part[] {
  const { tube: seg, round } = detail(quality);
  const parts = mirrorX((s) => [
    tube([s * 0.62, 0, -0.64], [s * 0.58, 1.32, -0.55], 0.032, seg),
    tube([s * 0.62, 0, 0.72], [s * 0.58, 1.32, 0.55], 0.032, seg),
    tube([s * 0.58, 1.32, 0.55], [s * 0.55, 3.0, 0.74], 0.03, seg),
  ]);
  parts.push(tube([-0.6, 0.35, -0.6], [0.6, 0.35, -0.6], 0.018, seg));
  return [
    { key: "frame", geometry: mergeLoose(parts), material: MAT.silver() },
    {
      key: "cushion",
      geometry: mergeLoose([
        rbox([0, 1.45, -0.02], [1.34, 0.24, 1.28], 0.08, round + 1),
        rbox([0, 2.32, 0.67], [1.28, 1.2, 0.2], 0.08, round + 1, [-0.12, 0, 0]),
      ]),
      material: MAT.velvet("#3a3436"),
    },
  ];
}

export function chairParts(style: StudioChairStyle, quality: StudioQuality): Part[] {
  const key = `chair:${style}:${quality}`;
  const build = (): Part[] => {
    switch (style) {
      case "chiavari_gold":
        return chiavari(quality, MAT.brushedGold());
      case "chiavari_silver":
        return chiavari(quality, MAT.silver());
      case "chiavari_white":
        return chiavari(quality, MAT.whiteResin());
      case "ghost":
        return ghost(quality);
      case "cross_back":
        return crossBack(quality);
      case "folding_white":
        return folding(quality);
      case "banquet":
        return banquet(quality);
      default:
        return [];
    }
  };
  const cached = partCache.get(key);
  if (cached) return cached;
  const parts = build();
  partCache.set(key, parts);
  return parts;
}

/** Merged chair / setting geometry per style + quality; lives for the page. */
const partCache = new Map<string, Part[]>();

/* ---- Place settings (charger, plate, glass, flatware) ---- */

function settingParts(quality: StudioQuality): Part[] {
  const cached = partCache.get(`setting:${quality}`);
  if (cached) return cached;
  const seg = quality === "ultra" ? 40 : 28;
  const plate = lathe(
    "plate",
    [
      [0, 0.004],
      [0.3, 0.004],
      [0.36, 0.012],
      [0.43, 0.03],
      [0.44, 0.036],
      [0.42, 0.034],
      [0.35, 0.016],
      [0, 0.014],
    ],
    seg
  );
  const glass = lathe(
    "wine-glass",
    [
      [0, 0],
      [0.1, 0],
      [0.1, 0.008],
      [0.014, 0.03],
      [0.012, 0.3],
      [0.06, 0.34],
      [0.13, 0.44],
      [0.135, 0.52],
      [0.115, 0.62],
      [0.11, 0.62],
    ],
    Math.round(seg * 0.6)
  );
  const parts: Part[] = [
    {
      key: "charger",
      geometry: placed(UNIT.cylinder(seg), [0, 0.01, 0], [0.54, 0.02, 0.54]),
      material: MAT.gold(),
    },
    {
      key: "plate",
      geometry: placed(plate, [0, 0.02, 0], [1, 1, 1]),
      material: MAT.porcelain(),
    },
    {
      key: "glass",
      geometry: placed(glass, [0.42, 0.02, -0.46], [1, 1, 1]),
      material: MAT.glass(),
    },
  ];
  if (quality === "ultra") {
    parts.push(
      {
        key: "flatware",
        geometry: mergeLoose([
          box([0.58, 0.012, 0.02], [0.05, 0.012, 0.62]),
          box([-0.58, 0.012, 0.02], [0.05, 0.012, 0.6]),
          box([-0.66, 0.012, 0.04], [0.04, 0.012, 0.56]),
        ]),
        material: MAT.silver(),
      },
      {
        key: "napkin",
        geometry: mergeLoose([rbox([0, 0.065, 0.05], [0.34, 0.045, 0.22], 0.02, 2)]),
        material: linenMaterial("ivory"),
      }
    );
  }
  partCache.set(`setting:${quality}`, parts);
  return parts;
}

/* ---- Instanced rendering ---- */

/**
 * Packed column-major 4x4 instance matrices, 16 floats each. The array sits in
 * a private field so React's dev-mode prop logging doesn't walk every float.
 */
export class InstanceMatrices {
  readonly #array: Float32Array;

  constructor(array: Float32Array) {
    this.#array = array;
  }

  get array() {
    return this.#array;
  }

  get count() {
    return this.#array.length / 16;
  }
}

const capacityFor = (count: number) =>
  Math.max(16, 2 ** Math.ceil(Math.log2(Math.max(1, count))));

/**
 * Uploads only the span of instance matrices that differs from what the GPU
 * already has; one dragged table rewrites its own chairs, an unchanged layout
 * uploads nothing and doesn't request a frame.
 */
function InstancedPart({
  part,
  matrices,
  castShadow,
}: {
  part: Part;
  matrices: InstanceMatrices;
  castShadow: boolean;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const invalidate = useThree((state) => state.invalidate);
  const capacity = capacityFor(matrices.count);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const source = matrices.array;
    const attribute = mesh.instanceMatrix;
    const target = attribute.array as Float32Array;
    const count = Math.min(matrices.count, attribute.count);
    const length = count * 16;
    let first = -1;
    let last = -1;
    for (let i = 0; i < length; i++) {
      if (target[i] !== source[i]) {
        if (first < 0) first = i;
        last = i;
      }
    }
    if (first < 0 && mesh.count === count) return;
    if (first >= 0) {
      const from = first - (first % 16);
      const to = last - (last % 16) + 16;
      target.set(source.subarray(from, to), from);
      attribute.addUpdateRange(from, to - from);
      attribute.needsUpdate = true;
    }
    mesh.count = count;
    mesh.boundingSphere = null;
    invalidate();
  }, [matrices, capacity, part, invalidate]);
  return (
    <instancedMesh
      key={`${capacity}:${part.geometry.uuid}`}
      ref={ref}
      args={[part.geometry, part.material, capacity]}
      castShadow={castShadow}
      receiveShadow
      frustumCulled
    />
  );
}

export function ChairInstances({
  style,
  matrices,
  quality,
}: {
  style: StudioChairStyle;
  matrices: InstanceMatrices;
  quality: StudioQuality;
}) {
  if (matrices.count === 0 || style === "none") return null;
  const parts = chairParts(style, quality);
  return (
    <>
      {parts.map((part) => (
        <InstancedPart
          key={part.key}
          part={part}
          matrices={matrices}
          castShadow={quality !== "draft" || matrices.count < 400}
        />
      ))}
    </>
  );
}

export function PlaceSettingInstances({
  matrices,
  quality,
}: {
  matrices: InstanceMatrices;
  quality: StudioQuality;
}) {
  if (matrices.count === 0 || quality === "draft") return null;
  return (
    <>
      {settingParts(quality).map((part) => (
        <InstancedPart
          key={part.key}
          part={part}
          matrices={matrices}
          castShadow={false}
        />
      ))}
    </>
  );
}
