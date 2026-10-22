"use client";

import { Lightbulb } from "lucide-react";
import {
  MinimizedOverlayChip,
  OverlayMinimizeButton,
  useStudioOverlayMinimized,
} from "../overlay/minimizable-overlay";

/** Contextual 2D plan tip pill; minimizes to a small lightbulb chip. */
export function PlanHint({ hint }: { hint: string }) {
  const minimized = useStudioOverlayMinimized("plan-hint");
  if (minimized) {
    return (
      <span className="hidden sm:block">
        <MinimizedOverlayChip id="plan-hint" icon={Lightbulb} label="plan tips" side="top" />
      </span>
    );
  }
  return (
    <div className="pointer-events-auto hidden items-center gap-1 rounded-full border border-border/60 bg-background/92 py-0.5 pr-0.5 pl-3 text-[0.65rem] text-muted-foreground shadow-sm sm:flex">
      <span>{hint}</span>
      <OverlayMinimizeButton id="plan-hint" label="plan tips" className="size-5 rounded-full" />
    </div>
  );
}
