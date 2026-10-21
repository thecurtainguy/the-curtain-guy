"use client";

/**
 * Glass pill rendered inside the plan SVG (plan inches). Used for live
 * lengths, offsets and spans while dragging room geometry and wall items.
 */
export function PlanBadge({
  x,
  z,
  text,
  fontSize,
  detail,
  tone = "gold",
}: {
  x: number;
  z: number;
  text: string;
  fontSize: number;
  detail?: string;
  tone?: "gold" | "muted";
}) {
  const full = detail ? `${text}  ·  ${detail}` : text;
  const width = full.length * fontSize * 0.56 + fontSize * 1.5;
  const height = fontSize * 1.85;
  const accent = tone === "gold" ? "var(--primary)" : "var(--muted-foreground)";
  return (
    <g transform={`translate(${x} ${z})`} pointerEvents="none" aria-hidden>
      <rect
        x={-width / 2}
        y={-height / 2}
        width={width}
        height={height}
        rx={height / 2}
        fill="color-mix(in oklch, var(--background) 86%, transparent)"
        stroke={accent}
        strokeOpacity={0.75}
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
      <text
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={fontSize}
        className="font-semibold tabular-nums select-none"
      >
        <tspan fill={accent}>{text}</tspan>
        {detail ? (
          <tspan fill="var(--muted-foreground)">{`  ·  ${detail}`}</tspan>
        ) : null}
      </text>
    </g>
  );
}

/** Rotation (degrees) that keeps text along a wall readable (never upside down). */
export function uprightAngle(radians: number): number {
  let degrees = (radians * 180) / Math.PI;
  if (degrees > 90) degrees -= 180;
  if (degrees <= -90) degrees += 180;
  return degrees;
}
