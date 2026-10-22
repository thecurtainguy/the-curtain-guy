"use client";

import { cn } from "@/lib/utils";
import { Minus, Plus, Ruler, Scan } from "lucide-react";
import { StudioTip } from "../studio-tip";

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
      className="pointer-events-auto flex items-center gap-0.5 rounded-2xl border border-border/60 bg-background/95 p-1 shadow-lg"
      role="toolbar"
      aria-label="Plan zoom"
    >
      <StudioTip label="Zoom out">
        <button type="button" className={buttonClass} onClick={onZoomOut} aria-label="Zoom out">
          <Minus className="size-4" />
        </button>
      </StudioTip>
      <StudioTip label="Reset to 100%">
        <button
          type="button"
          onClick={onReset}
          className="min-w-14 rounded-xl px-1.5 py-1 text-center text-xs font-semibold text-foreground tabular-nums transition-colors hover:bg-primary/10 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          aria-label={`Zoom ${Math.round(zoom * 100)} percent. Reset to 100 percent`}
        >
          {Math.round(zoom * 100)}%
        </button>
      </StudioTip>
      <StudioTip label="Zoom in">
        <button type="button" className={buttonClass} onClick={onZoomIn} aria-label="Zoom in">
          <Plus className="size-4" />
        </button>
      </StudioTip>
      <span className="mx-0.5 h-5 w-px bg-border/70" aria-hidden />
      <StudioTip label="Fit room" shortcut="F">
        <button type="button" className={buttonClass} onClick={onFit} aria-label="Fit room to view">
          <Scan className="size-4" />
        </button>
      </StudioTip>
      <StudioTip label={rulers ? "Hide rulers" : "Show rulers"}>
        <button
          type="button"
          className={cn(buttonClass, rulers && "bg-primary/12 text-primary")}
          onClick={onToggleRulers}
          aria-pressed={rulers}
          aria-label="Toggle rulers"
        >
          <Ruler className="size-4" />
        </button>
      </StudioTip>
    </div>
  );
}
