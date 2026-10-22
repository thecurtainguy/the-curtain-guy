import { useCallback, useSyncExternalStore } from "react";

/**
 * Hovered item id, kept outside React context so hovering in 2D/3D only
 * re-renders the components that actually show hover (not the whole studio).
 */
let hoveredId: string | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getStudioHoveredId() {
  return hoveredId;
}

export function setStudioHoveredId(id: string | null) {
  if (id === hoveredId) return;
  hoveredId = id;
  for (const listener of listeners) listener();
}

/** Re-renders on every hover change; prefer `useIsStudioHovered` per item. */
export function useStudioHoveredId() {
  return useSyncExternalStore(subscribe, getStudioHoveredId, () => null);
}

/** Re-renders only when this item's hovered state flips. */
export function useIsStudioHovered(id: string | null | undefined) {
  const getSnapshot = useCallback(() => id != null && hoveredId === id, [id]);
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
