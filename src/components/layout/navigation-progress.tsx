"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const SAFETY_MS = 12_000;

function isModifiedClick(event: MouseEvent) {
  return (
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    event.button !== 0
  );
}

function isInternalNavigation(anchor: HTMLAnchorElement) {
  if (anchor.hasAttribute("download")) return false;
  if (anchor.target && anchor.target !== "_self") return false;

  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#") || href.startsWith("mailto:")) return false;
  if (href.startsWith("tel:") || href.startsWith("javascript:")) return false;

  try {
    const url = new URL(anchor.href, window.location.href);
    if (url.origin !== window.location.origin) return false;
    const next = `${url.pathname}${url.search}`;
    const current = `${window.location.pathname}${window.location.search}`;
    return next !== current;
  } catch {
    return false;
  }
}

/**
 * Site-wide gold top bar while App Router navigations are in flight.
 * Captures internal link clicks so feedback starts before the RSC payload arrives.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [active, setActive] = useState(false);
  const [visible, setVisible] = useState(false);
  const safetyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const locationKey = `${pathname}?${searchParams?.toString() ?? ""}`;

  useEffect(() => {
    function clearTimers() {
      if (safetyTimer.current) clearTimeout(safetyTimer.current);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      safetyTimer.current = null;
      hideTimer.current = null;
    }

    function start() {
      clearTimers();
      setActive(true);
      setVisible(true);
      safetyTimer.current = setTimeout(() => {
        setActive(false);
        setVisible(false);
      }, SAFETY_MS);
    }

    function stop() {
      clearTimers();
      setActive(false);
      hideTimer.current = setTimeout(() => setVisible(false), 220);
    }

    function onClick(event: MouseEvent) {
      if (isModifiedClick(event)) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (!isInternalNavigation(anchor)) return;
      start();
    }

    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      clearTimers();
    };
  }, []);

  useEffect(() => {
    setActive(false);
    const t = setTimeout(() => setVisible(false), 220);
    return () => clearTimeout(t);
  }, [locationKey]);

  if (!visible && !active) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 overflow-hidden"
      aria-hidden
      role="presentation"
    >
      <div
        className={cn(
          "h-full origin-left bg-primary shadow-[0_0_12px_oklch(0.62_0.14_80/0.55)] transition-[width,opacity] duration-300 ease-out",
          active ? "w-[78%] opacity-100" : "w-full opacity-0"
        )}
      />
    </div>
  );
}
