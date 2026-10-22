/**
 * Shared plumbing for ceiling fabric builders: the inch → world frame, grid
 * surfaces with smooth normals, and small math helpers. Builders return
 * world-space geometry (feet) so a whole design merges into one mesh per
 * material.
 */
import type { StudioPoint } from "@/data/studio";
import * as THREE from "three";
import { rng } from "../../texture-utils";
import type { FabricQuality } from "../../fabric/materials";
import { CEILING_FLUSH_CLEARANCE_IN, SCALE } from "../frame";

export const TAU = Math.PI * 2;
export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smoothstep = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a || 1));
  return t * t * (3 - 2 * t);
};

export type CeilingFrame = {
  /** Room bounds centre, inches. */
  centerX: number;
  centerZ: number;
  wallHeight: number;
  quality: FabricQuality;
  /** Resolution multiplier (≤ 1) applied when a design exceeds its vertex budget. */
  density: number;
};

export function worldX(frame: CeilingFrame, x: number) {
  return (x - frame.centerX) * SCALE;
}

export function worldZ(frame: CeilingFrame, z: number) {
  return (z - frame.centerZ) * SCALE;
}

/** Highest y any fabric may reach (just under the ceiling plane), feet. */
export function maxFabricY(frame: CeilingFrame) {
  return (frame.wallHeight - CEILING_FLUSH_CLEARANCE_IN) * SCALE;
}

/** World y (feet) of a drop below the ceiling, clamped under the ceiling. */
export function dropY(frame: CeilingFrame, dropIn: number) {
  return Math.min(maxFabricY(frame), (frame.wallHeight - dropIn - CEILING_FLUSH_CLEARANCE_IN) * SCALE);
}

/** Scales a resolution count by the frame density, keeping a floor. */
export function scaled(frame: CeilingFrame, count: number, min: number) {
  return Math.max(min, Math.round(count * frame.density));
}

export function signedArea(points: readonly StudioPoint[]) {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    area += a.x * b.z - b.x * a.z;
  }
  return area / 2;
}

/** Inward unit normal (plan) of edge a → b for an outline with the given winding. */
export function inwardNormal(a: StudioPoint, b: StudioPoint, area: number) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len = Math.hypot(dx, dz) || 1;
  return area > 0 ? { x: -dz / len, z: dx / len } : { x: dz / len, z: -dx / len };
}

/**
 * Writes vertices row by row into a (columns + 1) × (rows + 1) grid. With
 * `wrap`, the last column must repeat the first column's position; its
 * normals are welded so closed loops show no seam.
 */
export class GridSurface {
  readonly positions: Float32Array;
  readonly uvs: Float32Array;
  private cursor = 0;

  constructor(
    readonly columns: number,
    readonly rows: number,
    private readonly wrap = false
  ) {
    const count = (columns + 1) * (rows + 1);
    this.positions = new Float32Array(count * 3);
    this.uvs = new Float32Array(count * 2);
  }

  put(x: number, y: number, z: number, u: number, v: number) {
    const i = this.cursor++;
    this.positions[i * 3] = x;
    this.positions[i * 3 + 1] = y;
    this.positions[i * 3 + 2] = z;
    this.uvs[i * 2] = u;
    this.uvs[i * 2 + 1] = v;
  }

  finish(): THREE.BufferGeometry {
    const { columns, rows } = this;
    const rowLength = columns + 1;
    const vertexCount = rowLength * (rows + 1);
    const indexCount = columns * rows * 6;
    const indices =
      vertexCount > 65535 ? new Uint32Array(indexCount) : new Uint16Array(indexCount);
    let k = 0;
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        const a = row * rowLength + column;
        const b = a + 1;
        const c = a + rowLength;
        const d = c + 1;
        indices[k++] = a;
        indices[k++] = c;
        indices[k++] = b;
        indices[k++] = b;
        indices[k++] = c;
        indices[k++] = d;
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));
    geometry.setAttribute("uv", new THREE.BufferAttribute(this.uvs, 2));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    geometry.computeVertexNormals();
    if (this.wrap) {
      const normal = geometry.attributes.normal as THREE.BufferAttribute;
      const n = new THREE.Vector3();
      const m = new THREE.Vector3();
      for (let row = 0; row <= rows; row++) {
        const first = row * rowLength;
        const last = first + columns;
        n.fromBufferAttribute(normal, first);
        m.fromBufferAttribute(normal, last);
        n.add(m).normalize();
        normal.setXYZ(first, n.x, n.y, n.z);
        normal.setXYZ(last, n.x, n.y, n.z);
      }
    }
    return geometry;
  }
}

/**
 * Seeded fold profile that is exactly periodic in `theta` (radians), so
 * closed loops (canopy webs, cascades, valances) have no seam. `s` (feet)
 * lets folds wander slowly along their length. Returns roughly [-1, 1].
 */
export function createPeriodicFolds(seed: number, folds: number) {
  const rand = rng(seed);
  const p = Array.from({ length: 8 }, () => rand() * TAU);
  const n = Math.max(1, Math.round(folds));
  const n2 = Math.max(1, Math.round(n * 0.47));
  const n3 = Math.max(1, Math.round(n * 1.83));
  const slow = Math.max(1, Math.round(n * 0.14));
  return (theta: number, s: number) => {
    const wander = 0.3 * Math.sin(s * 0.42 + p[0]) + 0.15 * Math.sin(s * 1.07 + p[1]);
    const a = Math.sin(n * theta + p[2] + wander);
    const shaped = a >= 0 ? Math.pow(a, 0.8) : -Math.pow(-a, 1.3);
    const depthMod = 0.74 + 0.26 * Math.sin(slow * theta + p[3] + s * 0.11);
    return (
      shaped * depthMod * 0.74 +
      0.2 * Math.sin(n2 * theta + p[5] + wander * 1.6) +
      0.08 * Math.sin(n3 * theta + p[6] - wander)
    );
  };
}

/** Orients a unit primitive (axis +Y) along `dir` at `position`. */
export function placeAlong(
  geometry: THREE.BufferGeometry,
  position: THREE.Vector3,
  dir: THREE.Vector3
) {
  const quaternion = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    dir.clone().normalize()
  );
  geometry.applyQuaternion(quaternion);
  geometry.translate(position.x, position.y, position.z);
  return geometry;
}

/** Soft gathered fabric tie (barrel) wrapping a bundle, axis along +Y, centred. */
export function createGatherTie(radius: number, length: number, quality: FabricQuality) {
  const segments = quality === "draft" ? 10 : quality === "ultra" ? 24 : 16;
  const points: THREE.Vector2[] = [];
  const steps = 8;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const bulge = Math.sin(Math.PI * t);
    points.push(new THREE.Vector2(radius * (0.72 + 0.28 * bulge), (t - 0.5) * length));
  }
  const geometry = new THREE.LatheGeometry(points, segments);
  const position = geometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const z = position.getZ(i);
    const y = position.getY(i);
    const angle = Math.atan2(z, x);
    const crease = 1 + 0.08 * Math.sin(angle * 7 + y * 30);
    position.setXYZ(i, x * crease, y, z * crease);
  }
  geometry.computeVertexNormals();
  return geometry;
}
