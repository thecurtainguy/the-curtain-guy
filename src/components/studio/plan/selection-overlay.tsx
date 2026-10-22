"use client";

import type { StudioObject } from "@/data/studio";
import type { StudioResizeHandle } from "@/lib/studio-interactions";
import { memo } from "react";
import { useStudioHoveredId } from "../editor/hover-store";
import { isCircularObjectType, type PlanEdgeHandle } from "./object-geometry";
import type { PlanRect } from "./viewport";

export type PlanObjectHandle = StudioResizeHandle | PlanEdgeHandle;

type PointerHandler = (event: React.PointerEvent<SVGElement>) => void;

const CORNER_HANDLES: Array<{ handle: StudioResizeHandle; x: -1 | 1; z: -1 | 1 }> = [
  { handle: "north_west", x: -1, z: -1 },
  { handle: "north_east", x: 1, z: -1 },
  { handle: "south_east", x: 1, z: 1 },
  { handle: "south_west", x: -1, z: 1 },
];

const EDGE_HANDLES: Array<{ handle: PlanEdgeHandle; x: -1 | 0 | 1; z: -1 | 0 | 1 }> = [
  { handle: "north", x: 0, z: -1 },
  { handle: "east", x: 1, z: 0 },
  { handle: "south", x: 0, z: 1 },
  { handle: "west", x: -1, z: 0 },
];

const RESIZE_CURSORS = ["ew-resize", "nwse-resize", "ns-resize", "nesw-resize"];

/** Resize cursor for a handle direction after the object's rotation. */
export function cursorFor(x: number, z: number, rotation: number): string {
  const angle = (Math.atan2(z, x) * 180) / Math.PI + rotation;
  const normalized = ((angle % 180) + 180) % 180;
  return RESIZE_CURSORS[Math.round(normalized / 45) % 4];
}

export type ObjectStatus = "selected" | "hovered" | "conflict" | "conflict-selected";

type HaloProps = {
  fill: "none";
  stroke: string;
  strokeOpacity: number;
  strokeWidth: number;
  strokeLinejoin: "round";
  strokeLinecap: "round";
  vectorEffect: "non-scaling-stroke";
  pointerEvents: "none";
};

/**
 * Two soft, wide strokes drawn under a crisp selection stroke. Reads like a
 * glow but costs two plain strokes instead of a per-item gaussian blur.
 */
export function selectionHalo(color = "var(--primary)"): [HaloProps, HaloProps] {
  const base = {
    fill: "none" as const,
    stroke: color,
    strokeLinejoin: "round" as const,
    strokeLinecap: "round" as const,
    vectorEffect: "non-scaling-stroke" as const,
    pointerEvents: "none" as const,
  };
  return [
    { ...base, strokeOpacity: 0.12, strokeWidth: 9 },
    { ...base, strokeOpacity: 0.26, strokeWidth: 5 },
  ];
}

const StatusOutline = memo(function StatusOutline({
  object,
  status,
  pad,
}: {
  object: StudioObject;
  status: ObjectStatus;
  pad: number;
}) {
  const conflict = status === "conflict" || status === "conflict-selected";
  const selected = status === "selected" || status === "conflict-selected";
  const stroke = conflict ? "#ef4444" : "var(--primary)";
  const common = {
    fill: conflict ? "rgba(239,68,68,0.08)" : "none",
    stroke,
    strokeWidth: selected ? 2 : 1.5,
    strokeOpacity: status === "hovered" ? 0.7 : 1,
    strokeDasharray: conflict && !selected ? "5 3" : undefined,
    vectorEffect: "non-scaling-stroke" as const,
  };
  const circular = isCircularObjectType(object.type);
  const shape = (props: object, key: string) =>
    circular ? (
      <ellipse key={key} rx={object.width / 2 + pad} ry={object.depth / 2 + pad} {...props} />
    ) : (
      <rect
        key={key}
        x={-object.width / 2 - pad}
        y={-object.depth / 2 - pad}
        width={object.width + pad * 2}
        height={object.depth + pad * 2}
        rx={pad}
        {...props}
      />
    );
  return (
    <g transform={`translate(${object.x} ${object.z}) rotate(${object.rotation})`}>
      {selected ? selectionHalo(stroke).map((halo, index) => shape(halo, `halo-${index}`)) : null}
      {shape(common, "stroke")}
    </g>
  );
});

