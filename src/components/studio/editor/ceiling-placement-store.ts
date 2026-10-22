/**
 * "Place on the ceiling" mode shared by the library, the 2D plan and the 3D
 * viewer. The library arms a style (or preset); the next click on the
 * ceiling in 3D, or inside the room in 2D, creates the design there.
 *
 *   armCeilingPlacement({ style: "starburst", label: "Ballroom starburst", overrides });
 *   const armed = useCeilingPlacement(); // null when idle
 *   disarmCeilingPlacement();
 *
 * Consumers that complete a placement call `disarmCeilingPlacement()` after
 * committing. Esc should disarm.
 */
import type { CeilingDrapeStyle, StudioCeilingDrape } from "@/data/studio";
import { useSyncExternalStore } from "react";

export type CeilingPlacementRequest = {
  style: CeilingDrapeStyle;
  /** Shown in the canvas hint, e.g. "Click the ceiling to place Ballroom starburst". */
  label: string;
  /** Applied on top of `createCeilingDrape(style, floor)` defaults. */
  overrides?: Partial<Omit<StudioCeilingDrape, "id" | "type">>;
};

let armed: CeilingPlacementRequest | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function armCeilingPlacement(request: CeilingPlacementRequest) {
  armed = request;
  emit();
}

export function disarmCeilingPlacement() {
  if (!armed) return;
  armed = null;
  emit();
}

export function getCeilingPlacement(): CeilingPlacementRequest | null {
  return armed;
}

export function useCeilingPlacement(): CeilingPlacementRequest | null {
  return useSyncExternalStore(subscribe, getCeilingPlacement, () => null);
}
