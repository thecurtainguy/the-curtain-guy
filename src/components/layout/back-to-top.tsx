"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Enter/exit thresholds — hysteresis avoids bounce near the edge. */
const SHOW_AFTER_DESKTOP = 420;
const HIDE_BELOW_DESKTOP = 280;
const SHOW_AFTER_MOBILE = 160;
const HIDE_BELOW_MOBILE = 96;

function isMobileViewport() {
  return window.matchMedia("(max-width: 767px)").matches;
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getScrollThresholds() {
  return isMobileViewport()
    ? { showAfter: SHOW_AFTER_MOBILE, hideBelow: HIDE_BELOW_MOBILE }
    : { showAfter: SHOW_AFTER_DESKTOP, hideBelow: HIDE_BELOW_DESKTOP };
}

function readDocumentScrollTop(): number {
  return Math.max(
    window.scrollY || 0,
    document.documentElement.scrollTop || 0,
    document.body.scrollTop || 0
  );
}

function readScrollTop(scrollRoot: HTMLElement | null): number {
  if (scrollRoot) return scrollRoot.scrollTop || 0;
  return readDocumentScrollTop();
}

function scrollDocumentToTop(behavior: ScrollBehavior) {
  const instant = isMobileViewport() || prefersReducedMotion();
  const resolved: ScrollBehavior = instant ? "auto" : behavior;

  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  window.scrollTo({ top: 0, left: 0, behavior: resolved });
}

function scrollElementToTop(element: HTMLElement, behavior: ScrollBehavior) {
  const instant = isMobileViewport() || prefersReducedMotion();
  const resolved: ScrollBehavior = instant ? "auto" : behavior;

  // Direct assignment is the most reliable path on iOS/Android overflow containers.
  element.scrollTop = 0;
  try {
    element.scrollTo({ top: 0, left: 0, behavior: resolved });
  } catch {
    element.scrollTop = 0;
  }
}

type BackToTopProps = {
  /**
   * Portal scroll container. Pass `null` while mounting.
   * Omit entirely on marketing pages that scroll the document.
   */
  scrollElement?: HTMLElement | null;
};

export function BackToTop({ scrollElement }: BackToTopProps = {}) {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const portalMode = scrollElement !== undefined;
  const scrollRootRef = useRef<HTMLElement | null>(null);
  const scrollingRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    scrollRootRef.current = portalMode ? scrollElement : null;

    if (portalMode && !scrollElement) {
      return;
    }

    let frame = 0;

    const update = () => {
      frame = 0;
      const { showAfter, hideBelow } = getScrollThresholds();
      const y = readScrollTop(scrollRootRef.current);

      setVisible((prev) => {
        if (prev) return y > hideBelow;
        return y > showAfter;
      });
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    const media = window.matchMedia("(max-width: 767px)");
    const onViewportChange = () => update();

    update();

    const scrollTargets: Array<EventTarget | null | undefined> = portalMode
      ? [scrollElement]
      : [window, document, document.documentElement, document.body];

    for (const target of scrollTargets) {
      target?.addEventListener("scroll", onScroll, { passive: true });
    }

    window.visualViewport?.addEventListener("scroll", onScroll, {
      passive: true,
    });
    window.visualViewport?.addEventListener("resize", onScroll, {
      passive: true,
    });
    media.addEventListener("change", onViewportChange);

    let syncInterval: number | undefined;
    if (window.matchMedia("(pointer: coarse)").matches) {
      syncInterval = window.setInterval(update, 350);
    }

    return () => {
      if (syncInterval) window.clearInterval(syncInterval);
      for (const target of scrollTargets) {
        target?.removeEventListener("scroll", onScroll);
      }
      window.visualViewport?.removeEventListener("scroll", onScroll);
      window.visualViewport?.removeEventListener("resize", onScroll);
      media.removeEventListener("change", onViewportChange);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [portalMode, scrollElement]);

  const scrollToTop = useCallback(() => {
    if (scrollingRef.current) return;
    scrollingRef.current = true;

    const behavior: ScrollBehavior = prefersReducedMotion() ? "auto" : "smooth";
    const root = scrollRootRef.current;

    if (root) {
      scrollElementToTop(root, behavior);
    } else {
      scrollDocumentToTop(behavior);
    }

    window.setTimeout(() => {
      scrollingRef.current = false;
    }, 450);
  }, []);

  const handleActivate = useCallback(
    (event: React.MouseEvent | React.PointerEvent) => {
      event.preventDefault();
      event.stopPropagation();
      scrollToTop();
    },
    [scrollToTop]
  );

  if (!mounted) return null;

  return createPortal(
    <div
      className={cn(
        "fixed right-4 z-[200] sm:right-6",
        "bottom-[max(1rem,env(safe-area-inset-bottom,0px))] sm:bottom-[max(1.5rem,env(safe-area-inset-bottom,0px))]",
        "transition-[opacity,transform,visibility] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
        "motion-reduce:transition-none",
        visible
          ? "visible translate-y-0 opacity-100"
          : "invisible translate-y-3 opacity-0 pointer-events-none"
      )}
      aria-hidden={!visible}
    >
      <Button
        type="button"
        size="icon"
        variant="outline"
        aria-label="Back to top"
        tabIndex={visible ? 0 : -1}
        onClick={handleActivate}
        className={cn(
          "size-11 touch-manipulation rounded-2xl border-primary/30 bg-background text-primary shadow-[0_10px_28px_-12px_rgba(0,0,0,0.45)]",
          "ring-1 ring-primary/15",
          "hover:border-primary/45 hover:bg-primary/10 hover:text-primary",
          "active:scale-95",
          "focus-visible:ring-primary/40",
          "lg:bg-background/85 lg:backdrop-blur-md"
        )}
      >
        <ArrowUp className="size-4" />
      </Button>
    </div>,
    document.body
  );
}
