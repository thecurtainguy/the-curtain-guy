"use client";

import { useThree, type ThreeEvent } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

export type DragModifiers = {
  /** Shift or Alt — bypass snapping. */
  free: boolean;
  shift: boolean;
  alt: boolean;
};

export type DragMoveContext = DragModifiers & {
  ray: THREE.Ray;
};

export type DragHandlers = {
  /** Pixels the pointer must travel before the drag activates. */
  threshold?: number;
  /** Cursor while dragging. */
  cursor?: string;
  /** Cursor to restore when the drag ends (pointer usually still on the item). */
  cursorAfter?: () => string;
  /**
   * Long-press claim (ms): the camera keeps the pointer until the hold
   * elapses without travel; moving first abandons the session silently.
   */
  holdToClaim?: number;
  onActivate?: (modifiers: DragModifiers) => void;
  onMove: (context: DragMoveContext) => void;
  /** `true` = keep the result, `false` = cancelled (Escape / pointercancel). */
  onEnd?: (commit: boolean) => void;
};

type ActiveSession = {
  pointerId: number;
  startX: number;
  startY: number;
  active: boolean;
  handlers: DragHandlers;
  lastEvent: PointerEvent | null;
  frame: number;
  controlsWasEnabled: boolean | null;
  holdTimer: number;
  /** True once the session paused the camera and captured the pointer. */
  claimed: boolean;
  cleanup: () => void;
};

type ControlsLike = { enabled: boolean };

function readModifiers(event: {
  shiftKey: boolean;
  altKey: boolean;
}): DragModifiers {
  return {
    free: event.shiftKey || event.altKey,
    shift: event.shiftKey,
    alt: event.altKey,
  };
}

function isControls(value: unknown): value is ControlsLike {
  return (
    typeof value === "object" &&
    value !== null &&
    "enabled" in value &&
    typeof (value as ControlsLike).enabled === "boolean"
  );
}

/**
 * Native window-level pointer session for 3D gizmo drags: survives the
 * pointer leaving meshes or the canvas, pauses OrbitControls, batches moves
 * per animation frame, cancels on Escape and swallows the trailing click.
 */
