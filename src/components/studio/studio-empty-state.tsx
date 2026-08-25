"use client";

import { Ruler, Sparkles } from "lucide-react";

export function StudioEmptyState() {
  return (
    <div className="rounded-3xl border border-dashed border-primary/25 bg-primary/[0.04] p-5 text-center">
      <div className="mx-auto flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Ruler className="size-5" aria-hidden="true" />
      </div>
      <h3 className="mt-3 font-heading text-base">Select an element</h3>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        Choose a wall, drape, opening, or room object on the plan to edit its
        exact details.
      </p>
      <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-[0.65rem] text-muted-foreground">
        <Sparkles className="size-3 text-primary" aria-hidden="true" />
        Precise changes update both views
      </div>
    </div>
  );
}
