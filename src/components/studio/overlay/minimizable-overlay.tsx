"use client";

import { cn } from "@/lib/utils";
import { Minus, type LucideIcon } from "lucide-react";
import { useSyncExternalStore, type ReactNode } from "react";
import { StudioTip } from "../studio-tip";

export type StudioOverlayId =
  | "scene-summary"
  | "walk-hud"
  | "view-chips"
  | "plan-minimap"
  | "plan-hint";

const STORAGE_KEY = "tcg-studio-overlay-minimized-v1";

let state: Partial<Record<StudioOverlayId, boolean>> | null = null;
const listeners = new Set<() => void>();

function read(): Partial<Record<StudioOverlayId, boolean>> {
  if (state) return state;
  state = {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === "object") {
      state = parsed as Partial<Record<StudioOverlayId, boolean>>;
    }
  } catch {
    // Storage is best-effort.
  }
  return state;
}

export function setStudioOverlayMinimized(id: StudioOverlayId, minimized: boolean) {
  state = { ...read(), [id]: minimized };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage is best-effort.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useStudioOverlayMinimized(id: StudioOverlayId): boolean {
  return useSyncExternalStore(
    subscribe,
    () => Boolean(read()[id]),
    () => false
  );
}

/** Header button that tucks an overlay panel away into its icon chip. */
export function OverlayMinimizeButton({
  id,
  label,
  className,
}: {
  id: StudioOverlayId;
  label: string;
  className?: string;
}) {
  return (
    <StudioTip label={`Minimize ${label}`} side="bottom">
      <button
        type="button"
        onClick={() => setStudioOverlayMinimized(id, true)}
        aria-label={`Minimize ${label}`}
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-card/60 hover:text-primary",
          "focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none",
          className
        )}
      >
        <Minus className="size-3.5" aria-hidden />
      </button>
    </StudioTip>
  );
}

/** Compact gold icon that restores a minimized overlay panel. */
export function MinimizedOverlayChip({
  id,
  icon: Icon,
  label,
  value,
  side = "right",
  className,
}: {
  id: StudioOverlayId;
  icon: LucideIcon;
  label: string;
  /** Optional short readout shown beside the icon (e.g. "5′7″"). */
  value?: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
}) {
  return (
    <StudioTip label={`Show ${label}`} side={side}>
      <button
        type="button"
        onClick={() => setStudioOverlayMinimized(id, false)}
        aria-label={`Show ${label}`}
        aria-expanded={false}
        className={cn(
          "pointer-events-auto flex h-9 items-center gap-1.5 rounded-xl border border-border/40 bg-background/75 p-1 shadow-lg backdrop-blur-xl transition-colors",
          "hover:border-primary/40 hover:bg-background/90 focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none",
          "animate-in fade-in-0 zoom-in-95 duration-200 motion-reduce:animate-none",
          value ? "pr-2.5" : "w-9 justify-center",
          className
        )}
      >
        <span className="flex size-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Icon className="size-3.5" aria-hidden />
        </span>
        {value ? (
          <span className="text-[0.68rem] font-medium whitespace-nowrap text-foreground/85 tabular-nums">
            {value}
          </span>
        ) : null}
      </button>
    </StudioTip>
  );
}
