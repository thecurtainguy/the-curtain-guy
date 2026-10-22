"use client";

import type { StudioFloorFinish, StudioPoint } from "@/data/studio";
import {
  getWallSegments,
  inchesToFeetLabel,
  type StudioWallSegment,
} from "@/lib/studio-geometry";
import {
  getRoomInteriorAngles,
  getWallInwardNormal,
} from "@/lib/studio-room-editing";
import { memo } from "react";
import { uprightAngle } from "./wall-plan-badge";

export type RoomOutlineGeometry = {
  walls: StudioWallSegment[];
  /** Mitered outer face vertex for every floor vertex. */
  outer: StudioPoint[];
  /** Wall band quads: inner start, inner end, outer end, outer start. */
  bands: StudioPoint[][];
  /** Unit inward normal per wall. */
  inward: StudioPoint[];
  /** Interior angle per vertex, degrees. */
  angles: number[];
};

export function computeRoomOutline(
  floor: StudioPoint[],
  thickness: number
): RoomOutlineGeometry {
  const walls = getWallSegments(floor);
  const n = floor.length;
  const inward = walls.map((wall) => getWallInwardNormal(floor, wall.index));
  const outer = floor.map((vertex, index) => {
    const a = inward[(index - 1 + n) % n];
    const b = inward[index];
    if (!a || !b) return { ...vertex };
    const dot = a.x * b.x + a.z * b.z;
    const denominator = 1 + dot;
    if (denominator < 0.2) {
      const length = Math.hypot(a.x + b.x, a.z + b.z) || 1;
      return {
        x: vertex.x - ((a.x + b.x) / length) * thickness * 2,
        z: vertex.z - ((a.z + b.z) / length) * thickness * 2,
      };
    }
    return {
      x: vertex.x - ((a.x + b.x) / denominator) * thickness,
      z: vertex.z - ((a.z + b.z) / denominator) * thickness,
    };
  });
  const bands = walls.map((wall) => [
    wall.start,
    wall.end,
    outer[(wall.index + 1) % n],
    outer[wall.index],
  ]);
  return { walls, outer, bands, inward, angles: getRoomInteriorAngles(floor) };
}

export function pointsAttr(points: StudioPoint[]): string {
  return points.map((point) => `${point.x},${point.z}`).join(" ");
}

