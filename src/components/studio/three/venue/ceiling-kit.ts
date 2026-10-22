/**
 * Geometry helpers for ceiling architecture, all in world feet: buffers
 * that carry a second UV set (`uv1`) for baked crease occlusion, a plan frame
 * aligned to the room's long axis for clipping grids and beam lines to any
 * outline (L-shapes, free-form), tubes, and merged recessed-can fixtures.
 */
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Vec2 } from "./polygon";

export type UV = [number, number];

export type Buffers = { pos: number[]; nor: number[]; uv: number[]; ao: number[] };

export const emptyBuffers = (): Buffers => ({ pos: [], nor: [], uv: [], ao: [] });

/** `uv1` that samples the bright centre of any AO cell (no occlusion). */
export const AO_NONE: UV = [0.5, 0.5];

export function toGeometry(b: Buffers) {
  if (!b.pos.length) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(b.pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(b.nor, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(b.uv, 2));
  g.setAttribute("uv1", new THREE.Float32BufferAttribute(b.ao, 2));
  g.computeBoundingSphere();
  return g;
}

const e1 = new THREE.Vector3();
const e2 = new THREE.Vector3();
const avg = new THREE.Vector3();

function pushPolygonFan(
  b: Buffers,
  p: THREE.Vector3[],
  uv: UV[],
  n: THREE.Vector3 | THREE.Vector3[],
  ao: UV[] | undefined,
  order: number[]
) {
  const normals = Array.isArray(n) ? n : null;
  if (normals) {
    avg.set(0, 0, 0);
    normals.forEach((v) => avg.add(v));
  } else avg.copy(n as THREE.Vector3);
  e1.subVectors(p[1], p[0]);
  e2.subVectors(p[2], p[0]);
  const flip = e1.cross(e2).dot(avg) < 0;
  const seq = flip ? [...order].reverse() : order;
  for (const i of seq) {
    const nn = normals ? normals[i] : (n as THREE.Vector3);
    b.pos.push(p[i].x, p[i].y, p[i].z);
    b.nor.push(nn.x, nn.y, nn.z);
    b.uv.push(uv[i][0], uv[i][1]);
    const a = ao ? ao[i] : AO_NONE;
    b.ao.push(a[0], a[1]);
  }
}

/** Two triangles with winding forced to face `n` (one normal, or one per corner). */
export function pushQuad(
  b: Buffers,
  p: THREE.Vector3[],
  uv: UV[],
  n: THREE.Vector3 | THREE.Vector3[],
  ao?: UV[]
) {
  pushPolygonFan(b, p, uv, n, ao, [0, 1, 2, 0, 2, 3]);
}

/** Filled planar polygon at height `y` facing `n` (earcut, any winding). */
export function pushPolygon(
  b: Buffers,
  outline: Vec2[],
  y: number,
  n: THREE.Vector3,
  uvOf: (p: Vec2) => UV,
  aoOf?: (p: Vec2) => UV
) {
  if (outline.length < 3) return;
  const contour = outline.map((p) => new THREE.Vector2(p.x, p.z));
  for (const tri of THREE.ShapeUtils.triangulateShape(contour, [])) {
    const pts = tri.map((i) => new THREE.Vector3(outline[i].x, y, outline[i].z));
    pushPolygonFan(
      b,
      pts,
      tri.map((i) => uvOf(outline[i])),
      n,
      aoOf ? tri.map((i) => aoOf(outline[i])) : undefined,
      [0, 1, 2]
    );
  }
}

/** Open cylinder from `a` to `c`; UVs are feet around × feet along. */
export function pushTube(
  b: Buffers,
  a: THREE.Vector3,
  c: THREE.Vector3,
  radius: number,
  segments: number
) {
  const dir = new THREE.Vector3().subVectors(c, a);
  const length = dir.length();
  if (length < 1e-4) return;
  dir.divideScalar(length);
  const helper = Math.abs(dir.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const s = new THREE.Vector3().crossVectors(dir, helper).normalize();
  const t = new THREE.Vector3().crossVectors(dir, s).normalize();
  const ring = (i: number) => {
    const angle = (i / segments) * Math.PI * 2;
    return s.clone().multiplyScalar(Math.cos(angle)).addScaledVector(t, Math.sin(angle));
  };
  for (let i = 0; i < segments; i++) {
    const n0 = ring(i);
    const n1 = ring(i + 1);
    const u0 = (i / segments) * Math.PI * 2 * radius;
    const u1 = ((i + 1) / segments) * Math.PI * 2 * radius;
    pushQuad(
      b,
      [
        a.clone().addScaledVector(n0, radius),
        a.clone().addScaledVector(n1, radius),
        c.clone().addScaledVector(n1, radius),
        c.clone().addScaledVector(n0, radius),
      ],
      [
        [u0, 0],
        [u1, 0],
        [u1, length],
        [u0, length],
      ],
      [n0, n1, n1, n0]
    );
  }
}

/* ------------------------------------------------------------------ */
/* Plan frame                                                          */
/* ------------------------------------------------------------------ */

/**
 * Orthonormal plan axes with `u` along the room's longest wall, flipped so
 * `u` spans the longer extent. Grids, beams and ducts are laid out in
 * (a, b) = (along u, along v) and mapped back with `fromFrame`.
 */
export type PlanFrame = {
  origin: Vec2;
  u: Vec2;
  v: Vec2;
  uMin: number;
  uMax: number;
  vMin: number;
  vMax: number;
};

export function toFrame(f: PlanFrame, p: Vec2): Vec2 {
  const dx = p.x - f.origin.x;
  const dz = p.z - f.origin.z;
  return { x: dx * f.u.x + dz * f.u.z, z: dx * f.v.x + dz * f.v.z };
}

export function fromFrame(f: PlanFrame, a: number, b: number): Vec2 {
  return { x: f.origin.x + f.u.x * a + f.v.x * b, z: f.origin.z + f.u.z * a + f.v.z * b };
}

export function createPlanFrame(outline: Vec2[]): PlanFrame {
  let best = 0;
  let u: Vec2 = { x: 1, z: 0 };
  outline.forEach((p, i) => {
    const q = outline[(i + 1) % outline.length];
    const len = Math.hypot(q.x - p.x, q.z - p.z);
    if (len > best) {
      best = len;
      u = { x: (q.x - p.x) / len, z: (q.z - p.z) / len };
    }
  });
  const frameFor = (axis: Vec2): PlanFrame => {
    const f: PlanFrame = {
      origin: { x: 0, z: 0 },
      u: axis,
      v: { x: -axis.z, z: axis.x },
      uMin: Infinity,
      uMax: -Infinity,
      vMin: Infinity,
      vMax: -Infinity,
    };
    for (const p of outline) {
      const l = toFrame(f, p);
      f.uMin = Math.min(f.uMin, l.x);
      f.uMax = Math.max(f.uMax, l.x);
      f.vMin = Math.min(f.vMin, l.z);
      f.vMax = Math.max(f.vMax, l.z);
    }
    return f;
  };
  const f = frameFor(u);
  return f.vMax - f.vMin > f.uMax - f.uMin ? frameFor({ x: -u.z, z: u.x }) : f;
}

/**
 * Inside spans of the line `a = value` (axis "v": runs along v) or
 * `b = value` (axis "u": runs along u) for a frame-local outline.
 */
export function chordsAt(local: Vec2[], axis: "u" | "v", value: number): Array<[number, number]> {
  const hits: number[] = [];
  for (let i = 0; i < local.length; i++) {
    const p = local[i];
    const q = local[(i + 1) % local.length];
    const pc = axis === "u" ? p.z : p.x;
    const qc = axis === "u" ? q.z : q.x;
    if (pc > value === qc > value) continue;
    const t = (value - pc) / (qc - pc);
    hits.push(axis === "u" ? p.x + (q.x - p.x) * t : p.z + (q.z - p.z) * t);
  }
  hits.sort((x, y) => x - y);
  const spans: Array<[number, number]> = [];
  for (let i = 0; i + 1 < hits.length; i += 2) {
    if (hits[i + 1] - hits[i] > 0.05) spans.push([hits[i], hits[i + 1]]);
  }
  return spans;
}

/** `spans` minus every `cut` interval. */
export function subtractSpans(
  spans: Array<[number, number]>,
  cuts: Array<[number, number]>
): Array<[number, number]> {
  let out = spans;
  for (const [c0, c1] of cuts) {
    const next: Array<[number, number]> = [];
    for (const [s0, s1] of out) {
      if (c1 <= s0 || c0 >= s1) next.push([s0, s1]);
      else {
        if (c0 - s0 > 0.02) next.push([s0, c0]);
        if (s1 - c1 > 0.02) next.push([c1, s1]);
      }
    }
    out = next;
  }
  return out;
}

/** Evenly spaced lines dividing [min, max] into ~`target`-sized bays (at least `minBays`). */
export function bayLines(min: number, max: number, target: number, minBays = 1) {
  const bays = Math.max(minBays, Math.round((max - min) / target));
  const step = (max - min) / bays;
  return { bays, step, lines: Array.from({ length: bays - 1 }, (_, i) => min + step * (i + 1)) };
}

/* ------------------------------------------------------------------ */
/* Merging & fixtures                                                  */
/* ------------------------------------------------------------------ */

export function mergeAll(list: THREE.BufferGeometry[]) {
  if (!list.length) return null;
  const flat = list.map((g) => (g.index ? g.toNonIndexed() : g));
  const merged = mergeGeometries(flat, false);
  list.forEach((g) => g.dispose());
  flat.forEach((g) => g.dispose());
  return merged;
}

export type CanGeometry = {
  lens: THREE.BufferGeometry | null;
  bezel: THREE.BufferGeometry | null;
  halo: THREE.BufferGeometry | null;
};

/** Recessed downlights flush with the plane `y`: HDR lens, trim ring and a soft spill halo. */
export function buildCans(points: Vec2[], y: number, radius: number): CanGeometry {
  const lens: THREE.BufferGeometry[] = [];
  const bezel: THREE.BufferGeometry[] = [];
  const halo: THREE.BufferGeometry[] = [];
  for (const p of points) {
    const disc = new THREE.CircleGeometry(radius, 20);
    disc.rotateX(Math.PI / 2);
    disc.translate(p.x, y - 0.02, p.z);
    lens.push(disc);
    const ring = new THREE.RingGeometry(radius, radius + 0.09, 24);
    ring.rotateX(Math.PI / 2);
    ring.translate(p.x, y - 0.025, p.z);
    bezel.push(ring);
    const glow = new THREE.CircleGeometry(radius * 3.5, 24);
    glow.rotateX(Math.PI / 2);
    glow.translate(p.x, y - 0.012, p.z);
    halo.push(glow);
  }
  return { lens: mergeAll(lens), bezel: mergeAll(bezel), halo: mergeAll(halo) };
}
