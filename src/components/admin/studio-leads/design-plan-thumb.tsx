import { cn } from "@/lib/utils";
import type { StudioPoint } from "@/data/studio";
import type { StudioPlanThumbData } from "./studio-leads-shared";

function wallFrame(floor: StudioPoint[], index: number, centroid: StudioPoint) {
  const start = floor[index];
  const end = floor[(index + 1) % floor.length];
  const length = Math.hypot(end.x - start.x, end.z - start.z) || 1;
  const dir = { x: (end.x - start.x) / length, z: (end.z - start.z) / length };
  let normal = { x: -dir.z, z: dir.x };
  const mid = { x: (start.x + end.x) / 2, z: (start.z + end.z) / 2 };
  if ((centroid.x - mid.x) * normal.x + (centroid.z - mid.z) * normal.z < 0) {
    normal = { x: -normal.x, z: -normal.z };
  }
  return { start, dir, normal, length };
}

/**
 * Mini 2D floor plan: room outline, drape runs (in their fabric colour, split
 * around doors) and door/window marks. Pure SVG — safe in server or client trees.
 */
export function DesignPlanThumb({
  plan,
  label,
  className,
}: {
  plan: StudioPlanThumbData;
  label: string;
  className?: string;
}) {
  const { floor } = plan;
  const xs = floor.map((point) => point.x);
  const zs = floor.map((point) => point.z);
  const minX = Math.min(...xs);
  const minZ = Math.min(...zs);
  const width = Math.max(1, Math.max(...xs) - minX);
  const depth = Math.max(1, Math.max(...zs) - minZ);
  const span = Math.max(width, depth);
  const pad = span * 0.08;
  const stroke = span / 110;
  const inset = stroke * 2.6;
  const centroid = {
    x: xs.reduce((sum, x) => sum + x, 0) / floor.length,
    z: zs.reduce((sum, z) => sum + z, 0) / floor.length,
  };

  return (
    <svg
      viewBox={`${minX - pad} ${minZ - pad} ${width + pad * 2} ${depth + pad * 2}`}
      className={cn("size-full text-primary", className)}
      role="img"
      aria-label={label}
      preserveAspectRatio="xMidYMid meet"
    >
      <polygon
        points={floor.map((point) => `${point.x},${point.z}`).join(" ")}
        fill="currentColor"
        fillOpacity={0.07}
        stroke="currentColor"
        strokeOpacity={0.75}
        strokeWidth={stroke}
        strokeLinejoin="round"
      />
      {plan.openings.map((opening, index) => {
        if (opening.wallIndex < 0 || opening.wallIndex >= floor.length) return null;
        const wall = wallFrame(floor, opening.wallIndex, centroid);
        const a = opening.offset;
        const b = Math.min(wall.length, opening.offset + opening.width);
        return (
          <line
            key={`opening-${index}`}
            x1={wall.start.x + wall.dir.x * a}
            y1={wall.start.z + wall.dir.z * a}
            x2={wall.start.x + wall.dir.x * b}
            y2={wall.start.z + wall.dir.z * b}
            stroke={opening.type === "window" ? "#7d93ab" : "var(--background)"}
            strokeWidth={stroke * (opening.type === "window" ? 1.6 : 2.2)}
            strokeLinecap="butt"
          />
        );
      })}
      {plan.runs.flatMap((run, runIndex) => {
        if (run.wallIndex < 0 || run.wallIndex >= floor.length) return [];
        const wall = wallFrame(floor, run.wallIndex, centroid);
        const ox = wall.normal.x * inset;
        const oz = wall.normal.z * inset;
        return run.segments.map((segment, segmentIndex) => {
          const coords = {
            x1: wall.start.x + wall.dir.x * segment.start + ox,
            y1: wall.start.z + wall.dir.z * segment.start + oz,
            x2: wall.start.x + wall.dir.x * segment.end + ox,
            y2: wall.start.z + wall.dir.z * segment.end + oz,
          };
          return (
            <g key={`run-${runIndex}-${segmentIndex}`}>
              <line
                {...coords}
                stroke="currentColor"
                strokeOpacity={0.55}
                strokeWidth={stroke * 3.4}
                strokeLinecap="round"
              />
              <line
                {...coords}
                stroke={run.color}
                strokeWidth={stroke * 2.2}
                strokeLinecap="round"
              />
            </g>
          );
        });
      })}
    </svg>
  );
}
