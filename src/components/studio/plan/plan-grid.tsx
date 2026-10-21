"use client";

import { getGridSteps, type PlanRect } from "./viewport";

/** Adaptive minor/major grid in plan inches; strokes stay ~1px at any zoom. */
export function PlanGrid({
  visible,
  zoom,
  snapIncrement,
}: {
  visible: PlanRect;
  zoom: number;
  snapIncrement: number;
}) {
  const { minor, major } = getGridSteps(snapIncrement, zoom);
  const stroke = 1 / zoom;
  return (
    <>
      <defs>
        <pattern id="studio-plan-grid-minor" width={minor} height={minor} patternUnits="userSpaceOnUse">
          <path
            d={`M ${minor} 0 L 0 0 0 ${minor}`}
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.06}
            strokeWidth={stroke}
          />
        </pattern>
        <pattern id="studio-plan-grid-major" width={major} height={major} patternUnits="userSpaceOnUse">
          <rect width={major} height={major} fill="url(#studio-plan-grid-minor)" />
          <path
            d={`M ${major} 0 L 0 0 0 ${major}`}
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.13}
            strokeWidth={stroke}
          />
        </pattern>
      </defs>
      <rect
        x={visible.minX}
        y={visible.minZ}
        width={visible.maxX - visible.minX}
        height={visible.maxZ - visible.minZ}
        fill="url(#studio-plan-grid-major)"
        className="pointer-events-none text-foreground"
      />
    </>
  );
}
