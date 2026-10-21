import type { StudioOpening, StudioPoint } from "@/data/studio";
import {
  clampOpeningToWall,
  getWallSegments,
  type StudioBounds,
  type StudioWallSegment,
} from "@/lib/studio-geometry";
import * as THREE from "three";

export const SCALE = 1 / 12;
/** Wall thickness in inches; the interior face sits exactly on the floor edge. */
export const WALL_THICKNESS_IN = 6;

export type Vec2 = { x: number; z: number };

export type WallFrame = StudioWallSegment & {
  dir: Vec2;
  /** Unit normal pointing into the room. */
  inward: Vec2;
  /** +1 when the room interior is the wall group's local +Z, else −1. */
  interiorSign: 1 | -1;
  /** Exterior corner points (inches) where neighbouring walls meet. */
  miterStart: StudioPoint;
  miterEnd: StudioPoint;
};

function signedArea(floor: StudioPoint[]) {
  let sum = 0;
  for (let i = 0; i < floor.length; i++) {
    const a = floor[i];
    const b = floor[(i + 1) % floor.length];
    sum += a.x * b.z - b.x * a.z;
  }
  return sum / 2;
}

function intersectLines(p: Vec2, d: Vec2, q: Vec2, e: Vec2): Vec2 | null {
  const cross = d.x * e.z - d.z * e.x;
  if (Math.abs(cross) < 1e-6) return null;
  const t = ((q.x - p.x) * e.z - (q.z - p.z) * e.x) / cross;
  return { x: p.x + d.x * t, z: p.z + d.z * t };
}

export function getWallFrames(
  floor: StudioPoint[],
  thickness = WALL_THICKNESS_IN
): WallFrame[] {
  const segments = getWallSegments(floor);
  if (segments.length < 2) return [];
  const sign: 1 | -1 = signedArea(floor) >= 0 ? 1 : -1;
  const base = segments.map((wall) => {
    const len = Math.max(1e-6, wall.length);
    const dir = {
      x: (wall.end.x - wall.start.x) / len,
      z: (wall.end.z - wall.start.z) / len,
    };
    const inward = { x: -dir.z * sign, z: dir.x * sign };
    return { wall, dir, inward };
  });
  const exteriorPoint = (i: number, at: StudioPoint) => ({
    x: at.x - base[i].inward.x * thickness,
    z: at.z - base[i].inward.z * thickness,
  });
  const miter = (prev: number, next: number, vertex: StudioPoint, owner: number) => {
    const fallback = exteriorPoint(owner, vertex);
    const hit = intersectLines(
      exteriorPoint(prev, vertex),
      base[prev].dir,
      exteriorPoint(next, vertex),
      base[next].dir
    );
    if (!hit) return fallback;
    const dist = Math.hypot(hit.x - vertex.x, hit.z - vertex.z);
    return dist > thickness * 6 ? fallback : hit;
  };
  const n = segments.length;
  return base.map(({ wall, dir, inward }, i) => ({
    ...wall,
    dir,
    inward,
    interiorSign: sign,
    miterStart: miter((i - 1 + n) % n, i, wall.start, i),
    miterEnd: miter(i, (i + 1) % n, wall.end, i),
  }));
}

export type OpeningSpan = {
  opening: StudioOpening;
  /** Along-wall inches. */
  start: number;
  end: number;
  /** Floor-relative inches (unclipped). `top` includes any arch. */
  bottom: number;
  top: number;
  /** Entrances: arch rise above the clear (spring) height, inches. */
  archRise?: number;
};

/** Gap between an arch apex and the top of its wall cut (keystone room). */
export const ARCH_CROWN_IN = 2;

export function getOpeningSpan(
  opening: StudioOpening,
  floor: StudioPoint[],
  wallHeightIn: number
): OpeningSpan {
  const safe = clampOpeningToWall(opening, floor);
  const isWindow = opening.type === "window";
  const defaultHeight =
    opening.type === "window" ? 60 : opening.type === "entrance" ? 96 : 84;
  const height = Math.max(12, opening.openingHeight ?? defaultHeight);
  const bottom = isWindow
    ? Math.min(Math.max(0, opening.sillHeight ?? 36), wallHeightIn - 12)
    : 0;
  const top = Math.max(bottom + 6, Math.min(bottom + height, wallHeightIn));
  const span: OpeningSpan = {
    opening,
    start: safe.offset,
    end: safe.offset + safe.width,
    bottom,
    top,
  };
  if (opening.type === "entrance" && safe.width >= 60) {
    const rise = Math.min(safe.width * 0.2, 26);
    const casing = 6;
    if (top + rise + ARCH_CROWN_IN + casing <= wallHeightIn) {
      span.archRise = rise;
      span.top = top + rise + ARCH_CROWN_IN;
    }
  }
  return span;
}

export type WallPiece = { a: number; b: number; y0: number; y1: number };

