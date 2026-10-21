"use client";

import { useThree, type ThreeEvent } from "@react-three/fiber";
import type { StudioDesignJson, StudioObject } from "@/data/studio";
import {
  getWallSegments,
  type StudioBounds,
} from "@/lib/studio-geometry";
import { getStudioObjectCorners } from "@/lib/studio-interactions";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  useOptionalStudioEditor,
  type StudioEditorContextValue,
} from "../editor/studio-editor-context";
import type { StudioSelection } from "../studio-types";
import {
  getStudioCameraMode,
  isInteriorMode,
  useStudioCameraMode,
} from "./camera/camera-view-store";
import {
  SCALE,
  getObjectRect,
  getObjectVerticalExtent,
  getWallFrames,
  getWallItemSpan,
  getWallItemVertical,
  getWallItems,
  hasElevationHandle,
  toWorld,
  unionRects,
  wallSpanPoints,
  type WallItemKind,
} from "./manipulation/drag-math";
import {
  ElevationHandle,
  ResizeHandles,
  RotationGizmo,
  SpanHandles,
} from "./manipulation/gizmos";
import { ReadoutChip } from "./manipulation/labels";
import {
  GhostFootprint,
  GuideLines,
  SelectionBox,
  WallSpanLine,
} from "./manipulation/overlays";
import {
  ObjectProxy,
  WallItemProxy,
  type ProxyEvents,
  type ProxyTarget,
} from "./manipulation/proxies";
import { useDragSession } from "./manipulation/use-drag-session";
import {
  useManipulationControllers,
  type ClaimOptions,
} from "./manipulation/use-manipulation-controllers";
import type { DragHandlers } from "./manipulation/use-drag-session";

const WALL_ITEM_KINDS: WallItemKind[] = ["drape", "treatment", "opening"];
/** Touch long-press (ms) that grabs an unselected item instead of the camera. */
const LONG_PRESS_MS = 250;

type HoverState =
  | { type: "proxy"; target: ProxyTarget }
  | { type: "gizmo"; cursor: string }
  | null;
const LAYER_FOR_KIND: Record<
  WallItemKind,
  "drapes" | "treatments" | "openings"
> = {
  drape: "drapes",
  treatment: "treatments",
  opening: "openings",
};

/**
 * Invisible pick proxies + gizmos for selecting, dragging, rotating and
 * sliding items directly in the 3D scene.
 */
export function StudioManipulationLayer(props: {
  design: StudioDesignJson;
  bounds: StudioBounds;
}) {
  const editor = useOptionalStudioEditor();
  if (!editor) return null;
  return <ManipulationLayer {...props} editor={editor} />;
}

