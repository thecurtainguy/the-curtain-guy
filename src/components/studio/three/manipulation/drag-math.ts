import type {
  StudioDesignJson,
  StudioDrapeRun,
  StudioObject,
  StudioOpening,
  StudioPoint,
  StudioTreatment,
} from "@/data/studio";
import {
  clampDrapeRunToWall,
  clampOpeningToWall,
  clampTreatmentToWall,
  getPolygonCentroid,
  type StudioBounds,
  type StudioWallSegment,
} from "@/lib/studio-geometry";
import {
  getStudioObjectCorners,
  isStudioPointInRoom,
} from "@/lib/studio-interactions";
import * as THREE from "three";

export const SCALE = 1 / 12;
export const GOLD = "#e8bd55";
export const GOLD_BRIGHT = "#ffe09a";
/** Inches within which smart guides magnetise edges and centers. */
export const SMART_SNAP_THRESHOLD = 6;
/** Inches within which a wall item dragged over the floor jumps to a wall. */
export const WALL_TRANSFER_DISTANCE = 24;
export const MIN_WALL_SPAN = 12;
export const CIRCULAR_OBJECT_TYPES = new Set([
  "round_table",
  "cocktail_table",
  "cake_table",
]);

export type WallItemKind = "drape" | "treatment" | "opening";
export type WallItem = StudioDrapeRun | StudioTreatment | StudioOpening;

export type WallSpan = { wallIndex: number; start: number; end: number };

export type FloorRect = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

export type GuideLine = { from: StudioPoint; to: StudioPoint };

export function toWorld(
  bounds: StudioBounds,
  point: StudioPoint
): [number, number] {
  return [(point.x - bounds.centerX) * SCALE, (point.z - bounds.centerZ) * SCALE];
}

export function fromWorld(
  bounds: StudioBounds,
  worldX: number,
  worldZ: number
): StudioPoint {
  return { x: worldX / SCALE + bounds.centerX, z: worldZ / SCALE + bounds.centerZ };
}

const scratchPlane = new THREE.Plane();
const scratchNormal = new THREE.Vector3();
const scratchPoint = new THREE.Vector3();

/** Ray hit on the horizontal plane y = `height` (feet), in front of the camera. */
export function intersectHorizontal(
  ray: THREE.Ray,
  height: number
): THREE.Vector3 | null {
  if (Math.abs(ray.direction.y) < 1e-5) return null;
  scratchPlane.set(scratchNormal.set(0, 1, 0), -height);
  const hit = ray.intersectPlane(scratchPlane, new THREE.Vector3());
  if (!hit) return null;
  // Guard against near-horizontal rays shooting the hit to the horizon.
  if (hit.distanceTo(ray.origin) > 2000) return null;
  return hit;
}

/** Ray hit on a vertical plane through `point` with horizontal `normal`. */
export function intersectVertical(
  ray: THREE.Ray,
  point: THREE.Vector3,
  normal: THREE.Vector3
): THREE.Vector3 | null {
  if (Math.abs(ray.direction.dot(normal)) < 0.08) return null;
  scratchPlane.setFromNormalAndCoplanarPoint(normal, point);
  const hit = ray.intersectPlane(scratchPlane, new THREE.Vector3());
  if (!hit || hit.distanceTo(ray.origin) > 2000) return null;
  return hit;
}

export function snapTo(value: number, step: number): number {
  if (!Number.isFinite(value) || step <= 0) return value;
  return Math.round(value / step) * step;
}

export function clamp(value: number, min: number, max: number): number {
  if (max < min) return (min + max) / 2;
  return Math.min(max, Math.max(min, value));
}

/** Wraps an angle delta (radians) into (-PI, PI]. */
export function wrapAngle(radians: number): number {
  let value = radians;
  while (value <= -Math.PI) value += Math.PI * 2;
  while (value > Math.PI) value -= Math.PI * 2;
  return value;
}