/** Hover outline for the hovered object only; the only part that re-renders on hover. */
function HoverOutline({
  objects,
  selectedIds,
  conflicts,
  pad,
}: {
  objects: readonly StudioObject[];
  selectedIds: ReadonlySet<string>;
  conflicts: ReadonlySet<string>;
  pad: number;
}) {
  const hoveredId = useStudioHoveredId();
  if (!hoveredId || selectedIds.has(hoveredId) || conflicts.has(hoveredId)) return null;
  const object = objects.find((item) => item.id === hoveredId);
  return object ? <StatusOutline object={object} status="hovered" pad={pad} /> : null;
}

/** Gold selection / hover outlines and red collision hints. */
export const ObjectStatusOutlines = memo(function ObjectStatusOutlines({
  objects,
  selectedIds,
  conflicts,
  pad,
}: {
  objects: readonly StudioObject[];
  selectedIds: ReadonlySet<string>;
  conflicts: ReadonlySet<string>;
  pad: number;
}) {
  return (
    <g className="pointer-events-none">
      {objects.map((object) => {
        const selected = selectedIds.has(object.id);
        const conflict = conflicts.has(object.id);
        if (!selected && !conflict) return null;
        const status: ObjectStatus = selected
          ? conflict
            ? "conflict-selected"
            : "selected"
          : "conflict";
        return <StatusOutline key={object.id} object={object} status={status} pad={pad} />;
      })}
      <HoverOutline objects={objects} selectedIds={selectedIds} conflicts={conflicts} pad={pad} />
    </g>
  );
});

export function Handle({
  cx,
  cz,
  r,
  cursor,
  label,
  onPointerDown,
  square,
}: {
  cx: number;
  cz: number;
  r: number;
  cursor: string;
  label: string;
  onPointerDown: PointerHandler;
  square?: boolean;
}) {
  return (
    <g style={{ cursor }} className="touch-none" role="button" aria-label={label} onPointerDown={onPointerDown}>
      <circle cx={cx} cy={cz} r={r * 2.2} fill="transparent" />
      {square ? (
        <rect
          x={cx - r * 0.8}
          y={cz - r * 0.8}
          width={r * 1.6}
          height={r * 1.6}
          rx={r * 0.35}
          fill="var(--background)"
          stroke="var(--primary)"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
      ) : (
        <circle cx={cx} cy={cz} r={r} fill="var(--background)" stroke="var(--primary)" strokeWidth={2.5} vectorEffect="non-scaling-stroke" />
      )}
    </g>
  );
}

export function RotateKnob({
  x,
  z,
  stemFrom,
  r,
  label,
  onPointerDown,
  angleLabel,
  labelSize,
}: {
  x: number;
  z: number;
  stemFrom: number;
  r: number;
  label: string;
  onPointerDown: PointerHandler;
  angleLabel?: string | null;
  labelSize: number;
}) {
  return (
    <>
      <line x1={x} y1={stemFrom} x2={x} y2={z} stroke="var(--primary)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" className="pointer-events-none" />
      <g className="cursor-grab touch-none active:cursor-grabbing" role="button" aria-label={label} onPointerDown={onPointerDown}>
        <circle cx={x} cy={z} r={r * 2.4} fill="transparent" />
        <circle cx={x} cy={z} r={r * 1.15} fill="var(--primary)" stroke="var(--background)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
        <path
          d={`M ${x - r * 0.55} ${z + r * 0.1} A ${r * 0.55} ${r * 0.55} 0 1 1 ${x + r * 0.1} ${z + r * 0.55}`}
          fill="none"
          stroke="var(--primary-foreground)"
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />
      </g>
      {angleLabel ? (
        <text
          x={x}
          y={z - r * 2.6}
          textAnchor="middle"
          fontSize={labelSize * 0.9}
          fill="var(--primary)"
          stroke="var(--background)"
          strokeWidth={labelSize * 0.35}
          paintOrder="stroke"
          className="pointer-events-none font-semibold"
        >
          {angleLabel}
        </text>
      ) : null}
    </>
  );
}

