import type { StudioPoint } from "@/data/studio";

export type Vec2 = { x: number; z: number };

export function signedArea(points: readonly Vec2[]) {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    area += a.x * b.z - b.x * a.z;
  }
  return area / 2;
}

/** Unit normal of edge i (points[i] → points[i+1]) pointing into the polygon. */
export function edgeInward(points: readonly Vec2[], i: number, area = signedArea(points)): Vec2 {
  const a = points[i];
  const b = points[(i + 1) % points.length];
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len = Math.hypot(dx, dz) || 1;
  return area > 0 ? { x: -dz / len, z: dx / len } : { x: dz / len, z: -dx / len };
}

/**
 * Mitred offset of a simple polygon: positive `distance` moves every edge
 * inward, negative outward. Miters are clamped to 4× the distance so sharp
 * corners never spike.
 */
export function offsetPolygon(points: readonly (Vec2 | StudioPoint)[], distance: number): Vec2[] {
  const pts = points.map((p) => ({ x: p.x, z: p.z }));
  const n = pts.length;
  if (n < 3) return pts;
  const area = signedArea(pts);
  const normals = pts.map((_, i) => edgeInward(pts, i, area));
  return pts.map((p, i) => {
    const prev = normals[(i - 1 + n) % n];
    const next = normals[i];
    const bx = prev.x + next.x;
    const bz = prev.z + next.z;
    const dot = prev.x * next.x + prev.z * next.z;
    const len = Math.hypot(bx, bz);
    if (len < 1e-6 || 1 + dot < 1e-6) {
      return { x: p.x + next.x * distance, z: p.z + next.z * distance };
    }
    const scale = Math.min(4, 1 / Math.sqrt((1 + dot) / 2));
    return {
      x: p.x + (bx / len) * distance * scale,
      z: p.z + (bz / len) * distance * scale,
    };
  });
}

/** Even-odd containment test. */
export function pointInPolygon(points: readonly Vec2[], x: number, z: number) {
  let within = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i];
    const b = points[j];
    if (a.z > z !== b.z > z && x < ((b.x - a.x) * (z - a.z)) / (b.z - a.z) + a.x) {
      within = !within;
    }
  }
  return within;
}

/** Shortest distance from (x, z) to the polygon outline. */
export function distanceToOutline(points: readonly Vec2[], x: number, z: number) {
  let best = Infinity;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const ex = b.x - a.x;
    const ez = b.z - a.z;
    const len2 = ex * ex + ez * ez || 1;
    const t = Math.max(0, Math.min(1, ((x - a.x) * ex + (z - a.z) * ez) / len2));
    best = Math.min(best, Math.hypot(a.x + ex * t - x, a.z + ez * t - z));
  }
  return best;
}
