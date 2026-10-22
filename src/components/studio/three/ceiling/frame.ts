/**
 * Plan-inch → world-feet conversion for ceiling designs. The scene is centred
 * on the room bounds with the floor at y = 0.
 */
import type { StudioPoint } from "@/data/studio";
import type { StudioBounds } from "@/lib/studio-geometry";

export const SCALE = 1 / 12;

/** World x/z (feet) of a plan point (inches). */
export function ceilingWorldPoint(
  point: StudioPoint,
  bounds: StudioBounds
): { x: number; z: number } {
  return {
    x: (point.x - bounds.centerX) * SCALE,
    z: (point.z - bounds.centerZ) * SCALE,
  };
}

/** World y (feet) of a point `dropIn` inches below a `wallHeightIn` ceiling. */
export function dropToWorldY(wallHeightIn: number, dropIn: number): number {
  return (wallHeightIn - dropIn) * SCALE;
}

/** Fabric that sits flush to the ceiling hangs this far below it (inches) to avoid z-fighting. */
export const CEILING_FLUSH_CLEARANCE_IN = 0.75;
