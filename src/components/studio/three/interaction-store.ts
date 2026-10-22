import { useSyncExternalStore } from "react";

/**
 * True while the user is orbiting, walking, tweening the camera or dragging in
 * 3D. Expensive passes (AO, reflections, twinkle) pause and refine on settle.
 * Sources register independently so overlapping interactions don't clobber.
 */
const active = new Set<string>();
const listeners = new Set<() => void>();
let interacting = false;

function emit() {
  const next = active.size > 0;
  if (next === interacting) return;
  interacting = next;
  for (const listener of listeners) listener();
}

export function subscribeStudioInteraction(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function isStudioInteracting() {
  return interacting;
}

/** `source` e.g. "orbit", "tween", "drag", "walk". */
export function setStudioInteraction(source: string, on: boolean) {
  if (on) active.add(source);
  else active.delete(source);
  emit();
}

export function useStudioInteracting() {
  return useSyncExternalStore(subscribeStudioInteraction, isStudioInteracting, () => false);
}
