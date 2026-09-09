"use client";

import { useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Save } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-button";
import { cn } from "@/lib/utils";

/** Matches BackToTop (`size-11` + `right-4`/`sm:right-6`) with a 0.75rem gap. */
const FLOAT_SAVE_POSITION =
  "fixed z-[200] right-[4.75rem] sm:right-[5.75rem] bottom-[max(1rem,env(safe-area-inset-bottom,0px))] sm:bottom-[max(1.5rem,env(safe-area-inset-bottom,0px))]";

const SHOW_AFTER_DESKTOP = 280;
const HIDE_BELOW_DESKTOP = 160;
const SHOW_AFTER_MOBILE = 120;
const HIDE_BELOW_MOBILE = 64;

function isMobileViewport() {
  return window.matchMedia("(max-width: 767px)").matches;
}

function getScrollThresholds() {
  return isMobileViewport()
    ? { showAfter: SHOW_AFTER_MOBILE, hideBelow: HIDE_BELOW_MOBILE }
    : { showAfter: SHOW_AFTER_DESKTOP, hideBelow: HIDE_BELOW_DESKTOP };
}

function readScrollTop(scrollRoot: HTMLElement | null): number {
  if (scrollRoot) return scrollRoot.scrollTop || 0;
  return Math.max(
    window.scrollY || 0,
    document.documentElement.scrollTop || 0,
    document.body.scrollTop || 0
  );
}

function subscribeNoop() {
  return () => {};
}

export type AdminFloatingSaveButtonProps = {
  /** When false, the control stays hidden. */
  active: boolean;
  saving?: boolean;
  disabled?: boolean;
  label?: string;
  savingLabel?: string;
  onSave: () => void;
  className?: string;
};

/**
 * Portal floating save for long admin editors. Sits left of BackToTop so the
 * two controls never stack on the same spot.
 */
export function AdminFloatingSaveButton({
  active,
  saving = false,
  disabled = false,
  label = "Save changes",
  savingLabel = "Saving",
  onSave,
  className,
}: AdminFloatingSaveButtonProps) {
  const mounted = useSyncExternalStore(subscribeNoop, () => true, () => false);
  const [scrolled, setScrolled] = useState(false);
  const scrollRootRef = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    if (!active || !mounted) return;

    const root =
      document.querySelector<HTMLElement>("[data-portal-scroll-root]") ?? null;
    scrollRootRef.current = root;

    let frame = 0;
    const update = () => {
      frame = 0;
      const { showAfter, hideBelow } = getScrollThresholds();
      const y = readScrollTop(scrollRootRef.current);
      setScrolled((prev) => (prev ? y > hideBelow : y > showAfter));
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    update();

    const targets: Array<EventTarget | null> = root
      ? [root]
      : [window, document, document.documentElement, document.body];

    for (const target of targets) {
      target?.addEventListener("scroll", onScroll, { passive: true });
    }
    window.visualViewport?.addEventListener("scroll", onScroll, {
      passive: true,
    });
    window.visualViewport?.addEventListener("resize", onScroll, {
      passive: true,
    });

    return () => {
      for (const target of targets) {
        target?.removeEventListener("scroll", onScroll);
      }
      window.visualViewport?.removeEventListener("scroll", onScroll);
      window.visualViewport?.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [active, mounted]);

  if (!mounted || !active) return null;

  const visible = scrolled || saving;

  return createPortal(
    <div
      className={cn(
        FLOAT_SAVE_POSITION,
        "transition-[opacity,transform,visibility] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
        "motion-reduce:transition-none",
        visible
          ? "visible translate-y-0 opacity-100"
          : "invisible translate-y-3 opacity-0 pointer-events-none",
        className
      )}
      aria-hidden={!visible}
    >
      <LoadingButton
        type="button"
        size="lg"
        isLoading={saving}
        loadingText={savingLabel}
        disabled={disabled}
        tabIndex={visible ? 0 : -1}
        onClick={onSave}
        icon={<Save className="size-4" aria-hidden />}
        className={cn(
          "h-11 touch-manipulation rounded-2xl px-4 shadow-[0_10px_28px_-12px_rgba(0,0,0,0.45)]",
          "ring-1 ring-primary/20",
          "active:scale-[0.98]"
        )}
        aria-label={label}
      >
        <span className="sm:hidden">Save</span>
        <span className="hidden sm:inline">{label}</span>
      </LoadingButton>
    </div>,
    document.body
  );
}
