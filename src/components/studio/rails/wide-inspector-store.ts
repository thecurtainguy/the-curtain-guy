"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "tcg-studio-wide-inspector-v1";

let wide: boolean | null = null;
const listeners = new Set<() => void>();

/** Desktop inspector rail at double width, persisted per browser. */
export function getWideInspector(): boolean {
  if (wide !== null) return wide;
  wide = false;
  try {
    wide = window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    // Storage may be unavailable (private mode); keep the default.
  }
  return wide;
}

export function setWideInspector(next: boolean) {
  if (next === getWideInspector()) return;
  wide = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
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

export function useWideInspector(): boolean {
  return useSyncExternalStore(subscribe, getWideInspector, () => false);
}
