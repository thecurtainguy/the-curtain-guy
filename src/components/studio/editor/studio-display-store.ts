"use client";

import { useSyncExternalStore } from "react";

/**
 * `native` — the Fullscreen API on <html>; `focus` — fallback that fills the
 * browser viewport where the API is missing or refused (iPhone Safari).
 */
export type StudioFullscreenMode = "off" | "native" | "focus";

type WebkitDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitFullscreenEnabled?: boolean;
  webkitExitFullscreen?: () => void;
};

type WebkitElement = HTMLElement & {
  webkitRequestFullscreen?: () => void;
};

const listeners = new Set<() => void>();
let focusActive = false;

function emit() {
  for (const listener of listeners) listener();
}

function nativeFullscreenElement(): Element | null {
  const doc = document as WebkitDocument;
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

export function getStudioFullscreenMode(): StudioFullscreenMode {
  if (typeof document === "undefined") return "off";
  if (nativeFullscreenElement() === document.documentElement) return "native";
  return focusActive ? "focus" : "off";
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  document.addEventListener("fullscreenchange", listener);
  document.addEventListener("webkitfullscreenchange", listener);
  return () => {
    listeners.delete(listener);
    document.removeEventListener("fullscreenchange", listener);
    document.removeEventListener("webkitfullscreenchange", listener);
  };
}

export function useStudioFullscreenMode(): StudioFullscreenMode {
  return useSyncExternalStore(subscribe, getStudioFullscreenMode, () => "off");
}

function setFocusActive(next: boolean) {
  if (focusActive === next) return;
  focusActive = next;
  emit();
}

/**
 * Fullscreens the whole document, not the Studio element: Radix menus,
 * dialogs and tooltips portal into <body> and would vanish otherwise.
 * Must run inside a user gesture (click / keydown).
 */
export async function enterStudioFullscreen(): Promise<void> {
  if (getStudioFullscreenMode() !== "off") return;
  const root = document.documentElement as WebkitElement;
  const doc = document as WebkitDocument;
  try {
    if (document.fullscreenEnabled && root.requestFullscreen) {
      await root.requestFullscreen({ navigationUI: "hide" });
      return;
    }
    if (doc.webkitFullscreenEnabled && root.webkitRequestFullscreen) {
      // The prefixed API reports refusal through an event, not a promise.
      const fallback = () => setFocusActive(true);
      document.addEventListener("webkitfullscreenerror", fallback, { once: true });
      window.setTimeout(
        () => document.removeEventListener("webkitfullscreenerror", fallback),
        1000
      );
      root.webkitRequestFullscreen();
      return;
    }
  } catch {
    // Refused (no user gesture, permissions policy): use the focus fallback.
  }
  setFocusActive(true);
}

export function exitStudioFullscreen() {
  setFocusActive(false);
  if (typeof document === "undefined") return;
  if (nativeFullscreenElement() !== document.documentElement) return;
  const doc = document as WebkitDocument;
  if (document.exitFullscreen) {
    void document.exitFullscreen().catch(() => {});
  } else {
    doc.webkitExitFullscreen?.();
  }
}

export function toggleStudioFullscreen() {
  if (getStudioFullscreenMode() === "off") void enterStudioFullscreen();
  else exitStudioFullscreen();
}
