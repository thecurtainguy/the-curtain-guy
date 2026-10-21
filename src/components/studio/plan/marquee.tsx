"use client";

import type { StudioPoint } from "@/data/studio";
import type { PlanRect } from "./viewport";

export function marqueeRect(start: StudioPoint, end: StudioPoint): PlanRect {
  return {
    minX: Math.min(start.x, end.x),
    maxX: Math.max(start.x, end.x),
    minZ: Math.min(start.z, end.z),
    maxZ: Math.max(start.z, end.z),
  };
}

/** Rubber-band selection rectangle. */
export function MarqueeLayer({ rect }: { rect: PlanRect }) {
  return (
    <rect
      x={rect.minX}
      y={rect.minZ}
      width={rect.maxX - rect.minX}
      height={rect.maxZ - rect.minZ}
      fill="color-mix(in oklch, var(--primary) 10%, transparent)"
      stroke="var(--primary)"
      strokeWidth={1}
      strokeDasharray="5 4"
      vectorEffect="non-scaling-stroke"
      className="pointer-events-none"
    />
  );
}
