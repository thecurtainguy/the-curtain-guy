"use client";

import type { ThreeEvent } from "@react-three/fiber";
import type { StudioDesignJson, StudioObject, StudioPoint } from "@/data/studio";
import {
  findStudioItem,
  normalizeRotation,
  nudgeStudioItems,
  rotateStudioItemsAsGroup,
} from "@/lib/studio-commands";
import {
  inchesToFeetLabel,
  type StudioBounds,
  type StudioWallSegment,
} from "@/lib/studio-geometry";
import {
  getStudioObjectBoundsResult,
  getStudioObjectCorners,
  isStudioPointInRoom,
  replaceStudioObject,
  resizeCircularStudioObject,
  resizeStudioObjectFromCorner,
  type StudioResizeHandle,
} from "@/lib/studio-interactions";
import { useCallback, useRef, useState } from "react";
import * as THREE from "three";
import type {
  StudioEditorActions,
  StudioEditorSettings,
} from "../../editor/studio-editor-context";
import type { StudioSelection } from "../../studio-types";
import {
  CIRCULAR_OBJECT_TYPES,
  MIN_WALL_SPAN,
  SCALE,
  applyWallItemSpan,
  clamp,
  computeSmartSnap,
  containCentersInPolygon,
  formatDegrees,
  fromWorld,
  getObjectRect,
  getObjectVerticalExtent,
  getWallItemSpan,
  getWallItemVertical,
  getWallItems,
  intersectHorizontal,
  intersectVertical,
  magnetWallStart,
  pointerAlongWall,
  projectOntoWall,
  resolvePointerWall,
  snapTo,
  toWorld,
  unionRects,
  wallSpanPoints,
  wrapAngle,
  type GuideLine,
  type WallFrame,
  type WallItemKind,
} from "./drag-math";
import type { DragHandlers } from "./use-drag-session";

export type ManipulationMode =
  | "move"
  | "rotate"
  | "resize"
  | "elevate"
  | "slide"
  | "span"
  | "hub"
  | "drop";

export type ManipulationOverlay = {
  mode: ManipulationMode;
  ghosts?: StudioPoint[][];
  guides?: GuideLine[];
  /** World y (feet) for `guides`; floor when omitted. */
  guidesHeight?: number;
  /** Ceiling outlines where the dragged designs started (plan inches). */
  ceilingGhosts?: StudioPoint[][];
  /** Which of several same-mode grips is being dragged (e.g. a drop field). */
  activeHandle?: string;
  wallGhost?: [StudioPoint, StudioPoint];
  targetWall?: [StudioPoint, StudioPoint];
  /** Live group-rotation knob angle (radians). */
  groupAngle?: number;
  /** Group rotation pivot frozen for the whole gesture (world feet / inches). */
  ring?: { center: [number, number]; halfDiagonal: number };
  readout?: {
    position: [number, number, number];
    title: string;
    detail?: string;
  };
};

const RESIZE_HANDLES: StudioResizeHandle[] = [
  "north_west",
  "north_east",
  "south_east",
  "south_west",
];

export type StartSession = (
  event: ThreeEvent<PointerEvent>,
  handlers: DragHandlers
) => void;

/** Shared gesture plumbing handed to sibling controllers (ceiling). */
export type GestureApi = {
  begin: (initial: ManipulationOverlay, selection?: StudioSelection) => void;
  finish: (commit: boolean) => void;
  setOverlay: (overlay: ManipulationOverlay | null) => void;
};

/** How a proxy drag claims the pointer (threshold / long-press). */
export type ClaimOptions = Pick<DragHandlers, "threshold" | "holdToClaim">;

function offsetRect(
  rect: ReturnType<typeof getObjectRect>,
  dx: number,
  dz: number
) {
  return {
    minX: rect.minX + dx,
    maxX: rect.maxX + dx,
    minZ: rect.minZ + dz,
    maxZ: rect.maxZ + dz,
  };
}

