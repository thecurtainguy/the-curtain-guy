"use client";

import { useEffect } from "react";

const VISITOR_KEY = "tcg_vid";
const MIN_VISIBLE_MS = 2_000;
const PASSIVE_VISIBLE_MS = 10_000;
const HEARTBEAT_MS = 20_000;

function visitorId(): string | null {
  try {
    let id = window.localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = crypto.randomUUID();
      window.localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

/**
 * Confirms a quote / invoice view only when a person is actually reading:
 * the page is visible for 2s and the reader interacts (or stays 10s), in a
 * browser that is not automated. Link scanners never get this far.
 */
export function DocumentViewBeacon({ viewId }: { viewId: string | null }) {
  useEffect(() => {
    if (!viewId || navigator.webdriver) return;
    const endpoint = `/api/document-views/${viewId}`;
    const visitor = visitorId();
    let visibleMs = 0;
    let visibleSince = document.visibilityState === "visible" ? performance.now() : null;
    let interacted = false;
    let confirmed = false;
    let lastSentMs = 0;

    const flushVisible = () => {
      if (visibleSince === null) return;
      const now = performance.now();
      visibleMs += now - visibleSince;
      visibleSince = now;
    };
    const send = (final: boolean) => {
      lastSentMs = visibleMs;
      const body = JSON.stringify({ activeSeconds: Math.round(visibleMs / 1000), visitorId: visitor });
      if (final && navigator.sendBeacon) {
        navigator.sendBeacon(endpoint, new Blob([body], { type: "application/json" }));
        return;
      }
      void fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {});
    };
    const eligible = () =>
      visibleMs >= MIN_VISIBLE_MS && (interacted || visibleMs >= PASSIVE_VISIBLE_MS);

    const tick = () => {
      flushVisible();
      if (!confirmed && eligible()) {
        confirmed = true;
        send(false);
      } else if (confirmed && visibleMs - lastSentMs >= HEARTBEAT_MS) {
        send(false);
      }
    };
    const onInteract = () => {
      interacted = true;
    };
    const onHide = () => {
      flushVisible();
      visibleSince = null;
      if (!confirmed && eligible()) confirmed = true;
      if (confirmed && visibleMs > lastSentMs) send(true);
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") visibleSince = performance.now();
      else onHide();
    };

    const interval = window.setInterval(tick, 1_000);
    const interactions = ["pointerdown", "pointermove", "scroll", "keydown", "touchstart", "wheel"] as const;
    for (const type of interactions) {
      window.addEventListener(type, onInteract, { passive: true, once: true });
    }
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onHide);
    return () => {
      window.clearInterval(interval);
      for (const type of interactions) window.removeEventListener(type, onInteract);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onHide);
    };
  }, [viewId]);

  return null;
}