export function useDragSession() {
  const get = useThree((state) => state.get);
  const session = useRef<ActiveSession | null>(null);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const ndc = useMemo(() => new THREE.Vector2(), []);

  const setCursor = useCallback(
    (cursor: string) => {
      get().gl.domElement.style.cursor = cursor;
    },
    [get]
  );

  const computeRay = useCallback(
    (event: PointerEvent): THREE.Ray => {
      const { gl, camera } = get();
      const rect = gl.domElement.getBoundingClientRect();
      ndc.set(
        ((event.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1,
        -((event.clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1
      );
      raycaster.setFromCamera(ndc, camera);
      return raycaster.ray.clone();
    },
    [get, ndc, raycaster]
  );

  const finish = useCallback(
    (commit: boolean, suppressClick: boolean) => {
      const current = session.current;
      if (!current) return;
      session.current = null;
      if (current.frame) window.cancelAnimationFrame(current.frame);
      if (current.holdTimer) window.clearTimeout(current.holdTimer);
      current.cleanup();
      const controls = get().controls;
      if (isControls(controls) && current.controlsWasEnabled !== null) {
        controls.enabled = current.controlsWasEnabled;
      }
      if (current.active) {
        current.handlers.onEnd?.(commit);
        setCursor(current.handlers.cursorAfter?.() ?? "");
        if (suppressClick) {
          const swallow = (event: MouseEvent) => {
            event.stopPropagation();
            event.preventDefault();
          };
          window.addEventListener("click", swallow, { capture: true, once: true });
          window.setTimeout(
            () => window.removeEventListener("click", swallow, { capture: true }),
            160
          );
        }
      }
      get().invalidate();
    },
    [get, setCursor]
  );

  const flushMove = useCallback(() => {
    const current = session.current;
    if (!current) return;
    current.frame = 0;
    const event = current.lastEvent;
    if (!event || !current.active) return;
    current.lastEvent = null;
    current.handlers.onMove({ ray: computeRay(event), ...readModifiers(event) });
    get().invalidate();
  }, [computeRay, get]);

  const start = useCallback(
    (
      event: ThreeEvent<PointerEvent>,
      handlers: DragHandlers
    ): void => {
      if (session.current) finish(false, false);
      const native = event.nativeEvent;
      const pointerId = native.pointerId;
      const domElement = get().gl.domElement;
      const hold = handlers.holdToClaim ?? 0;
      let lastModifiers = readModifiers(native);
      let claimedOnce = false;

      /* Pauses the camera (orbit / in-room look) and takes the pointer. */
      const claim = () => {
        const current = session.current;
        if (!current || current.claimed) return;
        current.claimed = true;
        claimedOnce = true;
        const controls = get().controls;
        if (isControls(controls)) {
          current.controlsWasEnabled = controls.enabled;
          controls.enabled = false;
        }
        try {
          domElement.setPointerCapture(pointerId);
        } catch {
          // Capture is best-effort (e.g. synthetic events).
        }
      };

      const threshold = hold > 0 ? 0 : (handlers.threshold ?? 3);
      const activate = (modifiers: DragModifiers) => {
        const current = session.current;
        if (!current || current.active) return;
        current.active = true;
        setCursor(handlers.cursor ?? "grabbing");
        handlers.onActivate?.(modifiers);
      };

      const onPointerMove = (moveEvent: PointerEvent) => {
        const current = session.current;
        if (!current || moveEvent.pointerId !== current.pointerId) return;
        lastModifiers = readModifiers(moveEvent);
        if (hold > 0 && !current.active) {
          const travel = Math.hypot(
            moveEvent.clientX - current.startX,
            moveEvent.clientY - current.startY
          );
          if (travel > 10) finish(false, false);
          return;
        }
        if (!current.active) {
          const distance = Math.hypot(
            moveEvent.clientX - current.startX,
            moveEvent.clientY - current.startY
          );
          if (distance < threshold) return;
          activate(lastModifiers);
        }
        current.lastEvent = moveEvent;
        if (!current.frame) {
          current.frame = window.requestAnimationFrame(flushMove);
        }
      };
      const onPointerUp = (upEvent: PointerEvent) => {
        const current = session.current;
        if (!current || upEvent.pointerId !== current.pointerId) return;
        if (current.active) {
          if (current.frame) window.cancelAnimationFrame(current.frame);
          current.lastEvent = upEvent;
          flushMove();
        }
        finish(true, true);
      };
      const onPointerCancel = (cancelEvent: PointerEvent) => {
        if (cancelEvent.pointerId !== session.current?.pointerId) return;
        finish(false, false);
      };
      const onKeyDown = (keyEvent: KeyboardEvent) => {
        if (keyEvent.key !== "Escape") return;
        const current = session.current;
        if (!current) return;
        keyEvent.preventDefault();
        keyEvent.stopPropagation();
        finish(false, false);
      };
      const onBlur = () => finish(false, false);

      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
      window.addEventListener("pointercancel", onPointerCancel);
      window.addEventListener("keydown", onKeyDown, { capture: true });
      window.addEventListener("blur", onBlur);

      session.current = {
        pointerId,
        startX: native.clientX,
        startY: native.clientY,
        active: false,
        handlers,
        lastEvent: null,
        frame: 0,
        controlsWasEnabled: null,
        holdTimer: 0,
        claimed: false,
        cleanup: () => {
          window.removeEventListener("pointermove", onPointerMove);
          window.removeEventListener("pointerup", onPointerUp);
          window.removeEventListener("pointercancel", onPointerCancel);
          window.removeEventListener("keydown", onKeyDown, { capture: true });
          window.removeEventListener("blur", onBlur);
          if (!claimedOnce) return;
          try {
            if (domElement.hasPointerCapture(pointerId)) {
              domElement.releasePointerCapture(pointerId);
            }
          } catch {
            // Already released.
          }
        },
      };
      if (hold > 0) {
        session.current.holdTimer = window.setTimeout(() => {
          const current = session.current;
          if (!current || current.pointerId !== pointerId) return;
          current.holdTimer = 0;
          claim();
          navigator.vibrate?.(12);
          activate(lastModifiers);
          get().invalidate();
        }, hold);
        return;
      }
      claim();
      if (threshold <= 0) activate(lastModifiers);
    },
    [finish, flushMove, get, setCursor]
  );

  useEffect(() => () => finish(false, false), [finish]);

  return { start, setCursor };
}
