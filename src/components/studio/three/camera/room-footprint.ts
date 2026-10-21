/**
 * The room's floor outline in world feet, with the geometry the in-room
 * camera needs: point-in-room tests, wall-margin clamping and floor rays.
 */
import type { StudioDesignJson } from "@/data/studio";
import type { StudioBounds } from "@/lib/studio-geometry";

const SCALE = 1 / 12;

export type FootPoint = { x: number; z: number };

export type RoomFootprint = {
  points: FootPoint[];
  /** +1 when the outline winds counter-clockwise in (x, z). */
  sign: number;
  centroid: FootPoint;
  /** Wall height, feet. */
  height: number;
  /** Floor diagonal, feet. */
  diagonal: number;
  /** Wall clearance the camera keeps, shrunk for very narrow rooms. */
  margin: number;
};

export function createRoomFootprint(
  floor: StudioDesignJson["room"]["floor"],
  wallHeightInches: number,
  bounds: StudioBounds
): RoomFootprint {
  const points = floor.map((point) => ({
    x: (point.x - bounds.centerX) * SCALE,
    z: (point.z - bounds.centerZ) * SCALE,
  }));
  let area = 0;
  let cx = 0;
  let cz = 0;
  for (let index = 0; index < points.length; index += 1) {
    const p = points[index];
    const q = points[(index + 1) % points.length];
    const cross = p.x * q.z - q.x * p.z;
    area += cross;
    cx += (p.x + q.x) * cross;
    cz += (p.z + q.z) * cross;
  }
  area /= 2;
  const centroid =
    Math.abs(area) > 1e-6
      ? { x: cx / (6 * area), z: cz / (6 * area) }
      : { x: 0, z: 0 };
  const width = bounds.width * SCALE;
  const depth = bounds.depth * SCALE;
  return {
    points,
    sign: area >= 0 ? 1 : -1,
    centroid,
    height: wallHeightInches * SCALE,
    diagonal: Math.hypot(width, depth),
    margin: Math.min(1.5, Math.max(0.35, Math.min(width, depth) * 0.3)),
  };
}

