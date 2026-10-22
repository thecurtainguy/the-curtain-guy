"use client";

import { cn } from "@/lib/utils";
import { Maximize2, Minimize2, MonitorPlay, X } from "lucide-react";
import { memo } from "react";
import { StudioTip } from "./studio-tip";

type StudioPresentBarProps = {
  title: string;
  fullscreen: boolean;
  onToggleFullscreen: () => void;
  onExit: () => void;
};

/** Minimal floating chrome shown over the 3D view while presenting. */
export const StudioPresentBar = memo(function StudioPresentBar({
  title,
  fullscreen,
  onToggleFullscreen,
  onExit,
}: StudioPresentBarProps) {
  const FullscreenIcon = fullscreen ? Minimize2 : Maximize2;
  const fullscreenLabel = fullscreen ? "Exit full screen" : "Full screen";
  return (
    <div
      role="toolbar"
      aria-label="Presentation controls"
      className="absolute top-3 left-3 z-30 flex max-w-[calc(100%-14rem)] items-center gap-2 rounded-2xl border border-primary/25 bg-background/75 py-1.5 pr-1.5 pl-1.5 shadow-[0_18px_50px_-20px_rgba(0,0,0,0.7)] backdrop-blur-xl animate-in fade-in-0 slide-in-from-top-1 duration-300 motion-reduce:animate-none"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/20">
        <MonitorPlay className="size-4" aria-hidden="true" />
      </span>
      <div className="hidden min-w-0 pr-1 sm:block">
        <p className="text-[0.58rem] font-semibold tracking-[0.22em] text-primary uppercase">
          Presenting
        </p>
        <p className="max-w-[16rem] truncate font-heading text-sm leading-tight text-foreground">
          {title}
        </p>
      </div>
      <span className="hidden h-6 w-px shrink-0 bg-border/60 sm:block" aria-hidden="true" />
      <StudioTip label={fullscreenLabel} shortcut="Ctrl ⇧ F" side="bottom">
        <button
          type="button"
          onClick={onToggleFullscreen}
          aria-label={fullscreenLabel}
          aria-keyshortcuts="Control+Shift+F"
          aria-pressed={fullscreen}
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
            fullscreen
              ? "bg-primary/15 text-primary shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--primary)_30%,transparent)]"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          )}
        >
          <FullscreenIcon className="size-3.5" aria-hidden="true" />
        </button>
      </StudioTip>
      <StudioTip label="Exit present mode" shortcut="P / Esc" side="bottom">
        <button
          type="button"
          onClick={onExit}
          aria-label="Exit present mode"
          aria-keyshortcuts="P Escape"
          className="flex h-8 shrink-0 items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-2.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
        >
          <X className="size-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">Exit</span>
        </button>
      </StudioTip>
    </div>
  );
});
