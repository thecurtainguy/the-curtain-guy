"use client";

import type { RootState } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import {
  setStudioPointerLocked,
  subscribeMouseLookRequest,
  type StudioCameraMode,
} from "./camera-view-store";
import { getMouseLookSpeed } from "./mouse-look-speed";

/** Radians of turn per mouse count at speed 1 and the reference field of view. */
const TURN_PER_COUNT = 0.0008;
/** Narrower lenses turn proportionally slower so aim stays steady when zoomed. */
const REFERENCE_FOV = 60;
/** Movement right after locking is unreliable (Chrome reports the cursor warp). */
const LOCK_SETTLE_MS = 120;
/**
 * Chrome on Windows occasionally reports one wildly large movement while
 * locked. A large report is dropped unless recent motion was already fast;
 * a real flick keeps reporting large steps, so only its first is lost.
 * Anything past the hard cap is always noise.
 */
const SPIKE_FLOOR = 160;
const SPIKE_RATIO = 5;
const MAX_STEP = 640;
/** Motion older than this no longer vouches for a large report. */
const MOTION_MEMORY_MS = 120;
/**
 * The crosshair re-picks once the head has rested this long, so sweeping
 * across the room doesn't flash highlights or raycast every few frames.
 */
const HOVER_SETTLE_MS = 90;
/** Chrome refuses a new lock for about a second after the user exits one. */
const RELOCK_COOLDOWN_MS = 1100;
/**
 * Crosshair clicks are replayed as synthetic events with an id no real
 * pointer uses, so nothing can pointer-capture them.
 */
const CROSSHAIR_POINTER_ID = 7301;

type Options = {
  /** Whether the current view supports mouse-look at all. */
  available: boolean;
  getState: () => RootState;
  /** Radians: +yaw turns left, +pitch looks up. */
  onTurn: (yaw: number, pitch: number) => void;
  onActivity: () => void;
};

function createCrosshair() {
  const root = document.createElement("div");
  root.setAttribute("aria-hidden", "true");
  root.className = "pointer-events-none absolute inset-0 z-[24] items-center justify-center";
  root.style.display = "none";
  root.innerHTML =
    '<span class="relative block size-5 rounded-full border border-primary/55 shadow-[0_0_12px_oklch(0.76_0.15_88/35%)]">' +
    '<span class="absolute top-1/2 left-1/2 size-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary"></span>' +
    "</span>";
  return root;
}

/**
 * Pointer-lock mouse-look for the in-room camera. Only an explicit
 * `requestStudioMouseLook()` (the Mouse look button) locks the pointer —
 * canvas clicks never do. While locked, mouse travel turns the head and a
 * gold crosshair marks the centre; clicks are replayed at the crosshair
 * through the normal R3F path, so they select (or place) whatever sits under
 * it. Esc, changing view, or losing availability releases the lock.
 */
