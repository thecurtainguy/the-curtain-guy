"use client";

import { Box } from "lucide-react";
import dynamic from "next/dynamic";

/**
 * The 3D engine (three, R3F, post-processing, fabric/lighting systems) is the
 * heaviest part of the studio. It lives in its own chunk so the default 2D
 * editor never downloads or parses it until 3D/Split/Present is opened.
 */
const load3DViewer = () => import("./studio-3d-viewer").then((mod) => mod.Studio3DViewer);

let preloadPromise: ReturnType<typeof load3DViewer> | null = null;

/** Warm the 3D chunk on intent (hovering/focusing the 3D or Split toggle). */
export function preloadStudio3D() {
  preloadPromise ??= load3DViewer();
  return preloadPromise;
}

function Studio3DLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="relative flex h-full min-h-[18rem] items-center justify-center overflow-hidden bg-background"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,color-mix(in_oklch,var(--primary)_14%,transparent),transparent_65%)]"
      />
      <div className="relative flex flex-col items-center gap-4 rounded-4xl border border-border/40 bg-card/25 px-8 py-7 text-center backdrop-blur-sm">
        <span className="relative flex size-12 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary">
          <Box className="size-5" aria-hidden="true" />
          <span className="absolute inset-0 animate-ping rounded-2xl border border-primary/30 motion-reduce:animate-none" />
        </span>
        <div className="space-y-1">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-primary">
            3D Studio
          </p>
          <p className="font-heading text-lg text-foreground">Dressing your room…</p>
        </div>
      </div>
    </div>
  );
}

export const Studio3DViewer = dynamic(preloadStudio3D, {
  ssr: false,
  loading: Studio3DLoading,
});
