"use client";

import {
  STUDIO_MAX_OBJECTS,
  STUDIO_OBJECT_TYPES,
  createStudioObject,
  getStudioObjectOption,
  type StudioObject,
  type StudioObjectType,
  type StudioPoint,
} from "@/data/studio";
import { getObjectsBounds, nudgeStudioItems, rotateStudioItemsAsGroup } from "@/lib/studio-commands";
import { getStudioBounds, inchesToFeetLabel } from "@/lib/studio-geometry";
import {
  replaceStudioObject,
  resizeCircularStudioObject,
  resizeStudioObjectFromCorner,
  snapStudioValue,
  type StudioResizeHandle,
} from "@/lib/studio-interactions";
import { cn } from "@/lib/utils";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useStudioEditor } from "./editor/studio-editor-context";
import { DimensionLine, SmartGuidesLayer, WallDistanceLayer } from "./plan/dimension-line";
import { MarqueeLayer, marqueeRect } from "./plan/marquee";
import { MeasureLayer, type PlanMeasurement } from "./plan/measure-tool";
import { PlanMinimap } from "./plan/minimap";
import {
  angleAround,
  constrainToOctant,
  getConflictingObjectIds,
  getObjectBox,
  getPointsBox,
  getWallItemSegments,
  isCircularObjectType,
  normalizeDegrees,
  objectIntersectsRect,
  offsetBox,
  resizeStudioObjectFromEdge,
  segmentIntersectsRect,
  type PlanEdgeHandle,
} from "./plan/object-geometry";
import { ObjectLabelsLayer } from "./plan/object-labels";
import { PlanObjectSymbol, PlanSymbolDefs } from "./plan/object-symbols";
import { PlanGrid } from "./plan/plan-grid";
import type { PlanLayerProps } from "./plan/plan-types";
import { RoomLayer2D } from "./plan/room-layer";
import { PlanRulers, PLAN_RULER_SIZE } from "./plan/rulers";
import {
  GroupSelectionBox,
  ObjectStatusOutlines,
  SingleSelectionHandles,
  type ObjectStatus,
  type PlanObjectHandle,
} from "./plan/selection-overlay";
import {
  computeSmartSnap,
  getWallDistances,
  type SmartGuide,
  type SmartSnapTarget,
} from "./plan/smart-guides";
import {
  centeredCamera,
  fitCamera,
  getVisiblePlanRect,
  rectContains,
  zoomCameraAt,
  type PlanCamera,
  type PlanRect,
  type PlanSize,
} from "./plan/viewport";
import { WallItemsLayer2D } from "./plan/wall-items-layer";
import { PlanZoomControls } from "./plan/zoom-controls";
import type { StudioEditorProps } from "./studio-types";

/** dataTransfer type the library rail uses for draggable object tiles. */
export const STUDIO_OBJECT_DRAG_MIME = "application/x-studio-object";

const FALLBACK_SIZE: PlanSize = { width: 960, height: 640 };
const HANDLE_PX = 7;
const LABEL_PX = 12;
const GUIDE_SNAP_PX = 8;
const DRAG_THRESHOLD_PX = 3;
const ROTATE_STEM_PX = 30;

const FLOOR_LEVEL_TYPES: ReadonlySet<StudioObjectType> = new Set([
  "dance_floor",
  "stage",
  "table_area",
  "lounge_area",
  "ceremony_seating",
]);
const OVERHEAD_TYPES: ReadonlySet<StudioObjectType> = new Set(["chandelier", "ceiling_drape"]);

type ClientPoint = { x: number; y: number };

type Session =
  | { kind: "pan"; pointerId: number; startClient: ClientPoint; startCamera: PlanCamera; moved: boolean; isTouch: boolean }
  | { kind: "pinch"; startDistance: number; startMid: ClientPoint; startCamera: PlanCamera }
  | {
      kind: "marquee";
      pointerId: number;
      start: StudioPoint;
      startClient: ClientPoint;
      additive: boolean;
      baseIds: string[];
      moved: boolean;
    }
  | {
      kind: "move";
      pointerId: number;
      start: StudioPoint;
      startClient: ClientPoint;
      ids: string[];
      anchor: StudioObject;
      box: PlanRect;
      targets: SmartSnapTarget[];
      originalDesign: StudioEditorProps["design"];
      moved: boolean;
      soloId: string | null;
    }
  | {
      kind: "resize";
      pointerId: number;
      object: StudioObject;
      handle: PlanObjectHandle;
      originalDesign: StudioEditorProps["design"];
      moved: boolean;
    }
  | {
      kind: "rotate";
      pointerId: number;
      ids: string[];
      center: StudioPoint;
      startAngle: number;
      object: StudioObject | null;
      originalDesign: StudioEditorProps["design"];
      moved: boolean;
    }
  | { kind: "measure"; pointerId: number; start: StudioPoint };

type DragFeedback = {
  label: string;
  mode: string;
  guides: SmartGuide[];
  box: PlanRect | null;
  angleLabel: string | null;
};

type DropGhost = { type: StudioObjectType | null; point: StudioPoint };

function isObjectType(value: unknown): value is StudioObjectType {
  return typeof value === "string" && (STUDIO_OBJECT_TYPES as readonly string[]).includes(value);
}

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.matches("input, textarea, select") || target.isContentEditable)
  );
}