/** Solid wall boxes (inches) left after cutting every opening out of the wall. */
export function computeWallPieces(
  length: number,
  wallTop: number,
  spans: OpeningSpan[]
): WallPiece[] {
  const cuts = new Set<number>([0, length]);
  for (const s of spans) {
    cuts.add(Math.min(length, Math.max(0, s.start)));
    cuts.add(Math.min(length, Math.max(0, s.end)));
  }
  const xs = [...cuts].sort((a, b) => a - b);
  const columns: { a: number; b: number; ranges: [number, number][] }[] = [];
  for (let i = 0; i < xs.length - 1; i++) {
    const a = xs[i];
    const b = xs[i + 1];
    if (b - a < 0.01) continue;
    const mid = (a + b) / 2;
    const holes = spans
      .filter((s) => s.start <= mid && s.end >= mid && s.bottom < wallTop)
      .map((s) => [s.bottom, Math.min(s.top, wallTop)] as [number, number])
      .sort((p, q) => p[0] - q[0]);
    const ranges: [number, number][] = [];
    let cursor = 0;
    for (const [h0, h1] of holes) {
      if (h0 > cursor + 0.01) ranges.push([cursor, h0]);
      cursor = Math.max(cursor, h1);
    }
    if (wallTop > cursor + 0.01) ranges.push([cursor, wallTop]);
    const prev = columns[columns.length - 1];
    const same =
      prev &&
      Math.abs(prev.b - a) < 0.01 &&
      prev.ranges.length === ranges.length &&
      prev.ranges.every(
        (r, k) => Math.abs(r[0] - ranges[k][0]) < 0.01 && Math.abs(r[1] - ranges[k][1]) < 0.01
      );
    if (same) prev.b = b;
    else columns.push({ a, b, ranges });
  }
  return columns.flatMap((c) =>
    c.ranges.map(([y0, y1]) => ({ a: c.a, b: c.b, y0, y1 }))
  );
}

function subtractRanges(
  [lo, hi]: [number, number],
  holes: [number, number][]
): [number, number][] {
  const out: [number, number][] = [];
  let cursor = lo;
  for (const [h0, h1] of [...holes].sort((p, q) => p[0] - q[0])) {
    if (h1 <= cursor) continue;
    if (h0 >= hi) break;
    if (h0 > cursor + 0.01) out.push([cursor, Math.min(h0, hi)]);
    cursor = Math.max(cursor, h1);
  }
  if (hi > cursor + 0.01) out.push([cursor, hi]);
  return out;
}

/** Material groups on wall geometry. */
export const WALL_GROUP = { interior: 0, exterior: 1, cap: 2 } as const;

type V3 = [number, number, number];

/**
 * Builds one mitered, thick wall as world-space geometry (feet) with UVs in
 * feet: u along the wall, v up. Groups: interior, exterior, caps.
 */
