"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "tcg-studio-mouse-look-speed-v1";
export const MOUSE_LOOK_SPEED_MIN = 0.25;
export const MOUSE_LOOK_SPEED_MAX = 2;
export const MOUSE_LOOK_SPEED_DEFAULT = 1;

let speed: number | null = null;
const listeners = new Set<() => void>();

function clampSpeed(value: number) {
  if (!Number.isFinite(value)) return MOUSE_LOOK_SPEED_DEFAULT;
  return Math.min(MOUSE_LOOK_SPEED_MAX, Math.max(MOUSE_LOOK_SPEED_MIN, value));
}

/** Pointer-lock look sensitivity multiplier (1 = default), persisted per browser. */
export function getMouseLookSpeed(): number {
  if (speed !== null) return speed;
  speed = MOUSE_LOOK_SPEED_DEFAULT;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored !== null) speed = clampSpeed(Number(stored));
  } catch {
    // Storage may be unavailable (private mode); keep the default.
  }
  return speed;
}

export function setMouseLookSpeed(next: number) {
  const value = clampSpeed(Math.round(next * 100) / 100);
  if (value === getMouseLookSpeed()) return;
  speed = value;
  try {
    window.localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    // Best-effort persistence.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useMouseLookSpeed(): number {
  return useSyncExternalStore(subscribe, getMouseLookSpeed, () => MOUSE_LOOK_SPEED_DEFAULT);
}
