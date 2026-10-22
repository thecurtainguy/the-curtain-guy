import type {
  StudioDesignJson,
  StudioObject,
  StudioObjectType,
  StudioPoint,
} from "@/data/studio";
import { clampOpeningToWall, getPointAlongWall, getWallSegments } from "@/lib/studio-geometry";
import {
  STUDIO_MAX_COORDINATE,
  STUDIO_OBJECT_MIN_DIMENSIONS,
  clampFinite,
  getStudioObjectBoundsResult,
  getStudioObjectCorners,
  snapStudioValue,
  type StudioInteractionOptions,
} from "@/lib/studio-interactions";
import type { PlanRect } from "./viewport";

export type PlanEdgeHandle = "north" | "east" | "south" | "west";

const CIRCULAR_TYPES: ReadonlySet<StudioObjectType> = new Set([
  "round_table",
  "cocktail_table",
  "cake_table",
  "plant",
  "uplight",
  "chandelier",
]);

/** Floor zones and overhead items that legitimately overlap other objects. */
const NON_COLLIDING_TYPES: ReadonlySet<StudioObjectType> = new Set([
  "stage",
  "dance_floor",
  "table_area",
  "lounge_area",
  "ceiling_drape",
  "chandelier",
  "uplight",
]);

export function isCircularObjectType(type: StudioObjectType): boolean {
  return CIRCULAR_TYPES.has(type);
}

type ObjectShapeCache = {
  corners: StudioPoint[];
  box: PlanRect;
  /** Containment result for the floor it was computed against. */
  floor?: readonly StudioPoint[];
  contained?: boolean;
};

/** Design objects are immutable, so geometry is cached per object identity. */
const shapeCache = new WeakMap<StudioObject, ObjectShapeCache>();

function objectShape(object: StudioObject): ObjectShapeCache {
  let entry = shapeCache.get(object);
  if (!entry) {
    const corners = getStudioObjectCorners(object);
    entry = { corners, box: getPointsBox(corners) };
    shapeCache.set(object, entry);
  }
  return entry;
}

/** Rotated corners of an object (cached; do not mutate). */
export function getObjectCorners(object: StudioObject): readonly StudioPoint[] {
  return objectShape(object).corners;
}

/** Axis-aligned bounds of an object (cached; do not mutate). */
export function getObjectBox(object: StudioObject): PlanRect {
  return objectShape(object).box;
}

function isContained(object: StudioObject, floor: StudioPoint[]): boolean {
  const entry = objectShape(object);
  if (entry.floor !== floor || entry.contained === undefined) {
    entry.floor = floor;
    entry.contained = getStudioObjectBoundsResult(object, floor).contained;
  }
  return entry.contained;
}

export function getPointsBox(points: readonly StudioPoint[]): PlanRect {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const point of points) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minZ = Math.min(minZ, point.z);
    maxZ = Math.max(maxZ, point.z);
  }
  if (!Number.isFinite(minX)) return { minX: 0, maxX: 0, minZ: 0, maxZ: 0 };
  return { minX, maxX, minZ, maxZ };
}

export function offsetBox(box: PlanRect, dx: number, dz: number): PlanRect {
  return {
    minX: box.minX + dx,
    maxX: box.maxX + dx,
    minZ: box.minZ + dz,
    maxZ: box.maxZ + dz,
  };
}

function boxesOverlap(a: PlanRect, b: PlanRect, slack = 0): boolean {
  return (
    a.minX < b.maxX - slack &&
    a.maxX > b.minX + slack &&
    a.minZ < b.maxZ - slack &&
    a.maxZ > b.minZ + slack
  );
}

