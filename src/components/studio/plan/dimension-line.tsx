"use client";

import type { StudioPoint } from "@/data/studio";
import { inchesToFeetLabel } from "@/lib/studio-geometry";
import type { SmartGuide, WallDistance } from "./smart-guides";

export const GUIDE_COLOR = "#e0479e";

/** Dimension line with end ticks and a centred, haloed length label. */
export function DimensionLine({
  from,
  to,
  label,
  labelSize,
  color = "var(--primary)",
  dashed,
}: {
  from: StudioPoint;
  to: StudioPoint;
  label?: string;
  labelSize: number;
  color?: string;
  dashed?: boolean;
}) {
  const length = Math.hypot(to.x - from.x, to.z - from.z);
  if (length <= 0) return null;
  const nx = -(to.z - from.z) / length;
  const nz = (to.x - from.x) / length;
  const tick = labelSize * 0.45;
  const midX = (from.x + to.x) / 2;
  const midZ = (from.z + to.z) / 2;
  const text = label ?? inchesToFeetLabel(length);
  return (
    <g className="pointer-events-none">
      <line
        x1={from.x}
        y1={from.z}
        x2={to.x}
        y2={to.z}
        stroke={color}
        strokeWidth={1.25}
        strokeDasharray={dashed ? "4 3" : undefined}
        vectorEffect="non-scaling-stroke"
      />
      {[from, to].map((point, index) => (
        <line
          key={index}
          x1={point.x - nx * tick}
          y1={point.z - nz * tick}
          x2={point.x + nx * tick}
          y2={point.z + nz * tick}
          stroke={color}
          strokeWidth={1.25}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      <text
        x={midX}
        y={midZ}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={labelSize * 0.9}
        fill={color}
        stroke="var(--background)"
        strokeWidth={labelSize * 0.38}
        paintOrder="stroke"
        className="font-semibold"
      >
        {text}
      </text>
    </g>
  );
}

export function SmartGuidesLayer({
  guides,
  labelSize,
}: {
  guides: readonly SmartGuide[];
  labelSize: number;
}) {
  const overshoot = labelSize * 1.5;
  return (
    <g className="pointer-events-none">
      {guides.map((guide, index) => {
        const color = guide.kind === "room" ? "var(--primary)" : GUIDE_COLOR;
        return guide.axis === "x" ? (
          <line
            key={index}
            x1={guide.value}
            x2={guide.value}
            y1={guide.from - overshoot}
            y2={guide.to + overshoot}
            stroke={color}
            strokeWidth={1}
            strokeDasharray={guide.kind === "room" ? "6 4" : undefined}
            vectorEffect="non-scaling-stroke"
          />
        ) : (
          <line
            key={index}
            y1={guide.value}
            y2={guide.value}
            x1={guide.from - overshoot}
            x2={guide.to + overshoot}
            stroke={color}
            strokeWidth={1}
            strokeDasharray={guide.kind === "room" ? "6 4" : undefined}
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
    </g>
  );
}

export function WallDistanceLayer({
  distances,
  labelSize,
}: {
  distances: readonly WallDistance[];
  labelSize: number;
}) {
  return (
    <g>
      {distances.map((item) => (
        <DimensionLine
          key={item.side}
          from={item.from}
          to={item.to}
          labelSize={labelSize}
          color={GUIDE_COLOR}
          dashed
        />
      ))}
    </g>
  );
}