function ManipulationLayer({
  design,
  bounds,
  editor,
}: {
  design: StudioDesignJson;
  bounds: StudioBounds;
  editor: StudioEditorContextValue;
}) {
  const invalidate = useThree((state) => state.invalidate);
  const { start: rawStartSession, setCursor } = useDragSession();
  const {
    settings,
    selectedIds,
    select,
    hoveredId,
    setHoveredId,
    sendCanvasCommand,
  } = editor;
  const cameraMode = useStudioCameraMode();

  const floor = design.room.floor;
  const walls = useMemo(() => getWallSegments(floor), [floor]);
  const frames = useMemo(() => getWallFrames(floor, walls), [floor, walls]);
  const wallHeight = design.room.wallHeight;
  const sceneSize = Math.max(bounds.width, bounds.depth) * SCALE;
  const handleSize = Math.min(0.55, Math.max(0.2, sceneSize * 0.0075));

  /* What the pointer rests on, so cursors survive drags and selection changes. */
  const hover = useRef<HoverState>(null);
  const selectedIdsRef = useRef<string[]>(selectedIds);

  const resolveCursor = useCallback((): string => {
    const current = hover.current;
    if (!current) return "";
    if (current.type === "gizmo") return current.cursor;
    const { target } = current;
    const selected = selectedIdsRef.current.includes(target.id);
    if (isInteriorMode(getStudioCameraMode())) {
      if (!selected) return "pointer";
      return target.locked ? "not-allowed" : "grab";
    }
    return target.locked ? "not-allowed" : "grab";
  }, []);

  const startSession = useCallback(
    (event: ThreeEvent<PointerEvent>, handlers: DragHandlers) =>
      rawStartSession(event, { ...handlers, cursorAfter: resolveCursor }),
    [rawStartSession, resolveCursor]
  );

  const controllers = useManipulationControllers({
    design,
    bounds,
    walls,
    frames,
    editor,
    startSession,
  });
  const { overlay, isDragging } = controllers;
  const mode = overlay?.mode ?? null;

  useEffect(() => {
    invalidate();
  }, [invalidate, overlay, selectedIds, hoveredId]);

  useEffect(() => {
    selectedIdsRef.current = selectedIds;
    if (hover.current && !isDragging()) setCursor(resolveCursor());
  }, [cameraMode, isDragging, resolveCursor, selectedIds, setCursor]);

  useEffect(
    () => () => {
      setCursor("");
    },
    [setCursor]
  );

  const hoverCursor = (cursor: string) => {
    if (cursor) hover.current = { type: "gizmo", cursor };
    else if (hover.current?.type === "gizmo") hover.current = null;
    if (!isDragging()) setCursor(cursor);
  };

  const proxyEvents: ProxyEvents = {
    onHover: (target: ProxyTarget | null) => {
      hover.current = target ? { type: "proxy", target } : null;
      if (isDragging()) return;
      setHoveredId(target?.id ?? null);
      setCursor(resolveCursor());
    },
    onClick: (event, target) => {
      if (event.delta > 4) return;
      select({ kind: target.kind, id: target.id } as StudioSelection, {
        additive: event.shiftKey || event.metaKey || event.ctrlKey,
      });
    },
    onDoubleClick: (_event, target) => {
      select({ kind: target.kind, id: target.id } as StudioSelection);
      sendCanvasCommand({ type: "focus_selection" });
    },
    /*
     * Outside views: any unlocked item drags. In-room views: drags on an
     * unselected item look around (click still selects); a selected item
     * drags; Alt-drag / touch long-press grabs an unselected item at once.
     */
    onPointerDown: (event: ThreeEvent<PointerEvent>, target) => {
      const native = event.nativeEvent;
      if (native.button !== 0 || target.locked) return false;
      if (settings.tool !== "select") return false;
      const selected = selectedIds.includes(target.id);
      const interior = isInteriorMode(getStudioCameraMode());
      const touch = native.pointerType === "touch";
      let claim: ClaimOptions | null = null;
      if (touch) {
        claim = selected ? {} : { holdToClaim: LONG_PRESS_MS };
      } else if (selected || !interior) {
        claim = {};
      } else if (native.altKey) {
        claim = { threshold: 0 };
      }
      if (!claim) return false;
      if (target.kind === "object") {
        controllers.startObjectDrag(event, target.id, claim);
      } else {
        controllers.startWallDrag(event, target.kind, target.id, claim);
      }
      return true;
    },
  };

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const visibleObjects = settings.layers.objects
    ? design.objects.filter((object) => !object.hidden)
    : [];
  const selectedObjects = visibleObjects.filter((object) =>
    selectedSet.has(object.id)
  );
  const movableSelected = selectedObjects.filter((object) => !object.locked);
  const singleObject: StudioObject | null =
    selectedIds.length === 1 && movableSelected.length === 1
      ? movableSelected[0]
      : null;
  const groupRect =
    selectedObjects.length > 1
      ? unionRects(selectedObjects.map(getObjectRect))
      : null;

  /* Rotation ring geometry (single object or whole multi-selection). */
  const rotationTarget = (() => {
    if (movableSelected.length === 0) return null;
    if (singleObject) {
      const halfDiagonal = Math.hypot(singleObject.width, singleObject.depth) / 2;
      return {
        center: toWorld(bounds, singleObject),
        radius: halfDiagonal * SCALE + Math.max(0.6, handleSize * 2.6),
        knobAngle: (singleObject.rotation * Math.PI) / 180,
      };
    }
    if (movableSelected.length < 2) return null;
    const padding = Math.max(0.8, handleSize * 3);
    if (overlay?.ring) {
      return {
        center: overlay.ring.center,
        radius: overlay.ring.halfDiagonal * SCALE + padding,
        knobAngle: overlay.groupAngle ?? 0,
      };
    }
    const rect = unionRects(movableSelected.map(getObjectRect));
    if (!rect) return null;
    const halfDiagonal =
      Math.hypot(rect.maxX - rect.minX, rect.maxZ - rect.minZ) / 2;
    return {
      center: toWorld(bounds, {
        x: (rect.minX + rect.maxX) / 2,
        z: (rect.minZ + rect.maxZ) / 2,
      }),
      radius: halfDiagonal * SCALE + padding,
      knobAngle: 0,
    };
  })();

  /* Single selected wall item → span grips. */
  const selectedWallItem = (() => {
    if (selectedIds.length !== 1) return null;
    for (const kind of WALL_ITEM_KINDS) {
      if (!settings.layers[LAYER_FOR_KIND[kind]]) continue;
      const item = getWallItems(design, kind).find(
        (entry) => entry.id === selectedIds[0]
      );
      if (!item || item.hidden) continue;
      const span = getWallItemSpan(kind, item);
      const wall = frames[span.wallIndex];
      if (!wall) return null;
      const { bottom, top } = getWallItemVertical(kind, item);
      const y = ((bottom + top) / 2) * SCALE;
      const floorLine = wallSpanPoints(wall, span.start, span.end, 3);
      const [from, to] = wallSpanPoints(wall, span.start, span.end, 8);
      const [fx, fz] = toWorld(bounds, from);
      const [tx, tz] = toWorld(bounds, to);
      const ends: [[number, number, number], [number, number, number]] = [
        [fx, y, fz],
        [tx, y, tz],
      ];
      return {
        kind,
        item,
        wall,
        floorLine,
        ends,
        gripHeight: (top - bottom) * SCALE,
      };
    }
    return null;
  })();

  const elevationHandlePosition: [number, number, number] | null =
    singleObject && hasElevationHandle(singleObject)
      ? [
          toWorld(bounds, singleObject)[0],
          getObjectVerticalExtent(singleObject, wallHeight).top * SCALE +
            handleSize * 4,
          toWorld(bounds, singleObject)[1],
        ]
      : null;

  const showGizmo = (gizmo: "rotate" | "resize" | "elevate" | "span") =>
    mode === null || mode === gizmo;

  return (
    <group name="studio-manipulation">
      {/* Pick proxies */}
      {visibleObjects.map((object) => (
        <ObjectProxy
          key={object.id}
          object={object}
          bounds={bounds}
          wallHeight={wallHeight}
          showSeating={settings.showSeating}
          events={proxyEvents}
        />
      ))}
      {WALL_ITEM_KINDS.flatMap((kind) =>
        settings.layers[LAYER_FOR_KIND[kind]]
          ? getWallItems(design, kind)
              .filter((item) => !item.hidden)
              .map((item) => {
                const wall = frames[getWallItemSpan(kind, item).wallIndex];
                if (!wall) return null;
                return (
                  <WallItemProxy
                    key={item.id}
                    kind={kind}
                    item={item}
                    wall={wall}
                    bounds={bounds}
                    events={proxyEvents}
                  />
                );
              })
          : []
      )}

      {/* Multi-selection frame (per-object highlights live in objects.tsx) */}
      {groupRect ? <SelectionBox bounds={bounds} rect={groupRect} /> : null}
      {selectedWallItem && !overlay ? (
        <WallSpanLine
          bounds={bounds}
          from={selectedWallItem.floorLine[0]}
          to={selectedWallItem.floorLine[1]}
        />
      ) : null}

      {/* Gizmos */}
      {rotationTarget && showGizmo("rotate") ? (
        <RotationGizmo
          center={rotationTarget.center}
          radius={rotationTarget.radius}
          knobAngle={rotationTarget.knobAngle}
          size={handleSize}
          setCursor={hoverCursor}
          onPointerDown={(event) => controllers.startRotate(event)}
        />
      ) : null}
      {singleObject && showGizmo("resize") ? (
        <ResizeHandles
          corners={getStudioObjectCorners(singleObject).map((corner) =>
            toWorld(bounds, corner)
          )}
          rotationY={(-singleObject.rotation * Math.PI) / 180}
          size={handleSize}
          setCursor={hoverCursor}
          onPointerDown={(event, index) =>
            controllers.startResize(event, singleObject, index)
          }
        />
      ) : null}
      {singleObject && elevationHandlePosition && showGizmo("elevate") ? (
        <ElevationHandle
          position={elevationHandlePosition}
          size={handleSize}
          setCursor={hoverCursor}
          onPointerDown={(event) => controllers.startElevate(event, singleObject)}
        />
      ) : null}
      {selectedWallItem &&
      !selectedWallItem.item.locked &&
      showGizmo("span") ? (
        <SpanHandles
          ends={selectedWallItem.ends}
          rotationY={-selectedWallItem.wall.angle}
          height={selectedWallItem.gripHeight}
          size={handleSize}
          setCursor={hoverCursor}
          onPointerDown={(event, end) =>
            controllers.startSpanResize(
              event,
              selectedWallItem.kind,
              selectedWallItem.item.id,
              end
            )
          }
        />
      ) : null}

      {/* Live drag feedback */}
      {overlay?.ghosts?.map((corners, index) => (
        <GhostFootprint key={`ghost-${index}`} bounds={bounds} corners={corners} />
      ))}
      {overlay?.guides && overlay.guides.length > 0 ? (
        <GuideLines bounds={bounds} guides={overlay.guides} />
      ) : null}
      {overlay?.wallGhost ? (
        <WallSpanLine
          bounds={bounds}
          from={overlay.wallGhost[0]}
          to={overlay.wallGhost[1]}
          ghost
        />
      ) : null}
      {overlay?.targetWall ? (
        <WallSpanLine
          bounds={bounds}
          from={overlay.targetWall[0]}
          to={overlay.targetWall[1]}
        />
      ) : null}
      {overlay?.readout ? (
        <ReadoutChip
          position={overlay.readout.position}
          title={overlay.readout.title}
          detail={overlay.readout.detail}
        />
      ) : null}
    </group>
  );
}