function pathFromPoints(points: StudioPoint[]): string {
  return (
    points
      .map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.z}`)
      .join(" ") + " Z"
  );
}

type FloorStyle = {
  tint: string;
  mix: number;
  pattern?: "planks" | "herringbone" | "carpet" | "concrete" | "marble" | "lawn";
  line: string;
};

const FLOOR_STYLES: Record<StudioFloorFinish, FloorStyle> = {
  warm_wood: { tint: "#b98b5a", mix: 14, pattern: "planks", line: "#e2b47c" },
  dark_oak: { tint: "#4f3526", mix: 18, pattern: "planks", line: "#8b6850" },
  herringbone: { tint: "#a7774a", mix: 14, pattern: "herringbone", line: "#d9a774" },
  event_carpet: { tint: "#8b8273", mix: 14, pattern: "carpet", line: "#c9bfae" },
  polished_concrete: { tint: "#9a9a96", mix: 10, pattern: "concrete", line: "#d7d7d2" },
  black_event: { tint: "#050505", mix: 24, line: "#3a3a3a" },
  light_neutral: { tint: "#e8e1d3", mix: 10, line: "#ffffff" },
  white_marble: { tint: "#f1eee8", mix: 12, pattern: "marble", line: "#ffffff" },
  lawn: { tint: "#4f7a3a", mix: 18, pattern: "lawn", line: "#8fbf6a" },
};

export function getFloorStyle(finish: StudioFloorFinish): FloorStyle {
  return FLOOR_STYLES[finish] ?? FLOOR_STYLES.warm_wood;
}

/** Solid floor tint (no pattern) for a finish. */
export function getFloorFill(finish: StudioFloorFinish): string {
  const style = getFloorStyle(finish);
  return `color-mix(in oklch, var(--card) ${100 - style.mix}%, ${style.tint} ${style.mix}%)`;
}

/** Floor-finish patterns and the wall poché hatch. */
export const RoomDefs = memo(function RoomDefs({
  idPrefix,
  finish,
  pixelsPerInch,
}: {
  idPrefix: string;
  finish: StudioFloorFinish;
  pixelsPerInch: number;
}) {
  const style = getFloorStyle(finish);
  const hair = Math.max(0.35, 0.8 / pixelsPerInch);
  return (
    <defs>
      <pattern
        id={`${idPrefix}-hatch`}
        width={6}
        height={6}
        patternUnits="userSpaceOnUse"
        patternTransform="rotate(45)"
      >
        <line
          x1={0}
          y1={0}
          x2={0}
          y2={6}
          stroke="currentColor"
          strokeOpacity={0.28}
          strokeWidth={Math.max(0.6, 1 / pixelsPerInch)}
        />
      </pattern>
      {style.pattern === "planks" ? (
        <pattern id={`${idPrefix}-floor`} width={96} height={12} patternUnits="userSpaceOnUse">
          <path
            d="M0 0H96M0 6H96M0 0V6M48 6V12M72 0V6M24 6V12"
            stroke={style.line}
            strokeOpacity={0.22}
            strokeWidth={hair}
            fill="none"
          />
        </pattern>
      ) : null}
      {style.pattern === "herringbone" ? (
        <pattern id={`${idPrefix}-floor`} width={24} height={12} patternUnits="userSpaceOnUse">
          <path
            d="M0 12L12 0L24 12M0 6L6 0M18 0L24 6M6 12L12 6L18 12"
            stroke={style.line}
            strokeOpacity={0.3}
            strokeWidth={hair}
            fill="none"
          />
        </pattern>
      ) : null}
      {style.pattern === "carpet" ? (
        <pattern id={`${idPrefix}-floor`} width={8} height={8} patternUnits="userSpaceOnUse">
          <circle cx={2} cy={2} r={0.7} fill={style.line} fillOpacity={0.25} />
          <circle cx={6} cy={6} r={0.7} fill={style.line} fillOpacity={0.2} />
        </pattern>
      ) : null}
      {style.pattern === "concrete" ? (
        <pattern id={`${idPrefix}-floor`} width={120} height={120} patternUnits="userSpaceOnUse">
          <path d="M0 0H120M0 0V120" stroke={style.line} strokeOpacity={0.22} strokeWidth={hair} />
          <circle cx={23} cy={41} r={1.1} fill={style.line} fillOpacity={0.2} />
          <circle cx={77} cy={18} r={0.8} fill={style.line} fillOpacity={0.18} />
          <circle cx={96} cy={88} r={1.2} fill={style.line} fillOpacity={0.16} />
          <circle cx={44} cy={101} r={0.7} fill={style.line} fillOpacity={0.2} />
        </pattern>
      ) : null}
      {style.pattern === "marble" ? (
        <pattern id={`${idPrefix}-floor`} width={96} height={96} patternUnits="userSpaceOnUse">
          <path d="M0 0H96M0 48H96M0 0V96M48 0V96" stroke={style.line} strokeOpacity={0.3} strokeWidth={hair} />
          <path
            d="M4 30C22 24 30 40 46 34M52 70C64 60 78 82 94 72M10 88C20 80 30 92 40 84"
            stroke="#8f8a80"
            strokeOpacity={0.22}
            strokeWidth={hair}
            fill="none"
          />
        </pattern>
      ) : null}
      {style.pattern === "lawn" ? (
        <pattern id={`${idPrefix}-floor`} width={10} height={10} patternUnits="userSpaceOnUse">
          <path d="M2 8L3 5M6 4L7 1M8 9L8.6 6.5" stroke={style.line} strokeOpacity={0.35} strokeWidth={hair} />
        </pattern>
      ) : null}
    </defs>
  );
});

export const RoomFloor = memo(function RoomFloor({
  floor,
  finish,
  idPrefix,
}: {
  floor: StudioPoint[];
  finish: StudioFloorFinish;
  idPrefix: string;
}) {
  const style = getFloorStyle(finish);
  const points = pointsAttr(floor);
  return (
    <g pointerEvents="none">
      <polygon points={points} fill={getFloorFill(finish)} />
      {style.pattern ? (
        <polygon points={points} fill={`url(#${idPrefix}-floor)`} />
      ) : null}
      <polygon
        points={points}
        fill="none"
        stroke="var(--primary)"
        strokeOpacity={0.12}
        strokeWidth={10}
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
});

