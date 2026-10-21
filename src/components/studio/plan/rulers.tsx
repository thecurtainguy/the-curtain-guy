"use client";

import { memo } from "react";
import { getRulerStepFeet, type PlanCamera, type PlanSize } from "./viewport";

export const PLAN_RULER_SIZE = 20;

function ticks(
  start: number,
  end: number,
  stepInches: number,
  majorEvery: number
): Array<{ value: number; major: boolean }> {
  const values: Array<{ value: number; major: boolean }> = [];
  const first = Math.ceil(start / stepInches);
  for (let index = first; index * stepInches <= end && values.length < 400; index += 1) {
    values.push({ value: index * stepInches, major: index % majorEvery === 0 });
  }
  return values;
}

/** Feet rulers along the top and left edges of the plan viewport. */
export const PlanRulers = memo(function PlanRulers({
  camera,
  size,
}: {
  camera: PlanCamera;
  size: PlanSize;
}) {
  const stepFeet = getRulerStepFeet(camera.zoom);
  const major = stepFeet * 12;
  const majorEvery = stepFeet === 1 ? 2 : 5;
  const minor = major / majorEvery;
  const endX = camera.x + size.width / camera.zoom;
  const endZ = camera.z + size.height / camera.zoom;
  const r = PLAN_RULER_SIZE;
  const label = (inches: number) => `${Math.round(inches / 12)}′`;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 select-none">
      <svg className="absolute top-0 left-0" width={size.width} height={r}>
        <rect width={size.width} height={r} fill="color-mix(in oklch, var(--background) 82%, transparent)" />
        <line x1={0} x2={size.width} y1={r - 0.5} y2={r - 0.5} stroke="var(--border)" />
        {ticks(camera.x, endX, minor, majorEvery).map(({ value, major: isMajor }) => {
          const x = (value - camera.x) * camera.zoom;
          return (
            <g key={`x${value}`}>
              <line x1={x} x2={x} y1={isMajor ? 6 : 13} y2={r} stroke={isMajor ? "var(--primary)" : "var(--muted-foreground)"} strokeOpacity={isMajor ? 0.8 : 0.45} />
              {isMajor ? (
                <text x={x + 3} y={10} fontSize={9} fill="var(--muted-foreground)" className="font-medium">
                  {label(value)}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      <svg className="absolute top-0 left-0" width={r} height={size.height}>
        <rect width={r} height={size.height} fill="color-mix(in oklch, var(--background) 82%, transparent)" />
        <line x1={r - 0.5} x2={r - 0.5} y1={0} y2={size.height} stroke="var(--border)" />
        {ticks(camera.z, endZ, minor, majorEvery).map(({ value, major: isMajor }) => {
          const y = (value - camera.z) * camera.zoom;
          return (
            <g key={`z${value}`}>
              <line y1={y} y2={y} x1={isMajor ? 6 : 13} x2={r} stroke={isMajor ? "var(--primary)" : "var(--muted-foreground)"} strokeOpacity={isMajor ? 0.8 : 0.45} />
              {isMajor ? (
                <text fontSize={9} fill="var(--muted-foreground)" textAnchor="end" transform={`translate(13 ${y + 3}) rotate(-90)`} className="font-medium">
                  {label(value)}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      <div className="absolute top-0 left-0 size-5 border-r border-b border-border bg-background" />
    </div>
  );
});
