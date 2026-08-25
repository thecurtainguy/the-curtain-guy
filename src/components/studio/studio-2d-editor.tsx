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
import {
  moveStudioObject,
  replaceStudioObject,
  resizeCircularStudioObject,
  resizeRectangleRoom,
  resizeStudioObjectFromCorner,
  type StudioResizeHandle,
  type StudioRoomResizeHandle,
} from "@/lib/studio-interactions";
import { useMemo, useRef, useState } from "react";
import { TreatmentOverlay2D } from "./treatment-overlay-2d";
import type { StudioEditorProps, StudioSelection } from "./studio-types";

type DragSession =
  | {
      kind: "room";
      pointerId: number;
      start: { x: number; z: number };
      originalDesign: StudioEditorProps["design"];
      handle: StudioRoomResizeHandle;
    }
  | {
      kind: "object_move";
      pointerId: number;
      start: { x: number; z: number };
      originalDesign: StudioEditorProps["design"];
      object: StudioEditorProps["design"]["objects"][number];
    }
  | {
      kind: "object_resize";
      pointerId: number;
      originalDesign: StudioEditorProps["design"];
      object: StudioEditorProps["design"]["objects"][number];
      handle: StudioResizeHandle | "diameter";
    };

type DragBadge = {
  label: string;
  snapping: boolean;
};

const roomHandles: Array<{
  handle: StudioRoomResizeHandle;
  x: (bounds: ReturnType<typeof getStudioBounds>) => number;
  z: (bounds: ReturnType<typeof getStudioBounds>) => number;
  cursor: string;
  label: string;
}> = [
  { handle: "north_west", x: (b) => b.minX, z: (b) => b.minZ, cursor: "cursor-nwse-resize", label: "Resize room from northwest corner" },
  { handle: "north", x: (b) => b.centerX, z: (b) => b.minZ, cursor: "cursor-ns-resize", label: "Resize north room edge" },
  { handle: "north_east", x: (b) => b.maxX, z: (b) => b.minZ, cursor: "cursor-nesw-resize", label: "Resize room from northeast corner" },
  { handle: "east", x: (b) => b.maxX, z: (b) => b.centerZ, cursor: "cursor-ew-resize", label: "Resize east room edge" },
  { handle: "south_east", x: (b) => b.maxX, z: (b) => b.maxZ, cursor: "cursor-nwse-resize", label: "Resize room from southeast corner" },
  { handle: "south", x: (b) => b.centerX, z: (b) => b.maxZ, cursor: "cursor-ns-resize", label: "Resize south room edge" },
  { handle: "south_west", x: (b) => b.minX, z: (b) => b.maxZ, cursor: "cursor-nesw-resize", label: "Resize room from southwest corner" },
  { handle: "west", x: (b) => b.minX, z: (b) => b.centerZ, cursor: "cursor-ew-resize", label: "Resize west room edge" },
];

const objectHandles: Array<{
  handle: StudioResizeHandle;
  x: -1 | 1;
  z: -1 | 1;
  cursor: string;
}> = [
  { handle: "north_west", x: -1, z: -1, cursor: "cursor-nwse-resize" },
  { handle: "north_east", x: 1, z: -1, cursor: "cursor-nesw-resize" },
  { handle: "south_east", x: 1, z: 1, cursor: "cursor-nwse-resize" },
  { handle: "south_west", x: -1, z: 1, cursor: "cursor-nesw-resize" },
];

function pointerInDesign(
  svg: SVGSVGElement,
  event: Pick<React.PointerEvent<SVGElement>, "clientX" | "clientY">
) {
  const matrix = svg.getScreenCTM();
  if (!matrix) return null;
  const point =
    typeof svg.createSVGPoint === "function"
      ? svg.createSVGPoint()
      : new DOMPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  const transformed = point.matrixTransform(matrix.inverse());
  return { x: transformed.x, z: transformed.y };
}

function isCircularObject(type: string) {
  return type === "round_table" || type === "cocktail_table";
}