export function isInsideFootprint(footprint: RoomFootprint, x: number, z: number) {
  const { points } = footprint;
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const a = points[i];
    const b = points[j];
    if (a.z > z !== b.z > z && x < ((b.x - a.x) * (z - a.z)) / (b.z - a.z) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

type OutlineHit = { point: FootPoint; normal: FootPoint; distance: number };

function nearestOnOutline(footprint: RoomFootprint, x: number, z: number): OutlineHit | null {
  const { points, sign } = footprint;
  let best: OutlineHit | null = null;
  for (let index = 0; index < points.length; index += 1) {
    const p = points[index];
    const q = points[(index + 1) % points.length];
    const dx = q.x - p.x;
    const dz = q.z - p.z;
    const lengthSq = dx * dx + dz * dz;
    if (lengthSq < 1e-9) continue;
    const t = Math.min(1, Math.max(0, ((x - p.x) * dx + (z - p.z) * dz) / lengthSq));
    const point = { x: p.x + dx * t, z: p.z + dz * t };
    const distance = Math.hypot(x - point.x, z - point.z);
    if (!best || distance < best.distance) {
      const length = Math.sqrt(lengthSq);
      best = {
        point,
        normal: { x: (-dz / length) * sign, z: (dx / length) * sign },
        distance,
      };
    }
  }
  return best;
}

/** Distance (feet) from a point to the nearest wall line. */
export function distanceToWalls(footprint: RoomFootprint, x: number, z: number) {
  return nearestOnOutline(footprint, x, z)?.distance ?? Infinity;
}

/**
 * Nearest floor point that is inside the room and at least `margin` feet
 * from every wall. Iterates so concave (L-shaped) corners settle too.
 */
export function clampToFootprint(
  footprint: RoomFootprint,
  x: number,
  z: number,
  margin = footprint.margin
): FootPoint {
  if (footprint.points.length < 3) return { x, z };
  let cx = x;
  let cz = z;
  for (let iteration = 0; iteration < 5; iteration += 1) {
    const inside = isInsideFootprint(footprint, cx, cz);
    const hit = nearestOnOutline(footprint, cx, cz);
    if (!hit) return { x: cx, z: cz };
    if (inside && hit.distance >= margin - 1e-4) return { x: cx, z: cz };
    cx = hit.point.x + hit.normal.x * margin;
    cz = hit.point.z + hit.normal.z * margin;
  }
  if (isInsideFootprint(footprint, cx, cz)) return { x: cx, z: cz };
  return { ...footprint.centroid };
}

/** Whether a straight floor path stays inside the room with at least `clearance` to the walls. */
export function isClearPath(
  footprint: RoomFootprint,
  from: FootPoint,
  to: FootPoint,
  clearance = footprint.margin * 0.5
) {
  const steps = Math.max(8, Math.ceil(Math.hypot(to.x - from.x, to.z - from.z) / 1.5));
  for (let step = 1; step < steps; step += 1) {
    const t = step / steps;
    const x = from.x + (to.x - from.x) * t;
    const z = from.z + (to.z - from.z) * t;
    if (!isInsideFootprint(footprint, x, z) || distanceToWalls(footprint, x, z) < clearance) {
      return false;
    }
  }
  return true;
}

/**
 * Floor waypoints for an in-room camera flight. Straight when clear; otherwise
 * via the room's (clamped) centroid or a reflex corner, so L-shaped rooms never
 * see the camera cut through the inner corner.
 */
export function planInteriorPath(
  footprint: RoomFootprint,
  from: FootPoint,
  to: FootPoint
): FootPoint[] {
  if (isClearPath(footprint, from, to)) return [from, to];
  const candidates: FootPoint[] = [
    clampToFootprint(footprint, footprint.centroid.x, footprint.centroid.z),
  ];
  const { points, sign } = footprint;
  for (let index = 0; index < points.length; index += 1) {
    const prev = points[(index + points.length - 1) % points.length];
    const point = points[index];
    const next = points[(index + 1) % points.length];
    const cross =
      (point.x - prev.x) * (next.z - point.z) - (point.z - prev.z) * (next.x - point.x);
    if (cross * sign >= 0) continue;
    const bisector = {
      x: (prev.x + next.x) / 2 - point.x,
      z: (prev.z + next.z) / 2 - point.z,
    };
    const length = Math.hypot(bisector.x, bisector.z) || 1;
    candidates.push(
      clampToFootprint(
        footprint,
        point.x - (bisector.x / length) * footprint.margin * 2.2,
        point.z - (bisector.z / length) * footprint.margin * 2.2
      )
    );
  }
  let best: { via: FootPoint; length: number } | null = null;
  for (const via of candidates) {
    if (!isClearPath(footprint, from, via) || !isClearPath(footprint, via, to)) continue;
    const length =
      Math.hypot(via.x - from.x, via.z - from.z) + Math.hypot(to.x - via.x, to.z - via.z);
    if (!best || length < best.length) best = { via, length };
  }
  return best ? [from, best.via, to] : [from, candidates[0], to];
}

/** Feet from `origin` along unit `dir` to the first wall; Infinity if none. */
export function rayToWall(
  footprint: RoomFootprint,
  origin: FootPoint,
  dir: FootPoint
): number {
  const { points } = footprint;
  let nearest = Infinity;
  for (let index = 0; index < points.length; index += 1) {
    const p = points[index];
    const q = points[(index + 1) % points.length];
    const sx = q.x - p.x;
    const sz = q.z - p.z;
    const denom = dir.x * sz - dir.z * sx;
    if (Math.abs(denom) < 1e-9) continue;
    const ox = p.x - origin.x;
    const oz = p.z - origin.z;
    const t = (ox * sz - oz * sx) / denom;
    const u = (ox * dir.z - oz * dir.x) / denom;
    if (t > 1e-4 && u >= -1e-6 && u <= 1 + 1e-6) nearest = Math.min(nearest, t);
  }
  return nearest;
}
