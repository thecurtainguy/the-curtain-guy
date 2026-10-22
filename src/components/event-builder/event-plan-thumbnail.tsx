"use client";

import { memo, useMemo } from "react";
import {
  getDrapeColorHex,
  type StudioDesignJson,
  type StudioObject,
  type StudioPoint,
} from "@/data/studio";
import { getDrapeRunSegments } from "@/lib/studio-door-gaps";
import {
  getPointAlongWall,
  getStudioBounds,
  getWallSegments,
} from "@/lib/studio-geometry";
import { getCeilingLayout } from "@/lib/studio-ceiling";
import { getWallOutwardNormal } from "@/lib/event-builder/wall-roles";
import { cn } from "@/lib/utils";

const ROUND_TYPES = new Set<StudioObject["type"]>([
  "round_table",
  "cocktail_table",
  "cake_table",
  "uplight",
  "chandelier",
  "plant",
  "column",
]);

type EventPlanThumbnailProps = {
  design: StudioDesignJson;
  /** Wall index labelled as the front (stage) wall. */
  frontWall?: number;
  frontLabel?: string;
  className?: string;
  ariaLabel: string;
};

function pathFrom(points: StudioPoint[]): string {
  return points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.z}`).join(" ") + " Z";
}

/** Lightweight 2D plan of a studio design — room, drapes, openings, furniture, ceiling. */
export const EventPlanThumbnail = memo(function EventPlanThumbnail({
  design,
  frontWall,
  frontLabel = "FRONT",
  className,
  ariaLabel,
}: EventPlanThumbnailProps) {
  const floor = design.room.floor;
  const view = useMemo(() => {
    const bounds = getStudioBounds(floor);
    const size = Math.max(bounds.width, bounds.depth);
    const pad = size * 0.09;
    return {
      size,
      box: `${bounds.minX - pad} ${bounds.minZ - pad} ${bounds.width + pad * 2} ${bounds.depth + pad * 2}`,
      walls: getWallSegments(floor),
    };
  }, [floor]);

  const unit = view.size / 100;
  const ceilings = useMemo(
    () =>
      (design.ceilingDrapes ?? [])
        .filter((drape) => !drape.hidden)
        .map((drape) => ({ id: drape.id, layout: getCeilingLayout(drape, floor) })),
    [design.ceilingDrapes, floor]
  );

  function wallLine(wallIndex: number, start: number, end: number, inset: number) {
    const wall = view.walls[wallIndex];
    if (!wall) return null;
    const normal = getWallOutwardNormal(wall, floor);
    const a = getPointAlongWall(wall, start);
    const b = getPointAlongWall(wall, end);
    return {
      x1: a.x - normal.x * inset,
      y1: a.z - normal.z * inset,
      x2: b.x - normal.x * inset,
      y2: b.z - normal.z * inset,
    };
  }

  const front = frontWall !== undefined ? view.walls[frontWall] : undefined;
  const frontNormal = front ? getWallOutwardNormal(front, floor) : null;

  return (
    <svg
      viewBox={view.box}
      className={cn("h-full w-full", className)}
      role="img"
      aria-label={ariaLabel}
    >
      <defs>
        <radialGradient id="plan-glow" cx="50%" cy="45%" r="70%">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.12} />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
        </radialGradient>
      </defs>
      <path
        d={pathFrom(floor)}
        fill="url(#plan-glow)"
        className="stroke-primary/55"
        strokeWidth={unit * 0.6}
        strokeLinejoin="round"
      />

      {ceilings.map(({ id, layout }) => (
        <g key={id} opacity={0.5}>
          {layout.runs.map((run) => (
            <polyline
              key={run.key}
              points={run.points.map((point) => `${point.x},${point.z}`).join(" ")}
              fill="none"
              stroke={getDrapeColorHex(run.color)}
              strokeOpacity={0.55}
              strokeWidth={Math.max(unit * 0.5, Math.min(run.width, unit * 2.4))}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {layout.drops.map((drop, index) => (
            <circle key={index} cx={drop.x} cy={drop.z} r={unit * 1.4} className="fill-primary/40" />
          ))}
          {layout.hub ? (
            <circle cx={layout.hub.x} cy={layout.hub.z} r={unit * 1.6} className="fill-primary" />
          ) : null}
        </g>
      ))}

      {design.objects
        .filter((object) => !object.hidden)
        .map((object) => {
          const isRound = ROUND_TYPES.has(object.type);
          const isFloor = object.type === "dance_floor" || object.type === "stage";
          return (
            <g
              key={object.id}
              transform={`translate(${object.x} ${object.z}) rotate(${object.rotation})`}
            >
              {isRound ? (
                <circle
                  r={Math.max(object.width, object.depth) / 2}
                  className="fill-primary/30 stroke-primary/70"
                  strokeWidth={unit * 0.25}
                />
              ) : (
                <rect
                  x={-object.width / 2}
                  y={-object.depth / 2}
                  width={object.width}
                  height={object.depth}
                  rx={unit * 0.4}
                  className={isFloor ? "fill-foreground/10 stroke-foreground/40" : "fill-primary/25 stroke-primary/65"}
                  strokeWidth={unit * 0.25}
                />
              )}
            </g>
          );
        })}

      {design.drapeRuns
        .filter((run) => !run.hidden)
        .flatMap((run) =>
          getDrapeRunSegments(run, design.openings).map((segment, index) => {
            const line = wallLine(run.wallIndex, segment.start, segment.end, unit * 1.1);
            return line ? (
              <line
                key={`${run.id}-${index}`}
                {...line}
                stroke={getDrapeColorHex(run.color)}
                strokeWidth={unit * 1.1}
                strokeLinecap="round"
              />
            ) : null;
          })
        )}

      {design.treatments
        .filter((treatment) => !treatment.hidden)
        .map((treatment) => {
          const line = wallLine(
            treatment.anchor.wallIndex,
            treatment.anchor.startOffset,
            treatment.anchor.endOffset,
            unit * 2.6
          );
          return line ? (
            <line
              key={treatment.id}
              {...line}
              stroke={getDrapeColorHex(treatment.color)}
              strokeWidth={unit * 1.6}
              strokeLinecap="round"
              className="drop-shadow-[0_0_2px_rgba(0,0,0,0.6)]"
            />
          ) : null;
        })}

      {design.openings
        .filter((opening) => !opening.hidden)
        .map((opening) => {
          const line = wallLine(opening.wallIndex, opening.offset, opening.offset + opening.width, 0);
          if (!line) return null;
          const isWindow = opening.type === "window";
          return (
            <line
              key={opening.id}
              {...line}
              className={isWindow ? "stroke-sky-200/80" : "stroke-background"}
              strokeWidth={isWindow ? unit * 0.9 : unit * 1.6}
              strokeLinecap="butt"
            />
          );
        })}

      {front && frontNormal ? (
        <text
          x={front.center.x + frontNormal.x * unit * 4.5}
          y={front.center.z + frontNormal.z * unit * 4.5}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={unit * 3.2}
          letterSpacing={unit * 0.6}
          className="fill-primary font-semibold"
        >
          {frontLabel}
        </text>
      ) : null}
    </svg>
  );
});