function getObjectFill(object: StudioEditorProps["design"]["objects"][number]) {
  if (object.type === "dance_floor") {
    const finish = object.finish ?? "white_gloss";
    if (finish === "checkerboard") return "url(#studio-checkerboard)";
    if (finish === "warm_parquet") return "url(#studio-parquet)";
    if (finish === "oak") return "url(#studio-oak)";
    if (finish === "dark_wood") return "url(#studio-dark-wood)";
    if (finish === "led_starlit") return "url(#studio-starlit)";
    if (finish === "custom_wrap_monogram") return "url(#studio-custom-wrap)";
    if (finish === "black_gloss") return "#181818";
    if (finish === "neutral_event_carpet") return "#8b8273";
    return "#f1eee7";
  }
  if (object.type === "table_area" || object.type === "lounge_area") {
    return "color-mix(in oklch, var(--primary) 15%, transparent)";
  }
  return "color-mix(in oklch, var(--muted) 75%, var(--card))";
}

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
  onChange,
  selection,
  onSelect,
}: StudioEditorProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragSessionRef = useRef<DragSession | null>(null);
  const [dragBadge, setDragBadge] = useState<DragBadge | null>(null);
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
  const handleRadius = Math.max(7, longest / 105);

  function beginRoomResize(
    event: React.PointerEvent<SVGCircleElement>,
    handle: StudioRoomResizeHandle
  ) {
    const svg = svgRef.current;
    if (!svg) return;
    const start = pointerInDesign(svg, event);
    if (!start) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragSessionRef.current = {
      kind: "room",
      pointerId: event.pointerId,
      start,
      originalDesign: design,
      handle,
    };
    setDragBadge({
      label: `${inchesToFeetLabel(bounds.width)} × ${inchesToFeetLabel(bounds.depth)}`,
      snapping: !event.shiftKey,
    });
  }

  function beginObjectDrag(
    event: React.PointerEvent<SVGGElement>,
    object: StudioEditorProps["design"]["objects"][number]
  ) {
    const svg = svgRef.current;
    if (!svg) return;
    const start = pointerInDesign(svg, event);
    if (!start) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    onSelect({ kind: "object", id: object.id });
    dragSessionRef.current = {
      kind: "object_move",
      pointerId: event.pointerId,
      start,
      originalDesign: design,
      object: { ...object },
    };
    setDragBadge({
      label: `${inchesToFeetLabel(object.x)}, ${inchesToFeetLabel(object.z)}`,
      snapping: !event.shiftKey,
    });
  }

  function beginObjectResize(
    event: React.PointerEvent<SVGCircleElement>,
    object: StudioEditorProps["design"]["objects"][number],
    handle: StudioResizeHandle | "diameter"
  ) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragSessionRef.current = {
      kind: "object_resize",
      pointerId: event.pointerId,
      originalDesign: design,
      object: { ...object },
      handle,
    };
    setDragBadge({
      label: `${inchesToFeetLabel(object.width)} × ${inchesToFeetLabel(object.depth)}`,
      snapping: !event.shiftKey,
    });
  }

  function handlePointerMove(event: React.PointerEvent<SVGSVGElement>) {
    const session = dragSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) return;
    const pointer = pointerInDesign(event.currentTarget, event);
    if (!pointer) return;
    const options = { bypassSnap: event.shiftKey };
    if (session.kind === "room") {
      const next = resizeRectangleRoom(
        session.originalDesign,
        session.handle,
        {
          x: pointer.x - session.start.x,
          z: pointer.z - session.start.z,
        },
        options
      );
      onChange(next);
      const nextBounds = getStudioBounds(next.room.floor);
      setDragBadge({
        label: `${inchesToFeetLabel(nextBounds.width)} × ${inchesToFeetLabel(nextBounds.depth)}`,
        snapping: !event.shiftKey,
      });
      return;
    }
    if (session.kind === "object_move") {
      const nextObject = moveStudioObject(
        session.object,
        {
          x: pointer.x - session.start.x,
          z: pointer.z - session.start.z,
        },
        options
      );
      onChange(replaceStudioObject(session.originalDesign, nextObject));
      setDragBadge({
        label: `${inchesToFeetLabel(nextObject.x)}, ${inchesToFeetLabel(nextObject.z)}`,
        snapping: !event.shiftKey,
      });
      return;
    }
    const nextObject =
      session.handle === "diameter"
        ? resizeCircularStudioObject(session.object, pointer, options)
        : resizeStudioObjectFromCorner(
            session.object,
            session.handle,
            pointer,
            options
          );
    onChange(replaceStudioObject(session.originalDesign, nextObject));
    setDragBadge({
      label: isCircularObject(nextObject.type)
        ? `Ø ${inchesToFeetLabel(nextObject.width)}`
        : `${inchesToFeetLabel(nextObject.width)} × ${inchesToFeetLabel(nextObject.depth)}`,
      snapping: !event.shiftKey,
    });
  }

  function endDrag(event: React.PointerEvent<SVGSVGElement>) {
    const session = dragSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) return;
    dragSessionRef.current = null;
    setDragBadge(null);
  }

  return (
    <div className="relative h-full min-h-[420px] overflow-hidden bg-[radial-gradient(circle_at_50%_30%,color-mix(in_oklch,var(--primary)_7%,transparent),transparent_50%)]">
      <svg
        ref={svgRef}
        viewBox={viewBox}
        className="size-full"
        role="group"
        aria-labelledby="studio-plan-title studio-plan-description"
        onClick={() => {
          if (!dragSessionRef.current) onSelect(null);
        }}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <title id="studio-plan-title">
          {`${design.room.name} floor plan editor`}
        </title>
        <desc id="studio-plan-description">
          Interactive top-down plan. Tab to walls, drape runs, treatments,
          openings, and room objects; press Enter or Space to select.
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
          <pattern id="studio-checkerboard" width="24" height="24" patternUnits="userSpaceOnUse">
            <rect width="24" height="24" fill="#f4f1e9" />
            <path d="M0 0h12v12H0zM12 12h12v12H12z" fill="#171717" />
          </pattern>
          <pattern id="studio-parquet" width="32" height="16" patternUnits="userSpaceOnUse">
            <rect width="32" height="16" fill="#9b6b3e" />
            <path d="M0 0v16M16 0v16M32 0v16M0 8h32" stroke="#d2a26c" strokeWidth="2" />
          </pattern>
          <pattern id="studio-oak" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="20" height="20" fill="#bd9360" />
            <path d="M5 0v20M15 0v20" stroke="#8b6038" strokeWidth="1.5" />
          </pattern>
          <pattern id="studio-dark-wood" width="18" height="18" patternUnits="userSpaceOnUse">
            <rect width="18" height="18" fill="#4b3429" />
            <path d="M6 0v18M12 0v18" stroke="#8b6850" strokeWidth="1" />
          </pattern>
          <pattern id="studio-starlit" width="28" height="28" patternUnits="userSpaceOnUse">
            <rect width="28" height="28" fill="#101522" />
            <circle cx="5" cy="7" r="1.5" fill="#f7d675" />
            <circle cx="21" cy="18" r="1" fill="#dbe9ff" />
            <circle cx="13" cy="25" r="0.8" fill="#8ec5ff" />
          </pattern>
          <pattern id="studio-custom-wrap" width="48" height="48" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="48" height="48" fill="#e9dfcb" />
            <path d="M0 0v48M16 0v48M32 0v48M48 0v48" stroke="#b68b3f" strokeWidth="5" opacity=".7" />
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

        {design.room.shape === "rectangle" &&
          roomHandles.map((item) => (
            <circle
              key={item.handle}
              cx={item.x(bounds)}
              cy={item.z(bounds)}
              r={handleRadius}
              fill="var(--background)"
              stroke="var(--primary)"
              strokeWidth="3"
              vectorEffect="non-scaling-stroke"
              className={`${item.cursor} touch-none`}
              role="button"
              aria-label={item.label}
              onPointerDown={(event) => beginRoomResize(event, item.handle)}
              onClick={(event) => event.stopPropagation()}
            />
          ))}

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

        {design.treatments.map((treatment) => {
          const wall = walls[treatment.anchor.wallIndex];
          if (!wall) return null;
          return (
            <TreatmentOverlay2D
              key={treatment.id}
              treatment={treatment}
              wall={wall}
              selection={selection}
              onSelect={onSelect}
              handleRadius={handleRadius}
            />
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
          const circular = isCircularObject(object.type);
          const zone =
            object.type === "table_area" || object.type === "lounge_area";
          return (
            <g
              key={object.id}
              role="button"
              tabIndex={0}
              aria-pressed={selected}
              aria-label={`Select ${object.label}`}
              className="cursor-move touch-none outline-none focus:[&_.studio-focus]:opacity-100"
              transform={`rotate(${object.rotation} ${object.x} ${object.z})`}
              onPointerDown={(event) => beginObjectDrag(event, object)}
              onClick={(event) => {
                event.stopPropagation();
                onSelect({ kind: "object", id: object.id });
              }}
              onKeyDown={(event) =>
                activate(event, () => onSelect({ kind: "object", id: object.id }))
              }
            >
              {circular ? (
                <circle
                  cx={object.x}
                  cy={object.z}
                  r={object.width / 2}
                  fill={getObjectFill(object)}
                  stroke={selected ? "var(--primary)" : "var(--muted-foreground)"}
                  strokeWidth={selected ? 4 : 2}
                  vectorEffect="non-scaling-stroke"
                  filter={selected ? "url(#studio-selection-glow)" : undefined}
                />
              ) : (
                <rect
                  x={object.x - object.width / 2}
                  y={object.z - object.depth / 2}
                  width={object.width}
                  height={object.depth}
                  rx={zone ? 4 : Math.min(12, object.width / 10, object.depth / 10)}
                  fill={getObjectFill(object)}
                  fillOpacity={zone ? 0.68 : 1}
                  stroke={selected ? "var(--primary)" : "var(--muted-foreground)"}
                  strokeWidth={selected ? 4 : 2}
                  strokeDasharray={zone ? "8 5" : undefined}
                  vectorEffect="non-scaling-stroke"
                  filter={selected ? "url(#studio-selection-glow)" : undefined}
                />
              )}
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
              {selected && circular ? (
                <>
                  <line
                    x1={object.x}
                    y1={object.z}
                    x2={object.x + object.width / 2}
                    y2={object.z}
                    stroke="var(--primary)"
                    strokeWidth="2"
                    strokeDasharray="4 3"
                    vectorEffect="non-scaling-stroke"
                    className="pointer-events-none"
                  />
                  <circle
                    cx={object.x + object.width / 2}
                    cy={object.z}
                    r={handleRadius * 0.82}
                    fill="var(--background)"
                    stroke="var(--primary)"
                    strokeWidth="3"
                    vectorEffect="non-scaling-stroke"
                    className="cursor-ew-resize touch-none"
                    role="button"
                    aria-label={`Resize ${object.label} diameter`}
                    onPointerDown={(event) =>
                      beginObjectResize(event, object, "diameter")
                    }
                    onClick={(event) => event.stopPropagation()}
                  />
                </>
              ) : null}
              {selected && !circular
                ? objectHandles.map((item) => (
                    <circle
                      key={item.handle}
                      cx={object.x + (item.x * object.width) / 2}
                      cy={object.z + (item.z * object.depth) / 2}
                      r={handleRadius * 0.82}
                      fill="var(--background)"
                      stroke="var(--primary)"
                      strokeWidth="3"
                      vectorEffect="non-scaling-stroke"
                      className={`${item.cursor} touch-none`}
                      role="button"
                      aria-label={`Resize ${object.label} from ${item.handle.replace("_", " ")} corner`}
                      onPointerDown={(event) =>
                        beginObjectResize(event, object, item.handle)
                      }
                      onClick={(event) => event.stopPropagation()}
                    />
                  ))
                : null}
            </g>
          );
        })}
      </svg>

      {dragBadge ? (
        <div
          className="pointer-events-none absolute top-3 left-1/2 flex max-w-[calc(100%-1.5rem)] -translate-x-1/2 items-center gap-2 rounded-full border border-primary/35 bg-background/90 px-3 py-1.5 text-xs shadow-lg backdrop-blur"
          role="status"
        >
          <span className="font-semibold text-foreground">{dragBadge.label}</span>
          <span className="whitespace-nowrap text-primary">
            {dragBadge.snapping ? "Snap 12″ on" : "Free move"}
          </span>
        </div>
      ) : null}

      {design.room.shape !== "rectangle" ? (
        <div className="pointer-events-none absolute top-3 left-3 max-w-[min(18rem,calc(100%-1.5rem))] rounded-2xl border border-primary/20 bg-background/85 px-3 py-2 text-[0.68rem] leading-relaxed text-muted-foreground shadow-sm backdrop-blur">
          {design.room.shape === "l_shape"
            ? "L-shape resizing is guarded Beta. Use Room setup dimensions; direct edge editing is unavailable."
            : "Custom room direct editing is unavailable in Beta. The saved outline is preserved."}
        </div>
      ) : null}

      <div className="pointer-events-none absolute bottom-3 left-3 max-w-[calc(100%-1.5rem)] rounded-full border border-border/60 bg-background/80 px-3 py-1 text-[0.65rem] text-muted-foreground shadow-sm backdrop-blur">
        Drag objects or gold handles · 12″ snap · hold Shift for precision
      </div>
    </div>
  );
}
