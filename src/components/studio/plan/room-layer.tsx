"use client";

import type { PlanLayerProps } from "./plan-types";

/**
 * Room outline, wall hit-targets, wall dimensions and room-shape handles
 * (rectangle edges, L-shape, custom vertex editing).
 */
export function RoomLayer2D(props: PlanLayerProps) {
  const { design } = props;
  return (
    <polygon
      points={design.room.floor.map((point) => `${point.x},${point.z}`).join(" ")}
      fill="color-mix(in oklch, var(--card) 82%, var(--primary) 4%)"
      stroke="color-mix(in oklch, var(--foreground) 55%, transparent)"
      strokeWidth={4}
      vectorEffect="non-scaling-stroke"
    />
  );
}