export function buildWallGeometry(
  frame: WallFrame,
  pieces: WallPiece[],
  bounds: StudioBounds,
  thickness = WALL_THICKNESS_IN
): THREE.BufferGeometry {
  const groups: { pos: number[]; nor: number[]; uv: number[] }[] = [0, 1, 2].map(() => ({
    pos: [],
    nor: [],
    uv: [],
  }));
  const toWorld = (p: Vec2, yIn: number): V3 => [
    (p.x - bounds.centerX) * SCALE,
    yIn * SCALE,
    (p.z - bounds.centerZ) * SCALE,
  ];
  const quad = (group: number, p: V3[], uv: [number, number][], n: V3) => {
    const e1 = [p[1][0] - p[0][0], p[1][1] - p[0][1], p[1][2] - p[0][2]];
    const e2 = [p[2][0] - p[0][0], p[2][1] - p[0][1], p[2][2] - p[0][2]];
    const cx = e1[1] * e2[2] - e1[2] * e2[1];
    const cy = e1[2] * e2[0] - e1[0] * e2[2];
    const cz = e1[0] * e2[1] - e1[1] * e2[0];
    const order = cx * n[0] + cy * n[1] + cz * n[2] >= 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2];
    const g = groups[group];
    for (const i of order) {
      g.pos.push(...p[i]);
      g.nor.push(...n);
      g.uv.push(...uv[i]);
    }
  };
  const { dir, inward, start, length } = frame;
  const along = (d: number): Vec2 => ({ x: start.x + dir.x * d, z: start.z + dir.z * d });
  const outer = (d: number): Vec2 => {
    if (d <= 0.01) return frame.miterStart;
    if (d >= length - 0.01) return frame.miterEnd;
    const p = along(d);
    return { x: p.x - inward.x * thickness, z: p.z - inward.z * thickness };
  };
  const project = (p: Vec2) => ((p.x - start.x) * dir.x + (p.z - start.z) * dir.z) * SCALE;
  const nIn: V3 = [inward.x, 0, inward.z];
  const nOut: V3 = [-inward.x, 0, -inward.z];
  const t = thickness * SCALE;
  // Neighbouring pieces' y-breaks along each shared vertical edge; face quads
  // are split there so no T-junctions (raster cracks) appear at openings.
  const edgeBreaks = (x: number) =>
    pieces
      .filter((p) => Math.abs(p.a - x) < 0.01 || Math.abs(p.b - x) < 0.01)
      .flatMap((p) => [p.y0, p.y1]);
  for (const { a, b, y0, y1 } of pieces) {
    const ia = along(a);
    const ib = along(b);
    const oa = outer(a);
    const ob = outer(b);
    const ua = project(oa);
    const ub = project(ob);
    const ys = [y0, y1, ...edgeBreaks(a), ...edgeBreaks(b)]
      .filter((y) => y >= y0 && y <= y1)
      .sort((p, q) => p - q)
      .filter((y, i, arr) => i === 0 || y - arr[i - 1] > 0.01);
    ys[ys.length - 1] = y1;
    for (let s = 0; s < ys.length - 1; s++) {
      const s0 = ys[s];
      const s1 = ys[s + 1];
      const v0 = s0 * SCALE;
      const v1 = s1 * SCALE;
      quad(
        WALL_GROUP.interior,
        [toWorld(ia, s0), toWorld(ib, s0), toWorld(ib, s1), toWorld(ia, s1)],
        [[a * SCALE, v0], [b * SCALE, v0], [b * SCALE, v1], [a * SCALE, v1]],
        nIn
      );
      quad(
        WALL_GROUP.exterior,
        [toWorld(oa, s0), toWorld(ob, s0), toWorld(ob, s1), toWorld(oa, s1)],
        [[ua, v0], [ub, v0], [ub, v1], [ua, v1]],
        nOut
      );
    }
    const capUv: [number, number][] = [[a * SCALE, 0], [b * SCALE, 0], [ub, t], [ua, t]];
    quad(WALL_GROUP.cap, [toWorld(ia, y1), toWorld(ib, y1), toWorld(ob, y1), toWorld(oa, y1)], capUv, [0, 1, 0]);
    if (y0 > 0.01) {
      quad(WALL_GROUP.cap, [toWorld(ia, y0), toWorld(ib, y0), toWorld(ob, y0), toWorld(oa, y0)], capUv, [0, -1, 0]);
    }
    for (const [inner, outerPt, sense, at] of [
      [ia, oa, -1, a],
      [ib, ob, 1, b],
    ] as const) {
      const mx = outerPt.x - inner.x;
      const mz = outerPt.z - inner.z;
      const len = Math.hypot(mx, mz) || 1;
      let nx = mz / len;
      let nz = -mx / len;
      if ((nx * dir.x + nz * dir.z) * sense < 0) {
        nx = -nx;
        nz = -nz;
      }
      const covering = pieces
        .filter((p) => Math.abs((sense < 0 ? p.b : p.a) - at) < 0.01)
        .map((p) => [p.y0, p.y1] as [number, number]);
      for (const [e0, e1] of subtractRanges([y0, y1], covering)) {
        const w0 = e0 * SCALE;
        const w1 = e1 * SCALE;
        quad(
          WALL_GROUP.cap,
          [toWorld(inner, e0), toWorld(outerPt, e0), toWorld(outerPt, e1), toWorld(inner, e1)],
          [[0, w0], [t, w0], [t, w1], [0, w1]],
          [nx, 0, nz]
        );
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];
  let offset = 0;
  groups.forEach((g, index) => {
    const count = g.pos.length / 3;
    if (count) geometry.addGroup(offset, count, index);
    offset += count;
    pos.push(...g.pos);
    nor.push(...g.nor);
    uv.push(...g.uv);
  });
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  const sx = (start.x - bounds.centerX) * SCALE;
  const sz = (start.z - bounds.centerZ) * SCALE;
  const lengthFt = length * SCALE;
  const wallAttr = new Float32Array((pos.length / 3) * 2);
  for (let i = 0, v = 0; i < pos.length; i += 3, v += 2) {
    wallAttr[v] = (pos[i] - sx) * dir.x + (pos[i + 2] - sz) * dir.z;
    wallAttr[v + 1] = lengthFt;
  }
  geometry.setAttribute(WALL_SHADING_ATTRIBUTE, new THREE.BufferAttribute(wallAttr, 2));
  geometry.computeBoundingSphere();
  return geometry;
}

/**
 * Per-vertex `(along, length)` in feet for wall shading (corner occlusion).
 * Read by `applyWallShading`; absent attributes read as zero (no corner term).
 */
export const WALL_SHADING_ATTRIBUTE = "venueWall";

/** World (feet) position of a point on the interior face. */
export function wallPointWorld(
  frame: WallFrame,
  offsetIn: number,
  bounds: StudioBounds
): [number, number] {
  return [
    (frame.start.x + frame.dir.x * offsetIn - bounds.centerX) * SCALE,
    (frame.start.z + frame.dir.z * offsetIn - bounds.centerZ) * SCALE,
  ];
}

/** Group yaw so local +X runs along the wall and local +Z faces the room. */
export function wallYaw(frame: WallFrame) {
  return -frame.angle + (frame.interiorSign === 1 ? 0 : Math.PI);
}
