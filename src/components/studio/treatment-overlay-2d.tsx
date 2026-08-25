"use client";

import {
  getDrapeColorHex,
  type StudioTreatment,
} from "@/data/studio";
import {
  getPointAlongWall,
  type StudioWallSegment,
} from "@/lib/studio-geometry";
import type { StudioSelection } from "./studio-types";

export function TreatmentOverlay2D({
  treatment,
  wall,
  selection,
  onSelect,
  handleRadius,
}: {
  treatment: StudioTreatment;
  wall: StudioWallSegment;
  selection: StudioSelection;
  onSelect: (selection: StudioSelection) => void;
  handleRadius: number;
}) {
  const selected =
    selection?.kind === "treatment" && selection.id === treatment.id;
  const span = Math.max(
    1,
    treatment.anchor.endOffset - treatment.anchor.startOffset
  );
  const center = getPointAlongWall(
    wall,
    (treatment.anchor.startOffset + treatment.anchor.endOffset) / 2
  );
  const rotation = (wall.angle * 180) / Math.PI;
  const primary = getDrapeColorHex(treatment.color);
  const accent = getDrapeColorHex(treatment.secondaryColor);
  const opening = Math.min(span * 0.8, Math.max(12, treatment.openingWidth));
  const sideWidth = Math.max(6, (span - opening) / 2);
  const depth = Math.min(36, Math.max(10, treatment.swagDrop * 0.45));
  const baseY = 12;

  return (
    <g
      transform={`translate(${center.x} ${center.z}) rotate(${rotation})`}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`Select ${treatment.label}`}
      className="cursor-pointer outline-none focus:[&_.studio-treatment-focus]:opacity-100"
      onClick={(event) => {
        event.stopPropagation();
        onSelect({ kind: "treatment", id: treatment.id });
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect({ kind: "treatment", id: treatment.id });
        }
      }}
    >
      <rect
        x={-span / 2}
        y={baseY - 16}
        width={span}
        height={36}
        fill="transparent"
      />

      {selected ? (
        <rect
          x={-span / 2 - 5}
          y={baseY - 8}
          width={span + 10}
          height={Math.max(18, depth + 12)}
          rx={5}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={3}
          strokeDasharray="7 4"
          vectorEffect="non-scaling-stroke"
          filter="url(#studio-selection-glow)"
        />
      ) : null}

      {treatment.type === "full_pleated_backdrop" ? (
        <>
          <line
            x1={-span / 2}
            y1={baseY}
            x2={span / 2}
            y2={baseY}
            stroke={primary}
            strokeWidth={10}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          {Array.from({ length: Math.min(18, Math.max(4, Math.round(span / 30))) }).map(
            (_, index, folds) => {
              const x = -span / 2 + ((index + 0.5) / folds.length) * span;
              return (
                <line
                  key={index}
                  x1={x}
                  y1={baseY - 5}
                  x2={x}
                  y2={baseY + 5}
                  stroke="#000000"
                  strokeOpacity={0.28}
                  strokeWidth={1.5}
                  vectorEffect="non-scaling-stroke"
                />
              );
            }
          )}
        </>
      ) : null}

      {treatment.type === "side_tieback_panels" ? (
        <>
          {treatment.hasBackdrop ? (
            <line
              x1={-span / 2}
              y1={baseY}
              x2={span / 2}
              y2={baseY}
              stroke={accent}
              strokeWidth={7}
              strokeOpacity={0.72}
              vectorEffect="non-scaling-stroke"
            />
          ) : null}
          <line
            x1={-span / 2}
            y1={baseY}
            x2={-span / 2 + sideWidth}
            y2={baseY + 3}
            stroke={primary}
            strokeWidth={11}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1={span / 2 - sideWidth}
            y1={baseY + 3}
            x2={span / 2}
            y2={baseY}
            stroke={primary}
            strokeWidth={11}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          {treatment.hasTiebacks ? (
            <>
              <circle
                cx={-opening / 2}
                cy={baseY + 3}
                r={4}
                fill={accent}
                stroke="var(--background)"
                strokeWidth={1.5}
                vectorEffect="non-scaling-stroke"
              />
              <circle
                cx={opening / 2}
                cy={baseY + 3}
                r={4}
                fill={accent}
                stroke="var(--background)"
                strokeWidth={1.5}
                vectorEffect="non-scaling-stroke"
              />
            </>
          ) : null}
          {treatment.hasTopSwag ? (
            <SwagPath span={span} baseY={baseY} depth={depth} color={accent} />
          ) : null}
        </>
      ) : null}

      {treatment.type === "top_swag_valance" ? (
        <SwagPath span={span} baseY={baseY} depth={depth} color={primary} />
      ) : null}

      {treatment.type === "ceremony_arch" ? (
        <>
          <path
            d={`M ${-span / 2} ${baseY + 18} V ${baseY} H ${span / 2} V ${baseY + 18}`}
            fill="none"
            stroke={accent}
            strokeWidth={6}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1={-span / 2 + 7}
            y1={baseY + 2}
            x2={-span / 2 + Math.max(18, sideWidth)}
            y2={baseY + 5}
            stroke={primary}
            strokeWidth={9}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1={span / 2 - Math.max(18, sideWidth)}
            y1={baseY + 5}
            x2={span / 2 - 7}
            y2={baseY + 2}
            stroke={primary}
            strokeWidth={9}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          {treatment.hasTopSwag ? (
            <SwagPath span={span * 0.88} baseY={baseY} depth={depth} color={primary} />
          ) : null}
        </>
      ) : null}

      <rect
        className="studio-treatment-focus pointer-events-none opacity-0"
        x={-span / 2 - 7}
        y={baseY - 10}
        width={span + 14}
        height={Math.max(22, depth + 16)}
        rx={6}
        fill="none"
        stroke="var(--ring)"
        strokeWidth={5}
        vectorEffect="non-scaling-stroke"
      />

      {selected ? (
        <>
          <circle
            cx={-span / 2}
            cy={baseY}
            r={handleRadius * 0.78}
            fill="var(--background)"
            stroke="var(--primary)"
            strokeWidth={3}
            vectorEffect="non-scaling-stroke"
          />
          <circle
            cx={span / 2}
            cy={baseY}
            r={handleRadius * 0.78}
            fill="var(--background)"
            stroke="var(--primary)"
            strokeWidth={3}
            vectorEffect="non-scaling-stroke"
          />
        </>
      ) : null}
    </g>
  );
}

function SwagPath({
  span,
  baseY,
  depth,
  color,
}: {
  span: number;
  baseY: number;
  depth: number;
  color: string;
}) {
  const halfSpan = span / 2;
  const topDepth = depth * 0.18;
  return (
    <g>
      <path
        d={`M ${-halfSpan} ${baseY} Q 0 ${baseY + topDepth} ${halfSpan} ${baseY} Q 0 ${baseY + depth} ${-halfSpan} ${baseY} Z`}
        fill={color}
        fillOpacity={0.78}
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {[-0.28, 0, 0.28].map((offset) => (
        <path
          key={offset}
          d={`M ${span * offset} ${baseY + 2} Q ${span * offset * 0.55} ${baseY + depth * 0.62} 0 ${baseY + depth * 0.9}`}
          fill="none"
          stroke="var(--background)"
          strokeOpacity={0.28}
          strokeWidth={1.5}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </g>
  );
}
