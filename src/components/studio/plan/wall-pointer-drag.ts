"use client";

import type { StudioPoint } from "@/data/studio";
import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { useStudioEditor } from "../editor/studio-editor-context";
import type { PlanLayerProps } from "./plan-types";

export type PlanDragModifiers = {
  shiftKey: boolean;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
};

export type PlanDragHandlers = {
  /** Every pointer move past the threshold (plan inches). */
  onMove: (point: StudioPoint, modifiers: PlanDragModifiers) => void;
  /** Gesture finished; `moved` is false for a plain click. */
  onEnd?: (moved: boolean) => void;
  /** Escape / pointercancel; the transaction was already rolled back. */
  onCancel?: () => void;
};

type DragSession = {
  pointerId: number;
  started: boolean;
  handlers: PlanDragHandlers;
  cleanup: () => void;
};

function modifiersOf(event: PointerEvent): PlanDragModifiers {
  return {
    shiftKey: event.shiftKey,
    altKey: event.altKey,
    ctrlKey: event.ctrlKey,
    metaKey: event.metaKey,
  };
}

/**
 * Pointer-capture drag for plan handles. Stops propagation so the canvas does
 * not start a marquee/pan, opens one editor transaction once the pointer moves
 * past `threshold` screen px (one undo step per drag), and rolls back on
 * Escape or pointercancel. Window listeners keep the gesture alive even if
 * the pressed element re-renders or unmounts mid-drag.
 */
export function usePlanPointerDrag(toPlanPoint: PlanLayerProps["toPlanPoint"]) {
  const { beginTransaction, endTransaction, cancelTransaction } =
    useStudioEditor();
  const latest = useRef({
    toPlanPoint,
    beginTransaction,
    endTransaction,
    cancelTransaction,
  });
  useLayoutEffect(() => {
    latest.current = {
      toPlanPoint,
      beginTransaction,
      endTransaction,
      cancelTransaction,
    };
  }, [toPlanPoint, beginTransaction, endTransaction, cancelTransaction]);
  const sessionRef = useRef<DragSession | null>(null);

  const finish = useCallback((mode: "end" | "cancel") => {
    const session = sessionRef.current;
    if (!session) return;
    sessionRef.current = null;
    session.cleanup();
    if (mode === "end") {
      if (session.started) latest.current.endTransaction();
      session.handlers.onEnd?.(session.started);
    } else {
      if (session.started) latest.current.cancelTransaction();
      session.handlers.onCancel?.();
    }
  }, []);

  useEffect(() => () => finish("end"), [finish]);

  return useCallback(
    (
      event: React.PointerEvent<Element>,
      handlers: PlanDragHandlers,
      options: { threshold?: number } = {}
    ) => {
      if (event.button !== 0) return;
      event.stopPropagation();
      finish("cancel");
      const target = event.currentTarget;
      const pointerId = event.pointerId;
      const startX = event.clientX;
      const startY = event.clientY;
      const threshold = Math.max(0, options.threshold ?? 3);
      try {
        target.setPointerCapture(pointerId);
      } catch {
        // Capture is best-effort; window listeners still track the pointer.
      }
      const session: DragSession = {
        pointerId,
        started: false,
        handlers,
        cleanup: () => undefined,
      };
      const handleMove = (moveEvent: PointerEvent) => {
        if (moveEvent.pointerId !== pointerId) return;
        if (!session.started) {
          if (
            Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY) <
            threshold
          ) {
            return;
          }
          session.started = true;
          latest.current.beginTransaction();
        }
        const point = latest.current.toPlanPoint(moveEvent);
        if (point) handlers.onMove(point, modifiersOf(moveEvent));
      };
      const handleUp = (upEvent: PointerEvent) => {
        if (upEvent.pointerId === pointerId) finish("end");
      };
      const handleCancel = (cancelEvent: PointerEvent) => {
        if (cancelEvent.pointerId === pointerId) finish("cancel");
      };
      const handleKey = (keyEvent: KeyboardEvent) => {
        if (keyEvent.key !== "Escape") return;
        keyEvent.preventDefault();
        keyEvent.stopPropagation();
        finish("cancel");
      };
      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
      window.addEventListener("pointercancel", handleCancel);
      window.addEventListener("keydown", handleKey, true);
      session.cleanup = () => {
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
        window.removeEventListener("pointercancel", handleCancel);
        window.removeEventListener("keydown", handleKey, true);
        try {
          if (target.hasPointerCapture(pointerId)) {
            target.releasePointerCapture(pointerId);
          }
        } catch {
          // Element may already be detached.
        }
      };
      sessionRef.current = session;
    },
    [finish]
  );
}

/** Grid snap unless disabled or Shift/Alt is held. */
export function shouldSnap(
  snapEnabled: boolean,
  modifiers: Pick<PlanDragModifiers, "shiftKey" | "altKey">
): boolean {
  return snapEnabled && !modifiers.shiftKey && !modifiers.altKey;
}

export function activateOnKey(
  event: React.KeyboardEvent<Element>,
  callback: () => void
) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    event.stopPropagation();
    callback();
  }
}

/** Arrow-key step: 1″ with Shift, the snap increment when snapping, else 6″. */
export function arrowStep(
  event: React.KeyboardEvent<Element>,
  snapEnabled: boolean,
  snapIncrement: number
): { dx: number; dz: number } | null {
  const step = event.shiftKey ? 1 : snapEnabled ? snapIncrement : 6;
  switch (event.key) {
    case "ArrowLeft":
      return { dx: -step, dz: 0 };
    case "ArrowRight":
      return { dx: step, dz: 0 };
    case "ArrowUp":
      return { dx: 0, dz: -step };
    case "ArrowDown":
      return { dx: 0, dz: step };
    default:
      return null;
  }
}
