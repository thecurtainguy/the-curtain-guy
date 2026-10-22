"use client";

import type { ThreeEvent } from "@react-three/fiber";
import type { StudioCeilingDrape } from "@/data/studio";
import { ceilingLowestDrop, type CeilingLayout } from "@/lib/studio-ceiling";
import type { StudioBounds } from "@/lib/studio-geometry";
import { useMemo } from "react";
import { SCALE, clamp, toWorld } from "../drag-math";
import {
  ElevationHandle,
  MoveHandle,
  ResizeHandles,
  RotationGizmo,
} from "../gizmos";
import type {
  ManipulationMode,
  ManipulationOverlay,
} from "../use-manipulation-controllers";
import { getCeilingHandleAnchors, type CeilingDropField } from "./ceiling-geometry";
import type { useCeilingControllers } from "./use-ceiling-controllers";

/** The rotation ring floats under the fabric but never below this, inches. */
const RING_MIN_HEIGHT = 78;

type CeilingControllers = ReturnType<typeof useCeilingControllers>;

/**
 * Grips for one selected, unlocked ceiling design: hub, drop arrows, the
 * rotation ring and (area coverage) corner + centre handles.
 */
export function CeilingGizmos({
  drape,
  layout,
  bounds,
  wallHeight,
  size,
  overlay,
  setCursor,
  controllers,
}: {
  drape: StudioCeilingDrape;
  layout: CeilingLayout;
  bounds: StudioBounds;
  wallHeight: number;
  size: number;
  overlay: ManipulationOverlay | null;
  setCursor: (cursor: string) => void;
  controllers: CeilingControllers;
}) {
  const anchors = useMemo(
    () => getCeilingHandleAnchors(drape, layout, bounds, wallHeight),
    [bounds, drape, layout, wallHeight]
  );
  const corners = useMemo(
    () => anchors.corners?.map((corner) => toWorld(bounds, corner)) ?? null,
    [anchors, bounds]
  );
  const mode = overlay?.mode ?? null;
  const show = (gizmo: ManipulationMode, handle?: string) =>
    mode === null ||
    (mode === gizmo && (handle === undefined || overlay?.activeHandle === handle));

  const ceilingY = wallHeight * SCALE;
  const gripY = ceilingY - size * 0.9;
  const [pivotX, pivotZ] = toWorld(bounds, anchors.pivot);
  const ringY =
    Math.max(RING_MIN_HEIGHT, wallHeight - ceilingLowestDrop(drape) - 4) * SCALE;
  const extentX = Math.max(...layout.outline.map((point) => point.x)) -
    Math.min(...layout.outline.map((point) => point.x));
  const extentZ = Math.max(...layout.outline.map((point) => point.z)) -
    Math.min(...layout.outline.map((point) => point.z));
  const ringRadius = clamp(Math.min(extentX, extentZ) * SCALE * 0.3, 2.5, 8);
  const centre = drape.coverage === "area" ? toWorld(bounds, drape) : null;
  const centreClear =
    centre &&
    (!anchors.hub ||
      Math.hypot(anchors.hub[0] - centre[0], anchors.hub[2] - centre[1]) > size * 6 ||
      Math.abs(anchors.hub[1] - gripY) > size * 6);

  const dropPosition = (field: CeilingDropField, position: [number, number, number]) =>
    field === "hubDrop"
      ? ([position[0], position[1] - size * 7, position[2]] as [number, number, number])
      : position;

  return (
    <group>
      {anchors.hub && show("hub") ? (
        <MoveHandle
          position={anchors.hub}
          size={size}
          variant="hub"
          setCursor={setCursor}
          onPointerDown={(event) => controllers.startHubDrag(event, drape)}
        />
      ) : null}
      {centre && centreClear && show("move") ? (
        <MoveHandle
          position={[centre[0], gripY, centre[1]]}
          size={size}
          variant="center"
          setCursor={setCursor}
          onPointerDown={(event: ThreeEvent<PointerEvent>) =>
            controllers.startCeilingDrag(event, drape.id, { threshold: 1 })
          }
        />
      ) : null}
      {anchors.drops.map((handle) =>
        show("drop", handle.field) ? (
          <ElevationHandle
            key={handle.field}
            position={dropPosition(handle.field, handle.position)}
            size={size}
            setCursor={setCursor}
            onPointerDown={(event) =>
              controllers.startDropDrag(event, drape, handle.field)
            }
          />
        ) : null
      )}
      {anchors.rotatable && show("rotate") ? (
        <RotationGizmo
          center={[pivotX, pivotZ]}
          radius={ringRadius}
          knobAngle={(drape.rotation * Math.PI) / 180}
          size={size}
          height={ringY}
          setCursor={setCursor}
          onPointerDown={(event) =>
            controllers.startCeilingRotate(event, drape, anchors.pivot, ringY)
          }
        />
      ) : null}
      {corners && show("resize") ? (
        <ResizeHandles
          corners={corners}
          rotationY={(-drape.rotation * Math.PI) / 180}
          size={size}
          height={gripY}
          setCursor={setCursor}
          onPointerDown={(event, index) =>
            controllers.startAreaResize(event, drape, index, gripY)
          }
        />
      ) : null}
    </group>
  );
}
