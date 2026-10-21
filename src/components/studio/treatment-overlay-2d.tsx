"use client";

import type { StudioTreatment } from "@/data/studio";
import {
  getPointAlongWall,
  type StudioWallSegment,
} from "@/lib/studio-geometry";
import {
  TREATMENT_PLAN_BASE,
  TreatmentGlyph,
} from "./plan/wall-item-symbols";
import type { StudioSelection } from "./studio-types";

/**
 * Legacy single-treatment overlay. The Studio plan now renders treatments via
 * `WallItemsLayer2D` (plan/wall-items-layer.tsx); this wrapper remains for
 * callers that still draw one treatment on its own.
 */
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
  const depth = Math.min(36, Math.max(10, treatment.swagDrop * 0.45));
  const baseY = TREATMENT_PLAN_BASE;

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
        />
      ) : null}
      <TreatmentGlyph treatment={treatment} />
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
      {selected
        ? [-span / 2, span / 2].map((x) => (
            <circle
              key={x}
              cx={x}
              cy={baseY}
              r={handleRadius * 0.78}
              fill="var(--background)"
              stroke="var(--primary)"
              strokeWidth={3}
              vectorEffect="non-scaling-stroke"
            />
          ))
        : null}
    </g>
  );
}
