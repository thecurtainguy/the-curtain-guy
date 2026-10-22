"use client";

import type { RootState } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { getCeilingPlacement } from "../../editor/ceiling-placement-store";
import { setStudioPointerLocked, type StudioCameraMode } from "./camera-view-store";
import { hitsManipulable } from "./scene-hits";

/** Radians of turn per pixel of mouse travel while locked. */
const TURN_PER_PIXEL = 0.0022;
/** Some browsers report one huge jump right after locking. */
const MAX_STEP_PX = 250;
/** A click on empty canvas waits this long in case it becomes a double-click (glide). */
const LOCK_DELAY_MS = 260;
const CLICK_SLOP_PX = 4;
/**
 * Crosshair clicks are replayed as synthetic events with an id no real
 * pointer uses, so nothing can pointer-capture them.
 */
const CROSSHAIR_POINTER_ID = 7301;

type Options = {
  /** Whether a click on empty canvas may grab the pointer. */
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
 * Pointer-lock mouse-look for the in-room camera. While `available`, a
 * plain click on empty canvas (not an item, grip or armed placement) locks
 * the pointer; mouse travel then turns the head and a gold crosshair marks
 * the centre. Locked clicks are replayed at the crosshair through the normal
 * R3F path, so they select (or place) whatever sits under it. Esc, leaving
 * Walk, or losing availability releases the lock.
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
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let press: { x: number; y: number } | null = null;
    let pendingLock = 0;
    let hoverFrame = 0;
    let releasedAt = -Infinity;

    const cancelPendingLock = () => {
      if (pendingLock) window.clearTimeout(pendingLock);
      pendingLock = 0;
    };
    const centre = () => {
      const rect = domElement.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    };
    const showLocked = (locked: boolean) => {
      if (!locked && crosshair.style.display !== "none") releasedAt = performance.now();
      crosshair.style.display = locked ? "flex" : "none";
      setStudioPointerLocked(locked);
      if (!locked && hoverFrame) {
        window.cancelAnimationFrame(hoverFrame);
        hoverFrame = 0;
      }
      optionsRef.current.getState().invalidate();
    };
    const pressesItem = (clientX: number, clientY: number) => {
      const state = optionsRef.current.getState();
      const rect = domElement.getBoundingClientRect();
      ndc.set(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1
      );
      raycaster.setFromCamera(ndc, state.camera);
      return hitsManipulable(raycaster.intersectObjects(state.scene.children, true));
    };
    const requestLock = () => {
      try {
        const request = domElement.requestPointerLock() as Promise<void> | undefined;
        request?.catch?.(() => showLocked(false));
      } catch {
        showLocked(false);
      }
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
    const hoverCentre = () => {
      hoverFrame = 0;
      if (isLocked()) replay("pointermove");
    };

    /* Locked: the real pointer is frozen, so keep its events away from R3F,
       drag sessions and the drag-look input; turn the head instead. */
    const onLockedMove = (event: PointerEvent) => {
      if (!event.isTrusted || !isLocked()) return;
      event.stopImmediatePropagation();
      const dx = THREE.MathUtils.clamp(event.movementX, -MAX_STEP_PX, MAX_STEP_PX);
      const dy = THREE.MathUtils.clamp(event.movementY, -MAX_STEP_PX, MAX_STEP_PX);
      if (!dx && !dy) return;
      optionsRef.current.onTurn(-dx * TURN_PER_PIXEL, -dy * TURN_PER_PIXEL);
      optionsRef.current.onActivity();
      if (!hoverFrame) hoverFrame = window.requestAnimationFrame(hoverCentre);
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

    /* Unlocked: a still, unmodified left click on empty canvas grabs the pointer. */
    const onPressDown = (event: PointerEvent) => {
      if (!event.isTrusted || isLocked()) return;
      cancelPendingLock();
      press =
        event.pointerType === "mouse" && event.button === 0
          ? { x: event.clientX, y: event.clientY }
          : null;
    };
    const onPressClick = (event: MouseEvent) => {
      const start = press;
      press = null;
      if (!start || !event.isTrusted || isLocked() || event.defaultPrevented) return;
      if (!optionsRef.current.available || getCeilingPlacement()) return;
      if (event.button !== 0 || event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }
      if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > CLICK_SLOP_PX) return;
      if (pressesItem(event.clientX, event.clientY)) return;
      cancelPendingLock();
      pendingLock = window.setTimeout(() => {
        pendingLock = 0;
        if (!optionsRef.current.available || getCeilingPlacement() || isLocked()) return;
        requestLock();
      }, LOCK_DELAY_MS);
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
    domElement.addEventListener("pointerdown", onPressDown);
    domElement.addEventListener("click", onPressClick);
    domElement.addEventListener("dblclick", cancelPendingLock);
    document.addEventListener("pointerlockchange", onLockChange);
    document.addEventListener("pointerlockerror", onLockError);
    window.addEventListener("keydown", onEscape, capture);
    return () => {
      cancelPendingLock();
      if (hoverFrame) window.cancelAnimationFrame(hoverFrame);
      domElement.removeEventListener("pointermove", onLockedMove, capture);
      domElement.removeEventListener("pointerdown", onLockedButton, capture);
      domElement.removeEventListener("pointerup", onLockedButton, capture);
      domElement.removeEventListener("click", onLockedButton, capture);
      domElement.removeEventListener("dblclick", onLockedButton, capture);
      domElement.removeEventListener("contextmenu", onLockedButton, capture);
      domElement.removeEventListener("pointerdown", onPressDown);
      domElement.removeEventListener("click", onPressClick);
      domElement.removeEventListener("dblclick", cancelPendingLock);
      document.removeEventListener("pointerlockchange", onLockChange);
      document.removeEventListener("pointerlockerror", onLockError);
      window.removeEventListener("keydown", onEscape, capture);
      if (isLocked()) document.exitPointerLock();
      crosshair.remove();
      setStudioPointerLocked(false);
    };
  }, [domElement]);

  /* Leaving Walk, or mouse-look becoming unavailable, hands the mouse back. */
  const { available } = options;
  const previousMode = useRef(mode);
  useEffect(() => {
    const leftWalk = previousMode.current === "walk" && mode !== "walk";
    previousMode.current = mode;
    if ((leftWalk || !available) && document.pointerLockElement === domElement) {
      document.exitPointerLock();
    }
  }, [available, domElement, mode]);
}
