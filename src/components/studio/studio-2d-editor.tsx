"use client";

import { getDrapeColorHex } from "@/data/studio";
import {
  clampOpeningToWall,
  getPointAlongWall,
  getPolygonCentroid,
  getStudioBounds,
  getWallSegments,
  inchesToFeetLabel,
} from "@/lib/studio-geometry";
import { useMemo } from "react";
import type { StudioEditorProps, StudioSelection } from "./studio-types";

function isSelected(
  selection: StudioSelection,
  kind: Exclude<NonNullable<StudioSelection>["kind"], "wall">,
  id: string
) {
  return selection?.kind === kind && selection.id === id;
}

function activate(
  event: React.KeyboardEvent<SVGGElement>,
  callback: () => void
) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    callback();
  }
}

export function Studio2DEditor({
  design,
  selection,
  onSelect,
}: StudioEditorProps) {
  const walls = useMemo(
    () => getWallSegments(design.room.floor),
    [design.room.floor]
  );
  const bounds = useMemo(
    () => getStudioBounds(design.room.floor),
    [design.room.floor]
  );
  const centroid = useMemo(
    () => getPolygonCentroid(design.room.floor),
    [design.room.floor]
  );
  const longest = Math.max(bounds.width, bounds.depth, 120);
  const padding = Math.max(84, longest * 0.22);
  const viewBox = `${bounds.minX - padding} ${bounds.minZ - padding} ${bounds.width + padding * 2} ${bounds.depth + padding * 2}`;
  const labelSize = Math.max(12, longest / 48);

  return (
    <div className="relative h-full min-h-[420px] overflow-hidden bg-[radial-gradient(circle_at_50%_30%,color-mix(in_oklch,var(--primary)_7%,transparent),transparent_50%)]">
      <svg
        viewBox={viewBox}
        className="size-full touch-manipulation"
        role="group"
        aria-labelledby="studio-plan-title studio-plan-description"
        onClick={() => onSelect(null)}
      >
        <title id="studio-plan-title">{design.room.name} floor plan editor</title>
        <desc id="studio-plan-description">
          Interactive top-down plan. Tab to walls, drape runs, openings, and
          room objects; press Enter or Space to select.
        </desc>
        <defs>
          <pattern
            id="studio-grid-small"
            width="12"
            height="12"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 12 0 L 0 0 0 12"
              fill="none"
              stroke="currentColor"
              strokeOpacity="0.055"
              strokeWidth="0.75"
            />
          </pattern>
          <pattern
            id="studio-grid-large"
            width="60"
            height="60"
            patternUnits="userSpaceOnUse"
          >
            <rect width="60" height="60" fill="url(#studio-grid-small)" />
            <path
              d="M 60 0 L 0 0 0 60"
              fill="none"
              stroke="currentColor"
              strokeOpacity="0.1"
              strokeWidth="1"
            />
          </pattern>
          <filter id="studio-selection-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect
          x={bounds.minX - padding}
          y={bounds.minZ - padding}
          width={bounds.width + padding * 2}
          height={bounds.depth + padding * 2}
          fill="url(#studio-grid-large)"
          className="text-foreground"
        />

        <polygon
          points={design.room.floor.map((point) => `${point.x},${point.z}`).join(" ")}
          fill="color-mix(in oklch, var(--card) 82%, var(--primary) 4%)"
          stroke="color-mix(in oklch, var(--foreground) 55%, transparent)"
          strokeWidth={Math.max(3, longest / 210)}
          strokeLinejoin="round"
        />

        {walls.map((wall) => {
          const selected =
            selection?.kind === "wall" && selection.index === wall.index;
          let normalX = -Math.sin(wall.angle);
          let normalZ = Math.cos(wall.angle);
          const towardCenterX = centroid.x - wall.center.x;
          const towardCenterZ = centroid.z - wall.center.z;
          if (normalX * towardCenterX + normalZ * towardCenterZ > 0) {
            normalX *= -1;
            normalZ *= -1;
          }
          const dimensionOffset = labelSize * 2.8;
          const tickLength = labelSize * 0.65;
          const dimensionStart = {
            x: wall.start.x + normalX * dimensionOffset,
            z: wall.start.z + normalZ * dimensionOffset,
          };
          const dimensionEnd = {
            x: wall.end.x + normalX * dimensionOffset,
            z: wall.end.z + normalZ * dimensionOffset,
          };
          const labelX = wall.center.x + normalX * dimensionOffset;
          const labelZ = wall.center.z + normalZ * dimensionOffset;
          return (
            <g
              key={wall.index}
              role="button"
              tabIndex={0}
              aria-pressed={selected}
              aria-label={`Select wall ${wall.index + 1}, ${inchesToFeetLabel(wall.length)}`}
              onClick={(event) => {
                event.stopPropagation();
                onSelect({ kind: "wall", index: wall.index });
              }}
              onKeyDown={(event) =>
                activate(event, () =>
                  onSelect({ kind: "wall", index: wall.index })
                )
              }
              className="cursor-pointer outline-none focus:[&_.studio-focus]:opacity-100"
            >
              <line
                x1={wall.start.x}
                y1={wall.start.z}
                x2={wall.end.x}
                y2={wall.end.z}
                stroke="transparent"
                strokeWidth={Math.max(20, longest / 42)}
              />
              <line
                x1={wall.start.x}
                y1={wall.start.z}
                x2={wall.end.x}
                y2={wall.end.z}
                stroke={
                  selected
                    ? "var(--primary)"
                    : "color-mix(in oklch, var(--foreground) 76%, var(--background))"
                }
                strokeWidth={selected ? 9 : 6}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                filter={selected ? "url(#studio-selection-glow)" : undefined}
              />
              <line
                className="studio-focus pointer-events-none opacity-0"
                x1={wall.start.x}
                y1={wall.start.z}
                x2={wall.end.x}
                y2={wall.end.z}
                stroke="var(--ring)"
                strokeWidth="14"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
              <g
                className="pointer-events-none"
                stroke="var(--muted-foreground)"
                strokeWidth={1.25}
                opacity={0.78}
              >
                <line
                  x1={wall.start.x}
                  y1={wall.start.z}
                  x2={dimensionStart.x + normalX * tickLength}
                  y2={dimensionStart.z + normalZ * tickLength}
                />
                <line
                  x1={wall.end.x}
                  y1={wall.end.z}
                  x2={dimensionEnd.x + normalX * tickLength}
                  y2={dimensionEnd.z + normalZ * tickLength}
                />
                <line
                  x1={dimensionStart.x}
                  y1={dimensionStart.z}
                  x2={dimensionEnd.x}
                  y2={dimensionEnd.z}
                />
                <line
                  x1={dimensionStart.x - normalX * tickLength * 0.45}
                  y1={dimensionStart.z - normalZ * tickLength * 0.45}
                  x2={dimensionStart.x + normalX * tickLength * 0.45}
                  y2={dimensionStart.z + normalZ * tickLength * 0.45}
                />
                <line
                  x1={dimensionEnd.x - normalX * tickLength * 0.45}
                  y1={dimensionEnd.z - normalZ * tickLength * 0.45}
                  x2={dimensionEnd.x + normalX * tickLength * 0.45}
                  y2={dimensionEnd.z + normalZ * tickLength * 0.45}
                />
              </g>
              <text
                x={labelX}
                y={labelZ}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={labelSize}
                fill="var(--muted-foreground)"
                stroke="var(--background)"
                strokeWidth={labelSize * 0.42}
                paintOrder="stroke"
                className="pointer-events-none font-semibold"
              >
                {inchesToFeetLabel(wall.length)}
              </text>
            </g>
          );
        })}

        {design.drapeRuns.map((run) => {
          const wall = walls[run.wallIndex];
          if (!wall) return null;
          const start = getPointAlongWall(wall, run.startOffset);
          const end = getPointAlongWall(wall, run.endOffset);
          const selected = isSelected(selection, "drape", run.id);
          const normalX = -Math.sin(wall.angle) * 8;
          const normalZ = Math.cos(wall.angle) * 8;
          return (
            <g
              key={run.id}
              role="button"
              tabIndex={0}
              aria-pressed={selected}
              aria-label={`Select ${run.label}`}
              className="cursor-pointer outline-none focus:[&_.studio-focus]:opacity-100"
              onClick={(event) => {
                event.stopPropagation();
                onSelect({ kind: "drape", id: run.id });
              }}
              onKeyDown={(event) =>
                activate(event, () => onSelect({ kind: "drape", id: run.id }))
              }
            >
              <line
                x1={start.x + normalX}
                y1={start.z + normalZ}
                x2={end.x + normalX}
                y2={end.z + normalZ}
                stroke="transparent"
                strokeWidth="24"
                vectorEffect="non-scaling-stroke"
              />
              <line
                x1={start.x + normalX}
                y1={start.z + normalZ}
                x2={end.x + normalX}
                y2={end.z + normalZ}
                stroke={getDrapeColorHex(run.color)}
                strokeWidth={selected ? 12 : 8}
                strokeDasharray={run.type === "divider" ? "14 8" : undefined}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                filter={selected ? "url(#studio-selection-glow)" : undefined}
              />
              <line
                className="studio-focus pointer-events-none opacity-0"
                x1={start.x + normalX}
                y1={start.z + normalZ}
                x2={end.x + normalX}
                y2={end.z + normalZ}
                stroke="var(--ring)"
                strokeWidth="16"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          );
        })}

        {design.openings.map((opening) => {
          const wall = walls[opening.wallIndex];
          if (!wall) return null;
          const safeOpening = clampOpeningToWall(
            opening,
            design.room.floor
          );
          const start = getPointAlongWall(wall, safeOpening.offset);
          const end = getPointAlongWall(
            wall,
            safeOpening.offset + safeOpening.width
          );
          const selected = isSelected(selection, "opening", opening.id);
          return (
            <g
              key={opening.id}
              role="button"
              tabIndex={0}
              aria-pressed={selected}
              aria-label={`Select ${opening.label}`}
              className="cursor-pointer outline-none focus:[&_.studio-focus]:opacity-100"
              onClick={(event) => {
                event.stopPropagation();
                onSelect({ kind: "opening", id: opening.id });
              }}
              onKeyDown={(event) =>
                activate(event, () =>
                  onSelect({ kind: "opening", id: opening.id })
                )
              }
            >
              <line
                x1={start.x}
                y1={start.z}
                x2={end.x}
                y2={end.z}
                stroke="var(--background)"
                strokeWidth="12"
                vectorEffect="non-scaling-stroke"
              />
              <line
                x1={start.x}
                y1={start.z}
                x2={end.x}
                y2={end.z}
                stroke={selected ? "var(--primary)" : "var(--muted-foreground)"}
                strokeWidth="4"
                strokeDasharray="7 4"
                vectorEffect="non-scaling-stroke"
              />
              <line
                className="studio-focus pointer-events-none opacity-0"
                x1={start.x}
                y1={start.z}
                x2={end.x}
                y2={end.z}
                stroke="var(--ring)"
                strokeWidth="12"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          );
        })}

        {design.objects.map((object) => {
          const selected = isSelected(selection, "object", object.id);
          return (
            <g
              key={object.id}
              role="button"
              tabIndex={0}
              aria-pressed={selected}
              aria-label={`Select ${object.label}`}
              className="cursor-pointer outline-none focus:[&_.studio-focus]:opacity-100"
              transform={`rotate(${object.rotation} ${object.x} ${object.z})`}
              onClick={(event) => {
                event.stopPropagation();
                onSelect({ kind: "object", id: object.id });
              }}
              onKeyDown={(event) =>
                activate(event, () => onSelect({ kind: "object", id: object.id }))
              }
            >
              <rect
                x={object.x - object.width / 2}
                y={object.z - object.depth / 2}
                width={object.width}
                height={object.depth}
                rx={Math.min(12, object.width / 10, object.depth / 10)}
                fill={
                  selected
                    ? "color-mix(in oklch, var(--primary) 28%, var(--card))"
                    : "color-mix(in oklch, var(--muted) 75%, var(--card))"
                }
                stroke={selected ? "var(--primary)" : "var(--muted-foreground)"}
                strokeWidth={selected ? 4 : 2}
                vectorEffect="non-scaling-stroke"
                filter={selected ? "url(#studio-selection-glow)" : undefined}
              />
              <rect
                className="studio-focus pointer-events-none opacity-0"
                x={object.x - object.width / 2 - labelSize * 0.35}
                y={object.z - object.depth / 2 - labelSize * 0.35}
                width={object.width + labelSize * 0.7}
                height={object.depth + labelSize * 0.7}
                rx={Math.min(14, object.width / 10, object.depth / 10)}
                fill="none"
                stroke="var(--ring)"
                strokeWidth="5"
                vectorEffect="non-scaling-stroke"
              />
              <text
                x={object.x}
                y={object.z}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={labelSize * 0.85}
                fill="var(--foreground)"
                className="pointer-events-none font-medium"
              >
                {object.label}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="pointer-events-none absolute bottom-3 left-3 rounded-full border border-border/60 bg-background/80 px-3 py-1 text-[0.65rem] text-muted-foreground shadow-sm backdrop-blur">
        Dimensions in feet · click any element to inspect
      </div>
    </div>
  );
}
