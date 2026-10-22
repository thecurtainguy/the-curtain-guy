import type { StudioPoint } from "@/data/studio";
import type { PlanRect } from "./viewport";

export type SmartGuide = {
  axis: "x" | "z";
  /** Plan coordinate of the guide line (x for vertical, z for horizontal). */
  value: number;
  /** Extent along the other axis. */
  from: number;
  to: number;
  kind: "object" | "room";
};

export type SmartSnapTarget = { box: PlanRect };

export type SmartSnapResult = {
  dx: number;
  dz: number;
  snappedX: boolean;
  snappedZ: boolean;
  guides: SmartGuide[];
};

type Line = { value: number; extent: [number, number]; kind: SmartGuide["kind"] };

function boxLines(box: PlanRect, axis: "x" | "z"): number[] {
  return axis === "x"
    ? [box.minX, (box.minX + box.maxX) / 2, box.maxX]
    : [box.minZ, (box.minZ + box.maxZ) / 2, box.maxZ];
}

function crossExtent(box: PlanRect, axis: "x" | "z"): [number, number] {
  return axis === "x" ? [box.minZ, box.maxZ] : [box.minX, box.maxX];
}

function collectLines(
  axis: "x" | "z",
  targets: readonly SmartSnapTarget[],
  room: { bounds: PlanRect; floor: readonly StudioPoint[] }
): Line[] {
  const lines: Line[] = [];
  for (const target of targets) {
    const extent = crossExtent(target.box, axis);
    for (const value of boxLines(target.box, axis)) {
      lines.push({ value, extent, kind: "object" });
    }
  }
  const roomExtent = crossExtent(room.bounds, axis);
  const seen = new Set<number>();
  for (const point of room.floor) {
    const value = axis === "x" ? point.x : point.z;
    if (seen.has(value)) continue;
    seen.add(value);
    lines.push({ value, extent: roomExtent, kind: "room" });
  }
  const center =
    axis === "x"
      ? (room.bounds.minX + room.bounds.maxX) / 2
      : (room.bounds.minZ + room.bounds.maxZ) / 2;
  lines.push({ value: center, extent: roomExtent, kind: "room" });
  return lines;
}

type SnapLines = {
  room: { bounds: PlanRect; floor: readonly StudioPoint[] };
  linesX: Line[];
  linesZ: Line[];
};

/** Drags reuse one targets array per gesture, so its guide lines are built once. */
const linesCache = new WeakMap<readonly SmartSnapTarget[], SnapLines>();

function snapLines(
  targets: readonly SmartSnapTarget[],
  room: { bounds: PlanRect; floor: readonly StudioPoint[] }
): SnapLines {
  const hit = linesCache.get(targets);
  if (
    hit &&
    hit.room.floor === room.floor &&
    hit.room.bounds.minX === room.bounds.minX &&
    hit.room.bounds.maxX === room.bounds.maxX &&
    hit.room.bounds.minZ === room.bounds.minZ &&
    hit.room.bounds.maxZ === room.bounds.maxZ
  ) {
    return hit;
  }
  const entry = {
    room,
    linesX: collectLines("x", targets, room),
    linesZ: collectLines("z", targets, room),
  };
  linesCache.set(targets, entry);
  return entry;
}

function snapAxis(
  axis: "x" | "z",
  moving: PlanRect,
  lines: readonly Line[],
  threshold: number
): { offset: number; snapped: boolean } {
  let best: { offset: number; distance: number } | null = null;
  for (const movingValue of boxLines(moving, axis)) {
    for (const line of lines) {
      const offset = line.value - movingValue;
      const distance = Math.abs(offset);
      if (distance <= threshold && (!best || distance < best.distance)) {
        best = { offset, distance };
      }
    }
  }
  return best ? { offset: best.offset, snapped: true } : { offset: 0, snapped: false };
}

