"use client";

import { cn } from "@/lib/utils";
import { Minus, Plus, Ruler, Scan } from "lucide-react";

const buttonClass =
  "inline-flex size-8 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

export function PlanZoomControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onReset,
  onFit,
  rulers,
  onToggleRulers,
}: {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onFit: () => void;
  rulers: boolean;
  onToggleRulers: () => void;
}) {
  return (
    <div
      className="pointer-events-auto flex items-center gap-0.5 rounded-2xl border border-border/60 bg-background/85 p-1 shadow-lg backdrop-blur"
      role="toolbar"
      aria-label="Plan zoom"
    >
      <button type="button" className={buttonClass} onClick={onZoomOut} aria-label="Zoom out" title="Zoom out">
        <Minus className="size-4" />
      </button>
      <button
        type="button"
        onClick={onReset}
        className="min-w-14 rounded-xl px-1.5 py-1 text-center text-xs font-semibold text-foreground tabular-nums transition-colors hover:bg-primary/10 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        aria-label={`Zoom ${Math.round(zoom * 100)} percent. Reset to 100 percent`}
        title="Reset to 100%"
      >
        {Math.round(zoom * 100)}%
      </button>
      <button type="button" className={buttonClass} onClick={onZoomIn} aria-label="Zoom in" title="Zoom in">
        <Plus className="size-4" />
      </button>
      <span className="mx-0.5 h-5 w-px bg-border/70" aria-hidden />
      <button type="button" className={buttonClass} onClick={onFit} aria-label="Fit room to view" title="Fit room (F)">
        <Scan className="size-4" />
      </button>
      <button
        type="button"
        className={cn(buttonClass, rulers && "bg-primary/12 text-primary")}
        onClick={onToggleRulers}
        aria-pressed={rulers}
        aria-label="Toggle rulers"
        title="Rulers"
      >
        <Ruler className="size-4" />
      </button>
    </div>
  );
}
