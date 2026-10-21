"use client";

import { SEATED_OBJECT_TYPES, type StudioObject } from "@/data/studio";
import { getObjectBox } from "./object-geometry";

function LockGlyph({ x, z, size }: { x: number; z: number; size: number }) {
  const s = size;
  return (
    <g transform={`translate(${x} ${z})`}>
      <circle r={s * 0.75} fill="var(--background)" stroke="var(--primary)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      <path
        d={`M ${-s * 0.22} ${-s * 0.05} V ${-s * 0.22} A ${s * 0.22} ${s * 0.22} 0 0 1 ${s * 0.22} ${-s * 0.22} V ${-s * 0.05}`}
        fill="none"
        stroke="var(--primary)"
        strokeWidth={1.25}
        vectorEffect="non-scaling-stroke"
      />
      <rect x={-s * 0.32} y={-s * 0.05} width={s * 0.64} height={s * 0.42} rx={s * 0.08} fill="var(--primary)" />
    </g>
  );
}

/**
 * Screen-size-aware labels, seat badges and lock glyphs. Re-renders with zoom,
 * kept separate from the memoized symbols.
 */
export function ObjectLabelsLayer({
  objects,
  zoom,
  labelSize,
  showLabels,
  emphasized,
}: {
  objects: readonly StudioObject[];
  zoom: number;
  labelSize: number;
  showLabels: boolean;
  emphasized: ReadonlySet<string>;
}) {
  return (
    <g className="pointer-events-none select-none">
      {objects.map((object) => {
        const box = getObjectBox(object);
        const screenMin = Math.min(object.width, object.depth) * zoom;
        const important = emphasized.has(object.id);
        const showText = showLabels && (important || screenMin >= 34);
        const seats = object.seatingCount ?? 0;
        const showSeats =
          showLabels &&
          seats > 0 &&
          SEATED_OBJECT_TYPES.includes(object.type) &&
          (important || screenMin >= 18);
        const fontSize = labelSize * 0.82;
        return (
          <g key={object.id}>
            {showText ? (
              <text
                x={object.x}
                y={object.z}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={fontSize}
                fill="var(--foreground)"
                stroke="var(--background)"
                strokeWidth={fontSize * 0.34}
                strokeOpacity={0.85}
                paintOrder="stroke"
                className="font-medium"
              >
                {object.label}
              </text>
            ) : null}
            {showSeats ? (
              <g transform={`translate(${box.maxX} ${box.minZ})`}>
                <rect
                  x={-labelSize * 0.95}
                  y={-labelSize * 0.62}
                  width={labelSize * 1.9}
                  height={labelSize * 1.24}
                  rx={labelSize * 0.62}
                  fill="var(--primary)"
                  stroke="var(--background)"
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={labelSize * 0.72}
                  fill="var(--primary-foreground)"
                  className="font-semibold"
                >
                  {seats}
                </text>
              </g>
            ) : null}
            {object.locked ? (
              <LockGlyph x={box.minX} z={box.minZ} size={labelSize} />
            ) : null}
          </g>
        );
      })}
    </g>
  );
}