/** Corner + edge resize handles and a rotation knob for one object. */
export function SingleSelectionHandles({
  object,
  handleRadius,
  labelSize,
  stemLength,
  angleLabel,
  onResizeStart,
  onRotateStart,
}: {
  object: StudioObject;
  handleRadius: number;
  labelSize: number;
  stemLength: number;
  angleLabel: string | null;
  onResizeStart: (event: React.PointerEvent<SVGElement>, handle: PlanObjectHandle) => void;
  onRotateStart: PointerHandler;
}) {
  const hw = object.width / 2;
  const hd = object.depth / 2;
  const circular = isCircularObjectType(object.type);
  const r = handleRadius * 0.85;
  return (
    <g transform={`translate(${object.x} ${object.z}) rotate(${object.rotation})`}>
      <rect
        x={-hw}
        y={-hd}
        width={object.width}
        height={object.depth}
        fill="none"
        stroke="var(--primary)"
        strokeOpacity={0.55}
        strokeDasharray="4 3"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
        className="pointer-events-none"
      />
      <RotateKnob
        x={0}
        z={-hd - stemLength}
        stemFrom={-hd}
        r={r}
        label={`Rotate ${object.label}`}
        onPointerDown={onRotateStart}
        angleLabel={angleLabel}
        labelSize={labelSize}
      />
      {circular
        ? null
        : CORNER_HANDLES.map((item) => (
            <Handle
              key={item.handle}
              cx={item.x * hw}
              cz={item.z * hd}
              r={r}
              cursor={cursorFor(item.x, item.z, object.rotation)}
              label={`Resize ${object.label} from ${item.handle.replace("_", " ")} corner`}
              onPointerDown={(event) => onResizeStart(event, item.handle)}
            />
          ))}
      {EDGE_HANDLES.map((item) => (
        <Handle
          key={item.handle}
          cx={item.x * hw}
          cz={item.z * hd}
          r={r * 0.8}
          square
          cursor={cursorFor(item.x, item.z, object.rotation)}
          label={circular ? `Resize ${object.label} diameter` : `Resize ${object.label} ${item.handle} edge`}
          onPointerDown={(event) => onResizeStart(event, item.handle)}
        />
      ))}
    </g>
  );
}

/** Dashed group bounds you can drag (by its border) and rotate as a whole. */
export function GroupSelectionBox({
  box,
  pad,
  handleRadius,
  labelSize,
  stemLength,
  count,
  angleLabel,
  onMoveStart,
  onRotateStart,
}: {
  box: PlanRect;
  pad: number;
  handleRadius: number;
  labelSize: number;
  stemLength: number;
  count: number;
  angleLabel: string | null;
  onMoveStart: PointerHandler;
  onRotateStart: PointerHandler;
}) {
  const x = box.minX - pad;
  const z = box.minZ - pad;
  const width = box.maxX - box.minX + pad * 2;
  const depth = box.maxZ - box.minZ + pad * 2;
  const centerX = (box.minX + box.maxX) / 2;
  return (
    <g>
      <rect
        x={x}
        y={z}
        width={width}
        height={depth}
        fill="none"
        stroke="transparent"
        strokeWidth={handleRadius * 2}
        pointerEvents="stroke"
        className="cursor-move touch-none"
        onPointerDown={onMoveStart}
        aria-label={`Move ${count} selected items`}
        role="button"
      />
      <rect
        x={x}
        y={z}
        width={width}
        height={depth}
        rx={handleRadius * 0.6}
        fill="color-mix(in oklch, var(--primary) 4%, transparent)"
        stroke="var(--primary)"
        strokeWidth={1.25}
        strokeDasharray="7 4"
        vectorEffect="non-scaling-stroke"
        className="pointer-events-none"
      />
      <g transform={`translate(${x + width} ${z})`} className="pointer-events-none">
        <rect
          x={-labelSize * 1.2}
          y={-labelSize * 0.7}
          width={labelSize * 2.4}
          height={labelSize * 1.4}
          rx={labelSize * 0.7}
          fill="var(--primary)"
        />
        <text textAnchor="middle" dominantBaseline="central" fontSize={labelSize * 0.75} fill="var(--primary-foreground)" className="font-semibold">
          {count}
        </text>
      </g>
      <RotateKnob
        x={centerX}
        z={z - stemLength}
        stemFrom={z}
        r={handleRadius * 0.85}
        label={`Rotate ${count} selected items`}
        onPointerDown={onRotateStart}
        angleLabel={angleLabel}
        labelSize={labelSize}
      />
    </g>
  );
}
