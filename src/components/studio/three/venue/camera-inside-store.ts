import type { StudioPoint } from "@/data/studio";
import { useSyncExternalStore } from "react";
import { distanceToOutline, pointInPolygon } from "./polygon";

/** Hysteresis band (inches) around the floor outline and the wall top. */
const ENTER_MARGIN_IN = 6;
const EXIT_MARGIN_IN = 8;

let inside = false;
const listeners = new Set<() => void>();

/** True while the 3D camera stands inside the room footprint below the walls. */
export function getCameraInsideRoom(): boolean {
  return inside;
}

/** Returns true when the value changed (callers should `invalidate()`). */
export function setCameraInsideRoom(next: boolean): boolean {
  if (next === inside) return false;
  inside = next;
  listeners.forEach((listener) => listener());
  return true;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Live "camera is inside the room" flag, maintained by `StudioVenue` each
 * frame with hysteresis. Inside: walls render full height and the ceiling is
 * on; outside: dollhouse behaviour (cutaway / low / ceiling hidden).
 */
export function useCameraInsideRoom(): boolean {
  return useSyncExternalStore(subscribe, getCameraInsideRoom, () => false);
}

/**
 * Next inside/outside state for a camera at design-space inches (x, y, z).
 * Entering needs a clear margin; leaving needs to cross a wider one so the
 * state never flickers when the camera hugs a wall or the ceiling plane.
 */
export function nextCameraInside(
  wasInside: boolean,
  floor: StudioPoint[],
  wallHeightIn: number,
  x: number,
  y: number,
  z: number
): boolean {
  if (floor.length < 3) return false;
  const within = pointInPolygon(floor, x, z);
  const distance = distanceToOutline(floor, x, z);
  if (wasInside) {
    return y < wallHeightIn + EXIT_MARGIN_IN && (within || distance < EXIT_MARGIN_IN);
  }
  return within && distance > ENTER_MARGIN_IN && y < wallHeightIn - ENTER_MARGIN_IN;
}
