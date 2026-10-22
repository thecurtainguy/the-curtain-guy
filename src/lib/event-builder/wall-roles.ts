import type { EventWallRole } from "@/data/event-builder/brief";
import type { StudioPoint } from "@/data/studio";
import { getWallSegments, type StudioWallSegment } from "@/lib/studio-geometry";

export type EventWallRoles = Record<EventWallRole, number>;

const ROLE_DIRECTIONS: Record<EventWallRole, StudioPoint> = {
  front: { x: 0, z: -1 },
  back: { x: 0, z: 1 },
  left: { x: -1, z: 0 },
  right: { x: 1, z: 0 },
};

/** A wall must face within ~60° of a role's direction to qualify for it. */
const MIN_FACING = 0.5;

function signedArea(floor: readonly StudioPoint[]): number {
  let total = 0;
  for (let index = 0; index < floor.length; index += 1) {
    const current = floor[index];
    const next = floor[(index + 1) % floor.length];
    total += current.x * next.z - next.x * current.z;
  }
  return total / 2;
}

/** Unit normal pointing out of the room, whichever way the outline winds. */
export function getWallOutwardNormal(
  wall: StudioWallSegment,
  floor: readonly StudioPoint[]
): StudioPoint {
  if (wall.length <= 0) return { x: 0, z: 0 };
  const dx = (wall.end.x - wall.start.x) / wall.length;
  const dz = (wall.end.z - wall.start.z) / wall.length;
  return signedArea(floor) >= 0 ? { x: dz, z: -dx } : { x: -dz, z: dx };
}

/**
 * Maps front/back/left/right to real wall indexes of a floor polygon.
 *
 * Rule: plan "front" is the top of the 2D plan (−z), the same edge the studio
 * layout generators use for the stage, altar and presentation screen. For each
 * role we score every wall by `facing × length`, where facing is how squarely
 * the wall's outward normal points in that role's direction (front −z, back
 * +z, left −x, right +x). The highest score wins, so the longest wall on that
 * side is chosen (e.g. the long top wall of an L-shape, the axis walls rather
 * than the chamfers of an octagon). Walls facing more than ~60° away never
 * qualify; if none do, the best-facing wall is used.
 */
export function computeEventWallRoles(floor: readonly StudioPoint[]): EventWallRoles {
  const walls = getWallSegments(floor as StudioPoint[]);
  const normals = walls.map((wall) => getWallOutwardNormal(wall, floor));

  function pick(role: EventWallRole): number {
    const dir = ROLE_DIRECTIONS[role];
    let best = -1;
    let bestScore = -Infinity;
    let fallback = 0;
    let fallbackFacing = -Infinity;
    walls.forEach((wall, index) => {
      const facing = normals[index].x * dir.x + normals[index].z * dir.z;
      if (facing > fallbackFacing) {
        fallbackFacing = facing;
        fallback = index;
      }
      if (facing < MIN_FACING) return;
      const score = facing * wall.length;
      if (score > bestScore) {
        bestScore = score;
        best = index;
      }
    });
    return best >= 0 ? best : fallback;
  }

  return {
    front: pick("front"),
    back: pick("back"),
    left: pick("left"),
    right: pick("right"),
  };
}

/** Role label for a wall index, or null when it plays no named role. */
export function getWallRoleForIndex(
  roles: EventWallRoles,
  wallIndex: number
): EventWallRole | null {
  const entry = (Object.entries(roles) as Array<[EventWallRole, number]>).find(
    ([, index]) => index === wallIndex
  );
  return entry ? entry[0] : null;
}