export function usePointerLook(
  domElement: HTMLElement,
  mode: StudioCameraMode,
  options: Options
) {
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  });

  useEffect(() => {
    const isLocked = () => document.pointerLockElement === domElement;
    const crosshair = createCrosshair();
    domElement.parentElement?.appendChild(crosshair);
    let hoverTimer = 0;
    /** The crosshair currently holds an R3F hover that must be released. */
    let hovering = false;
    let relockTimer = 0;
    let releasedAt = -Infinity;
    let lockedAt = -Infinity;
    let recentStep = 0;
    let lastStepAt = -Infinity;
    /** Raw (unaccelerated) input when the browser supports it. */
    let rawInput = true;

    const centre = () => {
      const rect = domElement.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    };
    const replay = (type: "pointermove" | "pointerdown" | "pointerup" | "click", from?: MouseEvent) => {
      const { x, y } = centre();
      const init = {
        bubbles: true,
        cancelable: true,
        composed: true,
        view: window,
        clientX: x,
        clientY: y,
        shiftKey: from?.shiftKey ?? false,
        ctrlKey: from?.ctrlKey ?? false,
        metaKey: from?.metaKey ?? false,
        button: 0,
      };
      domElement.dispatchEvent(
        type === "click"
          ? new MouseEvent(type, { ...init, detail: 1 })
          : new PointerEvent(type, {
              ...init,
              pointerId: CROSSHAIR_POINTER_ID,
              pointerType: "mouse",
              isPrimary: true,
              button: type === "pointermove" ? -1 : 0,
              buttons: type === "pointerdown" ? 1 : 0,
            })
      );
    };

    const cancelHover = () => {
      if (hoverTimer) window.clearTimeout(hoverTimer);
      hoverTimer = 0;
    };
    /** Drops whatever the crosshair was hovering (R3F's canvas-leave path). */
    const releaseHover = () => {
      if (!hovering) return;
      hovering = false;
      optionsRef.current
        .getState()
        .events.handlers?.onPointerLeave?.(
          new PointerEvent("pointerleave", { pointerId: CROSSHAIR_POINTER_ID })
        );
    };
    /** Re-pick under the crosshair once the head rests; clear it while turning. */
    const settleHover = () => {
      releaseHover();
      cancelHover();
      hoverTimer = window.setTimeout(() => {
        hoverTimer = 0;
        if (!isLocked()) return;
        hovering = true;
        replay("pointermove");
      }, HOVER_SETTLE_MS);
    };

    const showLocked = (locked: boolean) => {
      const wasLocked = crosshair.style.display !== "none";
      if (locked === wasLocked) return;
      if (locked) {
        lockedAt = performance.now();
        recentStep = 0;
        settleHover();
      } else {
        releasedAt = performance.now();
        cancelHover();
        releaseHover();
      }
      crosshair.style.display = locked ? "flex" : "none";
      setStudioPointerLocked(locked);
      optionsRef.current.getState().invalidate();
    };

    const requestLock = () => {
      const raw = rawInput;
      const fail = (error: unknown) => {
        if (raw && error instanceof DOMException && error.name === "NotSupportedError") {
          rawInput = false;
          requestLock();
          return;
        }
        // Too soon after an exit: wait out the cooldown (the click's user activation outlasts it).
        const wait = RELOCK_COOLDOWN_MS - (performance.now() - releasedAt);
        if (wait > 0 && !relockTimer) {
          relockTimer = window.setTimeout(() => {
            relockTimer = 0;
            if (optionsRef.current.available && !isLocked()) requestLock();
          }, wait);
        }
      };
      try {
        const request = domElement.requestPointerLock(
          raw ? { unadjustedMovement: true } : undefined
        ) as Promise<void> | undefined;
        request?.catch?.(fail);
      } catch (error) {
        fail(error);
      }
    };

    /* Locked: the real pointer is frozen, so keep its events away from R3F,
       drag sessions and the drag-look input; turn the head instead. */
    const onLockedMove = (event: PointerEvent) => {
      if (!event.isTrusted || !isLocked()) return;
      event.stopImmediatePropagation();
      const now = performance.now();
      if (now - lockedAt < LOCK_SETTLE_MS) return;
      const dx = event.movementX;
      const dy = event.movementY;
      if (!dx && !dy) return;
      const step = Math.hypot(dx, dy);
      if (step > MAX_STEP) return;
      if (now - lastStepAt > MOTION_MEMORY_MS) recentStep = 0;
      lastStepAt = now;
      if (step > SPIKE_FLOOR && step > recentStep * SPIKE_RATIO) {
        recentStep = Math.max(recentStep, step / SPIKE_RATIO);
        return;
      }
      recentStep = recentStep * 0.6 + step * 0.4;
      const camera = optionsRef.current.getState().camera as THREE.PerspectiveCamera;
      const fov = camera.isPerspectiveCamera ? camera.fov : REFERENCE_FOV;
      const gain = TURN_PER_COUNT * getMouseLookSpeed() * (fov / REFERENCE_FOV);
      optionsRef.current.onTurn(-dx * gain, -dy * gain);
      optionsRef.current.onActivity();
      settleHover();
    };
    const onLockedButton = (event: MouseEvent) => {
      if (!event.isTrusted || !isLocked()) return;
      event.stopImmediatePropagation();
      if (event.type === "contextmenu") event.preventDefault();
      if (event.type !== "click" || event.button !== 0) return;
      replay("pointerdown", event);
      replay("pointerup", event);
      replay("click", event);
      optionsRef.current.getState().invalidate();
    };

    const onRequest = () => {
      if (optionsRef.current.available && !isLocked()) requestLock();
    };
    const onLockChange = () => showLocked(isLocked());
    const onLockError = () => showLocked(false);
    /* Esc only releases the mouse; it must not also clear the selection.
       Some browsers unlock first and still deliver the keydown. */
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const locked = isLocked();
      if (!locked && performance.now() - releasedAt > 200) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (locked) document.exitPointerLock();
    };

    const capture = { capture: true };
    domElement.addEventListener("pointermove", onLockedMove, capture);
    domElement.addEventListener("pointerdown", onLockedButton, capture);
    domElement.addEventListener("pointerup", onLockedButton, capture);
    domElement.addEventListener("click", onLockedButton, capture);
    domElement.addEventListener("dblclick", onLockedButton, capture);
    domElement.addEventListener("contextmenu", onLockedButton, capture);
    const unsubscribeRequest = subscribeMouseLookRequest(onRequest);
    document.addEventListener("pointerlockchange", onLockChange);
    document.addEventListener("pointerlockerror", onLockError);
    window.addEventListener("keydown", onEscape, capture);
    return () => {
      unsubscribeRequest();
      cancelHover();
      window.clearTimeout(relockTimer);
      domElement.removeEventListener("pointermove", onLockedMove, capture);
      domElement.removeEventListener("pointerdown", onLockedButton, capture);
      domElement.removeEventListener("pointerup", onLockedButton, capture);
      domElement.removeEventListener("click", onLockedButton, capture);
      domElement.removeEventListener("dblclick", onLockedButton, capture);
      domElement.removeEventListener("contextmenu", onLockedButton, capture);
      document.removeEventListener("pointerlockchange", onLockChange);
      document.removeEventListener("pointerlockerror", onLockError);
      window.removeEventListener("keydown", onEscape, capture);
      if (isLocked()) document.exitPointerLock();
      crosshair.remove();
      setStudioPointerLocked(false);
    };
  }, [domElement]);

  /* Changing view, or mouse-look becoming unavailable, hands the mouse back. */
  const { available } = options;
  const previousMode = useRef(mode);
  useEffect(() => {
    const changedView = previousMode.current !== mode;
    previousMode.current = mode;
    if ((changedView || !available) && document.pointerLockElement === domElement) {
      document.exitPointerLock();
    }
  }, [available, domElement, mode]);
}
