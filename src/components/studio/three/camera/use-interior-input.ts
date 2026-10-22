"use client";

import { useEffect, useRef, useState } from "react";

type MotionState = {
  /** Pressed movement keys by `KeyboardEvent.code`. */
  keys: Set<string>;
  /** Pending forward (+) / backward (−) step in feet, eased out per frame. */
  dolly: number;
  /** Pending look drag in pixels (grab-the-world: +x turns left, +y looks up). */
  lookX: number;
  lookY: number;
  /** Pending orbit drag in pixels (right mouse button). */
  orbitX: number;
  orbitY: number;
  /** Pending two-finger walk in feet. */
  walkAhead: number;
  walkSide: number;
  /** Pending pointer-lock turn in radians (+yaw turns left, +pitch looks up). */
  turnYaw: number;
  turnPitch: number;
};

export type InteriorMotion = {
  /** −1..1 walk intent from WASD / arrows, Q/E rise, plus Shift. */
  intent: () => { ahead: number; side: number; rise: number; run: boolean };
  addDolly: (feet: number) => void;
  /** Eases out the queued step; returns the feet to apply this frame. */
  takeDolly: (delta: number) => number;
  takeLook: () => { x: number; y: number };
  takeOrbit: () => { x: number; y: number };
  takeWalk: () => { ahead: number; side: number };
  /** Mouse-look under pointer lock: applied undamped, like a game camera. */
  addTurn: (yaw: number, pitch: number) => void;
  takeTurn: () => { yaw: number; pitch: number };
};

type Handlers = {
  /** Called on any user input; the frame loop must start ticking. */
  onActivity: () => void;
  onDoubleClick: (event: MouseEvent) => void;
  /** Feet of travel for one wheel notch. */
  wheelStep: () => number;
  /** True while another tool (D's drag session) owns the pointer. */
  isPaused: () => boolean;
};

const MOVE_KEYS = new Set([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "KeyQ",
  "KeyE",
  "ShiftLeft",
  "ShiftRight",
]);
const ARROW_KEYS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);
/** Feet per pixel for two-finger walking and pinch stepping. */
const TOUCH_WALK_FEET = 0.035;
const PINCH_STEP_FEET = 0.05;

function isTypingTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "SELECT")
  );
}

/**
 * Pointer, touch, keyboard and wheel input for the in-room camera. Only
 * listens while `enabled`. Mouse: drag = look, right-drag = orbit. Touch: one
 * finger = look, two fingers = walk, pinch = step. Input is queued and the
 * caller's frame loop drains it, so damping and collisions live in one place.
 */
