import type { StudioDesignJson, StudioObjectType } from "@/data/studio";
import { getPolygonCentroid, getStudioBounds } from "@/lib/studio-geometry";
import { isStudioPointInRoom } from "@/lib/studio-interactions";

/** Drag payload read by the 2D plan drop handler. */
export const STUDIO_OBJECT_DRAG_MIME = "application/x-studio-object";

export function startStudioObjectDrag(
  event: React.DragEvent,
  type: StudioObjectType
) {
  event.dataTransfer.setData(STUDIO_OBJECT_DRAG_MIME, type);
  event.dataTransfer.setData("text/plain", type);
  event.dataTransfer.effectAllowed = "copy";
}

type Rect = { minX: number; maxX: number; minZ: number; maxZ: number };

function objectRect(object: {
  x: number;
  z: number;
  width: number;
  depth: number;
  rotation: number;
}): Rect {
  const radians = (object.rotation * Math.PI) / 180;
  const cos = Math.abs(Math.cos(radians));
  const sin = Math.abs(Math.sin(radians));
  const halfX = (object.width * cos + object.depth * sin) / 2;
  const halfZ = (object.width * sin + object.depth * cos) / 2;
  return {
    minX: object.x - halfX,
    maxX: object.x + halfX,
    minZ: object.z - halfZ,
    maxZ: object.z + halfZ,
  };
}

function overlaps(a: Rect, b: Rect, gap: number) {
  return (
    a.minX < b.maxX + gap &&
    a.maxX > b.minX - gap &&
    a.minZ < b.maxZ + gap &&
    a.maxZ > b.minZ - gap
  );
}

export function footprintInsideRoom(
  floor: StudioDesignJson["room"]["floor"],
  x: number,
  z: number,
  halfX: number,
  halfZ: number
) {
  return [
    { x, z },
    { x: x - halfX, z: z - halfZ },
    { x: x + halfX, z: z - halfZ },
    { x: x + halfX, z: z + halfZ },
    { x: x - halfX, z: z + halfZ },
  ].every((point) => isStudioPointInRoom(point, floor));
}

/**
 * Finds an open spot near the room centre for a new footprint, spiralling
 * outward so repeated adds never stack on the same point.
 */
export function findFreeStudioSpot(
  design: StudioDesignJson,
  width: number,
  depth: number
): { x: number; z: number } {
  const floor = design.room.floor;
  const bounds = getStudioBounds(floor);
  const centroid = getPolygonCentroid(floor);
  const start = isStudioPointInRoom(centroid, floor)
    ? centroid
    : { x: bounds.centerX, z: bounds.centerZ };
  const occupied = design.objects
    .filter((object) => !object.hidden && object.type !== "ceiling_drape")
    .map(objectRect);
  const halfX = width / 2;
  const halfZ = depth / 2;
  const step = Math.max(24, Math.min(Math.max(width, depth) + 12, 96));
  const rings = Math.ceil(
    Math.max(bounds.width, bounds.depth) / step / 2 + 1
  );

  for (let ring = 0; ring <= rings; ring += 1) {
    const candidates: Array<{ x: number; z: number }> = [];
    if (ring === 0) {
      candidates.push(start);
    } else {
      for (let dx = -ring; dx <= ring; dx += 1) {
        for (let dz = -ring; dz <= ring; dz += 1) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== ring) continue;
          candidates.push({ x: start.x + dx * step, z: start.z + dz * step });
        }
      }
      candidates.sort(
        (a, b) =>
          Math.hypot(a.x - start.x, a.z - start.z) -
          Math.hypot(b.x - start.x, b.z - start.z)
      );
    }
    for (const candidate of candidates) {
      if (!footprintInsideRoom(floor, candidate.x, candidate.z, halfX, halfZ)) {
        continue;
      }
      const rect = {
        minX: candidate.x - halfX,
        maxX: candidate.x + halfX,
        minZ: candidate.z - halfZ,
        maxZ: candidate.z + halfZ,
      };
      if (occupied.some((other) => overlaps(rect, other, 6))) continue;
      return { x: Math.round(candidate.x), z: Math.round(candidate.z) };
    }
  }

  const nudge = (design.objects.length % 8) * 24;
  return {
    x: Math.round(start.x + nudge),
    z: Math.round(start.z + nudge),
  };
}

export function formatStudioFeet(inches: number): string {
  const feet = inches / 12;
  const rounded = Math.round(feet * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}′`;
}

export function formatStudioFootprint(width: number, depth: number): string {
  return `${formatStudioFeet(width)} × ${formatStudioFeet(depth)}`;
}
