"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  createLShapeRoom,
  createRectangleRoom,
  feetToInches,
  getStudioBounds,
  inchesToFeetLabel,
} from "@/lib/studio-geometry";
import type { EventBuilderBrief, EventBuilderRoomShape } from "@/data/event-builder/brief";
import { cn } from "@/lib/utils";

type EventRoomShapeCanvasProps = {
  room: EventBuilderBrief["room"];
  interactive: boolean;
  className?: string;
  ariaLabel?: string;
  onRoomChange?: (patch: Partial<EventBuilderBrief["room"]>) => void;
};

type DragHandle =
  | "south_east"
  | "east"
  | "south"
  | "cutout";

type DragSession = {
  pointerId: number;
  handle: DragHandle;
  startPointer: { x: number; z: number };
  startRoom: EventBuilderBrief["room"];
};

const MIN_RECT_FT = 10;
const MIN_L_FT = 24;
const MIN_CUTOUT_FT = 8;
const MAX_FT = 200;

function clampFt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function pointerInSvg(
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

function roomPolygon(shape: EventBuilderRoomShape, room: EventBuilderBrief["room"]) {
  const widthIn = feetToInches(room.widthFt);
  const lengthIn = feetToInches(room.lengthFt);
  if (shape === "l_shape") {
    return createLShapeRoom(
      widthIn,
      lengthIn,
      feetToInches(room.cutoutWidthFt ?? 20),
      feetToInches(room.cutoutDepthFt ?? 20)
    );
  }
  return createRectangleRoom(widthIn, lengthIn);
}

function polygonPath(points: Array<{ x: number; z: number }>): string {
  if (points.length === 0) return "";
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.z}`)
    .join(" ") + " Z";
}

export function EventRoomShapeCanvas({
  room,
  interactive,
  className,
  ariaLabel,
  onRoomChange,
}: EventRoomShapeCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<DragSession | null>(null);
  const [badge, setBadge] = useState<string | null>(null);

  const floor = useMemo(
    () => roomPolygon(room.shape, room),
    [room]
  );
  const bounds = useMemo(() => getStudioBounds(floor), [floor]);
  const padding = Math.max(48, Math.max(bounds.width, bounds.depth) * 0.18);
  const viewBox = `${bounds.minX - padding} ${bounds.minZ - padding} ${bounds.width + padding * 2} ${bounds.depth + padding * 2}`;
  const longest = Math.max(bounds.width, bounds.depth, 120);
  const handleRadius = Math.max(8, longest / 90);
  const labelSize = Math.max(11, longest / 52);

  const widthIn = feetToInches(room.widthFt);
  const lengthIn = feetToInches(room.lengthFt);
  const cutoutWidthIn = feetToInches(room.cutoutWidthFt ?? 20);
  const cutoutDepthIn = feetToInches(room.cutoutDepthFt ?? 20);

  const cutoutInnerX = widthIn - cutoutWidthIn;
  const cutoutInnerZ = lengthIn - cutoutDepthIn;

  const applyRoomPatch = useCallback(
    (patch: Partial<EventBuilderBrief["room"]>) => {
      onRoomChange?.(patch);
    },
    [onRoomChange]
  );

  function beginDrag(
    event: React.PointerEvent<SVGCircleElement>,
    handle: DragHandle
  ) {
    if (!interactive || !onRoomChange) return;
    const svg = svgRef.current;
    if (!svg) return;
    const startPointer = pointerInSvg(svg, event);
    if (!startPointer) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      handle,
      startPointer,
      startRoom: { ...room },
    };
    setBadge(
      `${room.widthFt}′ × ${room.lengthFt}′`
    );
  }

  function onPointerMove(event: React.PointerEvent<SVGSVGElement>) {
    const session = dragRef.current;
    if (!session || session.pointerId !== event.pointerId || !onRoomChange) return;
    const svg = svgRef.current;
    if (!svg) return;
    const pointer = pointerInSvg(svg, event);
    if (!pointer) return;

    const minSide = room.shape === "l_shape" ? MIN_L_FT : MIN_RECT_FT;
    const pointerWidthFt = clampFt(pointer.x / 12, minSide, MAX_FT);
    const pointerLengthFt = clampFt(pointer.z / 12, minSide, MAX_FT);

    if (room.shape === "rectangle") {
      const patch: Partial<EventBuilderBrief["room"]> = {};
      if (session.handle === "east" || session.handle === "south_east") {
        patch.widthFt = pointerWidthFt;
      }
      if (session.handle === "south" || session.handle === "south_east") {
        patch.lengthFt = pointerLengthFt;
      }
      if (Object.keys(patch).length > 0) {
        applyRoomPatch(patch);
        setBadge(
          `${patch.widthFt ?? room.widthFt}′ × ${patch.lengthFt ?? room.lengthFt}′`
        );
      }
      return;
    }

    // L-shape
    if (
      session.handle === "east" ||
      session.handle === "south" ||
      session.handle === "south_east"
    ) {
      const nextWidth =
        session.handle === "south" ? room.widthFt : pointerWidthFt;
      const nextLength =
        session.handle === "east" ? room.lengthFt : pointerLengthFt;
      const patch: Partial<EventBuilderBrief["room"]> = {
        widthFt: nextWidth,
        lengthFt: nextLength,
        cutoutWidthFt: clampFt(
          room.cutoutWidthFt ?? 20,
          MIN_CUTOUT_FT,
          nextWidth - MIN_CUTOUT_FT
        ),
        cutoutDepthFt: clampFt(
          room.cutoutDepthFt ?? 20,
          MIN_CUTOUT_FT,
          nextLength - MIN_CUTOUT_FT
        ),
      };
      applyRoomPatch(patch);
      setBadge(`${nextWidth}′ × ${nextLength}′`);
      return;
    }
    if (session.handle === "cutout") {
      const nextWidth = clampFt(room.widthFt, MIN_L_FT, MAX_FT);
      const nextLength = clampFt(room.lengthFt, MIN_L_FT, MAX_FT);
      const innerXFt = clampFt(pointer.x / 12, MIN_CUTOUT_FT, nextWidth - MIN_CUTOUT_FT);
      const innerZFt = clampFt(pointer.z / 12, MIN_CUTOUT_FT, nextLength - MIN_CUTOUT_FT);
      applyRoomPatch({
        cutoutWidthFt: nextWidth - innerXFt,
        cutoutDepthFt: nextLength - innerZFt,
      });
      setBadge(`${nextWidth}′ × ${nextLength}′`);
    }
  }

  function endDrag(event: React.PointerEvent<SVGSVGElement>) {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setBadge(null);
  }

  const gridStep = Math.max(12, Math.round(longest / 12));

  return (
    <div
      className={cn(
        "relative flex flex-col overflow-hidden rounded-3xl border border-primary/25 bg-[radial-gradient(circle_at_20%_0%,color-mix(in_oklch,var(--primary)_10%,transparent),transparent_55%)] shadow-lg",
        className
      )}
    >
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(color-mix(in oklch, var(--border) 55%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in oklch, var(--border) 55%, transparent) 1px, transparent 1px)",
          backgroundSize: `${gridStep}px ${gridStep}px`,
        }}
      />
      <svg
        ref={svgRef}
        viewBox={viewBox}
        className="relative z-[1] h-full min-h-[200px] w-full flex-1 touch-none select-none"
        role="img"
        aria-label={ariaLabel}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <path
          d={polygonPath(floor)}
          fill="color-mix(in oklch, var(--primary) 22%, var(--card))"
          stroke="var(--primary)"
          strokeWidth={Math.max(2, longest / 180)}
          vectorEffect="non-scaling-stroke"
        />

        <text
          x={widthIn / 2}
          y={-padding * 0.35}
          textAnchor="middle"
          fontSize={labelSize}
          fill="var(--muted-foreground)"
          className="font-semibold"
        >
          {inchesToFeetLabel(widthIn)}
        </text>
        <text
          x={-padding * 0.35}
          y={lengthIn / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={labelSize}
          fill="var(--muted-foreground)"
          transform={`rotate(-90 ${-padding * 0.35} ${lengthIn / 2})`}
          className="font-semibold"
        >
          {inchesToFeetLabel(lengthIn)}
        </text>

        {interactive ? (
          <>
            <ResizeHandle
              cx={widthIn}
              cy={lengthIn}
              r={handleRadius}
              cursor="cursor-nwse-resize"
              label="Resize room southeast corner"
              onPointerDown={(event) => beginDrag(event, "south_east")}
            />
            <ResizeHandle
              cx={widthIn}
              cy={lengthIn / 2}
              r={handleRadius}
              cursor="cursor-ew-resize"
              label="Resize east wall"
              onPointerDown={(event) => beginDrag(event, "east")}
            />
            <ResizeHandle
              cx={widthIn / 2}
              cy={lengthIn}
              r={handleRadius}
              cursor="cursor-ns-resize"
              label="Resize south wall"
              onPointerDown={(event) => beginDrag(event, "south")}
            />
            {room.shape === "l_shape" ? (
              <ResizeHandle
                cx={cutoutInnerX}
                cy={cutoutInnerZ}
                r={handleRadius}
                cursor="cursor-nwse-resize"
                label="Adjust L-shape cutout"
                onPointerDown={(event) => beginDrag(event, "cutout")}
                variant="inner"
              />
            ) : null}
          </>
        ) : null}
      </svg>

      {badge ? (
        <div className="absolute left-3 top-3 z-[2] rounded-full border border-primary/30 bg-background/90 px-3 py-1 text-xs font-semibold shadow-sm">
          {badge}
        </div>
      ) : null}
    </div>
  );
}

function ResizeHandle({
  cx,
  cy,
  r,
  cursor,
  label,
  variant = "outer",
  onPointerDown,
}: {
  cx: number;
  cy: number;
  r: number;
  cursor: string;
  label: string;
  variant?: "outer" | "inner";
  onPointerDown: (event: React.PointerEvent<SVGCircleElement>) => void;
}) {
  return (
    <circle
      cx={cx}
      cy={cy}
      r={r}
      fill={variant === "inner" ? "var(--card)" : "var(--background)"}
      stroke="var(--primary)"
      strokeWidth={variant === "inner" ? 2.5 : 3}
      vectorEffect="non-scaling-stroke"
      className={cn(cursor, "touch-none")}
      role="button"
      aria-label={label}
      onPointerDown={onPointerDown}
    />
  );
}
