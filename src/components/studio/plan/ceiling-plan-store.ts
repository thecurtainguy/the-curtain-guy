/**
 * Which surface the 2D plan edits: the floor (objects, walls, wall items) or
 * the reflected ceiling plan (ceiling drape designs). Module-level so the
 * plan chrome, the canvas and anything else can share it without the editor
 * context.
 *
 *   const surface = usePlanSurface(); // "floor" | "ceiling"
 *   setPlanSurface("ceiling");
 */
import { useSyncExternalStore } from "react";

export type PlanSurface = "floor" | "ceiling";

let surface: PlanSurface = "floor";
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getPlanSurface(): PlanSurface {
  return surface;
}

export function setPlanSurface(next: PlanSurface) {
  if (surface === next) return;
  surface = next;
  listeners.forEach((listener) => listener());
}

export function usePlanSurface(): PlanSurface {
  return useSyncExternalStore(subscribe, getPlanSurface, () => "floor" as const);
}