function project(points: readonly StudioPoint[], axisX: number, axisZ: number) {
  let min = Infinity;
  let max = -Infinity;
  for (const point of points) {
    const value = point.x * axisX + point.z * axisZ;
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  return { min, max };
}

/** Separating-axis test for two convex polygons; `slack` tolerates touching. */
export function convexPolygonsOverlap(
  a: readonly StudioPoint[],
  b: readonly StudioPoint[],
  slack = 0.5
): boolean {
  for (const polygon of [a, b]) {
    for (let index = 0; index < polygon.length; index += 1) {
      const start = polygon[index];
      const end = polygon[(index + 1) % polygon.length];
      const length = Math.hypot(end.x - start.x, end.z - start.z);
      if (length <= 1e-9) continue;
      const axisX = -(end.z - start.z) / length;
      const axisZ = (end.x - start.x) / length;
      const first = project(a, axisX, axisZ);
      const second = project(b, axisX, axisZ);
      if (first.max - slack <= second.min || second.max - slack <= first.min) {
        return false;
      }
    }
  }
  return true;
}

function rectPolygon(rect: PlanRect): StudioPoint[] {
  return [
    { x: rect.minX, z: rect.minZ },
    { x: rect.maxX, z: rect.minZ },
    { x: rect.maxX, z: rect.maxZ },
    { x: rect.minX, z: rect.maxZ },
  ];
}

export function objectIntersectsRect(object: StudioObject, rect: PlanRect): boolean {
  return convexPolygonsOverlap(getObjectCorners(object), rectPolygon(rect), 0);
}

export function segmentIntersectsRect(
  start: StudioPoint,
  end: StudioPoint,
  rect: PlanRect
): boolean {
  const inside = (point: StudioPoint) =>
    point.x >= rect.minX &&
    point.x <= rect.maxX &&
    point.z >= rect.minZ &&
    point.z <= rect.maxZ;
  if (inside(start) || inside(end)) return true;
  // Liang–Barsky clip.
  let t0 = 0;
  let t1 = 1;
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const checks: Array<[number, number]> = [
    [-dx, start.x - rect.minX],
    [dx, rect.maxX - start.x],
    [-dz, start.z - rect.minZ],
    [dz, rect.maxZ - start.z],
  ];
  for (const [p, q] of checks) {
    if (p === 0) {
      if (q < 0) return false;
      continue;
    }
    const r = q / p;
    if (p < 0) {
      if (r > t1) return false;
      if (r > t0) t0 = r;
    } else {
      if (r < t0) return false;
      if (r < t1) t1 = r;
    }
  }
  return t0 <= t1;
}

export type PlanWallItemSegment = {
  id: string;
  start: StudioPoint;
  end: StudioPoint;
};

/** Plan segments of visible wall-anchored items, for marquee selection. */
export function getWallItemSegments(
  design: StudioDesignJson,
  layers: { drapes: boolean; treatments: boolean; openings: boolean }
): PlanWallItemSegment[] {
  const walls = getWallSegments(design.room.floor);
  const segments: PlanWallItemSegment[] = [];
  const push = (id: string, wallIndex: number, from: number, to: number) => {
    const wall = walls[wallIndex];
    if (!wall) return;
    segments.push({
      id,
      start: getPointAlongWall(wall, from),
      end: getPointAlongWall(wall, to),
    });
  };
  if (layers.drapes) {
    for (const run of design.drapeRuns) {
      if (!run.hidden) push(run.id, run.wallIndex, run.startOffset, run.endOffset);
    }
  }
  if (layers.treatments) {
    for (const treatment of design.treatments) {
      if (!treatment.hidden) {
        push(
          treatment.id,
          treatment.anchor.wallIndex,
          treatment.anchor.startOffset,
          treatment.anchor.endOffset
        );
      }
    }
  }
  if (layers.openings) {
    for (const opening of design.openings) {
      if (opening.hidden) continue;
      const safe = clampOpeningToWall(opening, design.room.floor);
      push(opening.id, opening.wallIndex, safe.offset, safe.offset + safe.width);
    }
  }
  return segments;
}

/**
 * Ids of visible objects that cross the room outline or overlap another
 * solid object. Zones, floors and overhead items never count as overlaps.
 */
export function getConflictingObjectIds(
  objects: readonly StudioObject[],
  floor: StudioPoint[]
): Set<string> {
  const conflicts = new Set<string>();
  const solids: Array<{ object: StudioObject; corners: readonly StudioPoint[]; box: PlanRect }> =
    [];
  for (const object of objects) {
    if (object.hidden) continue;
    if (object.type !== "ceiling_drape" && object.type !== "chandelier") {
      if (!isContained(object, floor)) {
        conflicts.add(object.id);
      }
    }
    if (NON_COLLIDING_TYPES.has(object.type)) continue;
    const shape = objectShape(object);
    solids.push({ object, corners: shape.corners, box: shape.box });
  }
  solids.sort((a, b) => a.box.minX - b.box.minX);
  for (let index = 0; index < solids.length; index += 1) {
    const current = solids[index];
    for (let other = index + 1; other < solids.length; other += 1) {
      const candidate = solids[other];
      if (candidate.box.minX >= current.box.maxX) break;
      if (!boxesOverlap(current.box, candidate.box, 0.5)) continue;
      if (convexPolygonsOverlap(current.corners, candidate.corners)) {
        conflicts.add(current.object.id);
        conflicts.add(candidate.object.id);
      }
    }
  }
  return conflicts;
}

/** Resizes one side of an object; the opposite edge stays anchored. */
export function resizeStudioObjectFromEdge(
  object: StudioObject,
  edge: PlanEdgeHandle,
  pointer: StudioPoint,
  options: StudioInteractionOptions = {}
): StudioObject {
  if (!Number.isFinite(pointer.x) || !Number.isFinite(pointer.z)) return object;
  const minimums = STUDIO_OBJECT_MIN_DIMENSIONS[object.type];
  const radians = (object.rotation * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const horizontal = edge === "east" || edge === "west";
  const sign = edge === "east" || edge === "south" ? 1 : -1;
  const half = horizontal ? object.width / 2 : object.depth / 2;
  // Local axis of the edge normal in plan space.
  const axisX = horizontal ? cos : -sin;
  const axisZ = horizontal ? sin : cos;
  const anchorX = object.x - sign * half * axisX;
  const anchorZ = object.z - sign * half * axisZ;
  const along = ((pointer.x - anchorX) * axisX + (pointer.z - anchorZ) * axisZ) * sign;
  const minimum = horizontal ? minimums.width : minimums.depth;
  const size = clampFinite(
    snapStudioValue(along, options),
    minimum,
    STUDIO_MAX_COORDINATE,
    half * 2
  );
  return {
    ...object,
    x: anchorX + sign * (size / 2) * axisX,
    z: anchorZ + sign * (size / 2) * axisZ,
    ...(horizontal ? { width: size } : { depth: size }),
  };
}

/** Constrains a measure/drag vector to 0/45/90° steps. */
export function constrainToOctant(start: StudioPoint, end: StudioPoint): StudioPoint {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const length = Math.hypot(dx, dz);
  if (length === 0) return end;
  const angle = Math.round(Math.atan2(dz, dx) / (Math.PI / 4)) * (Math.PI / 4);
  return { x: start.x + Math.cos(angle) * length, z: start.z + Math.sin(angle) * length };
}

export function normalizeDegrees(degrees: number): number {
  if (!Number.isFinite(degrees)) return 0;
  const value = ((degrees % 360) + 360) % 360;
  return Math.round(value * 100) / 100;
}

/** Clockwise plan angle (0° = up / −z) of `point` around `center`. */
export function angleAround(center: StudioPoint, point: StudioPoint): number {
  return (Math.atan2(point.x - center.x, -(point.z - center.z)) * 180) / Math.PI;
}
