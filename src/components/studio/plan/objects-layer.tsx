"use client";

import type { StudioObject } from "@/data/studio";
import { cn } from "@/lib/utils";
import { memo } from "react";
import { setStudioHoveredId } from "../editor/hover-store";
import { isCircularObjectType } from "./object-geometry";
import { PlanObjectSymbol, planSymbolDetail, type PlanSymbolDetail } from "./object-symbols";

export type PlanObjectPointerHandler = (
  event: React.PointerEvent<SVGGElement>,
  object: StudioObject
) => void;

type ItemProps = {
  object: StudioObject;
  selected: boolean;
  /** Ceiling mode: floor objects are inert and skipped by Tab. */
  ceilingMode: boolean;
  /** Select tool active (and Space not held): show move / pointer cursors. */
  grabbable: boolean;
  zoom: number;
  showSeating: boolean;
  detail: PlanSymbolDetail;
  onPointerDown: PlanObjectPointerHandler;
  onActivate: (object: StudioObject, additive: boolean) => void;
};

/**
 * One floor object: memoized symbol plus hit target and keyboard focus ring.
 * Skips re-rendering unless this object, its selection or the zoom changes.
 */
const PlanObjectItem = memo(function PlanObjectItem({
  object,
  selected,
  ceilingMode,
  grabbable,
  zoom,
  showSeating,
  detail,
  onPointerDown,
  onActivate,
}: ItemProps) {
  const circular = isCircularObjectType(object.type);
  const overhead = object.type === "ceiling_drape";
  const hitProps = overhead
    ? {
        fill: "none",
        stroke: "transparent",
        strokeWidth: 14 / zoom,
        pointerEvents: ceilingMode ? ("none" as const) : ("stroke" as const),
      }
    : { fill: "transparent" };
  return (
    <g
      data-studio-item={object.id}
      role="button"
      tabIndex={ceilingMode ? -1 : 0}
      aria-pressed={selected}
      aria-label={`${object.label}${object.locked ? ", locked" : ""}`}
      className={cn(
        "touch-none outline-none focus-visible:[&_.studio-focus]:opacity-100",
        grabbable ? (object.locked ? "cursor-pointer" : "cursor-move") : undefined
      )}
      onPointerDown={(event) => onPointerDown(event, object)}
      onPointerEnter={() => setStudioHoveredId(object.id)}
      onPointerLeave={() => setStudioHoveredId(null)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onActivate(object, event.shiftKey);
        }
      }}
    >
      <g pointerEvents="none">
        <PlanObjectSymbol object={object} showSeating={showSeating} detail={detail} />
      </g>
      <g transform={`translate(${object.x} ${object.z}) rotate(${object.rotation})`}>
        {circular ? (
          <ellipse rx={object.width / 2} ry={object.depth / 2} {...hitProps} />
        ) : (
          <rect
            x={-object.width / 2}
            y={-object.depth / 2}
            width={object.width}
            height={object.depth}
            {...hitProps}
          />
        )}
        {overhead ? (
          <circle r={Math.min(object.width, object.depth) * 0.08 + 4 / zoom} fill="transparent" />
        ) : null}
        <rect
          className="studio-focus pointer-events-none opacity-0"
          x={-object.width / 2 - 4 / zoom}
          y={-object.depth / 2 - 4 / zoom}
          width={object.width + 8 / zoom}
          height={object.depth + 8 / zoom}
          rx={4 / zoom}
          fill="none"
          stroke="var(--ring)"
          strokeWidth={3}
          vectorEffect="non-scaling-stroke"
        />
      </g>
    </g>
  );
});

/**
 * Floor objects in paint order. Memoized with stable handlers so camera pans
 * skip it entirely and a drag only re-renders the objects that moved.
 */
export const PlanObjectsLayer = memo(function PlanObjectsLayer({
  objects,
  selectedIds,
  ceilingMode,
  grabbable,
  zoom,
  showSeating,
  onObjectPointerDown,
  onObjectActivate,
}: {
  objects: readonly StudioObject[];
  selectedIds: ReadonlySet<string>;
  ceilingMode: boolean;
  grabbable: boolean;
  zoom: number;
  showSeating: boolean;
  onObjectPointerDown: PlanObjectPointerHandler;
  onObjectActivate: (object: StudioObject, additive: boolean) => void;
}) {
  const detail = planSymbolDetail(zoom);
  return (
    <g aria-label="Room objects">
      {objects.map((object) => (
        <PlanObjectItem
          key={object.id}
          object={object}
          selected={selectedIds.has(object.id)}
          ceilingMode={ceilingMode}
          grabbable={grabbable}
          zoom={zoom}
          showSeating={showSeating}
          detail={detail}
          onPointerDown={onObjectPointerDown}
          onActivate={onObjectActivate}
        />
      ))}
    </g>
  );
});
