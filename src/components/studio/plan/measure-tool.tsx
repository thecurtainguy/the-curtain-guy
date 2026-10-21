"use client";

import type { StudioPoint } from "@/data/studio";
import { inchesToFeetLabel } from "@/lib/studio-geometry";
import { DimensionLine } from "./dimension-line";

export type PlanMeasurement = { start: StudioPoint; end: StudioPoint };

/** Live tape-measure line drawn by the measure tool. */
export function MeasureLayer({
  measurement,
  labelSize,
  handleRadius,
}: {
  measurement: PlanMeasurement;
  labelSize: number;
  handleRadius: number;
}) {
  const { start, end } = measurement;
  const length = Math.hypot(end.x - start.x, end.z - start.z);
  const dx = Math.abs(end.x - start.x);
  const dz = Math.abs(end.z - start.z);
  const showComponents = dx > 1 && dz > 1;
  return (
    <g className="pointer-events-none">
      {showComponents ? (
        <path
          d={`M ${start.x} ${start.z} H ${end.x} V ${end.z}`}
          fill="none"
          stroke="var(--muted-foreground)"
          strokeOpacity={0.6}
          strokeDasharray="3 4"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      ) : null}
      <DimensionLine from={start} to={end} labelSize={labelSize * 1.15} label={inchesToFeetLabel(length)} />
      {[start, end].map((point, index) => (
        <circle
          key={index}
          cx={point.x}
          cy={point.z}
          r={handleRadius * 0.55}
          fill="var(--background)"
          stroke="var(--primary)"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {showComponents ? (
        <text
          x={end.x + labelSize * 0.6}
          y={end.z + labelSize * 1.2}
          fontSize={labelSize * 0.75}
          fill="var(--muted-foreground)"
          stroke="var(--background)"
          strokeWidth={labelSize * 0.3}
          paintOrder="stroke"
        >
          {`Δx ${inchesToFeetLabel(dx)} · Δz ${inchesToFeetLabel(dz)}`}
        </text>
      ) : null}
    </g>
  );
}
