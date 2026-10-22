"use client";

import {
  STUDIO_MAX_CEILING_DRAPES,
  STUDIO_MAX_OBJECTS,
  STUDIO_OBJECT_TYPES,
  createStudioObject,
  getCeilingDrapes,
  getStudioObjectOption,
  type StudioObject,
  type StudioObjectType,
  type StudioPoint,
} from "@/data/studio";
import { addCeilingDrape, createCeilingDrape, pointInCeilingPolygon } from "@/lib/studio-ceiling";
import { getObjectsBounds, nudgeStudioItems, rotateStudioItemsAsGroup } from "@/lib/studio-commands";
import { getStudioBounds, inchesToFeetLabel } from "@/lib/studio-geometry";
import {
  replaceStudioObject,
  resizeCircularStudioObject,
  resizeStudioObjectFromCorner,
  snapStudioValue,
  type StudioResizeHandle,
} from "@/lib/studio-interactions";
import { Crosshair } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { disarmCeilingPlacement, useCeilingPlacement } from "./editor/ceiling-placement-store";
import {
  useStudioCanvasCommand,
  useStudioEditorActions,
  useStudioSelection,
  useStudioSettings,
} from "./editor/studio-editor-context";
import { CeilingLayer2D, cachedCeilingLayout, type CeilingGhost } from "./plan/ceiling-layer";
import { setPlanSurface, usePlanSurface, type PlanSurface } from "./plan/ceiling-plan-store";
import { ceilingAnchor } from "./plan/ceiling-symbols";
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
import { PlanObjectsLayer, type PlanObjectPointerHandler } from "./plan/objects-layer";
import { PlanGrid } from "./plan/plan-grid";
import { PlanSurfaceToggle } from "./plan/plan-surface-toggle";
import type { PlanDragFeedback, PlanLayerProps } from "./plan/plan-types";
import { RoomLayer2D } from "./plan/room-layer";
import { PlanRulers, PLAN_RULER_SIZE } from "./plan/rulers";
import {
  GroupSelectionBox,
  ObjectStatusOutlines,
  SingleSelectionHandles,
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
  quantizeZoom,
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

/** Latest pointer sample of a gesture, applied once per animation frame. */
type PointerSample = {
  pointerId: number;
  clientX: number;
  clientY: number;
  altKey: boolean;
  shiftKey: boolean;
};

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

type DragFeedback = PlanDragFeedback;

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
    select,
    selectIds,
    beginTransaction,
    preview,
    endTransaction,
    cancelTransaction,
    commit,
    updateSettings,
  } = useStudioEditorActions();
  const settings = useStudioSettings();
  const { selectedIds } = useStudioSelection();
  const canvasCommand = useStudioCanvasCommand();

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const sessionRef = useRef<Session | null>(null);
  const touchesRef = useRef(new Map<number, ClientPoint>());
  const spaceRef = useRef(false);
  const pointerInsideRef = useRef(false);
  const dragTypeRef = useRef<StudioObjectType | null>(null);
  const sizeRef = useRef<PlanSize | null>(null);
  /** Cached svg client rect; cleared on resize/scroll and at every pointerdown. */
  const svgRectRef = useRef<DOMRect | null>(null);
  // Pointer/wheel input is stashed here and applied once per animation frame.
  const frameRef = useRef(0);
  const pendingMoveRef = useRef<PointerSample | null>(null);
  /** Newest camera, ahead of state until the frame that applies it commits. */
  const pendingCameraRef = useRef<PlanCamera | null>(null);
  const cameraDirtyRef = useRef(false);
  const actionsRef = useRef<{
    processMove: (sample: PointerSample) => void;
    objectPointerDown: PlanObjectPointerHandler;
  }>({ processMove: () => undefined, objectPointerDown: () => undefined });

  const [size, setSize] = useState<PlanSize | null>(null);
  const [camera, setCamera] = useState<PlanCamera | null>(null);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [panning, setPanning] = useState(false);
  const [feedback, setFeedback] = useState<DragFeedback | null>(null);
  const [marquee, setMarquee] = useState<PlanRect | null>(null);
  const [measurement, setMeasurement] = useState<PlanMeasurement | null>(null);
  const [dropGhost, setDropGhost] = useState<DropGhost | null>(null);
  const [showRulers, setShowRulers] = useState(true);
  const [placePoint, setPlacePoint] = useState<StudioPoint | null>(null);
  const surface = usePlanSurface();
  const ceilingMode = surface === "ceiling";
  const armed = useCeilingPlacement();

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
  const rawCeilingDrapes = design.ceilingDrapes;
  const ceilingDrapes = useMemo(
    () => getCeilingDrapes({ ceilingDrapes: rawCeilingDrapes }),
    [rawCeilingDrapes]
  );
  const ceilingIds = useMemo(
    () => new Set(ceilingDrapes.map((drape) => drape.id)),
    [ceilingDrapes]
  );

  // Follow the selection: ceiling-only → Ceiling mode, floor-only → Floor mode.
  const selectionKey = selectedIds.join("|");
  const selectionSurface: PlanSurface | null =
    selectedIds.length === 0
      ? null
      : selectedIds.every((id) => ceilingIds.has(id))
        ? "ceiling"
        : selectedIds.some((id) => ceilingIds.has(id))
          ? null
          : "floor";
  useEffect(() => {
    if (selectionSurface) setPlanSurface(selectionSurface);
  }, [selectionKey, selectionSurface]);
  useEffect(() => {
    if (armed) setPlanSurface("ceiling");
  }, [armed]);

  const ghost = useMemo<CeilingGhost | null>(() => {
    if (!armed || !placePoint) return null;
    const drape = createCeilingDrape(armed.style, floor, {
      ...armed.overrides,
      hubX: placePoint.x,
      hubZ: placePoint.z,
      x: placePoint.x,
      z: placePoint.z,
    });
    return {
      drape: { ...drape, id: "ceiling-placement-ghost" },
      point: placePoint,
      inside: pointInCeilingPolygon(floor, placePoint.x, placePoint.z),
    };
  }, [armed, floor, placePoint]);
  const ceilingFull = ceilingDrapes.length >= STUDIO_MAX_CEILING_DRAPES;

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
      const ceilingOutline = ceilingDrapes
        .filter((drape) => selectedSet.has(drape.id))
        .flatMap((drape) => cachedCeilingLayout(drape, floor).outline);
      const target =
        ceilingOutline.length > 0 && (ceilingMode || selectedObjects.length === 0)
          ? getPointsBox(ceilingOutline)
          : selectedObjects.length > 0
            ? getObjectsBounds(selectedObjects)
            : roomRect;
      const pad = 48;
      setCamera(
        fitCamera(
          { minX: target.minX - pad, maxX: target.maxX + pad, minZ: target.minZ - pad, maxZ: target.maxZ + pad },
          viewSize
        )
      );
    }
  }

  // A toolbar command wins over wheel/pinch input still queued for the next frame.
  useLayoutEffect(() => {
    pendingCameraRef.current = null;
    cameraDirtyRef.current = false;
  }, [handledNonce]);

  // ---- live values for native listeners -----------------------------------
  const liveRef = useRef({ cam, tool: settings.tool, armed: Boolean(armed) });
  useLayoutEffect(() => {
    liveRef.current = { cam, tool: settings.tool, armed: Boolean(armed) };
    // The applied camera has committed; drop it unless newer input is queued.
    if (!cameraDirtyRef.current) pendingCameraRef.current = null;
  });

  useLayoutEffect(() => {
    const invalidateRect = () => {
      svgRectRef.current = null;
    };
    window.addEventListener("scroll", invalidateRect, { capture: true, passive: true });
    window.addEventListener("resize", invalidateRect);
    const element = containerRef.current;
    if (!element || typeof ResizeObserver === "undefined") {
      return () => {
        window.removeEventListener("scroll", invalidateRect, { capture: true });
        window.removeEventListener("resize", invalidateRect);
      };
    }
    const observer = new ResizeObserver((entries) => {
      invalidateRect();
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
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", invalidateRect, { capture: true });
      window.removeEventListener("resize", invalidateRect);
    };
  }, []);

  const getSvgRect = useCallback(() => {
    const cached = svgRectRef.current;
    if (cached) return cached;
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    svgRectRef.current = rect;
    return rect;
  }, []);

  /** Camera including input not yet committed to state. */
  const currentCamera = useCallback(
    () => pendingCameraRef.current ?? liveRef.current.cam,
    []
  );

  const toPlanPoint = useCallback(
    (event: { clientX: number; clientY: number }) => {
      const rect = getSvgRect();
      if (!rect) return null;
      const current = currentCamera();
      return {
        x: current.x + (event.clientX - rect.left) / current.zoom,
        z: current.z + (event.clientY - rect.top) / current.zoom,
      };
    },
    [currentCamera, getSvgRect]
  );

  /** Applies the latest queued pointer sample and camera (one render per frame). */
  const flushFrame = useCallback(() => {
    if (frameRef.current) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
    }
    const move = pendingMoveRef.current;
    pendingMoveRef.current = null;
    if (move) actionsRef.current.processMove(move);
    if (frameRef.current && !pendingMoveRef.current) {
      // Camera queued by the move itself is applied right below.
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
    }
    const nextCamera = pendingCameraRef.current;
    if (cameraDirtyRef.current && nextCamera) {
      cameraDirtyRef.current = false;
      setCamera(nextCamera);
    }
  }, []);

  const requestFrame = useCallback(() => {
    if (frameRef.current) return;
    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = 0;
      flushFrame();
    });
  }, [flushFrame]);

  const scheduleCamera = useCallback(
    (next: PlanCamera) => {
      pendingCameraRef.current = next;
      cameraDirtyRef.current = true;
      requestFrame();
    },
    [requestFrame]
  );

  /** Immediate camera change (buttons, commands) that overrides queued input. */
  const applyCamera = useCallback((next: PlanCamera | null) => {
    pendingCameraRef.current = null;
    cameraDirtyRef.current = false;
    setCamera(next);
  }, []);

  useEffect(
    () => () => {
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
    },
    []
  );

  const clearSessionUi = useCallback(() => {
    setFeedback(null);
    setMarquee(null);
    setPanning(false);
  }, []);
  const showCeilingFeedback = useCallback((next: DragFeedback | null) => setFeedback(next), []);

  const abortSession = useCallback(() => {
    const session = sessionRef.current;
    if (!session) return;
    sessionRef.current = null;
    pendingMoveRef.current = null;
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
    // Every wheel event folds into the queued camera; state updates once per frame.
    function handleWheel(event: WheelEvent) {
      event.preventDefault();
      const rect = getSvgRect();
      if (!rect) return;
      const screen = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? rect.height : 1;
      const dx = event.deltaX * unit;
      const dy = event.deltaY * unit;
      const current = currentCamera();
      if (event.ctrlKey || event.metaKey) {
        scheduleCamera(zoomCameraAt(current, Math.exp(-dy * 0.01), screen));
        return;
      }
      const trackpadPan = event.deltaMode === 0 && Math.abs(dx) > 0.5;
      if (event.shiftKey || trackpadPan) {
        const panX = event.shiftKey && !trackpadPan ? dy : dx;
        const panZ = event.shiftKey && !trackpadPan ? 0 : dy;
        scheduleCamera({
          ...current,
          x: current.x + panX / current.zoom,
          z: current.z + panZ / current.zoom,
        });
        return;
      }
      const factor = Math.min(2, Math.max(0.5, Math.exp(-dy * 0.0015)));
      scheduleCamera(zoomCameraAt(current, factor, screen));
    }
    svg.addEventListener("wheel", handleWheel, { passive: false });
    return () => svg.removeEventListener("wheel", handleWheel);
  }, [currentCamera, getSvgRect, scheduleCamera]);

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
        if (liveRef.current.armed) {
          event.preventDefault();
          event.stopImmediatePropagation();
          disarmCeilingPlacement();
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
  const steppedZoom = quantizeZoom(zoom);
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

  function ceilingMarqueeHits(rect: PlanRect): string[] {
    if (!settings.layers.ceiling) return [];
    return ceilingDrapes
      .filter((drape) => {
        if (drape.hidden || drape.locked) return false;
        const layout = cachedCeilingLayout(drape, floor);
        const outline = layout.outline;
        const anchor = ceilingAnchor(layout);
        return (
          rectContains(rect, { minX: anchor.x, maxX: anchor.x, minZ: anchor.z, maxZ: anchor.z }, 0) ||
          outline.some((point, index) =>
            segmentIntersectsRect(point, outline[(index + 1) % outline.length], rect)
          )
        );
      })
      .map((drape) => drape.id);
  }

  function placeCeiling(point: StudioPoint) {
    if (!armed || ceilingFull || !pointInCeilingPolygon(floor, point.x, point.z)) return;
    const drape = createCeilingDrape(armed.style, floor, {
      ...armed.overrides,
      hubX: point.x,
      hubZ: point.z,
      x: point.x,
      z: point.z,
    });
    commit(addCeilingDrape(design, drape));
    if (!settings.layers.ceiling) {
      updateSettings({ layers: { ...settings.layers, ceiling: true } });
    }
    select({ kind: "ceiling", id: drape.id });
    disarmCeilingPlacement();
    setPlacePoint(null);
  }

  function marqueeHits(rect: PlanRect): string[] {
    if (ceilingMode) return ceilingMarqueeHits(rect);
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
    svgRectRef.current = null;
    concretizeCamera();
    if (event.pointerType !== "touch") return;
    const touches = touchesRef.current;
    touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (touches.size === 2) {
      event.stopPropagation();
      abortSession();
      const [a, b] = [...touches.values()];
      const rect = getSvgRect() ?? event.currentTarget.getBoundingClientRect();
      sessionRef.current = {
        kind: "pinch",
        startDistance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
        startMid: { x: (a.x + b.x) / 2 - rect.left, y: (a.y + b.y) / 2 - rect.top },
        startCamera: currentCamera(),
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
      (isTouch && settings.tool === "select" && !armed)
    ) {
      event.preventDefault();
      sessionRef.current = {
        kind: "pan",
        pointerId: event.pointerId,
        startClient,
        startCamera: currentCamera(),
        moved: false,
        isTouch,
      };
      setPanning(true);
      capture(event.pointerId);
      return;
    }
    if (armed) {
      event.preventDefault();
      placeCeiling(snapPoint(point, event.altKey));
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

  function trackPlacement(event: PointerSample) {
    const point = toPlanPoint(event);
    if (!point) return;
    const snapped = snapPoint(point, event.altKey);
    setPlacePoint((previous) =>
      previous && previous.x === snapped.x && previous.z === snapped.z ? previous : snapped
    );
  }

  function handlePointerMove(event: React.PointerEvent<SVGSVGElement>) {
    const session = sessionRef.current;
    if (session ? "pointerId" in session && session.pointerId !== event.pointerId : !armed) {
      return;
    }
    pendingMoveRef.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      altKey: event.altKey,
      shiftKey: event.shiftKey,
    };
    requestFrame();
  }

  /** Applies one (coalesced) pointer sample to the active gesture. */
  function processMove(event: PointerSample) {
    const session = sessionRef.current;
    if (!session) {
      if (armed) trackPlacement(event);
      return;
    }

    if (session.kind === "pinch") {
      const touches = [...touchesRef.current.values()];
      if (touches.length < 2) return;
      const [a, b] = touches;
      const rect = getSvgRect();
      if (!rect) return;
      const distance = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
      const mid = { x: (a.x + b.x) / 2 - rect.left, y: (a.y + b.y) / 2 - rect.top };
      const start = session.startCamera;
      const scaled = zoomCameraAt(start, distance / session.startDistance, session.startMid);
      scheduleCamera({
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
      scheduleCamera({ ...start, x: start.x - dx / start.zoom, z: start.z - dy / start.zoom });
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
    if (!sessionRef.current) return;
    // Apply the last queued sample so the committed result matches the pointer.
    flushFrame();
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

  // ---- stable callbacks for memoized layers -------------------------------
  useLayoutEffect(() => {
    actionsRef.current = { processMove, objectPointerDown: handleObjectPointerDown };
  });
  const onObjectPointerDown = useCallback<PlanObjectPointerHandler>(
    (event, object) => actionsRef.current.objectPointerDown(event, object),
    []
  );
  const onObjectActivate = useCallback(
    (object: StudioObject, additive: boolean) =>
      select({ kind: "object", id: object.id }, { additive }),
    [select]
  );

  // ---- render -------------------------------------------------------------
  const visible = getVisiblePlanRect(cam, viewSize);
  const gridRect: PlanRect = {
    minX: visible.minX - 24,
    minZ: visible.minZ - 24,
    maxX: visible.maxX + 24,
    maxZ: visible.maxZ + 24,
  };
  // Pans only move the viewBox: layers keep identical props and skip rendering.
  const layerProps = useMemo<PlanLayerProps>(
    () => ({ design, toPlanPoint, pixelsPerInch: zoom, handleRadius, labelSize }),
    [design, toPlanPoint, zoom, handleRadius, labelSize]
  );
  const wallDistances =
    feedback?.box && (settings.layers.objects || ceilingMode)
      ? getWallDistances(feedback.box, floor)
      : [];
  const roomVisible = rectContains(visible, roomRect, 1 / zoom);
  const cursor = panning
    ? "grabbing"
    : spaceHeld || settings.tool === "pan"
      ? "grab"
      : settings.tool === "measure" || armed
        ? "crosshair"
        : "default";
  const hint =
    settings.tool === "measure"
      ? "Drag to measure · Shift = 45° · Esc to exit"
      : settings.tool === "pan"
        ? "Drag to pan · Wheel to zoom"
        : ceilingMode
          ? "Ceiling plan · Click fabric to select · Drag to move · Gold handles reshape · Shift = add / free"
          : "Drag to move · Shift-click to multi-select · Space-drag to pan · Alt = free";
  const floorDim = ceilingMode ? 0.35 : 1;
  const floorPointer = ceilingMode ? ("none" as const) : undefined;
  const chromeTop = (showRulers ? PLAN_RULER_SIZE : 0) + 10;

  function changeSurface(next: PlanSurface) {
    setPlanSurface(next);
    if (next === "ceiling" && !settings.layers.ceiling) {
      updateSettings({ layers: { ...settings.layers, ceiling: true } });
    }
    if (next === "floor") disarmCeilingPlacement();
  }

  return (
    <div
      ref={containerRef}
      className="relative h-full min-h-[420px] overflow-hidden bg-[radial-gradient(circle_at_50%_30%,color-mix(in_oklch,var(--primary)_7%,transparent),transparent_55%)] select-none"
      style={{ cursor }}
      onPointerEnter={() => {
        pointerInsideRef.current = true;
        svgRectRef.current = null;
      }}
      onPointerLeave={() => {
        pointerInsideRef.current = false;
        setPlacePoint(null);
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
        aria-label={`${design.room.name} ${ceilingMode ? "reflected ceiling plan" : "floor plan"} editor`}
        aria-describedby="studio-plan-description"
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
        <desc id="studio-plan-description">
          {ceilingMode
            ? "Reflected ceiling plan. Tab to ceiling drape designs and press Enter or Space to select; Shift adds to the selection. Drag to move, use the gold handles to move the hub, resize, rotate or turn the run direction, and scroll to zoom."
            : "Interactive top-down plan. Tab to room objects and press Enter or Space to select; Shift adds to the selection. Drag to move, use the gold handles to resize or rotate, and scroll to zoom."}
        </desc>
        <defs>
          <PlanSymbolDefs />
        </defs>

        {settings.showGrid ? (
          <PlanGrid visible={gridRect} zoom={zoom} snapIncrement={settings.snapIncrement} />
        ) : null}

        <g pointerEvents={floorPointer}>
          <RoomLayer2D {...layerProps} />
        </g>

        <g opacity={floorDim} pointerEvents={floorPointer}>
          <PlanObjectsLayer
            objects={visibleObjects}
            selectedIds={selectedSet}
            ceilingMode={ceilingMode}
            grabbable={settings.tool === "select" && !spaceHeld}
            zoom={steppedZoom}
            showSeating={settings.showSeating}
            onObjectPointerDown={onObjectPointerDown}
            onObjectActivate={onObjectActivate}
          />

          <WallItemsLayer2D {...layerProps} />

          <ObjectStatusOutlines
            objects={visibleObjects}
            selectedIds={selectedSet}
            conflicts={conflicts}
            pad={3 / steppedZoom}
          />
          <ObjectLabelsLayer
            objects={visibleObjects}
            zoom={zoom}
            labelSize={labelSize}
            showLabels={settings.showLabels}
            selectedIds={selectedSet}
          />
        </g>

        <CeilingLayer2D
          {...layerProps}
          interactive={ceilingMode && settings.tool === "select" && !spaceHeld && !armed}
          faint={!ceilingMode}
          roomBounds={roomRect}
          ghost={ghost}
          onFeedback={showCeilingFeedback}
        />

        {feedback ? <SmartGuidesLayer guides={feedback.guides} labelSize={labelSize} /> : null}
        {wallDistances.length > 0 ? (
          <WallDistanceLayer distances={wallDistances} labelSize={labelSize} />
        ) : null}

        {!ceilingMode && settings.tool === "select" && singleObject && !singleObject.locked ? (
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
        {!ceilingMode && settings.tool === "select" && groupBox ? (
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
          className="pointer-events-none absolute top-8 left-1/2 flex max-w-[calc(100%-1.5rem)] -translate-x-1/2 items-center gap-2 rounded-full border border-primary/35 bg-background/95 px-3 py-1.5 text-xs shadow-lg"
          role="status"
        >
          <span className="font-semibold text-foreground tabular-nums">{feedback.label}</span>
          <span className="whitespace-nowrap text-primary">{feedback.mode}</span>
        </div>
      ) : null}

      {dropGhost ? (
        <div className="pointer-events-none absolute top-8 left-1/2 -translate-x-1/2 rounded-full border border-primary/35 bg-background/95 px-3 py-1.5 text-xs font-medium text-foreground shadow-lg">
          {ghostObject ? `Drop ${ghostObject.label}` : "Drop to place"}
          <span className="ml-2 text-primary">
            {inchesToFeetLabel(dropGhost.point.x)}, {inchesToFeetLabel(dropGhost.point.z)}
          </span>
        </div>
      ) : null}

      {armed && !feedback ? (
        <div
          className="pointer-events-none absolute left-1/2 flex max-w-[calc(100%-1.5rem)] -translate-x-1/2 items-center gap-2 rounded-full border border-primary/35 bg-background/95 px-3 py-1.5 text-xs shadow-lg"
          style={{ top: chromeTop + 46 }}
          role="status"
        >
          <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Crosshair className="size-3.5" aria-hidden />
          </span>
          {ceilingFull ? (
            <span className="font-medium text-foreground">
              Ceiling design limit reached ({STUDIO_MAX_CEILING_DRAPES})
            </span>
          ) : (
            <span className="truncate text-muted-foreground">
              Click inside the room to place{" "}
              <span className="font-semibold text-foreground">{armed.label}</span>
            </span>
          )}
          <span className="whitespace-nowrap text-primary">Esc to cancel</span>
        </div>
      ) : null}

      <div className="pointer-events-none absolute right-3" style={{ top: chromeTop }}>
        <PlanSurfaceToggle
          value={surface}
          ceilingCount={ceilingDrapes.length}
          onChange={changeSurface}
        />
      </div>

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
              applyCamera({
                ...cam,
                x: center.x - viewSize.width / 2 / zoom,
                z: center.z - viewSize.height / 2 / zoom,
              })
            }
          />
        ) : null}
        <div className="hidden rounded-full border border-border/60 bg-background/92 px-3 py-1 text-[0.65rem] text-muted-foreground shadow-sm sm:block">
          {hint}
        </div>
      </div>

      <div className="pointer-events-none absolute right-3 bottom-3">
        <PlanZoomControls
          zoom={zoom}
          onZoomIn={() =>
            applyCamera(zoomCameraAt(cam, 1.25, { x: viewSize.width / 2, y: viewSize.height / 2 }))
          }
          onZoomOut={() =>
            applyCamera(zoomCameraAt(cam, 0.8, { x: viewSize.width / 2, y: viewSize.height / 2 }))
          }
          onReset={() => applyCamera(centeredCamera(roomRect, viewSize, 1))}
          onFit={() => applyCamera(null)}
          rulers={showRulers}
          onToggleRulers={() => setShowRulers((value) => !value)}
        />
      </div>
    </div>
  );
}
