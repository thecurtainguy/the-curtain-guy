"use client";

import type { StudioObject, StudioPoint } from "@/data/studio";
import { getStudioObjectCorners } from "@/lib/studio-interactions";
import { memo, useRef } from "react";
import { getVisiblePlanRect, type PlanCamera, type PlanRect, type PlanSize } from "./viewport";

const MAP_WIDTH = 168;
const MAP_HEIGHT = 112;

const MinimapContent = memo(function MinimapContent({
  floor,
  objects,
}: {
  floor: StudioPoint[];
  objects: StudioObject[];
}) {
  return (
    <>
      <polygon
        points={floor.map((point) => `${point.x},${point.z}`).join(" ")}
        fill="color-mix(in oklch, var(--card) 90%, var(--primary) 6%)"
        stroke="color-mix(in oklch, var(--foreground) 55%, transparent)"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
      {objects.map((object) =>
        object.hidden ? null : (
          <polygon
            key={object.id}
            points={getStudioObjectCorners(object)
              .map((corner) => `${corner.x},${corner.z}`)
              .join(" ")}
            fill="color-mix(in oklch, var(--primary) 45%, transparent)"
          />
        )
      )}
    </>
  );
});

/** Overview of the whole room with the visible viewport; click/drag to navigate. */
export function PlanMinimap({
  floor,
  objects,
  roomBounds,
  camera,
  size,
  onNavigate,
}: {
  floor: StudioPoint[];
  objects: StudioObject[];
  roomBounds: PlanRect;
  camera: PlanCamera;
  size: PlanSize;
  onNavigate: (center: StudioPoint) => void;
}) {
  const draggingRef = useRef(false);
  const pad = Math.max(roomBounds.maxX - roomBounds.minX, roomBounds.maxZ - roomBounds.minZ) * 0.08;
  const box = {
    minX: roomBounds.minX - pad,
    minZ: roomBounds.minZ - pad,
    width: roomBounds.maxX - roomBounds.minX + pad * 2,
    depth: roomBounds.maxZ - roomBounds.minZ + pad * 2,
  };
  const visible = getVisiblePlanRect(camera, size);

  function navigate(event: React.PointerEvent<SVGSVGElement>) {
    const svg = event.currentTarget;
    const matrix = svg.getScreenCTM();
    if (!matrix) return;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    onNavigate({ x: point.x, z: point.y });
  }

  return (
    <div className="pointer-events-auto overflow-hidden rounded-2xl border border-border/60 bg-background/95 p-1.5 shadow-lg">
      <svg
        width={MAP_WIDTH}
        height={MAP_HEIGHT}
        viewBox={`${box.minX} ${box.minZ} ${box.width} ${box.depth}`}
        className="block cursor-pointer touch-none"
        role="img"
        aria-label="Plan overview. Click or drag to move the view."
        onPointerDown={(event) => {
          event.stopPropagation();
          draggingRef.current = true;
          event.currentTarget.setPointerCapture(event.pointerId);
          navigate(event);
        }}
        onPointerMove={(event) => {
          if (draggingRef.current) navigate(event);
        }}
        onPointerUp={() => {
          draggingRef.current = false;
        }}
        onPointerCancel={() => {
          draggingRef.current = false;
        }}
      >
        <MinimapContent floor={floor} objects={objects} />
        <rect
          x={visible.minX}
          y={visible.minZ}
          width={visible.maxX - visible.minX}
          height={visible.maxZ - visible.minZ}
          fill="color-mix(in oklch, var(--primary) 10%, transparent)"
          stroke="var(--primary)"
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
          rx={2}
        />
      </svg>
    </div>
  );
}
