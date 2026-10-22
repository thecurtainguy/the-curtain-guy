"use client";

import { useState } from "react";
import Link from "next/link";
import { Box, Eye, Map as MapIcon, PencilRuler } from "lucide-react";
import type { StudioDesignJson } from "@/data/studio";
import { preloadStudio3D, Studio3DViewer } from "@/components/studio/studio-3d-lazy";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DesignPlanThumb } from "./design-plan-thumb";
import type { StudioPlanThumbData } from "./studio-leads-shared";

type ViewerMode = "3d" | "plan";

const MODES: Array<{ value: ViewerMode; label: string; icon: typeof Box }> = [
  { value: "3d", label: "3D walkthrough", icon: Box },
  { value: "plan", label: "Floor plan", icon: MapIcon },
];

function noop() {}

/**
 * Read-only design viewer. The 3D scene runs without the editor context, so
 * nothing is selectable or draggable; wall/ceiling display toggles only change
 * this local copy and are never saved.
 */
export function StudioDesignViewer({
  design,
  plan,
  editHref,
  className,
}: {
  design: StudioDesignJson;
  plan: StudioPlanThumbData | null;
  editHref?: string;
  className?: string;
}) {
  const [mode, setMode] = useState<ViewerMode>("3d");
  const [viewDesign, setViewDesign] = useState(design);

  return (
    <section
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl border border-border/40 bg-card/25 shadow-sm",
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-3 border-b border-border/40 bg-[radial-gradient(circle_at_top_left,color-mix(in_oklch,var(--primary)_12%,transparent),transparent_60%)] px-4 py-3">
        <span className="flex size-8 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
          <Eye className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium tracking-[0.18em] text-primary uppercase">
            Their vision · read-only
          </p>
          <p className="truncate font-heading text-sm text-foreground">{design.room.name}</p>
        </div>
        <div role="tablist" aria-label="Viewer mode" className="flex rounded-full border border-border/50 bg-background/50 p-0.5">
          {MODES.map((option) => {
            const Icon = option.icon;
            const active = mode === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setMode(option.value)}
                onPointerEnter={option.value === "3d" ? () => void preloadStudio3D() : undefined}
                className={cn(
                  "inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none",
                  active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="size-3.5" aria-hidden />
                {option.label}
              </button>
            );
          })}
        </div>
        {editHref ? (
          <Button asChild size="sm" variant="outline">
            <Link href={editHref}>
              <PencilRuler className="size-3.5" />
              Open in editor
            </Link>
          </Button>
        ) : null}
      </div>
      <div className="relative h-[clamp(420px,62vh,720px)]">
        {mode === "3d" ? (
          <Studio3DViewer
            design={viewDesign}
            onChange={setViewDesign}
            selection={null}
            onSelect={noop}
          />
        ) : plan ? (
          <div className="size-full bg-[radial-gradient(circle_at_50%_30%,color-mix(in_oklch,var(--primary)_12%,transparent),transparent_65%)] p-8">
            <DesignPlanThumb plan={plan} label={`${design.room.name} floor plan`} />
          </div>
        ) : (
          <div className="flex size-full items-center justify-center text-sm text-muted-foreground">
            This room has no floor outline yet.
          </div>
        )}
      </div>
    </section>
  );
}