/**
 * Gesture controllers for the 3D manipulation layer. Each `start*` begins a
 * pointer session; a whole gesture is one undo step (begin → preview → end).
 */
export function useManipulationControllers({
  design,
  bounds,
  walls,
  frames,
  actions,
  settings,
  selectedIds,
  startSession,
}: {
  design: StudioDesignJson;
  bounds: StudioBounds;
  walls: StudioWallSegment[];
  frames: WallFrame[];
  actions: StudioEditorActions;
  settings: StudioEditorSettings;
  selectedIds: string[];
  startSession: StartSession;
}) {
  const [overlay, setOverlay] = useState<ManipulationOverlay | null>(null);
  const dragging = useRef(false);
  const { select, beginTransaction, preview, endTransaction, cancelTransaction } =
    actions;
  const wallHeight = design.room.wallHeight;
  const increment = Math.max(1, settings.snapIncrement);

  const isDragging = useCallback(() => dragging.current, []);

  const finishGesture = useCallback(
    (commit: boolean) => {
      dragging.current = false;
      if (commit) endTransaction();
      else cancelTransaction();
      setOverlay(null);
    },
    [cancelTransaction, endTransaction]
  );

  const beginGesture = useCallback(
    (initial: ManipulationOverlay, selection?: StudioSelection) => {
      dragging.current = true;
      if (selection) select(selection);
      beginTransaction();
      setOverlay(initial);
    },
    [beginTransaction, select]
  );

  const objectReadout = (
    object: StudioObject,
    title: string,
    detail?: string
  ): ManipulationOverlay["readout"] => {
    const [x, z] = toWorld(bounds, object);
    const { top } = getObjectVerticalExtent(object, wallHeight);
    return { position: [x, top * SCALE + 0.35, z], title, detail };
  };

  const positionTitle = (object: StudioObject) =>
    `X ${inchesToFeetLabel(object.x - bounds.minX)}  ·  Z ${inchesToFeetLabel(
      object.z - bounds.minZ
    )}`;

  /* ---------------------------- Object move ---------------------------- */

  const startObjectDrag = (
    event: ThreeEvent<PointerEvent>,
    id: string,
    claim: ClaimOptions = {}
  ) => {
    const base = design;
    const grabbed = base.objects.find((object) => object.id === id);
    if (!grabbed || grabbed.locked) return;
    const wasSelected = selectedIds.includes(id);
    const ids = wasSelected
      ? selectedIds.filter((itemId) => {
          const found = findStudioItem(base, itemId);
          return found && !found.item.locked;
        })
      : [id];
    const moving = base.objects.filter(
      (object) => ids.includes(object.id) && !object.locked
    );
    const movingIds = new Set(moving.map((object) => object.id));
    const others = base.objects
      .filter((object) => !movingIds.has(object.id) && !object.hidden)
      .map(getObjectRect);
    const containable = moving.filter(
      (object) => getStudioObjectBoundsResult(object, base.room.floor).contained
    );
    const groupRect = unionRects(containable.map(getObjectRect));
    const floor = base.room.floor;
    const insideCenters = moving
      .filter((object) => isStudioPointInRoom(object, floor))
      .map((object) => ({ x: object.x, z: object.z }));
    let lastValid = { x: 0, z: 0 };
    const grabbedRect = getObjectRect(grabbed);
    const planeY = Math.max(0, event.point.y);
    const startHit =
      intersectHorizontal(event.ray.clone(), planeY) ?? event.point.clone();
    const ghosts = moving.map((object) => getStudioObjectCorners(object));
    const detail =
      moving.length > 1 ? `Moving ${moving.length} items` : grabbed.label;

    startSession(event, {
      ...claim,
      onActivate: () =>
        beginGesture(
          {
            mode: "move",
            ghosts,
            readout: objectReadout(grabbed, positionTitle(grabbed), detail),
          },
          wasSelected ? undefined : { kind: "object", id }
        ),
      onMove: ({ ray, free }) => {
        const hit = intersectHorizontal(ray, planeY);
        if (!hit) return;
        let dx = (hit.x - startHit.x) / SCALE;
        let dz = (hit.z - startHit.z) / SCALE;
        let guides: GuideLine[] = [];
        if (!free) {
          let snappedX = dx;
          let snappedZ = dz;
          if (settings.snapEnabled) {
            snappedX = snapTo(grabbed.x + dx, increment) - grabbed.x;
            snappedZ = snapTo(grabbed.z + dz, increment) - grabbed.z;
          }
          if (settings.smartGuides) {
            const smart = computeSmartSnap(
              offsetRect(grabbedRect, dx, dz),
              others,
              walls
            );
            if (smart.dx !== null) snappedX = dx + smart.dx;
            if (smart.dz !== null) snappedZ = dz + smart.dz;
            guides = smart.guides;
          }
          dx = snappedX;
          dz = snappedZ;
        }
        if (groupRect) {
          const minDx = bounds.minX - groupRect.minX;
          const maxDx = bounds.maxX - groupRect.maxX;
          const minDz = bounds.minZ - groupRect.minZ;
          const maxDz = bounds.maxZ - groupRect.maxZ;
          if (minDx <= maxDx) dx = clamp(dx, minDx, maxDx);
          if (minDz <= maxDz) dz = clamp(dz, minDz, maxDz);
        }
        const contained = containCentersInPolygon(
          insideCenters,
          { x: dx, z: dz },
          floor
        );
        if (contained) lastValid = contained;
        dx = lastValid.x;
        dz = lastValid.z;
        const next = nudgeStudioItems(base, ids, dx, dz);
        preview(next);
        const moved = next.objects.find((object) => object.id === id) ?? grabbed;
        setOverlay({
          mode: "move",
          ghosts,
          guides,
          readout: objectReadout(moved, positionTitle(moved), detail),
        });
      },
      onEnd: finishGesture,
    });
  };

  /* ------------------------------ Rotation ----------------------------- */

  const getRotatableObjects = (base: StudioDesignJson) =>
    base.objects.filter(
      (object) =>
        selectedIds.includes(object.id) && !object.locked && !object.hidden
    );

  const startRotate = (event: ThreeEvent<PointerEvent>) => {
    const base = design;
    const targets = getRotatableObjects(base);
    if (targets.length === 0) return;
    const single = targets.length === 1 ? targets[0] : null;
    const rect = unionRects(targets.map(getObjectRect));
    if (!rect) return;
    const center = single
      ? { x: single.x, z: single.z }
      : { x: (rect.minX + rect.maxX) / 2, z: (rect.minZ + rect.maxZ) / 2 };
    const ids = targets.map((object) => object.id);
    const startHit = intersectHorizontal(event.ray.clone(), 0.05);
    if (!startHit) return;
    const startPoint = fromWorld(bounds, startHit.x, startHit.z);
    let lastAngle = Math.atan2(startPoint.z - center.z, startPoint.x - center.x);
    let accumulated = 0;
    const [cx, cz] = toWorld(bounds, center);
    const readoutY =
      Math.max(
        ...targets.map((object) => getObjectVerticalExtent(object, wallHeight).top)
      ) *
        SCALE +
      0.6;
    const ghosts = targets.map((object) => getStudioObjectCorners(object));
    const step = settings.rotationSnap > 0 ? settings.rotationSnap : 0;
    const ring = single
      ? undefined
      : {
          center: [cx, cz] as [number, number],
          halfDiagonal: Math.hypot(rect.maxX - rect.minX, rect.maxZ - rect.minZ) / 2,
        };

    startSession(event, {
      threshold: 1,
      onActivate: () =>
        beginGesture({
          mode: "rotate",
          ghosts,
          groupAngle: 0,
          ring,
          readout: {
            position: [cx, readoutY, cz],
            title: single ? formatDegrees(single.rotation) : "+0°",
            detail: single ? "Rotation" : `Rotating ${targets.length} items`,
          },
        }),
      onMove: ({ ray, free }) => {
        const hit = intersectHorizontal(ray, 0.05);
        if (!hit) return;
        const point = fromWorld(bounds, hit.x, hit.z);
        const angle = Math.atan2(point.z - center.z, point.x - center.x);
        accumulated += wrapAngle(angle - lastAngle);
        lastAngle = angle;
        const deltaDegrees = (accumulated * 180) / Math.PI;
        if (single) {
          const raw = single.rotation + deltaDegrees;
          const snapped =
            free || step === 0 ? Math.round(raw * 10) / 10 : snapTo(raw, step);
          const rotation = normalizeRotation(snapped);
          preview(replaceStudioObject(base, { ...single, rotation }));
          setOverlay({
            mode: "rotate",
            ghosts,
            readout: {
              position: [cx, readoutY, cz],
              title: formatDegrees(rotation),
              detail: free ? "Free rotation" : `Snap ${step}°`,
            },
          });
          return;
        }
        const delta =
          free || step === 0
            ? Math.round(deltaDegrees * 10) / 10
            : snapTo(deltaDegrees, step);
        preview(rotateStudioItemsAsGroup(base, ids, delta));
        setOverlay({
          mode: "rotate",
          ghosts,
          ring,
          groupAngle: (delta * Math.PI) / 180,
          readout: {
            position: [cx, readoutY, cz],
            title: `${delta >= 0 ? "+" : "−"}${formatDegrees(Math.abs(delta))}`,
            detail: `Rotating ${targets.length} items`,
          },
        });
      },
      onEnd: finishGesture,
    });
  };

  /* ------------------------------- Resize ------------------------------ */

  const startResize = (
    event: ThreeEvent<PointerEvent>,
    object: StudioObject,
    cornerIndex: number
  ) => {
    if (object.locked) return;
    const base = design;
    const handle = RESIZE_HANDLES[cornerIndex] ?? "south_east";
    const circular = CIRCULAR_OBJECT_TYPES.has(object.type);
    const ghosts = [getStudioObjectCorners(object)];
    const sizeTitle = (target: StudioObject) =>
      circular
        ? `⌀ ${inchesToFeetLabel(target.width)}`
        : `${inchesToFeetLabel(target.width)} × ${inchesToFeetLabel(target.depth)}`;

    startSession(event, {
      threshold: 1,
      cursor: cornerIndex % 2 === 0 ? "nwse-resize" : "nesw-resize",
      onActivate: () =>
        beginGesture({
          mode: "resize",
          ghosts,
          readout: objectReadout(object, sizeTitle(object), "Footprint"),
        }),
      onMove: ({ ray, free }) => {
        const hit = intersectHorizontal(ray, 0);
        if (!hit) return;
        const pointer = fromWorld(bounds, hit.x, hit.z);
        const options = {
          bypassSnap: free || !settings.snapEnabled,
          snapIncrement: increment,
        };
        const resized = circular
          ? resizeCircularStudioObject(
              object,
              {
                x: object.x + (pointer.x - object.x) / Math.SQRT2,
                z: object.z + (pointer.z - object.z) / Math.SQRT2,
              },
              options
            )
          : resizeStudioObjectFromCorner(object, handle, pointer, options);
        preview(replaceStudioObject(base, resized));
        setOverlay({
          mode: "resize",
          ghosts,
          readout: objectReadout(resized, sizeTitle(resized), "Footprint"),
        });
      },
      onEnd: finishGesture,
    });
  };

  /* ------------------------------ Elevation ---------------------------- */

  const startElevate = (event: ThreeEvent<PointerEvent>, object: StudioObject) => {
    if (object.locked) return;
    const base = design;
    const [x, z] = toWorld(bounds, object);
    const normal = new THREE.Vector3();
    event.camera.getWorldDirection(normal);
    normal.y = 0;
    if (normal.lengthSq() < 1e-6) normal.set(0, 0, 1);
    normal.normalize();
    const pivot = new THREE.Vector3(x, 0, z);
    const startHit = intersectVertical(event.ray.clone(), pivot, normal);
    if (!startHit) return;
    const baseElevation = getObjectVerticalExtent(object, wallHeight).bottom;
    const maxElevation = Math.max(0, Math.min(600, wallHeight - object.height));
    const title = (elevation: number) => `${inchesToFeetLabel(elevation)} off floor`;

    startSession(event, {
      threshold: 1,
      cursor: "ns-resize",
      onActivate: () =>
        beginGesture({
          mode: "elevate",
          readout: objectReadout(object, title(baseElevation), "Hang height"),
        }),
      onMove: ({ ray, free }) => {
        const hit = intersectVertical(ray, pivot, normal);
        if (!hit) return;
        let elevation = baseElevation + (hit.y - startHit.y) / SCALE;
        if (!free && settings.snapEnabled) {
          elevation = snapTo(elevation, Math.min(increment, 6));
        }
        elevation = Math.round(clamp(elevation, 0, maxElevation));
        const next = { ...object, elevation } as StudioObject;
        preview(replaceStudioObject(base, next));
        setOverlay({
          mode: "elevate",
          readout: objectReadout(next, title(elevation), "Hang height"),
        });
      },
      onEnd: finishGesture,
    });
  };

  /* ----------------------------- Wall items ---------------------------- */

  const wallNeighbours = (
    base: StudioDesignJson,
    wallIndex: number,
    excludeId: string
  ) =>
    (["drape", "treatment", "opening"] as WallItemKind[]).flatMap((kind) =>
      getWallItems(base, kind)
        .filter((item) => item.id !== excludeId && !item.hidden)
        .map((item) => getWallItemSpan(kind, item))
        .filter((span) => span.wallIndex === wallIndex)
    );

  const wallReadout = (
    wall: WallFrame,
    start: number,
    end: number,
    top: number,
    title: string,
    detail: string
  ): ManipulationOverlay["readout"] => {
    const [from, to] = wallSpanPoints(wall, start, end, 10);
    const [x, z] = toWorld(bounds, {
      x: (from.x + to.x) / 2,
      z: (from.z + to.z) / 2,
    });
    return { position: [x, top * SCALE + 0.45, z], title, detail };
  };

  const startWallDrag = (
    event: ThreeEvent<PointerEvent>,
    kind: WallItemKind,
    id: string,
    claim: ClaimOptions = {}
  ) => {
    const base = design;
    const item = getWallItems(base, kind).find((entry) => entry.id === id);
    if (!item || item.locked) return;
    const span = getWallItemSpan(kind, item);
    const originWall = frames[span.wallIndex];
    if (!originWall) return;
    const length = Math.max(1, span.end - span.start);
    const { top } = getWallItemVertical(kind, item);
    const grabAlong =
      pointerAlongWall(event.ray.clone(), originWall, bounds) ??
      projectOntoWall(originWall, fromWorld(bounds, event.point.x, event.point.z));
    const grabLocal = clamp(grabAlong - span.start, 0, length);
    const wallGhost = wallSpanPoints(originWall, span.start, span.end, 3);
    const wasSelected = selectedIds.includes(id);
    let currentWall = span.wallIndex;

    const describe = (wall: WallFrame, start: number, spanLength: number) => ({
      title: `${inchesToFeetLabel(start)} from corner`,
      detail: `Wall ${wall.index + 1} · ${inchesToFeetLabel(spanLength)} span`,
    });

    startSession(event, {
      ...claim,
      onActivate: () => {
        const text = describe(originWall, span.start, length);
        beginGesture(
          {
            mode: "slide",
            wallGhost,
            readout: wallReadout(
              originWall,
              span.start,
              span.end,
              top,
              text.title,
              text.detail
            ),
          },
          wasSelected ? undefined : ({ kind, id } as StudioSelection)
        );
      },
      onMove: ({ ray, free }) => {
        const target = resolvePointerWall(ray, frames, bounds, wallHeight);
        let along: number | null = null;
        if (target && target.wallIndex !== currentWall) {
          currentWall = target.wallIndex;
          along = target.along;
        } else {
          const wall = frames[currentWall];
          along = wall ? pointerAlongWall(ray, wall, bounds) : null;
        }
        const wall = frames[currentWall];
        if (along === null || !wall) return;
        const spanLength = Math.min(length, wall.length);
        let start = along - Math.min(grabLocal, spanLength);
        if (!free) {
          const raw = start;
          if (settings.snapEnabled) start = snapTo(start, increment);
          if (settings.smartGuides) {
            const magnet = magnetWallStart(
              raw,
              spanLength,
              wall.length,
              wallNeighbours(base, currentWall, id)
            );
            if (magnet.snapped) start = magnet.start;
          }
        }
        start = clamp(start, 0, Math.max(0, wall.length - spanLength));
        const next = applyWallItemSpan(base, kind, id, {
          wallIndex: currentWall,
          start,
          end: start + spanLength,
        });
        preview(next);
        const text = describe(wall, start, spanLength);
        setOverlay({
          mode: "slide",
          wallGhost,
          targetWall:
            currentWall !== span.wallIndex
              ? wallSpanPoints(wall, 0, wall.length, 3)
              : undefined,
          readout: wallReadout(
            wall,
            start,
            start + spanLength,
            top,
            text.title,
            text.detail
          ),
        });
      },
      onEnd: finishGesture,
    });
  };

  const startSpanResize = (
    event: ThreeEvent<PointerEvent>,
    kind: WallItemKind,
    id: string,
    end: "start" | "end"
  ) => {
    const base = design;
    const item = getWallItems(base, kind).find((entry) => entry.id === id);
    if (!item || item.locked) return;
    const span = getWallItemSpan(kind, item);
    const wall = frames[span.wallIndex];
    if (!wall) return;
    const { top } = getWallItemVertical(kind, item);
    const wallGhost = wallSpanPoints(wall, span.start, span.end, 3);
    const describe = (start: number, finish: number) => ({
      title: `${inchesToFeetLabel(finish - start)} span`,
      detail: `${inchesToFeetLabel(start)} → ${inchesToFeetLabel(finish)} on wall ${
        wall.index + 1
      }`,
    });

    startSession(event, {
      threshold: 1,
      cursor: "ew-resize",
      onActivate: () => {
        const text = describe(span.start, span.end);
        beginGesture({
          mode: "span",
          wallGhost,
          readout: wallReadout(wall, span.start, span.end, top, text.title, text.detail),
        });
      },
      onMove: ({ ray, free }) => {
        let along = pointerAlongWall(ray, wall, bounds);
        if (along === null) return;
        if (!free && settings.snapEnabled) along = snapTo(along, increment);
        const start =
          end === "start"
            ? clamp(along, 0, span.end - MIN_WALL_SPAN)
            : span.start;
        const finish =
          end === "end"
            ? clamp(along, span.start + MIN_WALL_SPAN, wall.length)
            : span.end;
        preview(
          applyWallItemSpan(base, kind, id, {
            wallIndex: span.wallIndex,
            start,
            end: finish,
          })
        );
        const text = describe(start, finish);
        setOverlay({
          mode: "span",
          wallGhost,
          readout: wallReadout(wall, start, finish, top, text.title, text.detail),
        });
      },
      onEnd: finishGesture,
    });
  };

  const gesture: GestureApi = {
    begin: beginGesture,
    finish: finishGesture,
    setOverlay,
  };

  return {
    overlay,
    isDragging,
    gesture,
    startObjectDrag,
    startWallDrag,
    startRotate,
    startResize,
    startElevate,
    startSpanResize,
  };
}
