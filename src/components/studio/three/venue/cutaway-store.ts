import { useSyncExternalStore } from "react";

/** Wall heights (inches) used when walls are cut down for visibility. */
export const LOW_WALL_HEIGHT_IN = 36;
export const CUTAWAY_WALL_HEIGHT_IN = 24;

const EMPTY: readonly number[] = [];
let current: readonly number[] = EMPTY;
const listeners = new Set<() => void>();

/** Indices of walls currently dropped by the dollhouse cutaway (sorted). */
export function getCutawayWalls(): readonly number[] {
  return current;
}

export function setCutawayWalls(next: readonly number[]) {
  if (
    next.length === current.length &&
    next.every((value, index) => value === current[index])
  ) {
    return;
  }
  current = next.length ? next : EMPTY;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Live list of cut-down wall indices while `view.wallDisplay === "cutaway"`
 * (empty otherwise). Wall-mounted items can use it to hide/shorten.
 */
export function useCutawayWalls(): readonly number[] {
  return useSyncExternalStore(subscribe, getCutawayWalls, () => EMPTY);
}