export function formatDegrees(degrees: number): string {
  const rounded = Math.round(degrees * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}°`;
}

/* ------------------------------------------------------------------ */
/* Objects                                                             */
/* ------------------------------------------------------------------ */

export function getObjectRect(object: StudioObject): FloorRect {
  const corners = getStudioObjectCorners(object);
  return {
    minX: Math.min(...corners.map((corner) => corner.x)),
    maxX: Math.max(...corners.map((corner) => corner.x)),
    minZ: Math.min(...corners.map((corner) => corner.z)),
    maxZ: Math.max(...corners.map((corner) => corner.z)),
  };
}

export function unionRects(rects: FloorRect[]): FloorRect | null {
  if (rects.length === 0) return null;
  return rects.reduce((acc, rect) => ({
    minX: Math.min(acc.minX, rect.minX),
    maxX: Math.max(acc.maxX, rect.maxX),
    minZ: Math.min(acc.minZ, rect.minZ),
    maxZ: Math.max(acc.maxZ, rect.maxZ),
  }));
}

export function hasElevationHandle(object: StudioObject): boolean {
  if (object.type === "ceiling_drape") return false;
  return object.type === "chandelier" || typeof object.elevation === "number";
}

/** Bottom / top of an object in inches above the floor. */
export function getObjectVerticalExtent(
  object: StudioObject,
  wallHeight: number
): { bottom: number; top: number } {
  const height = Math.max(1, object.height);
  if (object.type === "ceiling_drape") {
    // Mirrors CeilingDrapeModel: hangs from the ceiling, drop clamped.
    const drop = clamp(height, 3.6, Math.max(3.6, wallHeight - 12));
    return { bottom: Math.max(0, wallHeight - drop), top: wallHeight };
  }
  const fallback = object.type === "chandelier" ? 96 : 0;
  const bottom =
    typeof object.elevation === "number" ? object.elevation : fallback;
  return { bottom, top: bottom + height };
}

/**
 * Translates `delta` (inches) so every centre stays inside the room
 * polygon, sliding along the violated edges. `null` = no valid slide found.
 */
export function containCentersInPolygon(
  centers: StudioPoint[],
  delta: StudioPoint,
  floor: StudioPoint[]
): StudioPoint | null {
  if (floor.length < 3 || centers.length === 0) return delta;
  const next = { ...delta };
  for (let iteration = 0; iteration < 8; iteration += 1) {
    let worst: { from: StudioPoint; to: StudioPoint; distance: number } | null =
      null;
    for (const center of centers) {
      const point = { x: center.x + next.x, z: center.z + next.z };
      if (isStudioPointInRoom(point, floor)) continue;
      const nearest = nearestPointOnPolygon(point, floor);
      const distance = Math.hypot(nearest.x - point.x, nearest.z - point.z);
      if (!worst || distance > worst.distance) {
        worst = { from: point, to: nearest, distance };
      }
    }
    if (!worst) return next;
    const scale = worst.distance > 1e-6 ? 0.5 / worst.distance : 0;
    next.x += worst.to.x - worst.from.x + (worst.to.x - worst.from.x) * scale;
    next.z += worst.to.z - worst.from.z + (worst.to.z - worst.from.z) * scale;
  }
  return containByAxes(centers, delta, floor);
}

/** Fallback when edge projections fight (group straddling a notch). */
function containByAxes(
  centers: StudioPoint[],
  delta: StudioPoint,
  floor: StudioPoint[]
): StudioPoint | null {
  const valid = (x: number, z: number) =>
    centers.every((center) =>
      isStudioPointInRoom({ x: center.x + x, z: center.z + z }, floor)
    );
  if (!valid(0, 0)) return null;
  const furthest = (from: StudioPoint, step: StudioPoint) => {
    if (valid(from.x + step.x, from.z + step.z)) return 1;
    let low = 0;
    let high = 1;
    for (let index = 0; index < 14; index += 1) {
      const mid = (low + high) / 2;
      if (valid(from.x + step.x * mid, from.z + step.z * mid)) low = mid;
      else high = mid;
    }
    return low;
  };
  const along = furthest({ x: 0, z: 0 }, delta);
  const result = { x: delta.x * along, z: delta.z * along };
  const restX = { x: delta.x - result.x, z: 0 };
  result.x += restX.x * furthest(result, restX);
  const restZ = { x: 0, z: delta.z - result.z };
  result.z += restZ.z * furthest(result, restZ);
  return result;
}

function nearestPointOnPolygon(
  point: StudioPoint,
  floor: StudioPoint[]
): StudioPoint {
  let best = floor[0];
  let bestDistance = Infinity;
  for (let index = 0; index < floor.length; index += 1) {
    const start = floor[index];
    const end = floor[(index + 1) % floor.length];
    const ex = end.x - start.x;
    const ez = end.z - start.z;
    const lengthSquared = ex * ex + ez * ez;
    const t =
      lengthSquared > 0
        ? clamp(((point.x - start.x) * ex + (point.z - start.z) * ez) / lengthSquared, 0, 1)
        : 0;
    const candidate = { x: start.x + ex * t, z: start.z + ez * t };
    const distance = Math.hypot(candidate.x - point.x, candidate.z - point.z);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = candidate;
    }
  }
  return best;
}

type SnapCandidate = { offset: number; target: number; spanMin: number; spanMax: number };

function bestAxisSnap(
  values: number[],
  targets: Array<{ value: number; spanMin: number; spanMax: number }>,
  threshold: number
): SnapCandidate | null {
  let best: SnapCandidate | null = null;
  for (const value of values) {
    for (const target of targets) {
      const offset = target.value - value;
      if (Math.abs(offset) > threshold) continue;
      if (!best || Math.abs(offset) < Math.abs(best.offset)) {
        best = {
          offset,
          target: target.value,
          spanMin: target.spanMin,
          spanMax: target.spanMax,
        };
      }
    }
  }
  return best;
}

/**
 * Magnetises a moving rect's edges/centre to other rects and axis-aligned
 * walls. Returns per-axis corrections (null = no snap) and guide lines.
 */
export function computeSmartSnap(
  moving: FloorRect,
  others: FloorRect[],
  walls: StudioWallSegment[],
  threshold = SMART_SNAP_THRESHOLD
): { dx: number | null; dz: number | null; guides: GuideLine[] } {
  const xTargets: Array<{ value: number; spanMin: number; spanMax: number }> = [];
  const zTargets: Array<{ value: number; spanMin: number; spanMax: number }> = [];
  for (const rect of others) {
    const cx = (rect.minX + rect.maxX) / 2;
    const cz = (rect.minZ + rect.maxZ) / 2;
    for (const value of [rect.minX, cx, rect.maxX]) {
      xTargets.push({ value, spanMin: rect.minZ, spanMax: rect.maxZ });
    }
    for (const value of [rect.minZ, cz, rect.maxZ]) {
      zTargets.push({ value, spanMin: rect.minX, spanMax: rect.maxX });
    }
  }
  for (const wall of walls) {
    if (Math.abs(wall.start.x - wall.end.x) < 0.5) {
      xTargets.push({
        value: wall.start.x,
        spanMin: Math.min(wall.start.z, wall.end.z),
        spanMax: Math.max(wall.start.z, wall.end.z),
      });
    } else if (Math.abs(wall.start.z - wall.end.z) < 0.5) {
      zTargets.push({
        value: wall.start.z,
        spanMin: Math.min(wall.start.x, wall.end.x),
        spanMax: Math.max(wall.start.x, wall.end.x),
      });
    }
  }
  const movingCx = (moving.minX + moving.maxX) / 2;
  const movingCz = (moving.minZ + moving.maxZ) / 2;
  const snapX = bestAxisSnap(
    [moving.minX, movingCx, moving.maxX],
    xTargets,
    threshold
  );
  const snapZ = bestAxisSnap(
    [moving.minZ, movingCz, moving.maxZ],
    zTargets,
    threshold
  );
  const guides: GuideLine[] = [];
  const dz = snapZ?.offset ?? 0;
  const dx = snapX?.offset ?? 0;
  if (snapX) {
    guides.push({
      from: { x: snapX.target, z: Math.min(snapX.spanMin, moving.minZ + dz) },
      to: { x: snapX.target, z: Math.max(snapX.spanMax, moving.maxZ + dz) },
    });
  }
  if (snapZ) {
    guides.push({
      from: { x: Math.min(snapZ.spanMin, moving.minX + dx), z: snapZ.target },
      to: { x: Math.max(snapZ.spanMax, moving.maxX + dx), z: snapZ.target },
    });
  }
  return { dx: snapX?.offset ?? null, dz: snapZ?.offset ?? null, guides };
}

/* ------------------------------------------------------------------ */
/* Walls & wall items                                                  */
/* ------------------------------------------------------------------ */

export type WallFrame = StudioWallSegment & {
  /** Unit wall direction (start → end) in plan. */
  dir: StudioPoint;
  /** Unit inward normal in plan. */
  normal: StudioPoint;
};

export function getWallFrames(
  floor: StudioPoint[],
  walls: StudioWallSegment[]
): WallFrame[] {
  const centroid = getPolygonCentroid(floor);
  return walls.map((wall) => {
    const length = Math.max(1e-6, wall.length);
    const dir = {
      x: (wall.end.x - wall.start.x) / length,
      z: (wall.end.z - wall.start.z) / length,
    };
    // Three's local +Z after rotation.y = -angle.
    let normal = { x: -dir.z, z: dir.x };
    const probe = {
      x: wall.center.x + normal.x * 6,
      z: wall.center.z + normal.z * 6,
    };
    const inside = isStudioPointInRoom(probe, floor);
    const flippedProbe = {
      x: wall.center.x - normal.x * 6,
      z: wall.center.z - normal.z * 6,
    };
    const flippedInside = isStudioPointInRoom(flippedProbe, floor);
    if (!inside && flippedInside) {
      normal = { x: -normal.x, z: -normal.z };
    } else if (inside === flippedInside) {
      const toCentroid = {
        x: centroid.x - wall.center.x,
        z: centroid.z - wall.center.z,
      };
      if (toCentroid.x * normal.x + toCentroid.z * normal.z < 0) {
        normal = { x: -normal.x, z: -normal.z };
      }
    }
    return { ...wall, dir, normal };
  });
}

export function projectOntoWall(wall: WallFrame, point: StudioPoint): number {
  return (point.x - wall.start.x) * wall.dir.x + (point.z - wall.start.z) * wall.dir.z;
}

export function distanceToWall(wall: WallFrame, point: StudioPoint): number {
  const along = clamp(projectOntoWall(wall, point), 0, wall.length);
  const px = wall.start.x + wall.dir.x * along;
  const pz = wall.start.z + wall.dir.z * along;
  return Math.hypot(point.x - px, point.z - pz);
}

export function getWallItemSpan(kind: WallItemKind, item: WallItem): WallSpan {
  if (kind === "drape") {
    const run = item as StudioDrapeRun;
    return { wallIndex: run.wallIndex, start: run.startOffset, end: run.endOffset };
  }
  if (kind === "treatment") {
    const treatment = item as StudioTreatment;
    return {
      wallIndex: treatment.anchor.wallIndex,
      start: treatment.anchor.startOffset,
      end: treatment.anchor.endOffset,
    };
  }
  const opening = item as StudioOpening;
  return {
    wallIndex: opening.wallIndex,
    start: opening.offset,
    end: opening.offset + opening.width,
  };
}

export function getWallItemVertical(
  kind: WallItemKind,
  item: WallItem
): { bottom: number; top: number } {
  if (kind === "opening") {
    const opening = item as StudioOpening;
    if (opening.type === "window") {
      const bottom = opening.sillHeight ?? 36;
      return { bottom, top: bottom + (opening.openingHeight ?? 60) };
    }
    const bottom = opening.sillHeight ?? 0;
    return { bottom, top: bottom + (opening.openingHeight ?? 84) };
  }
  return { bottom: 0, top: Math.max(12, (item as StudioDrapeRun).height) };
}

export function getWallItems(
  design: StudioDesignJson,
  kind: WallItemKind
): WallItem[] {
  if (kind === "drape") return design.drapeRuns;
  if (kind === "treatment") return design.treatments;
  return design.openings;
}

/** Writes a new wall/span to a wall item, clamped to its wall. */
export function applyWallItemSpan(
  design: StudioDesignJson,
  kind: WallItemKind,
  id: string,
  span: WallSpan
): StudioDesignJson {
  const floor = design.room.floor;
  if (kind === "drape") {
    return {
      ...design,
      drapeRuns: design.drapeRuns.map((run) =>
        run.id === id
          ? clampDrapeRunToWall(
              {
                ...run,
                wallIndex: span.wallIndex,
                startOffset: span.start,
                endOffset: span.end,
              },
              floor
            )
          : run
      ),
    };
  }
  if (kind === "treatment") {
    return {
      ...design,
      treatments: design.treatments.map((treatment) =>
        treatment.id === id
          ? clampTreatmentToWall(
              {
                ...treatment,
                anchor: {
                  ...treatment.anchor,
                  wallIndex: span.wallIndex,
                  startOffset: span.start,
                  endOffset: span.end,
                },
              },
              floor
            )
          : treatment
      ),
    };
  }
  return {
    ...design,
    openings: design.openings.map((opening) =>
      opening.id === id
        ? clampOpeningToWall(
            {
              ...opening,
              wallIndex: span.wallIndex,
              offset: span.start,
              width: span.end - span.start,
            },
            floor
          )
        : opening
    ),
  };
}

/** Horizontal Three.js vector for a plan direction. */
export function planVector(point: StudioPoint): THREE.Vector3 {
  return new THREE.Vector3(point.x, 0, point.z);
}

/**
 * Offset along `wall` under the pointer: vertical wall-plane hit when the
 * view allows it, otherwise the floor hit projected onto the wall line.
 */
export function pointerAlongWall(
  ray: THREE.Ray,
  wall: WallFrame,
  bounds: StudioBounds
): number | null {
  const [wx, wz] = toWorld(bounds, wall.start);
  scratchPoint.set(wx, 0, wz);
  const hit = intersectVertical(ray, scratchPoint, planVector(wall.normal));
  if (hit) return projectOntoWall(wall, fromWorld(bounds, hit.x, hit.z));
  const floorHit = intersectHorizontal(ray, 0);
  if (!floorHit) return null;
  return projectOntoWall(wall, fromWorld(bounds, floorHit.x, floorHit.z));
}

/**
 * Which wall the pointer is aiming at: the nearest visible interior wall
 * face under the ray, else the wall closest to the floor hit (within
 * WALL_TRANSFER_DISTANCE). `null` = stay on the current wall.
 */
export function resolvePointerWall(
  ray: THREE.Ray,
  walls: WallFrame[],
  bounds: StudioBounds,
  wallHeight: number
): { wallIndex: number; along: number } | null {
  let best: { wallIndex: number; along: number; distance: number } | null = null;
  const topFeet = wallHeight * SCALE + 3;
  for (const wall of walls) {
    const normal = planVector(wall.normal);
    // Only interior faces looking back at the camera.
    if (ray.direction.dot(normal) >= -0.05) continue;
    const [wx, wz] = toWorld(bounds, wall.start);
    scratchPoint.set(wx, 0, wz);
    const hit = intersectVertical(ray, scratchPoint, normal);
    if (!hit || hit.y < -0.5 || hit.y > topFeet) continue;
    const along = projectOntoWall(wall, fromWorld(bounds, hit.x, hit.z));
    if (along < -12 || along > wall.length + 12) continue;
    const distance = hit.distanceTo(ray.origin);
    if (!best || distance < best.distance) {
      best = { wallIndex: wall.index, along, distance };
    }
  }
  if (best) return { wallIndex: best.wallIndex, along: best.along };

  const floorHit = intersectHorizontal(ray, 0);
  if (!floorHit) return null;
  const point = fromWorld(bounds, floorHit.x, floorHit.z);
  let nearest: { wall: WallFrame; distance: number } | null = null;
  for (const wall of walls) {
    const distance = distanceToWall(wall, point);
    if (!nearest || distance < nearest.distance) nearest = { wall, distance };
  }
  if (!nearest || nearest.distance > WALL_TRANSFER_DISTANCE) return null;
  return {
    wallIndex: nearest.wall.index,
    along: projectOntoWall(nearest.wall, point),
  };
}

/**
 * Magnetises a sliding span's start so it butts against / aligns with
 * neighbouring items on the same wall, the wall ends, or the wall centre.
 */
export function magnetWallStart(
  rawStart: number,
  length: number,
  wallLength: number,
  neighbours: Array<{ start: number; end: number }>,
  threshold = SMART_SNAP_THRESHOLD
): { start: number; snapped: boolean } {
  const candidates = [0, wallLength - length, wallLength / 2 - length / 2];
  for (const neighbour of neighbours) {
    candidates.push(
      neighbour.end,
      neighbour.start - length,
      neighbour.start,
      neighbour.end - length
    );
  }
  let best: number | null = null;
  for (const candidate of candidates) {
    const distance = Math.abs(candidate - rawStart);
    if (distance > threshold) continue;
    if (best === null || distance < Math.abs(best - rawStart)) best = candidate;
  }
  return best === null
    ? { start: rawStart, snapped: false }
    : { start: best, snapped: true };
}

/** Plan points for a span along a wall, pushed `inset` inches into the room. */
export function wallSpanPoints(
  wall: WallFrame,
  start: number,
  end: number,
  inset: number
): [StudioPoint, StudioPoint] {
  const ox = wall.normal.x * inset;
  const oz = wall.normal.z * inset;
  return [
    { x: wall.start.x + wall.dir.x * start + ox, z: wall.start.z + wall.dir.z * start + oz },
    { x: wall.start.x + wall.dir.x * end + ox, z: wall.start.z + wall.dir.z * end + oz },
  ];
}
