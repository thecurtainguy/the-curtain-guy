import type { StudioDesignJson } from "@/data/studio";
import { findStudioItem } from "@/lib/studio-commands";
import { getStudioHoveredId } from "../editor/hover-store";
import type { StudioSelection } from "../studio-types";

export type StudioContextSurface = "2d" | "3d";

export type StudioContextRequest = {
  /** Viewport pixels. */
  x: number;
  y: number;
  /** What was under the pointer; `null` = empty canvas. */
  target: StudioSelection;
  surface: StudioContextSurface;
  /** Ids of every item under the pointer, topmost / nearest first. */
  stack: readonly string[];
};

type Host = (request: StudioContextRequest) => void;

type Press = { x: number; y: number; time: number; held: boolean; touch: boolean };

/** Pixels a right press may travel and still count as a click (not an orbit/pan). */
const DRAG_TOLERANCE = 6;
/** A `contextmenu` this long after the last press came from the keyboard. */
const PRESS_WINDOW_MS = 1500;

let host: Host | null = null;
let lastEvent: Event | null = null;
let press: Press | null = null;
let pending: StudioContextRequest | null = null;
let tracking = false;

function isSecondaryPress(event: PointerEvent): boolean {
  // macOS Ctrl-click raises `contextmenu` like a right click.
  return event.button === 2 || (event.button === 0 && event.ctrlKey);
}

function isStill(from: Press, x: number, y: number): boolean {
  return Math.hypot(x - from.x, y - from.y) <= DRAG_TOLERANCE;
}

function trackPointers() {
  if (tracking || typeof window === "undefined") return;
  tracking = true;
  window.addEventListener(
    "pointerdown",
    (event) => {
      pending = null;
      const touch = event.pointerType === "touch";
      press =
        touch || isSecondaryPress(event)
          ? { x: event.clientX, y: event.clientY, time: performance.now(), held: true, touch }
          : null;
    },
    true
  );
  window.addEventListener(
    "pointerup",
    (event) => {
      if (!press) return;
      press.held = false;
      const request = pending;
      pending = null;
      // macOS / Linux fire `contextmenu` on press: open on a still release.
      if (request) {
        const still = isStill(press, event.clientX, event.clientY);
        press = null;
        if (still) host?.(request);
      }
    },
    true
  );
}

/** The item under the pointer, from the shared hover store. */
export function hoveredStudioTarget(design: StudioDesignJson): StudioSelection {
  const id = getStudioHoveredId();
  const found = id ? findStudioItem(design, id) : null;
  return found && id ? ({ kind: found.kind, id } as StudioSelection) : null;
}

/** Plan items under a viewport point (`data-studio-item` hit areas), topmost first. */
export function planItemsAt(x: number, y: number): string[] {
  const ids: string[] = [];
  for (const element of document.elementsFromPoint(x, y)) {
    const id = element.closest<SVGElement>("[data-studio-item]")?.dataset.studioItem;
    if (id && !ids.includes(id)) ids.push(id);
  }
  return ids;
}

/** The menu component registers itself; returns the unregister function. */
export function registerStudioContextMenuHost(next: Host): () => void {
  trackPointers();
  host = next;
  return () => {
    if (host === next) host = null;
  };
}

/**
 * Call from a `contextmenu` handler. The first caller for a native event wins,
 * so a 3D mesh handler takes precedence over the canvas fallback. Right-drags
 * (camera orbit / pan) and touch long-presses never open the menu.
 */
export function requestStudioContextMenu(
  event: MouseEvent,
  target: StudioSelection,
  surface: StudioContextSurface,
  stack: readonly string[] = []
): void {
  if (!host || event === lastEvent) return;
  lastEvent = event;
  event.preventDefault();
  if (typeof document !== "undefined" && document.pointerLockElement) return;

  const recent =
    press && performance.now() - press.time < PRESS_WINDOW_MS ? press : null;
  if (recent?.touch) return;

  let x = event.clientX;
  let y = event.clientY;
  if (!recent && event.target instanceof Element && x === 0 && y === 0) {
    const rect = event.target.getBoundingClientRect();
    x = rect.left + rect.width / 2;
    y = rect.top + rect.height / 2;
  }
  const request: StudioContextRequest = { x, y, target, surface, stack };

  if (recent?.held) {
    pending = request;
    return;
  }
  press = null;
  if (!recent || isStill(recent, x, y)) host(request);
}