function isCornerHandle(handle: PlanObjectHandle): handle is StudioResizeHandle {
  return handle.includes("_");
}

function layerOrder(type: StudioObjectType): number {
  if (FLOOR_LEVEL_TYPES.has(type)) return 0;
  if (OVERHEAD_TYPES.has(type)) return 2;
  return 1;
}

export function Studio2DEditor(props: StudioEditorProps) {
  const { design } = props;
  const {
    settings,
    selectedIds,
    select,
    selectIds,
    hoveredId,
    setHoveredId,
    beginTransaction,
    preview,
    endTransaction,
    cancelTransaction,
    commit,
    canvasCommand,
    updateSettings,
  } = useStudioEditor();

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const sessionRef = useRef<Session | null>(null);
  const touchesRef = useRef(new Map<number, ClientPoint>());
  const spaceRef = useRef(false);
  const pointerInsideRef = useRef(false);
  const dragTypeRef = useRef<StudioObjectType | null>(null);
  const sizeRef = useRef<PlanSize | null>(null);

  const [size, setSize] = useState<PlanSize | null>(null);
  const [camera, setCamera] = useState<PlanCamera | null>(null);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [panning, setPanning] = useState(false);
  const [feedback, setFeedback] = useState<DragFeedback | null>(null);
  const [marquee, setMarquee] = useState<PlanRect | null>(null);
  const [measurement, setMeasurement] = useState<PlanMeasurement | null>(null);
  const [dropGhost, setDropGhost] = useState<DropGhost | null>(null);
  const [showRulers, setShowRulers] = useState(true);

  const floor = design.room.floor;
  const roomRect = useMemo<PlanRect>(() => {
    const bounds = getStudioBounds(floor);
    return { minX: bounds.minX, maxX: bounds.maxX, minZ: bounds.minZ, maxZ: bounds.maxZ };
  }, [floor]);
  const viewWidth = size?.width ?? FALLBACK_SIZE.width;
  const viewHeight = size?.height ?? FALLBACK_SIZE.height;
  const viewSize = useMemo<PlanSize>(
    () => ({ width: viewWidth, height: viewHeight }),
    [viewWidth, viewHeight]
  );
  const fit = useMemo(() => fitCamera(roomRect, viewSize), [roomRect, viewSize]);
  const cam = camera ?? fit;

  const visibleObjects = useMemo(() => {
    if (!settings.layers.objects) return [];
    return design.objects
      .filter((object) => !object.hidden)
      .map((object, index) => ({ object, index }))
      .sort(
        (a, b) =>
          layerOrder(a.object.type) - layerOrder(b.object.type) || a.index - b.index
      )
      .map((entry) => entry.object);
  }, [design.objects, settings.layers.objects]);
  const conflicts = useMemo(
    () => (settings.layers.objects ? getConflictingObjectIds(design.objects, floor) : new Set<string>()),
    [design.objects, floor, settings.layers.objects]
  );
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedObjects = useMemo(
    () => visibleObjects.filter((object) => selectedSet.has(object.id)),
    [selectedSet, visibleObjects]
  );
  const singleObject =
    selectedObjects.length === 1 && selectedIds.length === 1 ? selectedObjects[0] : null;
  const groupBox = useMemo(
    () =>
      selectedObjects.length > 1
        ? getPointsBox(selectedObjects.map((object) => getObjectBox(object)).flatMap((box) => [
            { x: box.minX, z: box.minZ },
            { x: box.maxX, z: box.maxZ },
          ]))
        : null,
    [selectedObjects]
  );

  // ---- canvas commands (fit / reset / zoom / focus) ----------------------
  const [handledNonce, setHandledNonce] = useState(() => canvasCommand?.nonce ?? 0);
  if (canvasCommand && canvasCommand.nonce !== handledNonce) {
    setHandledNonce(canvasCommand.nonce);
    const center = { x: viewSize.width / 2, y: viewSize.height / 2 };
    if (canvasCommand.type === "fit") setCamera(null);
    else if (canvasCommand.type === "reset") setCamera(centeredCamera(roomRect, viewSize, 1));
    else if (canvasCommand.type === "zoom") {
      setCamera(zoomCameraAt(cam, canvasCommand.direction === "in" ? 1.25 : 0.8, center));
    } else if (canvasCommand.type === "focus_selection") {
      const target = selectedObjects.length > 0 ? getObjectsBounds(selectedObjects) : roomRect;
      const pad = 48;
      setCamera(
        fitCamera(
          { minX: target.minX - pad, maxX: target.maxX + pad, minZ: target.minZ - pad, maxZ: target.maxZ + pad },
          viewSize
        )
      );
    }
  }

  // ---- live values for native listeners -----------------------------------
  const liveRef = useRef({ cam, tool: settings.tool });
  useLayoutEffect(() => {
    liveRef.current = { cam, tool: settings.tool };
  });

  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect || rect.width <= 0 || rect.height <= 0) return;
      const previous = sizeRef.current;
      if (previous && previous.width === rect.width && previous.height === rect.height) return;
      sizeRef.current = { width: rect.width, height: rect.height };
      setSize(sizeRef.current);
      if (previous) {
        // Keep the plan point at the viewport centre stable across layout changes.
        setCamera((current) =>
          current
            ? {
                ...current,
                x: current.x + (previous.width - rect.width) / 2 / current.zoom,
                z: current.z + (previous.height - rect.height) / 2 / current.zoom,
              }
            : current
        );
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const toPlanPoint = useCallback((event: { clientX: number; clientY: number }) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const current = liveRef.current.cam;
    return {
      x: current.x + (event.clientX - rect.left) / current.zoom,
      z: current.z + (event.clientY - rect.top) / current.zoom,
    };
  }, []);

  const clearSessionUi = useCallback(() => {
    setFeedback(null);
    setMarquee(null);
    setPanning(false);
  }, []);

  const abortSession = useCallback(() => {
    const session = sessionRef.current;
    if (!session) return;
    sessionRef.current = null;
    if (
      (session.kind === "move" || session.kind === "resize" || session.kind === "rotate") &&
      session.moved
    ) {
      cancelTransaction();
    }
    if (session.kind === "measure") setMeasurement(null);
    if ("pointerId" in session) {
      const svg = svgRef.current;
      if (svg?.hasPointerCapture(session.pointerId)) svg.releasePointerCapture(session.pointerId);
    }
    clearSessionUi();
  }, [cancelTransaction, clearSessionUi]);

  // Wheel: zoom at cursor (pinch = ctrl+wheel), trackpad two-finger pans.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    function handleWheel(event: WheelEvent) {
      event.preventDefault();
      const target = svgRef.current;
      if (!target) return;
      const rect = target.getBoundingClientRect();
      const screen = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? rect.height : 1;
      const dx = event.deltaX * unit;
      const dy = event.deltaY * unit;
      const base = liveRef.current.cam;
      if (event.ctrlKey || event.metaKey) {
        const factor = Math.exp(-dy * 0.01);
        setCamera((previous) => zoomCameraAt(previous ?? base, factor, screen));
        return;
      }
      const trackpadPan = event.deltaMode === 0 && Math.abs(dx) > 0.5;
      if (event.shiftKey || trackpadPan) {
        const panX = event.shiftKey && !trackpadPan ? dy : dx;
        const panZ = event.shiftKey && !trackpadPan ? 0 : dy;
        setCamera((previous) => {
          const current = previous ?? base;
          return { ...current, x: current.x + panX / current.zoom, z: current.z + panZ / current.zoom };
        });
        return;
      }
      const factor = Math.min(2, Math.max(0.5, Math.exp(-dy * 0.0015)));
      setCamera((previous) => zoomCameraAt(previous ?? base, factor, screen));
    }
    svg.addEventListener("wheel", handleWheel, { passive: false });
    return () => svg.removeEventListener("wheel", handleWheel);
  }, []);

  // Space-drag panning and Escape cancelling an in-flight gesture.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (sessionRef.current) {
          event.preventDefault();
          event.stopImmediatePropagation();
          abortSession();
          return;
        }
        if (liveRef.current.tool === "measure") {
          setMeasurement(null);
          updateSettings({ tool: "select" });
        }
        return;
      }
      if (event.code !== "Space" || isTypingTarget(event.target)) return;
      if (!pointerInsideRef.current && !spaceRef.current) return;
      event.preventDefault();
      if (!spaceRef.current) {
        spaceRef.current = true;
        setSpaceHeld(true);
      }
    }
    function release() {
      if (!spaceRef.current) return;
      spaceRef.current = false;
      setSpaceHeld(false);
    }
    function handleKeyUp(event: KeyboardEvent) {
      if (event.code === "Space") release();
    }
    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", release);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", release);
    };
  }, [abortSession, updateSettings]);

  // Remember which library tile is being dragged so dragover can preview it.
  useEffect(() => {
    function handleDragStart(event: DragEvent) {
      const value = event.dataTransfer?.getData(STUDIO_OBJECT_DRAG_MIME);
      dragTypeRef.current = isObjectType(value) ? value : null;
    }
    function handleDragEnd() {
      dragTypeRef.current = null;
      setDropGhost(null);
    }
    document.addEventListener("dragstart", handleDragStart);
    document.addEventListener("dragend", handleDragEnd);
    return () => {
      document.removeEventListener("dragstart", handleDragStart);
      document.removeEventListener("dragend", handleDragEnd);
    };
  }, []);

  // ---- helpers --------------------------------------------------------------
  const zoom = cam.zoom;
  const handleRadius = HANDLE_PX / zoom;
  const labelSize = LABEL_PX / zoom;
  const snapOptions = { snapIncrement: settings.snapIncrement };

  function snapPoint(point: StudioPoint, free: boolean): StudioPoint {
    if (free || !settings.snapEnabled) return point;
    return {
      x: snapStudioValue(point.x, snapOptions),
      z: snapStudioValue(point.z, snapOptions),
    };
  }

  function capture(pointerId: number) {
    const svg = svgRef.current;
    if (!svg) return;
    try {
      svg.setPointerCapture(pointerId);
    } catch {
      // Pointer already released (e.g. synthetic events); dragging still works.
    }
  }

  function concretizeCamera() {
    if (!camera) setCamera(cam);
  }

  function marqueeHits(rect: PlanRect): string[] {
    const ids = visibleObjects
      .filter((object) => !object.locked && objectIntersectsRect(object, rect))
      .map((object) => object.id);
    const lockedWallIds = new Set(
      [...design.drapeRuns, ...design.treatments, ...design.openings]
        .filter((item) => item.locked)
        .map((item) => item.id)
    );
    for (const segment of getWallItemSegments(design, settings.layers)) {
      if (!lockedWallIds.has(segment.id) && segmentIntersectsRect(segment.start, segment.end, rect)) {
        ids.push(segment.id);
      }
    }
    return ids;
  }

  // ---- pointer: objects -------------------------------------------------------
  function handleObjectPointerDown(
    event: React.PointerEvent<SVGGElement>,
    object: StudioObject
  ) {
    if (settings.tool !== "select" || spaceRef.current || event.button !== 0) return;
    if (sessionRef.current || touchesRef.current.size > 1) return;
    event.stopPropagation();
    const additive = event.shiftKey || event.metaKey || event.ctrlKey;
    const wasSelected = selectedSet.has(object.id);
    let ids: string[];
    let soloId: string | null = null;
    if (additive) {
      select({ kind: "object", id: object.id }, { additive: true });
      if (wasSelected) return;
      ids = [...selectedIds, object.id];
    } else if (!wasSelected) {
      select({ kind: "object", id: object.id });
      ids = [object.id];
    } else {
      ids = selectedIds;
      soloId = selectedIds.length > 1 ? object.id : null;
    }
    if (object.locked) return;
    const idSet = new Set(ids);
    const movingObjects = design.objects.filter(
      (item) => idSet.has(item.id) && !item.locked && !item.hidden
    );
    const movableIds = [
      ...movingObjects.map((item) => item.id),
      ...[...design.drapeRuns, ...design.treatments, ...design.openings]
        .filter((item) => idSet.has(item.id) && !item.locked)
        .map((item) => item.id),
    ];
    const start = toPlanPoint(event);
    if (!start || movingObjects.length === 0) return;
    const movingSet = new Set(movableIds);
    sessionRef.current = {
      kind: "move",
      pointerId: event.pointerId,
      start,
      startClient: { x: event.clientX, y: event.clientY },
      ids: movableIds,
      anchor: object,
      box: getObjectsBounds(movingObjects),
      targets: visibleObjects
        .filter((item) => !movingSet.has(item.id))
        .map((item) => ({ box: getObjectBox(item) })),
      originalDesign: design,
      moved: false,
      soloId,
    };
    capture(event.pointerId);
  }

  function handleResizeStart(event: React.PointerEvent<SVGElement>, handle: PlanObjectHandle) {
    if (!singleObject || singleObject.locked || event.button !== 0) return;
    event.stopPropagation();
    event.preventDefault();
    sessionRef.current = {
      kind: "resize",
      pointerId: event.pointerId,
      object: singleObject,
      handle,
      originalDesign: design,
      moved: false,
    };
    capture(event.pointerId);
  }

  function handleRotateStart(event: React.PointerEvent<SVGElement>) {
    if (event.button !== 0) return;
    const point = toPlanPoint(event);
    if (!point) return;
    const movable = selectedObjects.filter((object) => !object.locked);
    if (movable.length === 0) return;
    event.stopPropagation();
    event.preventDefault();
    const single = movable.length === 1 ? movable[0] : null;
    const bounds = getObjectsBounds(movable);
    const center = single
      ? { x: single.x, z: single.z }
      : { x: (bounds.minX + bounds.maxX) / 2, z: (bounds.minZ + bounds.maxZ) / 2 };
    sessionRef.current = {
      kind: "rotate",
      pointerId: event.pointerId,
      ids: movable.map((object) => object.id),
      center,
      startAngle: angleAround(center, point),
      object: single,
      originalDesign: design,
      moved: false,
    };
    capture(event.pointerId);
  }

  function handleGroupMoveStart(event: React.PointerEvent<SVGElement>) {
    if (event.button !== 0 || selectedObjects.length === 0) return;
    const anchor = selectedObjects.find((object) => !object.locked);
    if (!anchor) return;
    handleObjectPointerDown(event as unknown as React.PointerEvent<SVGGElement>, anchor);
  }

  // ---- pointer: canvas ----------------------------------------------------------
  function handlePointerDownCapture(event: React.PointerEvent<SVGSVGElement>) {
    concretizeCamera();
    if (event.pointerType !== "touch") return;
    const touches = touchesRef.current;
    touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (touches.size === 2) {
      event.stopPropagation();
      abortSession();
      const [a, b] = [...touches.values()];
      const rect = event.currentTarget.getBoundingClientRect();
      sessionRef.current = {
        kind: "pinch",
        startDistance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
        startMid: { x: (a.x + b.x) / 2 - rect.left, y: (a.y + b.y) / 2 - rect.top },
        startCamera: cam,
      };
      for (const id of touches.keys()) capture(id);
    }
  }

  function handlePointerDown(event: React.PointerEvent<SVGSVGElement>) {
    if (event.defaultPrevented || sessionRef.current) return;
    if (event.button !== 0 && event.button !== 1) return;
    const point = toPlanPoint(event);
    if (!point) return;
    const isTouch = event.pointerType === "touch";
    const startClient = { x: event.clientX, y: event.clientY };
    if (
      event.button === 1 ||
      settings.tool === "pan" ||
      spaceRef.current ||
      (isTouch && settings.tool === "select")
    ) {
      event.preventDefault();
      sessionRef.current = {
        kind: "pan",
        pointerId: event.pointerId,
        startClient,
        startCamera: cam,
        moved: false,
        isTouch,
      };
      setPanning(true);
      capture(event.pointerId);
      return;
    }
    if (settings.tool === "measure") {
      const start = snapPoint(point, event.altKey);
      sessionRef.current = { kind: "measure", pointerId: event.pointerId, start };
      setMeasurement({ start, end: start });
      capture(event.pointerId);
      return;
    }
    sessionRef.current = {
      kind: "marquee",
      pointerId: event.pointerId,
      start: point,
      startClient,
      additive: event.shiftKey || event.metaKey || event.ctrlKey,
      baseIds: selectedIds,
      moved: false,
    };
    capture(event.pointerId);
  }

  function trackTouchMove(event: React.PointerEvent<SVGSVGElement>) {
    if (event.pointerType === "touch" && touchesRef.current.has(event.pointerId)) {
      touchesRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }
  }

  function forgetTouch(event: React.PointerEvent<SVGSVGElement>) {
    touchesRef.current.delete(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<SVGSVGElement>) {
    const session = sessionRef.current;
    if (!session) return;

    if (session.kind === "pinch") {
      const touches = [...touchesRef.current.values()];
      if (touches.length < 2) return;
      const [a, b] = touches;
      const rect = event.currentTarget.getBoundingClientRect();
      const distance = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
      const mid = { x: (a.x + b.x) / 2 - rect.left, y: (a.y + b.y) / 2 - rect.top };
      const start = session.startCamera;
      const scaled = zoomCameraAt(start, distance / session.startDistance, session.startMid);
      setCamera({
        ...scaled,
        x: scaled.x - (mid.x - session.startMid.x) / scaled.zoom,
        z: scaled.z - (mid.y - session.startMid.y) / scaled.zoom,
      });
      return;
    }
    if (session.pointerId !== event.pointerId) return;

    if (session.kind === "pan") {
      const dx = event.clientX - session.startClient.x;
      const dy = event.clientY - session.startClient.y;
      if (Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) session.moved = true;
      const start = session.startCamera;
      setCamera({ ...start, x: start.x - dx / start.zoom, z: start.z - dy / start.zoom });
      return;
    }

    const point = toPlanPoint(event);
    if (!point) return;
    const free = event.altKey || event.shiftKey;

    if (session.kind === "measure") {
      let end = snapPoint(point, event.altKey);
      if (event.shiftKey) end = constrainToOctant(session.start, end);
      setMeasurement({ start: session.start, end });
      return;
    }

    if (session.kind === "marquee") {
      const distance = Math.hypot(
        event.clientX - session.startClient.x,
        event.clientY - session.startClient.y
      );
      if (!session.moved && distance < DRAG_THRESHOLD_PX) return;
      session.moved = true;
      setMarquee(marqueeRect(session.start, point));
      return;
    }

    if (session.kind === "move") {
      if (!session.moved) {
        const distance = Math.hypot(
          event.clientX - session.startClient.x,
          event.clientY - session.startClient.y
        );
        if (distance < DRAG_THRESHOLD_PX) return;
        session.moved = true;
        beginTransaction();
      }
      const rawDx = point.x - session.start.x;
      const rawDz = point.z - session.start.z;
      let dx = rawDx;
      let dz = rawDz;
      let guides: SmartGuide[] = [];
      let snappedX = false;
      let snappedZ = false;
      if (!free && settings.smartGuides) {
        const result = computeSmartSnap({
          moving: offsetBox(session.box, rawDx, rawDz),
          targets: session.targets,
          room: { bounds: roomRect, floor },
          threshold: GUIDE_SNAP_PX / zoom,
        });
        if (result.snappedX) {
          dx = rawDx + result.dx;
          snappedX = true;
        }
        if (result.snappedZ) {
          dz = rawDz + result.dz;
          snappedZ = true;
        }
        guides = result.guides;
      }
      if (!free && settings.snapEnabled) {
        if (!snappedX) dx = snapStudioValue(session.anchor.x + rawDx, snapOptions) - session.anchor.x;
        if (!snappedZ) dz = snapStudioValue(session.anchor.z + rawDz, snapOptions) - session.anchor.z;
      }
      preview(nudgeStudioItems(session.originalDesign, session.ids, dx, dz));
      setFeedback({
        label: `${inchesToFeetLabel(session.anchor.x + dx)}, ${inchesToFeetLabel(session.anchor.z + dz)}`,
        mode: free
          ? "Free move"
          : guides.length > 0
            ? "Smart guide"
            : settings.snapEnabled
              ? `Snap ${settings.snapIncrement}″`
              : "Free move",
        guides,
        box: offsetBox(session.box, dx, dz),
        angleLabel: null,
      });
      return;
    }

    if (session.kind === "resize") {
      if (!session.moved) {
        session.moved = true;
        beginTransaction();
      }
      const options = { ...snapOptions, bypassSnap: free || !settings.snapEnabled };
      const object = session.object;
      const next = isCircularObjectType(object.type)
        ? resizeCircularStudioObject(object, point, options)
        : isCornerHandle(session.handle)
          ? resizeStudioObjectFromCorner(object, session.handle, point, options)
          : resizeStudioObjectFromEdge(object, session.handle as PlanEdgeHandle, point, options);
      preview(replaceStudioObject(session.originalDesign, next));
      setFeedback({
        label: isCircularObjectType(next.type)
          ? `Ø ${inchesToFeetLabel(next.width)}`
          : `${inchesToFeetLabel(next.width)} × ${inchesToFeetLabel(next.depth)}`,
        mode: options.bypassSnap ? "Free size" : `Snap ${settings.snapIncrement}″`,
        guides: [],
        box: getObjectBox(next),
        angleLabel: null,
      });
      return;
    }

    if (session.kind === "rotate") {
      if (!session.moved) {
        session.moved = true;
        beginTransaction();
      }
      const step = settings.rotationSnap > 0 ? settings.rotationSnap : 15;
      const angle = angleAround(session.center, point);
      if (session.object) {
        const rotation = normalizeDegrees(free ? angle : Math.round(angle / step) * step);
        preview(replaceStudioObject(session.originalDesign, { ...session.object, rotation }));
        setFeedback({
          label: `${Math.round(rotation)}°`,
          mode: free ? "Free rotate" : `Snap ${step}°`,
          guides: [],
          box: null,
          angleLabel: `${Math.round(rotation)}°`,
        });
      } else {
        const raw = angle - session.startAngle;
        const delta = free ? raw : Math.round(raw / step) * step;
        preview(rotateStudioItemsAsGroup(session.originalDesign, session.ids, delta));
        const shown = ((Math.round(delta) % 360) + 540) % 360 - 180;
        setFeedback({
          label: `${shown > 0 ? "+" : ""}${shown}°`,
          mode: free ? "Free rotate" : `Snap ${step}°`,
          guides: [],
          box: null,
          angleLabel: `${shown > 0 ? "+" : ""}${shown}°`,
        });
      }
    }
  }

  function handlePointerUp(event: React.PointerEvent<SVGSVGElement>) {
    const session = sessionRef.current;
    if (!session) return;
    if (session.kind === "pinch") {
      if (touchesRef.current.size < 2) sessionRef.current = null;
      return;
    }
    if (session.pointerId !== event.pointerId) return;
    sessionRef.current = null;
    const svg = svgRef.current;
    if (svg?.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId);

    if (session.kind === "pan") {
      if (!session.moved && session.isTouch && settings.tool === "select") select(null);
    } else if (session.kind === "marquee") {
      if (!session.moved) {
        if (!session.additive) select(null);
      } else {
        const point = toPlanPoint(event) ?? session.start;
        const hits = marqueeHits(marqueeRect(session.start, point));
        selectIds(session.additive ? [...session.baseIds, ...hits] : hits);
      }
    } else if (session.kind === "move") {
      if (session.moved) endTransaction();
      else if (session.soloId) select({ kind: "object", id: session.soloId });
    } else if (session.kind === "resize" || session.kind === "rotate") {
      if (session.moved) endTransaction();
    }
    clearSessionUi();
  }

  function handlePointerCancel(event: React.PointerEvent<SVGSVGElement>) {
    const session = sessionRef.current;
    if (!session) return;
    if (session.kind === "pinch") {
      if (touchesRef.current.size < 2) sessionRef.current = null;
      return;
    }
    if (session.pointerId === event.pointerId) abortSession();
  }

  // ---- drag & drop from the library ------------------------------------------------
  function hasObjectPayload(event: React.DragEvent) {
    return Array.from(event.dataTransfer.types).includes(STUDIO_OBJECT_DRAG_MIME);
  }

  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    if (!hasObjectPayload(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    const point = toPlanPoint(event);
    if (!point) return;
    const snapped = snapPoint(point, event.altKey);
    const type = dragTypeRef.current;
    setDropGhost((previous) =>
      previous &&
      previous.type === type &&
      previous.point.x === snapped.x &&
      previous.point.z === snapped.z
        ? previous
        : { type, point: snapped }
    );
  }

  function handleDragLeave(event: React.DragEvent<HTMLDivElement>) {
    const related = event.relatedTarget;
    if (related instanceof Node && event.currentTarget.contains(related)) return;
    setDropGhost(null);
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    if (!hasObjectPayload(event)) return;
    event.preventDefault();
    setDropGhost(null);
    const value = event.dataTransfer.getData(STUDIO_OBJECT_DRAG_MIME);
    const type = isObjectType(value) ? value : dragTypeRef.current;
    dragTypeRef.current = null;
    const point = toPlanPoint(event);
    if (!type || !point || design.objects.length >= STUDIO_MAX_OBJECTS) return;
    const object = createStudioObject(type, snapPoint(point, event.altKey));
    commit({ ...design, objects: [...design.objects, object] });
    if (!settings.layers.objects) {
      updateSettings({ layers: { ...settings.layers, objects: true } });
    }
    select({ kind: "object", id: object.id });
  }

  const ghostType = dropGhost?.type ?? null;
  const ghostObject = useMemo<StudioObject | null>(() => {
    if (!ghostType) return null;
    const option = getStudioObjectOption(ghostType);
    return {
      ...createStudioObject(ghostType, { x: 0, z: 0 }),
      id: "studio-drop-ghost",
      label: option?.label ?? ghostType,
    };
  }, [ghostType]);

  // ---- render -------------------------------------------------------------
  const visible = getVisiblePlanRect(cam, viewSize);
  const gridRect: PlanRect = {
    minX: visible.minX - 24,
    minZ: visible.minZ - 24,
    maxX: visible.maxX + 24,
    maxZ: visible.maxZ + 24,
  };
  const layerProps: PlanLayerProps = {
    design,
    toPlanPoint,
    pixelsPerInch: zoom,
    handleRadius,
    labelSize,
  };
  const emphasized = new Set(selectedIds);
  if (hoveredId) emphasized.add(hoveredId);
  const statusOf = (object: StudioObject): ObjectStatus | null => {
    const conflict = conflicts.has(object.id);
    if (selectedSet.has(object.id)) return conflict ? "conflict-selected" : "selected";
    if (conflict) return "conflict";
    if (hoveredId === object.id) return "hovered";
    return null;
  };
  const wallDistances =
    feedback?.box && settings.layers.objects ? getWallDistances(feedback.box, floor) : [];
  const roomVisible = rectContains(visible, roomRect, 1 / zoom);
  const cursor = panning
    ? "grabbing"
    : spaceHeld || settings.tool === "pan"
      ? "grab"
      : settings.tool === "measure"
        ? "crosshair"
        : "default";
  const hint =
    settings.tool === "measure"
      ? "Drag to measure · Shift = 45° · Esc to exit"
      : settings.tool === "pan"
        ? "Drag to pan · Wheel to zoom"
        : "Drag to move · Shift-click to multi-select · Space-drag to pan · Alt = free";

  return (
    <div
      ref={containerRef}
      className="relative h-full min-h-[420px] overflow-hidden bg-[radial-gradient(circle_at_50%_30%,color-mix(in_oklch,var(--primary)_7%,transparent),transparent_55%)] select-none"
      style={{ cursor }}
      onPointerEnter={() => {
        pointerInsideRef.current = true;
      }}
      onPointerLeave={() => {
        pointerInsideRef.current = false;
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <svg
        ref={svgRef}
        viewBox={`${cam.x} ${cam.z} ${viewSize.width / zoom} ${viewSize.height / zoom}`}
        preserveAspectRatio="xMinYMin meet"
        className="absolute inset-0 size-full touch-none"
        role="group"
        aria-labelledby="studio-plan-title studio-plan-description"
        onPointerDownCapture={handlePointerDownCapture}
        onPointerDown={handlePointerDown}
        onPointerMoveCapture={trackTouchMove}
        onPointerMove={handlePointerMove}
        onPointerUpCapture={forgetTouch}
        onPointerUp={handlePointerUp}
        onPointerCancelCapture={forgetTouch}
        onPointerCancel={handlePointerCancel}
        onMouseDown={(event) => {
          if (event.button === 1) event.preventDefault();
        }}
        onContextMenu={(event) => {
          if (sessionRef.current) event.preventDefault();
        }}
      >
        <title id="studio-plan-title">{`${design.room.name} floor plan editor`}</title>
        <desc id="studio-plan-description">
          Interactive top-down plan. Tab to room objects and press Enter or Space
          to select; Shift adds to the selection. Drag to move, use the gold
          handles to resize or rotate, and scroll to zoom.
        </desc>
        <defs>
          <PlanSymbolDefs />
        </defs>

        {settings.showGrid ? (
          <PlanGrid visible={gridRect} zoom={zoom} snapIncrement={settings.snapIncrement} />
        ) : null}

        <RoomLayer2D {...layerProps} />

        <g aria-label="Room objects">
          {visibleObjects.map((object) => {
            const selected = selectedSet.has(object.id);
            const circular = isCircularObjectType(object.type);
            const overhead = object.type === "ceiling_drape";
            const hitProps = overhead
              ? {
                  fill: "none",
                  stroke: "transparent",
                  strokeWidth: 14 / zoom,
                  pointerEvents: "stroke" as const,
                }
              : { fill: "transparent" };
            return (
              <g
                key={object.id}
                role="button"
                tabIndex={0}
                aria-pressed={selected}
                aria-label={`${object.label}${object.locked ? ", locked" : ""}`}
                className={cn(
                  "touch-none outline-none focus-visible:[&_.studio-focus]:opacity-100",
                  settings.tool === "select" && !spaceHeld
                    ? object.locked
                      ? "cursor-pointer"
                      : "cursor-move"
                    : undefined
                )}
                onPointerDown={(event) => handleObjectPointerDown(event, object)}
                onPointerEnter={() => setHoveredId(object.id)}
                onPointerLeave={() => setHoveredId(null)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    select({ kind: "object", id: object.id }, { additive: event.shiftKey });
                  }
                }}
              >
                <g pointerEvents="none">
                  <PlanObjectSymbol object={object} showSeating={settings.showSeating} />
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
                  {overhead ? <circle r={Math.min(object.width, object.depth) * 0.08 + 4 / zoom} fill="transparent" /> : null}
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
          })}
        </g>

        <WallItemsLayer2D {...layerProps} />

        <ObjectStatusOutlines objects={visibleObjects} status={statusOf} pad={3 / zoom} />
        <ObjectLabelsLayer
          objects={visibleObjects}
          zoom={zoom}
          labelSize={labelSize}
          showLabels={settings.showLabels}
          emphasized={emphasized}
        />

        {feedback ? <SmartGuidesLayer guides={feedback.guides} labelSize={labelSize} /> : null}
        {wallDistances.length > 0 ? (
          <WallDistanceLayer distances={wallDistances} labelSize={labelSize} />
        ) : null}

        {settings.tool === "select" && singleObject && !singleObject.locked ? (
          <SingleSelectionHandles
            object={singleObject}
            handleRadius={handleRadius}
            labelSize={labelSize}
            stemLength={ROTATE_STEM_PX / zoom}
            angleLabel={feedback?.angleLabel ?? null}
            onResizeStart={handleResizeStart}
            onRotateStart={handleRotateStart}
          />
        ) : null}
        {settings.tool === "select" && groupBox ? (
          <GroupSelectionBox
            box={groupBox}
            pad={6 / zoom}
            handleRadius={handleRadius}
            labelSize={labelSize}
            stemLength={ROTATE_STEM_PX / zoom}
            count={selectedIds.length}
            angleLabel={feedback?.angleLabel ?? null}
            onMoveStart={handleGroupMoveStart}
            onRotateStart={handleRotateStart}
          />
        ) : null}

        {marquee ? <MarqueeLayer rect={marquee} /> : null}
        {settings.tool === "measure" && measurement ? (
          <MeasureLayer measurement={measurement} labelSize={labelSize} handleRadius={handleRadius} />
        ) : null}

        {dropGhost ? (
          <g className="pointer-events-none" opacity={0.7}>
            {ghostObject ? (
              <PlanObjectSymbol
                object={{ ...ghostObject, x: dropGhost.point.x, z: dropGhost.point.z }}
                showSeating={settings.showSeating}
              />
            ) : null}
            <rect
              x={dropGhost.point.x - (ghostObject?.width ?? 48) / 2}
              y={dropGhost.point.z - (ghostObject?.depth ?? 48) / 2}
              width={ghostObject?.width ?? 48}
              height={ghostObject?.depth ?? 48}
              rx={4 / zoom}
              fill="color-mix(in oklch, var(--primary) 10%, transparent)"
              stroke="var(--primary)"
              strokeWidth={1.5}
              strokeDasharray="6 4"
              vectorEffect="non-scaling-stroke"
            />
            {getWallDistances(
              {
                minX: dropGhost.point.x - (ghostObject?.width ?? 48) / 2,
                maxX: dropGhost.point.x + (ghostObject?.width ?? 48) / 2,
                minZ: dropGhost.point.z - (ghostObject?.depth ?? 48) / 2,
                maxZ: dropGhost.point.z + (ghostObject?.depth ?? 48) / 2,
              },
              floor
            ).map((item) => (
              <DimensionLine key={item.side} from={item.from} to={item.to} labelSize={labelSize} dashed />
            ))}
          </g>
        ) : null}
      </svg>

      {showRulers && size ? <PlanRulers camera={cam} size={size} /> : null}

      {feedback ? (
        <div
          className="pointer-events-none absolute top-8 left-1/2 flex max-w-[calc(100%-1.5rem)] -translate-x-1/2 items-center gap-2 rounded-full border border-primary/35 bg-background/90 px-3 py-1.5 text-xs shadow-lg backdrop-blur"
          role="status"
        >
          <span className="font-semibold text-foreground tabular-nums">{feedback.label}</span>
          <span className="whitespace-nowrap text-primary">{feedback.mode}</span>
        </div>
      ) : null}

      {dropGhost ? (
        <div className="pointer-events-none absolute top-8 left-1/2 -translate-x-1/2 rounded-full border border-primary/35 bg-background/90 px-3 py-1.5 text-xs font-medium text-foreground shadow-lg backdrop-blur">
          {ghostObject ? `Drop ${ghostObject.label}` : "Drop to place"}
          <span className="ml-2 text-primary">
            {inchesToFeetLabel(dropGhost.point.x)}, {inchesToFeetLabel(dropGhost.point.z)}
          </span>
        </div>
      ) : null}

      <div
        className="pointer-events-none absolute bottom-3 flex max-w-[calc(100%-1.5rem)] flex-col items-start gap-2"
        style={{ left: showRulers ? PLAN_RULER_SIZE + 12 : 12 }}
      >
        {!roomVisible && size ? (
          <PlanMinimap
            floor={floor}
            objects={design.objects}
            roomBounds={roomRect}
            camera={cam}
            size={size}
            onNavigate={(center) =>
              setCamera({
                ...cam,
                x: center.x - viewSize.width / 2 / zoom,
                z: center.z - viewSize.height / 2 / zoom,
              })
            }
          />
        ) : null}
        <div className="hidden rounded-full border border-border/60 bg-background/80 px-3 py-1 text-[0.65rem] text-muted-foreground shadow-sm backdrop-blur sm:block">
          {hint}
        </div>
      </div>

      <div className="pointer-events-none absolute right-3 bottom-3">
        <PlanZoomControls
          zoom={zoom}
          onZoomIn={() =>
            setCamera(zoomCameraAt(cam, 1.25, { x: viewSize.width / 2, y: viewSize.height / 2 }))
          }
          onZoomOut={() =>
            setCamera(zoomCameraAt(cam, 0.8, { x: viewSize.width / 2, y: viewSize.height / 2 }))
          }
          onReset={() => setCamera(centeredCamera(roomRect, viewSize, 1))}
          onFit={() => setCamera(null)}
          rulers={showRulers}
          onToggleRulers={() => setShowRulers((value) => !value)}
        />
      </div>
    </div>
  );
}