export function useInteriorInput(
  domElement: HTMLElement,
  enabled: boolean,
  walk: boolean,
  handlers: Handlers
): InteriorMotion {
  const stateRef = useRef<MotionState>({
    keys: new Set(),
    dolly: 0,
    lookX: 0,
    lookY: 0,
    orbitX: 0,
    orbitY: 0,
    walkAhead: 0,
    walkSide: 0,
    turnYaw: 0,
    turnPitch: 0,
  });
  const handlerRef = useRef(handlers);
  useEffect(() => {
    handlerRef.current = handlers;
  });

  const [motion] = useState<InteriorMotion>(() => ({
    intent: () => {
      const { keys } = stateRef.current;
      return {
        ahead:
          (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0) -
          (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0),
        side:
          (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) -
          (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0),
        rise: (keys.has("KeyE") ? 1 : 0) - (keys.has("KeyQ") ? 1 : 0),
        run: keys.has("ShiftLeft") || keys.has("ShiftRight"),
      };
    },
    addDolly: (feet) => {
      stateRef.current.dolly += feet;
    },
    takeDolly: (delta) => {
      const state = stateRef.current;
      if (Math.abs(state.dolly) <= 1e-3) {
        state.dolly = 0;
        return 0;
      }
      const step = state.dolly * (1 - Math.exp(-delta * 9));
      state.dolly -= step;
      return step;
    },
    takeLook: () => {
      const state = stateRef.current;
      const look = { x: state.lookX, y: state.lookY };
      state.lookX = 0;
      state.lookY = 0;
      return look;
    },
    takeOrbit: () => {
      const state = stateRef.current;
      const orbit = { x: state.orbitX, y: state.orbitY };
      state.orbitX = 0;
      state.orbitY = 0;
      return orbit;
    },
    takeWalk: () => {
      const state = stateRef.current;
      const step = { ahead: state.walkAhead, side: state.walkSide };
      state.walkAhead = 0;
      state.walkSide = 0;
      return step;
    },
    addTurn: (yaw, pitch) => {
      stateRef.current.turnYaw += yaw;
      stateRef.current.turnPitch += pitch;
    },
    takeTurn: () => {
      const state = stateRef.current;
      const turn = { yaw: state.turnYaw, pitch: state.turnPitch };
      state.turnYaw = 0;
      state.turnPitch = 0;
      return turn;
    },
  }));

  useEffect(() => {
    const state = stateRef.current;
    const reset = () => {
      state.keys.clear();
      state.dolly = 0;
      state.lookX = state.lookY = state.orbitX = state.orbitY = 0;
      state.walkAhead = state.walkSide = 0;
      state.turnYaw = state.turnPitch = 0;
    };
    if (!enabled) {
      reset();
      return;
    }
    const tracks = (code: string) => MOVE_KEYS.has(code) || (walk && ARROW_KEYS.has(code));
    const pointers = new Map<number, { x: number; y: number; button: number }>();
    let pinch: { distance: number; x: number; y: number } | null = null;

    const touchPair = () => {
      const [a, b] = [...pointers.values()];
      return {
        distance: Math.hypot(a.x - b.x, a.y - b.y),
        x: (a.x + b.x) / 2,
        y: (a.y + b.y) / 2,
      };
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && event.button !== 0 && event.button !== 2) return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY, button: event.button });
      try {
        domElement.setPointerCapture(event.pointerId);
      } catch {
        /* capture is best-effort */
      }
      pinch = pointers.size === 2 ? touchPair() : null;
    };
    const onPointerMove = (event: PointerEvent) => {
      const pointer = pointers.get(event.pointerId);
      if (!pointer) return;
      const dx = event.clientX - pointer.x;
      const dy = event.clientY - pointer.y;
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      if (handlerRef.current.isPaused()) return;
      if (pointers.size >= 2) {
        if (!pinch) return;
        const next = touchPair();
        state.walkAhead -= (next.y - pinch.y) * TOUCH_WALK_FEET;
        state.walkSide -= (next.x - pinch.x) * TOUCH_WALK_FEET;
        state.dolly += (next.distance - pinch.distance) * PINCH_STEP_FEET;
        pinch = next;
      } else if (pointer.button === 2 || (event.pointerType === "mouse" && event.ctrlKey)) {
        state.orbitX += dx;
        state.orbitY += dy;
      } else {
        state.lookX += dx;
        state.lookY += dy;
      }
      if (dx !== 0 || dy !== 0) handlerRef.current.onActivity();
    };
    const onPointerUp = (event: PointerEvent) => {
      pointers.delete(event.pointerId);
      pinch = pointers.size === 2 ? touchPair() : null;
    };
    const onContextMenu = (event: Event) => event.preventDefault();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target) || !tracks(event.code)) return;
      if (ARROW_KEYS.has(event.code)) event.preventDefault();
      state.keys.add(event.code);
      handlerRef.current.onActivity();
    };
    const onKeyUp = (event: KeyboardEvent) => {
      state.keys.delete(event.code);
    };
    const onBlur = () => state.keys.clear();
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey) return;
      event.preventDefault();
      const pixels = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
      const notches = Math.max(-3, Math.min(3, pixels / 100));
      state.dolly -= notches * handlerRef.current.wheelStep();
      handlerRef.current.onActivity();
    };
    const onDoubleClick = (event: MouseEvent) => handlerRef.current.onDoubleClick(event);

    domElement.addEventListener("pointerdown", onPointerDown);
    domElement.addEventListener("pointermove", onPointerMove);
    domElement.addEventListener("pointerup", onPointerUp);
    domElement.addEventListener("pointercancel", onPointerUp);
    domElement.addEventListener("contextmenu", onContextMenu);
    domElement.addEventListener("wheel", onWheel, { passive: false });
    domElement.addEventListener("dblclick", onDoubleClick);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      domElement.removeEventListener("pointerdown", onPointerDown);
      domElement.removeEventListener("pointermove", onPointerMove);
      domElement.removeEventListener("pointerup", onPointerUp);
      domElement.removeEventListener("pointercancel", onPointerUp);
      domElement.removeEventListener("contextmenu", onContextMenu);
      domElement.removeEventListener("wheel", onWheel);
      domElement.removeEventListener("dblclick", onDoubleClick);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      reset();
    };
  }, [domElement, enabled, walk]);

  return motion;
}