/** Architectural walls: poché band between floor edge and mitered outer face. */
export const WallPoche = memo(function WallPoche({
  floor,
  geometry,
  idPrefix,
}: {
  floor: StudioPoint[];
  geometry: RoomOutlineGeometry;
  idPrefix: string;
}) {
  const ring = `${pathFromPoints(geometry.outer)} ${pathFromPoints(floor)}`;
  return (
    <g pointerEvents="none" className="text-foreground">
      <path
        d={ring}
        fillRule="evenodd"
        fill="color-mix(in oklch, var(--foreground) 26%, var(--background))"
      />
      <path d={ring} fillRule="evenodd" fill={`url(#${idPrefix}-hatch)`} />
      <polygon
        points={pointsAttr(geometry.outer)}
        fill="none"
        stroke="color-mix(in oklch, var(--foreground) 70%, var(--background))"
        strokeWidth={1.25}
        strokeLinejoin="miter"
        vectorEffect="non-scaling-stroke"
      />
      <polygon
        points={pointsAttr(floor)}
        fill="none"
        stroke="color-mix(in oklch, var(--foreground) 82%, var(--background))"
        strokeWidth={1.75}
        strokeLinejoin="miter"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
});

/** Where a wall's dimension line and label sit (outside the wall face). */
export function getDimensionPlacement(
  wall: StudioWallSegment,
  inward: StudioPoint,
  thickness: number,
  labelSize: number
) {
  const offset = thickness + labelSize * 2.4;
  const outwardX = -inward.x;
  const outwardZ = -inward.z;
  return {
    offset,
    outwardX,
    outwardZ,
    start: { x: wall.start.x + outwardX * offset, z: wall.start.z + outwardZ * offset },
    end: { x: wall.end.x + outwardX * offset, z: wall.end.z + outwardZ * offset },
    label: { x: wall.center.x + outwardX * offset, z: wall.center.z + outwardZ * offset },
  };
}

/** CAD-style dimension strings with extension lines and tick marks. */
export const WallDimensions = memo(function WallDimensions({
  geometry,
  thickness,
  labelSize,
  hiddenWalls,
  highlightWall,
}: {
  geometry: RoomOutlineGeometry;
  thickness: number;
  labelSize: number;
  /** Walls whose label is replaced by a live badge. */
  hiddenWalls: ReadonlySet<number>;
  highlightWall: number | null;
}) {
  const tick = labelSize * 0.55;
  return (
    <g pointerEvents="none">
      {geometry.walls.map((wall) => {
        const inward = geometry.inward[wall.index];
        if (!inward || wall.length < 1) return null;
        const place = getDimensionPlacement(wall, inward, thickness, labelSize);
        const extensionStart = thickness + labelSize * 0.5;
        const highlighted = highlightWall === wall.index;
        const color = highlighted ? "var(--primary)" : "var(--muted-foreground)";
        const ux = Math.cos(wall.angle);
        const uz = Math.sin(wall.angle);
        const slash = (point: StudioPoint) => (
          <line
            x1={point.x - (ux + place.outwardX) * tick * 0.6}
            y1={point.z - (uz + place.outwardZ) * tick * 0.6}
            x2={point.x + (ux + place.outwardX) * tick * 0.6}
            y2={point.z + (uz + place.outwardZ) * tick * 0.6}
            vectorEffect="non-scaling-stroke"
          />
        );
        return (
          <g key={wall.index}>
            <g
              stroke={color}
              strokeWidth={highlighted ? 1.4 : 1}
              opacity={highlighted ? 1 : 0.72}
              vectorEffect="non-scaling-stroke"
            >
              <line
                x1={wall.start.x + place.outwardX * extensionStart}
                y1={wall.start.z + place.outwardZ * extensionStart}
                x2={place.start.x + place.outwardX * tick}
                y2={place.start.z + place.outwardZ * tick}
                vectorEffect="non-scaling-stroke"
              />
              <line
                x1={wall.end.x + place.outwardX * extensionStart}
                y1={wall.end.z + place.outwardZ * extensionStart}
                x2={place.end.x + place.outwardX * tick}
                y2={place.end.z + place.outwardZ * tick}
                vectorEffect="non-scaling-stroke"
              />
              <line
                x1={place.start.x}
                y1={place.start.z}
                x2={place.end.x}
                y2={place.end.z}
                vectorEffect="non-scaling-stroke"
              />
              {slash(place.start)}
              {slash(place.end)}
            </g>
            {hiddenWalls.has(wall.index) ? null : (
              <text
                x={place.label.x}
                y={place.label.z}
                transform={`rotate(${uprightAngle(wall.angle)} ${place.label.x} ${place.label.z})`}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={labelSize * 0.92}
                fill={highlighted ? "var(--primary)" : "var(--foreground)"}
                fillOpacity={highlighted ? 1 : 0.78}
                stroke="var(--background)"
                strokeWidth={labelSize * 0.45}
                paintOrder="stroke"
                className="font-semibold tabular-nums select-none"
              >
                {inchesToFeetLabel(wall.length)}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
});

function rotate(vector: StudioPoint, radians: number): StudioPoint {
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return { x: vector.x * cos - vector.z * sin, z: vector.x * sin + vector.z * cos };
}

/** Interior-angle arcs on corners that are not square (or straight). */
export const CornerAngleMarkers = memo(function CornerAngleMarkers({
  floor,
  angles,
  labelSize,
}: {
  floor: StudioPoint[];
  angles: number[];
  labelSize: number;
}) {
  const n = floor.length;
  const radius = labelSize * 2;
  return (
    <g pointerEvents="none">
      {floor.map((vertex, index) => {
        const angle = angles[index];
        if (
          !Number.isFinite(angle) ||
          Math.abs(angle - 90) < 0.5 ||
          Math.abs(angle - 270) < 0.5 ||
          Math.abs(angle - 180) < 0.5
        ) {
          return null;
        }
        const prev = floor[(index - 1 + n) % n];
        const next = floor[(index + 1) % n];
        const toPrevLength = Math.hypot(prev.x - vertex.x, prev.z - vertex.z);
        const toNextLength = Math.hypot(next.x - vertex.x, next.z - vertex.z);
        if (toPrevLength < 1 || toNextLength < 1) return null;
        const a = { x: (prev.x - vertex.x) / toPrevLength, z: (prev.z - vertex.z) / toPrevLength };
        const b = { x: (next.x - vertex.x) / toNextLength, z: (next.z - vertex.z) / toNextLength };
        const theta = (angle * Math.PI) / 180;
        const positive = rotate(a, theta);
        const sign =
          Math.hypot(positive.x - b.x, positive.z - b.z) <
          Math.hypot(rotate(a, -theta).x - b.x, rotate(a, -theta).z - b.z)
            ? 1
            : -1;
        const r = Math.min(radius, toPrevLength * 0.45, toNextLength * 0.45);
        const steps = 18;
        const arc = Array.from({ length: steps + 1 }, (_, step) => {
          const direction = rotate(a, (sign * theta * step) / steps);
          return `${step === 0 ? "M" : "L"}${vertex.x + direction.x * r} ${vertex.z + direction.z * r}`;
        }).join(" ");
        const bisector = rotate(a, (sign * theta) / 2);
        const labelDistance = r + labelSize * 1.1;
        return (
          <g key={index}>
            <path
              d={arc}
              fill="none"
              stroke="var(--primary)"
              strokeOpacity={0.85}
              strokeWidth={1.25}
              vectorEffect="non-scaling-stroke"
            />
            <text
              x={vertex.x + bisector.x * labelDistance}
              y={vertex.z + bisector.z * labelDistance}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={labelSize * 0.78}
              fill="var(--primary)"
              stroke="var(--background)"
              strokeWidth={labelSize * 0.35}
              paintOrder="stroke"
              className="font-semibold tabular-nums select-none"
            >
              {`${Math.round(angle * 10) / 10}°`}
            </text>
          </g>
        );
      })}
    </g>
  );
});
