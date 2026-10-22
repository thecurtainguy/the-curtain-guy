"use client";

import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { TipKbd } from "./studio-tip";

const SHOW_DELAY_MS = 450;
const TIP_SELECTOR = "[data-studio-tip]";

type Tip = { text: string; shortcut: string | null; x: number; y: number };

/**
 * Branded hover tooltip for elements that can't host a Radix trigger — SVG
 * plan shapes and canvas overlays. Mark an element with
 * `data-studio-tip="…"` (and optionally `data-studio-tip-shortcut="…"`);
 * never use `title` / SVG `<title>`, which show the browser's native tooltip.
 * Mount once per page.
 */
export function StudioHoverTip() {
  const [tip, setTip] = useState<Tip | null>(null);

  useEffect(() => {
    let target: Element | null = null;
    let timer = 0;
    let last = { x: 0, y: 0 };

    const clear = () => {
      window.clearTimeout(timer);
      timer = 0;
      target = null;
      setTip(null);
    };
    const show = () => {
      timer = 0;
      if (!target?.isConnected) return;
      const text = target.getAttribute("data-studio-tip");
      if (!text) return;
      setTip({
        text,
        shortcut: target.getAttribute("data-studio-tip-shortcut"),
        x: last.x,
        y: last.y,
      });
    };
    const onOver = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || document.pointerLockElement) return;
      const next = (event.target as Element | null)?.closest?.(TIP_SELECTOR) ?? null;
      last = { x: event.clientX, y: event.clientY };
      if (next === target) return;
      clear();
      if (!next || event.buttons) return;
      target = next;
      timer = window.setTimeout(show, SHOW_DELAY_MS);
    };
    const onMove = (event: PointerEvent) => {
      last = { x: event.clientX, y: event.clientY };
      if (event.buttons && target) clear();
    };
    const onLeaveWindow = (event: PointerEvent) => {
      if (!event.relatedTarget) clear();
    };

    document.addEventListener("pointerover", onOver, true);
    document.addEventListener("pointermove", onMove, { capture: true, passive: true });
    document.addEventListener("pointerdown", clear, true);
    document.addEventListener("pointerout", onLeaveWindow, true);
    document.addEventListener("wheel", clear, { capture: true, passive: true });
    document.addEventListener("keydown", clear, true);
    window.addEventListener("blur", clear);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("pointerover", onOver, true);
      document.removeEventListener("pointermove", onMove, true);
      document.removeEventListener("pointerdown", clear, true);
      document.removeEventListener("pointerout", onLeaveWindow, true);
      document.removeEventListener("wheel", clear, true);
      document.removeEventListener("keydown", clear, true);
      window.removeEventListener("blur", clear);
    };
  }, []);

  if (!tip) return null;
  const below = tip.y < 56;
  const left = Math.min(Math.max(tip.x, 136), window.innerWidth - 136);
  return createPortal(
    <div
      role="tooltip"
      className={cn(
        "pointer-events-none fixed z-50 inline-flex w-max max-w-64 -translate-x-1/2 animate-in items-center gap-1.5 rounded-xl bg-foreground px-3 py-1.5 text-xs text-background fade-in-0 zoom-in-95 has-data-[slot=kbd]:pr-1.5",
        !below && "-translate-y-full"
      )}
      style={{ left, top: below ? tip.y + 22 : tip.y - 14 }}
    >
      {tip.text}
      {tip.shortcut ? <TipKbd>{tip.shortcut}</TipKbd> : null}
    </div>,
    document.body
  );
}
