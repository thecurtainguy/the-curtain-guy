"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Enter/exit thresholds — hysteresis avoids bounce near the edge. */
const SHOW_AFTER = 420;
const HIDE_BELOW = 280;

export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;
      const y = window.scrollY || document.documentElement.scrollTop || 0;
      setVisible((prev) => {
        if (prev) return y > HIDE_BELOW;
        return y > SHOW_AFTER;
      });
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  function scrollToTop() {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  }

  return (
    <div
      className={cn(
        "pointer-events-none fixed right-4 bottom-4 z-40 sm:right-6 sm:bottom-6",
        "transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
        "motion-reduce:transition-none",
        visible
          ? "pointer-events-auto translate-y-0 opacity-100"
          : "translate-y-3 opacity-0"
      )}
    >
      <Button
        type="button"
        size="icon"
        variant="outline"
        aria-label="Back to top"
        tabIndex={visible ? 0 : -1}
        onClick={scrollToTop}
        className={cn(
          "size-11 rounded-2xl border-primary/30 bg-background/85 text-primary shadow-[0_10px_28px_-12px_rgba(0,0,0,0.45)]",
          "backdrop-blur-md ring-1 ring-primary/15",
          "hover:border-primary/45 hover:bg-primary/10 hover:text-primary",
          "focus-visible:ring-primary/40"
        )}
      >
        <ArrowUp className="size-4" />
      </Button>
    </div>
  );
}
