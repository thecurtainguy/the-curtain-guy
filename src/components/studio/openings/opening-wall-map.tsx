"use client";

import type { StudioDesignJson } from "@/data/studio";
import { getPointAlongWall, type StudioWallSegment } from "@/lib/studio-geometry";
import { cn } from "@/lib/utils";

/**
 * Mini floor plan: walls numbered, the target wall in gold and placed
 * openings marked. Clicking a wall is a mouse shortcut for the wall tiles.
 */
export function OpeningWallMap({
  design,
  walls,
  targetWall,
  onPickWall,
  className,
}: {
  design: StudioDesignJson;
  walls: StudioWallSegment[];
  targetWall: number;
  onPickWall?: (index: number) => void;
  className?: string;
}) {
  if (walls.length === 0) return null;
  const xs = design.room.floor.map((point) => point.x);
  const zs = design.room.floor.map((point) => point.z);
  const minX = Math.min(...xs);
  const minZ = Math.min(...zs);
  const width = Math.max(1, Math.max(...xs) - minX);
  const depth = Math.max(1, Math.max(...zs) - minZ);
  const span = Math.max(width, depth);
  const pad = span * 0.14;
  const stroke = span * 0.012;
  const labelSize = span * 0.1;
  const x = (value: number) => value - minX;
  const z = (value: number) => value - minZ;
  const points = design.room.floor.map((point) => `${x(point.x)},${z(point.z)}`).join(" ");

  return (
    <svg
      viewBox={`${-pad} ${-pad} ${width + pad * 2} ${depth + pad * 2}`}
      className={cn("h-24 w-full text-primary", className)}
      role="img"
      aria-label={`Floor plan with ${walls.length} walls; Wall ${targetWall + 1} is the target, ${design.openings.length} openings placed`}
    >
      <polygon points={points} className="fill-primary/8" />
      {walls.map((wall) => {
        const active = wall.index === targetWall;
        return (
          <g
            key={wall.index}
            onClick={onPickWall ? () => onPickWall(wall.index) : undefined}
            className={onPickWall ? "cursor-pointer" : undefined}
          >
            <line
              x1={x(wall.start.x)}
              y1={z(wall.start.z)}
              x2={x(wall.end.x)}
              y2={z(wall.end.z)}
              stroke="transparent"
              strokeWidth={stroke * 8}
            />
            <line
              x1={x(wall.start.x)}
              y1={z(wall.start.z)}
              x2={x(wall.end.x)}
              y2={z(wall.end.z)}
              stroke="currentColor"
              strokeOpacity={active ? 1 : 0.35}
              strokeWidth={active ? stroke * 2.6 : stroke}
              strokeLinecap="round"
            />
          </g>
        );
      })}
      {design.openings.map((opening) => {
        const wall = walls[opening.wallIndex];
        if (!wall) return null;
        const a = getPointAlongWall(wall, opening.offset);
        const b = getPointAlongWall(wall, opening.offset + opening.width);
        return (
          <line
            key={opening.id}
            x1={x(a.x)}
            y1={z(a.z)}
            x2={x(b.x)}
            y2={z(b.z)}
            className={opening.type === "window" ? "stroke-foreground/70" : "stroke-foreground"}
            strokeWidth={stroke * 2.2}
            strokeDasharray={opening.type === "window" ? `${stroke * 1.6} ${stroke}` : undefined}
            pointerEvents="none"
          />
        );
      })}
      {walls.map((wall) => {
        const active = wall.index === targetWall;
        const cx = (wall.start.x + wall.end.x) / 2;
        const cz = (wall.start.z + wall.end.z) / 2;
        const centreX = minX + width / 2;
        const centreZ = minZ + depth / 2;
        const dx = cx - centreX;
        const dz = cz - centreZ;
        const len = Math.hypot(dx, dz) || 1;
        const lx = x(cx) + (dx / len) * pad * 0.5;
        const lz = z(cz) + (dz / len) * pad * 0.5;
        return (
          <text
            key={wall.index}
            x={lx}
            y={lz}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={labelSize}
            pointerEvents="none"
            className={cn(
              "font-semibold",
              active ? "fill-primary" : "fill-muted-foreground"
            )}
          >
            {wall.index + 1}
          </text>
        );
      })}
    </svg>
  );
}