function guidesForAxis(
  axis: "x" | "z",
  moving: PlanRect,
  lines: readonly Line[]
): SmartGuide[] {
  const guides: SmartGuide[] = [];
  const movingExtent = crossExtent(moving, axis);
  const seen = new Set<string>();
  for (const movingValue of boxLines(moving, axis)) {
    for (const line of lines) {
      if (Math.abs(line.value - movingValue) > 0.01) continue;
      const from = Math.min(movingExtent[0], line.extent[0]);
      const to = Math.max(movingExtent[1], line.extent[1]);
      const key = `${line.kind}:${Math.round(line.value * 100)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      guides.push({ axis, value: line.value, from, to, kind: line.kind });
    }
  }
  return guides;
}

/**
 * Snaps a moving box's edges/centre to nearby object edges/centres, room walls
 * and room centre lines. `dx`/`dz` are the corrections to add to the drag.
 */
export function computeSmartSnap({
  moving,
  targets,
  room,
  threshold,
}: {
  moving: PlanRect;
  targets: readonly SmartSnapTarget[];
  room: { bounds: PlanRect; floor: readonly StudioPoint[] };
  threshold: number;
}): SmartSnapResult {
  const { linesX, linesZ } = snapLines(targets, room);
  const x = snapAxis("x", moving, linesX, threshold);
  const z = snapAxis("z", moving, linesZ, threshold);
  const snappedBox: PlanRect = {
    minX: moving.minX + x.offset,
    maxX: moving.maxX + x.offset,
    minZ: moving.minZ + z.offset,
    maxZ: moving.maxZ + z.offset,
  };
  return {
    dx: x.offset,
    dz: z.offset,
    snappedX: x.snapped,
    snappedZ: z.snapped,
    guides: [
      ...(x.snapped ? guidesForAxis("x", snappedBox, linesX) : []),
      ...(z.snapped ? guidesForAxis("z", snappedBox, linesZ) : []),
    ],
  };
}

export type WallDistance = {
  side: "left" | "right" | "top" | "bottom";
  from: StudioPoint;
  to: StudioPoint;
  distance: number;
};

/** Distances from a box's edge midpoints to the nearest wall along each axis. */
export function getWallDistances(
  box: PlanRect,
  floor: readonly StudioPoint[]
): WallDistance[] {
  const centerX = (box.minX + box.maxX) / 2;
  const centerZ = (box.minZ + box.maxZ) / 2;
  const hitsX: number[] = [];
  const hitsZ: number[] = [];
  for (let index = 0; index < floor.length; index += 1) {
    const a = floor[index];
    const b = floor[(index + 1) % floor.length];
    if (a.z !== b.z && centerZ >= Math.min(a.z, b.z) && centerZ <= Math.max(a.z, b.z)) {
      hitsX.push(a.x + ((centerZ - a.z) / (b.z - a.z)) * (b.x - a.x));
    }
    if (a.x !== b.x && centerX >= Math.min(a.x, b.x) && centerX <= Math.max(a.x, b.x)) {
      hitsZ.push(a.z + ((centerX - a.x) / (b.x - a.x)) * (b.z - a.z));
    }
  }
  const result: WallDistance[] = [];
  const left = Math.max(-Infinity, ...hitsX.filter((x) => x <= box.minX + 0.01));
  const right = Math.min(Infinity, ...hitsX.filter((x) => x >= box.maxX - 0.01));
  const top = Math.max(-Infinity, ...hitsZ.filter((z) => z <= box.minZ + 0.01));
  const bottom = Math.min(Infinity, ...hitsZ.filter((z) => z >= box.maxZ - 0.01));
  if (Number.isFinite(left)) {
    result.push({
      side: "left",
      from: { x: left, z: centerZ },
      to: { x: box.minX, z: centerZ },
      distance: box.minX - left,
    });
  }
  if (Number.isFinite(right)) {
    result.push({
      side: "right",
      from: { x: box.maxX, z: centerZ },
      to: { x: right, z: centerZ },
      distance: right - box.maxX,
    });
  }
  if (Number.isFinite(top)) {
    result.push({
      side: "top",
      from: { x: centerX, z: top },
      to: { x: centerX, z: box.minZ },
      distance: box.minZ - top,
    });
  }
  if (Number.isFinite(bottom)) {
    result.push({
      side: "bottom",
      from: { x: centerX, z: box.maxZ },
      to: { x: centerX, z: bottom },
      distance: bottom - box.maxZ,
    });
  }
  return result.filter((item) => item.distance > 0.5);
}
