"use client";

import {
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type CurtainRevealProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function CurtainReveal({
  children,
  className,
  contentClassName,
}: CurtainRevealProps) {
  return (
    <div
      className={cn(
        "contact-curtain-stage relative overflow-hidden rounded-2xl border border-border/40 bg-card/30",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,oklch(0.76_0.15_88/0.14),transparent_58%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-[0.2]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, transparent 0, transparent 48px, oklch(0.62 0.14 80 / 6%) 48px, oklch(0.62 0.14 80 / 6%) 49px)",
        }}
        aria-hidden
      />

      <div
        className={cn(
          "contact-curtain-reveal relative z-0 flex min-h-[min(22rem,52vh)] flex-col items-center justify-center px-6 py-10 text-center sm:px-10",
          contentClassName
        )}
      >
        {children}
      </div>

      <div
        className="contact-curtain-panel contact-curtain-panel-left pointer-events-none absolute inset-y-0 left-0 z-20 w-[52%]"
        aria-hidden
      />
      <div
        className="contact-curtain-panel contact-curtain-panel-right pointer-events-none absolute inset-y-0 right-0 z-20 w-[52%]"
        aria-hidden
      />
    </div>
  );
}

const VIEWPORT_CURTAIN_OPEN_MS = 2500;
const VIEWPORT_CURTAIN_HOLD_MS = 200;
const VIEWPORT_CURTAIN_TOTAL_MS =
  VIEWPORT_CURTAIN_HOLD_MS + VIEWPORT_CURTAIN_OPEN_MS + 100;

type ViewportCurtainOpenProps = {
  children: ReactNode;
  className?: string;
};

function CurtainStage({
  opening,
  onDone,
}: {
  opening: boolean;
  onDone: () => void;
}) {
  return (
    <div
      className={cn("viewport-curtain-stage", opening && "is-opening")}
      aria-hidden
      onAnimationEnd={(event) => {
        if (
          event.target instanceof HTMLElement &&
          event.target.classList.contains("viewport-curtain-panel")
        ) {
          onDone();
        }
      }}
    >
      <div className="viewport-curtain-panel viewport-curtain-panel-left" />
      <div className="viewport-curtain-panel viewport-curtain-panel-right" />
    </div>
  );
}

/**
 * Full-viewport velvet curtain open for 404.
 * Always portaled to document.body so PageTransition cannot trap fixed layers.
 */
export function ViewportCurtainOpen({
  children,
  className,
}: ViewportCurtainOpenProps) {
  const [phase, setPhase] = useState<"closed" | "opening" | "done">("closed");
  const [portalEl, setPortalEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setPortalEl(document.body));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      const frame = window.requestAnimationFrame(() => setPhase("done"));
      return () => window.cancelAnimationFrame(frame);
    }

    let cancelled = false;
    let openTimer = 0;
    let doneTimer = 0;
    let innerRaf = 0;

    const outerRaf = window.requestAnimationFrame(() => {
      innerRaf = window.requestAnimationFrame(() => {
        if (cancelled) return;

        openTimer = window.setTimeout(() => {
          if (!cancelled) setPhase("opening");
        }, VIEWPORT_CURTAIN_HOLD_MS);

        doneTimer = window.setTimeout(() => {
          if (!cancelled) setPhase("done");
        }, VIEWPORT_CURTAIN_TOTAL_MS);
      });
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(outerRaf);
      window.cancelAnimationFrame(innerRaf);
      window.clearTimeout(openTimer);
      window.clearTimeout(doneTimer);
    };
  }, []);

  // Belt-and-suspenders: purge any leftover curtain nodes when finished.
  useEffect(() => {
    if (phase !== "done") return;
    document.querySelectorAll(".viewport-curtain-stage").forEach((node) => {
      node.remove();
    });
  }, [phase]);

  const showCurtains = phase !== "done";
  const finish = () => setPhase("done");

  return (
    <div className={cn("relative", className)}>
      <div
        className={cn(
          "viewport-curtain-reveal",
          phase !== "closed" && "is-revealed"
        )}
      >
        {children}
      </div>

      {showCurtains && portalEl
        ? createPortal(
            <CurtainStage
              opening={phase === "opening"}
              onDone={finish}
            />,
            portalEl
          )
        : null}
    </div>
  );
}
