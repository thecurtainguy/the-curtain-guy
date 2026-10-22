"use client";

import {
  CEILING_DRAPE_STYLES,
  getCeilingDrapes,
  type StudioCeilingDrape,
  type StudioDesignJson,
  type StudioPoint,
} from "@/data/studio";
import {
  ceilingAxis,
  ceilingLowestDrop,
  ceilingStyleFamily,
  ceilingUsesHub,
  getCeilingAreaCorners,
  getCeilingLayout,
  getCeilingOutline,
  normalizeCeilingRotation,
  pointInCeilingPolygon,
  updateCeilingDrape,
  type CeilingLayout,
} from "@/lib/studio-ceiling";
import { nudgeStudioItems } from "@/lib/studio-commands";
import { inchesToFeetLabel } from "@/lib/studio-geometry";
import { snapStudioValue } from "@/lib/studio-interactions";
import { cn } from "@/lib/utils";
import { memo, useCallback, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  getStudioHoveredId,
  setStudioHoveredId,
  useIsStudioHovered,
  useStudioHoveredId,
} from "../editor/hover-store";
import {
  useStudioEditorActions,
  useStudioSelection,
  useStudioSettings,
} from "../editor/studio-editor-context";
import {
  CeilingDesignSymbol,
  ceilingAnchor,
  hubDecorRadius,
  outlineCentroid,
  polygonPath,
} from "./ceiling-symbols";
import { LockGlyph } from "./object-labels";
import { angleAround, getPointsBox, offsetBox } from "./object-geometry";
import type { PlanDragFeedback, PlanLayerProps } from "./plan-types";
import { Handle, RotateKnob, cursorFor, selectionHalo } from "./selection-overlay";
import { computeSmartSnap, type SmartGuide, type SmartSnapTarget } from "./smart-guides";
import type { PlanRect } from "./viewport";
import { activateOnKey, shouldSnap, usePlanPointerDrag } from "./wall-pointer-drag";

const GUIDE_SNAP_PX = 8;
const ROTATE_STEM_PX = 30;
const DIRECTION_PX = 72;
const EDGE_GRAB_PX = 12;
const MIN_AREA = 24;
/** Below this floor clearance (inches) the label turns amber. */
const LOW_CLEARANCE = 90;

const STYLE_LABELS = new Map<string, string>(
  CEILING_DRAPE_STYLES.map((option) => [option.value, option.label])
);

export type CeilingGhost = {
  drape: StudioCeilingDrape;
  point: StudioPoint;
  inside: boolean;
};

type CeilingEntry = { drape: StudioCeilingDrape; layout: CeilingLayout };

type DragKind = "move" | "hub" | "resize" | "rotate" | "direction";

const layoutCache = new WeakMap<
  StudioCeilingDrape,
  { floor: readonly StudioPoint[]; layout: CeilingLayout }
>();

/** Layout memoized per (immutable) drape object, so untouched designs never re-lay out. */
export function cachedCeilingLayout(
  drape: StudioCeilingDrape,
  floor: readonly StudioPoint[]
): CeilingLayout {
  const hit = layoutCache.get(drape);
  if (hit && hit.floor === floor) return hit.layout;
  const layout = getCeilingLayout(drape, floor);
  layoutCache.set(drape, { floor, layout });
  return layout;
}

const entryCache = new WeakMap<StudioCeilingDrape, CeilingEntry>();

/** Stable `{ drape, layout }` per drape so memoized views skip untouched designs. */
function cachedCeilingEntry(
  drape: StudioCeilingDrape,
  floor: readonly StudioPoint[]
): CeilingEntry {
  const layout = cachedCeilingLayout(drape, floor);
  const hit = entryCache.get(drape);
  if (hit && hit.layout === layout) return hit;
  const entry = { drape, layout };
  entryCache.set(drape, entry);
  return entry;
}

export function ceilingStyleLabel(drape: StudioCeilingDrape) {
  return STYLE_LABELS.get(drape.type) ?? drape.label;
}

/** Can a body drag change anything visible? (Room-wide rows always fill the room.) */
function isMovable(drape: StudioCeilingDrape) {
  return drape.coverage === "area" || ceilingUsesHub(drape.type);
}

function pointBox(point: StudioPoint): PlanRect {
  return { minX: point.x, maxX: point.x, minZ: point.z, maxZ: point.z };
}

/** Box used for smart guides: the area rectangle, or the hub point for room-wide radial designs. */
function snapBox(drape: StudioCeilingDrape, layout: CeilingLayout): PlanRect | null {
  if (drape.coverage === "area") return getPointsBox(getCeilingAreaCorners(drape));
  if (ceilingUsesHub(drape.type) && layout.hub) return pointBox(layout.hub);
  return null;
}

function anchorOf(drape: StudioCeilingDrape, layout: CeilingLayout): StudioPoint {
  if (drape.coverage === "area") return { x: drape.x, z: drape.z };
  return layout.hub ?? { x: drape.hubX, z: drape.hubZ };
}

/** Nearest point inside `outline` (nudged 1″ in from the edge when outside). */
export function clampInsideOutline(
  outline: readonly StudioPoint[],
  point: StudioPoint
): StudioPoint {
  if (outline.length < 3 || pointInCeilingPolygon(outline, point.x, point.z)) return point;
  let best = point;
  let bestDistance = Infinity;
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i];
    const b = outline[(i + 1) % outline.length];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const lengthSq = dx * dx + dz * dz || 1;
    const t = Math.min(1, Math.max(0, ((point.x - a.x) * dx + (point.z - a.z) * dz) / lengthSq));
    const candidate = { x: a.x + dx * t, z: a.z + dz * t };
    const distance = Math.hypot(point.x - candidate.x, point.z - candidate.z);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = candidate;
    }
  }
  const centre = outlineCentroid(outline);
  const toCentre = Math.hypot(centre.x - best.x, centre.z - best.z) || 1;
  return {
    x: best.x + ((centre.x - best.x) / toCentre) * Math.min(1, toCentre),
    z: best.z + ((centre.z - best.z) / toCentre) * Math.min(1, toCentre),
  };
}

/** Keeps room-wide hubs inside the room after a move. */
function clampRoomHubs(
  design: StudioDesignJson,
  ids: ReadonlySet<string>,
  floor: readonly StudioPoint[]
): StudioDesignJson {
  return {
    ...design,
    ceilingDrapes: getCeilingDrapes(design).map((drape) => {
      if (!ids.has(drape.id) || drape.coverage !== "room" || !ceilingUsesHub(drape.type)) {
        return drape;
      }
      const hub = clampInsideOutline(getCeilingOutline(drape, floor), {
        x: drape.hubX,
        z: drape.hubZ,
      });
      return hub.x === drape.hubX && hub.z === drape.hubZ
        ? drape
        : { ...drape, hubX: hub.x, hubZ: hub.z };
    }),
  };
}

/** Resizes the area from a corner (sx, sz = ±1) or edge (one of them 0); the opposite side stays put. */
function resizeArea(
  drape: StudioCeilingDrape,
  sx: -1 | 0 | 1,
  sz: -1 | 0 | 1,
  pointer: StudioPoint,
  increment: number
) {
  const u = ceilingAxis(drape.rotation);
  const v = { x: -u.z, z: u.x };
  const hw = drape.width / 2;
  const hd = drape.depth / 2;
  const anchor = {
    x: drape.x - u.x * sx * hw - v.x * sz * hd,
    z: drape.z - u.z * sx * hw - v.z * sz * hd,
  };
  const rel = { x: pointer.x - anchor.x, z: pointer.z - anchor.z };
  const snap = (value: number) =>
    increment > 0 ? snapStudioValue(value, { snapIncrement: increment }) : value;
  const width = sx ? Math.max(MIN_AREA, snap((rel.x * u.x + rel.z * u.z) * sx)) : drape.width;
  const depth = sz ? Math.max(MIN_AREA, snap((rel.x * v.x + rel.z * v.z) * sz)) : drape.depth;
  const x = anchor.x + (u.x * sx * width) / 2 + (v.x * sz * depth) / 2;
  const z = anchor.z + (u.z * sx * width) / 2 + (v.z * sz * depth) / 2;
  return {
    x,
    z,
    width,
    depth,
    hubX: drape.hubX + (x - drape.x),
    hubZ: drape.hubZ + (z - drape.z),
  };
}

const CORNERS: Array<{ sx: -1 | 1; sz: -1 | 1; name: string }> = [
  { sx: -1, sz: -1, name: "north west" },
  { sx: 1, sz: -1, name: "north east" },
  { sx: 1, sz: 1, name: "south east" },
  { sx: -1, sz: 1, name: "south west" },
];
const EDGES: Array<{ sx: -1 | 0 | 1; sz: -1 | 0 | 1; name: string }> = [
  { sx: 0, sz: -1, name: "north" },
  { sx: 1, sz: 0, name: "east" },
  { sx: 0, sz: 1, name: "south" },
  { sx: -1, sz: 0, name: "west" },
];

type CeilingPointerHandler = (event: React.PointerEvent<SVGGElement>, entry: CeilingEntry) => void;

/** One ceiling design body (drawing + edge hit area + focus ring). */
const CeilingEntryView = memo(function CeilingEntryView({
  entry,
  selected,
  interactive,
  ppi,
  idPrefix,
  onBeginMove,
  onActivate,
}: {
  entry: CeilingEntry;
  selected: boolean;
  interactive: boolean;
  ppi: number;
  idPrefix: string;
  onBeginMove: CeilingPointerHandler;
  onActivate: (drape: StudioCeilingDrape, additive: boolean) => void;
}) {
  const { drape, layout } = entry;
  const outline = polygonPath(layout.outline);
  return (
    <g
      role="button"
      tabIndex={interactive ? 0 : -1}
      aria-pressed={selected}
      aria-label={`${ceilingStyleLabel(drape)} ceiling: ${drape.label}${drape.locked ? ", locked" : ""}`}
      className={cn(
        "touch-none outline-none focus-visible:[&_.studio-ceiling-focus]:opacity-100",
        interactive && (drape.locked || !isMovable(drape) ? "cursor-pointer" : "cursor-move")
      )}
      onPointerDown={(event) => onBeginMove(event, entry)}
      onPointerEnter={() => setStudioHoveredId(drape.id)}
      onPointerLeave={() => {
        if (getStudioHoveredId() === drape.id) setStudioHoveredId(null);
      }}
      onKeyDown={(event) => activateOnKey(event, () => onActivate(drape, event.shiftKey))}
    >
      <CeilingDesignSymbol drape={drape} layout={layout} idPrefix={idPrefix} />
      <path
        d={outline}
        fill="none"
        stroke="transparent"
        strokeWidth={EDGE_GRAB_PX / ppi}
        pointerEvents={interactive ? "stroke" : "none"}
      />
      <path
        className="studio-ceiling-focus pointer-events-none opacity-0"
        d={outline}
        fill="none"
        stroke="var(--ring)"
        strokeWidth={3}
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
});

/** Gold outline for a selected (halo) or hovered design. */
const CeilingOutline = memo(function CeilingOutline({
  layout,
  selected,
}: {
  layout: CeilingLayout;
  selected: boolean;
}) {
  const d = polygonPath(layout.outline);
  return (
    <>
      {selected
        ? selectionHalo().map((halo, index) => <path key={index} d={d} {...halo} />)
        : null}
      <path
        d={d}
        fill={selected ? "color-mix(in oklch, var(--primary) 7%, transparent)" : "none"}
        stroke="var(--primary)"
        strokeWidth={selected ? 2 : 1.5}
        strokeOpacity={selected ? 1 : 0.7}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </>
  );
});

/** Hover outline; the only part of the layer that re-renders on hover. */
function CeilingHoverOutline({
  entries,
  isSelected,
}: {
  entries: readonly CeilingEntry[];
  isSelected: (id: string) => boolean;
}) {
  const hoveredId = useStudioHoveredId();
  if (!hoveredId || isSelected(hoveredId)) return null;
  const entry = entries.find((item) => item.drape.id === hoveredId);
  return entry ? <CeilingOutline layout={entry.layout} selected={false} /> : null;
}

type CeilingLabelInfo = {
  id: string;
  point: StudioPoint;
  span: number;
  text: string;
  low: boolean;
  locked: boolean;
};

/** Style + clearance label; shown when the design is big enough on screen or focused. */
const CeilingLabel = memo(function CeilingLabel({
  label,
  selected,
  ppi,
  fontSize,
  labelSize,
}: {
  label: CeilingLabelInfo;
  selected: boolean;
  ppi: number;
  fontSize: number;
  labelSize: number;
}) {
  const hovered = useIsStudioHovered(label.id);
  if (!selected && !hovered && label.span * ppi < 90) return null;
  const width = label.text.length * fontSize * 0.55;
  return (
    <g>
      <text
        x={label.point.x}
        y={label.point.z}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={fontSize}
        fill={label.low ? "#f59e0b" : "var(--primary)"}
        stroke="var(--background)"
        strokeWidth={fontSize * 0.34}
        strokeOpacity={0.9}
        paintOrder="stroke"
        className="font-semibold"
      >
        {label.text}
      </text>
      {label.locked ? (
        <LockGlyph x={label.point.x - width / 2 - fontSize} z={label.point.z} size={labelSize} />
      ) : null}
    </g>
  );
});

/**
 * Reflected ceiling plan: every visible ceiling drape design drawn over the
 * floor plan. When `interactive` (Ceiling mode), designs select on click
 * (Shift adds), drag to move (smart guides + grid snap, Shift/Alt = free,
 * Esc cancels), and the single selection gets hub, area resize/rotate and
 * run-direction handles. Faint + inert in Floor mode.
 */
export const CeilingLayer2D = memo(function CeilingLayer2D({
  design,
  toPlanPoint,
  pixelsPerInch,
  handleRadius,
  labelSize,
  interactive,
  faint,
  roomBounds,
  ghost,
  onFeedback,
}: PlanLayerProps & {
  interactive: boolean;
  faint: boolean;
  roomBounds: PlanRect;
  ghost: CeilingGhost | null;
  onFeedback: (feedback: PlanDragFeedback | null) => void;
}) {
  const { select, preview } = useStudioEditorActions();
  const { selectedIds, isSelected } = useStudioSelection();
  const settings = useStudioSettings();
  const startDrag = usePlanPointerDrag(toPlanPoint);
  const idPrefix = `studio-ceiling-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const [drag, setDrag] = useState<{ id: string; kind: DragKind; angleLabel: string | null } | null>(
    null
  );

  const floor = design.room.floor;
  const wallHeight = design.room.wallHeight;
  const ppi = Math.max(pixelsPerInch, 1e-6);
  const showLayer = settings.layers.ceiling;
  const rawDrapes = design.ceilingDrapes;

  const entries = useMemo<CeilingEntry[]>(() => {
    if (!showLayer) return [];
    const visible = getCeilingDrapes({ ceilingDrapes: rawDrapes })
      .filter((drape) => !drape.hidden)
      .map((drape, index) => ({ drape, index }));
    // Room-wide designs underneath so custom areas stay clickable on top.
    visible.sort(
      (a, b) =>
        Number(a.drape.coverage === "area") - Number(b.drape.coverage === "area") ||
        a.index - b.index
    );
    return visible.map(({ drape }) => cachedCeilingEntry(drape, floor));
  }, [floor, rawDrapes, showLayer]);

  const ghostLayout = useMemo(
    () => (ghost ? getCeilingLayout(ghost.drape, floor) : null),
    [floor, ghost]
  );

  const single =
    selectedIds.length === 1
      ? (entries.find((entry) => entry.drape.id === selectedIds[0]) ?? null)
      : null;

  const room = { bounds: roomBounds, floor };
  const threshold = GUIDE_SNAP_PX / ppi;
  const snapMode = (free: boolean, guides: readonly SmartGuide[]) =>
    free
      ? "Free move"
      : guides.length > 0
        ? "Smart guide"
        : settings.snapEnabled
          ? `Snap ${settings.snapIncrement}″`
          : "Free move";

  function finish() {
    setDrag(null);
    onFeedback(null);
  }

  // ---- body: select + move -----------------------------------------------------
  function beginMove(event: React.PointerEvent<SVGGElement>, entry: CeilingEntry) {
    if (!interactive || event.button !== 0) return;
    const drape = entry.drape;
    const additive = event.shiftKey || event.metaKey || event.ctrlKey;
    const wasSelected = isSelected(drape.id);
    let ids: string[];
    let soloId: string | null = null;
    if (additive) {
      select({ kind: "ceiling", id: drape.id }, { additive: true });
      if (wasSelected) {
        event.stopPropagation();
        return;
      }
      ids = [...selectedIds, drape.id];
    } else if (!wasSelected) {
      select({ kind: "ceiling", id: drape.id });
      ids = [drape.id];
    } else {
      ids = selectedIds;
      soloId = selectedIds.length > 1 ? drape.id : null;
    }
    const start = toPlanPoint(event);
    const base = design;
    const idSet = new Set(ids);
    const moving = entries.filter(
      (item) => idSet.has(item.drape.id) && !item.drape.locked && isMovable(item.drape)
    );
    if (drape.locked || !start || moving.length === 0) {
      event.stopPropagation();
      if (soloId) select({ kind: "ceiling", id: soloId });
      return;
    }
    const anchorEntry = moving.find((item) => item.drape.id === drape.id) ?? moving[0];
    const anchor = anchorOf(anchorEntry.drape, anchorEntry.layout);
    const movingIds = moving.map((item) => item.drape.id);
    const movingSet = new Set(movingIds);
    const boxes = moving.flatMap((item) => {
      const box = snapBox(item.drape, item.layout);
      return box
        ? [
            { x: box.minX, z: box.minZ },
            { x: box.maxX, z: box.maxZ },
          ]
        : [];
    });
    const box = boxes.length > 0 ? getPointsBox(boxes) : pointBox(anchor);
    const targets: SmartSnapTarget[] = entries.flatMap((item) => {
      if (movingSet.has(item.drape.id)) return [];
      const target = snapBox(item.drape, item.layout);
      return target ? [{ box: target }] : [];
    });
    const { snapEnabled, snapIncrement, smartGuides } = settings;

    startDrag(event, {
      onMove(point, modifiers) {
        const free = modifiers.shiftKey || modifiers.altKey;
        const rawDx = point.x - start.x;
        const rawDz = point.z - start.z;
        let dx = rawDx;
        let dz = rawDz;
        let guides: SmartGuide[] = [];
        let snappedX = false;
        let snappedZ = false;
        if (!free && smartGuides) {
          const result = computeSmartSnap({
            moving: offsetBox(box, rawDx, rawDz),
            targets,
            room,
            threshold,
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
        if (!free && snapEnabled) {
          const options = { snapIncrement };
          if (!snappedX) dx = snapStudioValue(anchor.x + rawDx, options) - anchor.x;
          if (!snappedZ) dz = snapStudioValue(anchor.z + rawDz, options) - anchor.z;
        }
        preview(clampRoomHubs(nudgeStudioItems(base, movingIds, dx, dz), movingSet, floor));
        setDrag({ id: drape.id, kind: "move", angleLabel: null });
        onFeedback({
          label: `${inchesToFeetLabel(anchor.x + dx)}, ${inchesToFeetLabel(anchor.z + dz)}`,
          mode: snapMode(free, guides),
          guides,
          box: offsetBox(box, dx, dz),
          angleLabel: null,
        });
      },
      onEnd(moved) {
        finish();
        if (!moved && soloId) select({ kind: "ceiling", id: soloId });
      },
      onCancel: finish,
    });
  }

  // ---- hub ---------------------------------------------------------------------
  function beginHub(event: React.PointerEvent<SVGElement>, entry: CeilingEntry) {
    if (event.button !== 0 || entry.drape.locked) return;
    event.preventDefault();
    const base = design;
    const drape = entry.drape;
    const outline = entry.layout.outline;
    const centreTargets: SmartSnapTarget[] = [{ box: pointBox(outlineCentroid(outline)) }];
    if (drape.coverage === "area") centreTargets.push({ box: pointBox({ x: drape.x, z: drape.z }) });
    const { snapEnabled, snapIncrement, smartGuides } = settings;
    startDrag(
      event,
      {
        onMove(point, modifiers) {
          const free = modifiers.shiftKey || modifiers.altKey;
          let next = point;
          let guides: SmartGuide[] = [];
          let snappedX = false;
          let snappedZ = false;
          if (!free && smartGuides) {
            const result = computeSmartSnap({
              moving: pointBox(point),
              targets: centreTargets,
              room,
              threshold,
            });
            next = { x: point.x + result.dx, z: point.z + result.dz };
            snappedX = result.snappedX;
            snappedZ = result.snappedZ;
            guides = result.guides;
          }
          if (!free && snapEnabled) {
            next = {
              x: snappedX ? next.x : snapStudioValue(next.x, { snapIncrement }),
              z: snappedZ ? next.z : snapStudioValue(next.z, { snapIncrement }),
            };
          }
          next = clampInsideOutline(outline, next);
          preview(updateCeilingDrape(base, drape.id, { hubX: next.x, hubZ: next.z }));
          setDrag({ id: drape.id, kind: "hub", angleLabel: null });
          onFeedback({
            label: `Hub ${inchesToFeetLabel(next.x)}, ${inchesToFeetLabel(next.z)}`,
            mode: snapMode(free, guides),
            guides,
            box: pointBox(next),
            angleLabel: null,
          });
        },
        onEnd: finish,
        onCancel: finish,
      },
      { threshold: 1 }
    );
  }

  // ---- area resize / rotate ------------------------------------------------------
  function beginResize(
    event: React.PointerEvent<SVGElement>,
    entry: CeilingEntry,
    sx: -1 | 0 | 1,
    sz: -1 | 0 | 1
  ) {
    if (event.button !== 0 || entry.drape.locked) return;
    event.preventDefault();
    const base = design;
    const drape = entry.drape;
    const { snapEnabled, snapIncrement } = settings;
    startDrag(
      event,
      {
        onMove(point, modifiers) {
          const snap = shouldSnap(snapEnabled, modifiers);
          const patch = resizeArea(drape, sx, sz, point, snap ? snapIncrement : 0);
          preview(updateCeilingDrape(base, drape.id, patch));
          setDrag({ id: drape.id, kind: "resize", angleLabel: null });
          onFeedback({
            label: `${inchesToFeetLabel(patch.width)} × ${inchesToFeetLabel(patch.depth)}`,
            mode: snap ? `Snap ${snapIncrement}″` : "Free size",
            guides: [],
            box: getPointsBox(getCeilingAreaCorners({ ...drape, ...patch })),
            angleLabel: null,
          });
        },
        onEnd: finish,
        onCancel: finish,
      },
      { threshold: 1 }
    );
  }

  function beginRotate(event: React.PointerEvent<SVGElement>, entry: CeilingEntry) {
    if (event.button !== 0 || entry.drape.locked) return;
    event.preventDefault();
    const base = design;
    const drape = entry.drape;
    const centre = { x: drape.x, z: drape.z };
    const step = settings.rotationSnap > 0 ? settings.rotationSnap : 15;
    startDrag(
      event,
      {
        onMove(point, modifiers) {
          const free = modifiers.shiftKey || modifiers.altKey;
          const angle = angleAround(centre, point);
          const rotation = normalizeCeilingRotation(free ? angle : Math.round(angle / step) * step);
          const delta = ((rotation - drape.rotation) * Math.PI) / 180;
          const rx = drape.hubX - centre.x;
          const rz = drape.hubZ - centre.z;
          preview(
            updateCeilingDrape(base, drape.id, {
              rotation,
              hubX: centre.x + rx * Math.cos(delta) - rz * Math.sin(delta),
              hubZ: centre.z + rx * Math.sin(delta) + rz * Math.cos(delta),
            })
          );
          const label = `${Math.round(rotation)}°`;
          setDrag({ id: drape.id, kind: "rotate", angleLabel: label });
          onFeedback({
            label,
            mode: free ? "Free rotate" : `Snap ${step}°`,
            guides: [],
            box: null,
            angleLabel: label,
          });
        },
        onEnd: finish,
        onCancel: finish,
      },
      { threshold: 1 }
    );
  }

  // ---- run direction / spin (room-wide designs) ------------------------------------
  function beginDirection(
    event: React.PointerEvent<SVGElement>,
    entry: CeilingEntry,
    centre: StudioPoint
  ) {
    if (event.button !== 0 || entry.drape.locked) return;
    event.preventDefault();
    const base = design;
    const drape = entry.drape;
    const step = settings.rotationSnap > 0 ? settings.rotationSnap : 15;
    const radial = ceilingUsesHub(drape.type);
    startDrag(
      event,
      {
        onMove(point, modifiers) {
          const free = modifiers.shiftKey || modifiers.altKey;
          const angle = (Math.atan2(point.z - centre.z, point.x - centre.x) * 180) / Math.PI;
          const rotation = normalizeCeilingRotation(free ? angle : Math.round(angle / step) * step);
          preview(updateCeilingDrape(base, drape.id, { rotation }));
          const label = `${Math.round(rotation)}°`;
          setDrag({ id: drape.id, kind: "direction", angleLabel: label });
          onFeedback({
            label: `${radial ? "Spin" : "Run direction"} ${label}`,
            mode: free ? "Free rotate" : `Snap ${step}°`,
            guides: [],
            box: null,
            angleLabel: label,
          });
        },
        onEnd: finish,
        onCancel: finish,
      },
      { threshold: 1 }
    );
  }

  // ---- labels ------------------------------------------------------------------------
  const fontSize = labelSize * 0.82;
  const labels = useMemo<CeilingLabelInfo[]>(() => {
    const placed: StudioPoint[] = [];
    return entries.map((entry) => {
      const base = ceilingAnchor(entry.layout);
      const below = entry.layout.hub ? hubDecorRadius(entry.drape.hubDecor) + fontSize * 1.1 : 0;
      const point = { x: base.x, z: base.z + below };
      while (placed.some((p) => Math.abs(p.x - point.x) < fontSize * 8 && Math.abs(p.z - point.z) < fontSize * 1.2)) {
        point.z += fontSize * 1.35;
      }
      placed.push(point);
      const box = getPointsBox(entry.layout.outline);
      const clear = wallHeight - ceilingLowestDrop(entry.drape);
      return {
        id: entry.drape.id,
        point,
        span: Math.min(box.maxX - box.minX, box.maxZ - box.minZ),
        text: `${ceilingStyleLabel(entry.drape)} · ${inchesToFeetLabel(clear)} clear`,
        low: clear < LOW_CLEARANCE,
        locked: Boolean(entry.drape.locked),
      };
    });
  }, [entries, fontSize, wallHeight]);

  const actions = useRef({ beginMove, select });
  useLayoutEffect(() => {
    actions.current = { beginMove, select };
  });
  const onBeginMove = useCallback<CeilingPointerHandler>(
    (event, entry) => actions.current.beginMove(event, entry),
    []
  );
  const onActivate = useCallback(
    (drape: StudioCeilingDrape, additive: boolean) =>
      actions.current.select(
        { kind: "ceiling", id: drape.id },
        additive ? { additive: true } : undefined
      ),
    []
  );

  if (entries.length === 0 && !ghost) return null;

  const r = handleRadius * 0.85;
  const stem = ROTATE_STEM_PX / ppi;
  const singleDrape = single?.drape ?? null;

  return (
    <g
      className="studio-ceiling-layer"
      aria-label="Ceiling designs"
      opacity={faint ? 0.2 : 1}
      pointerEvents={interactive ? undefined : "none"}
    >
      {entries.map((entry) => (
        <CeilingEntryView
          key={entry.drape.id}
          entry={entry}
          selected={isSelected(entry.drape.id)}
          interactive={interactive}
          ppi={ppi}
          idPrefix={idPrefix}
          onBeginMove={onBeginMove}
          onActivate={onActivate}
        />
      ))}

      <g className="pointer-events-none">
        {entries.map(({ drape, layout }) =>
          isSelected(drape.id) ? <CeilingOutline key={drape.id} layout={layout} selected /> : null
        )}
        <CeilingHoverOutline entries={entries} isSelected={isSelected} />
      </g>

      {settings.showLabels ? (
        <g className="pointer-events-none select-none">
          {labels.map((label) => (
            <CeilingLabel
              key={label.id}
              label={label}
              selected={isSelected(label.id)}
              ppi={ppi}
              fontSize={fontSize}
              labelSize={labelSize}
            />
          ))}
        </g>
      ) : null}

      {interactive && single && singleDrape && !singleDrape.locked ? (
        <g>
          {singleDrape.coverage === "area" ? (
            <g transform={`translate(${singleDrape.x} ${singleDrape.z}) rotate(${singleDrape.rotation})`}>
              <rect
                x={-singleDrape.width / 2}
                y={-singleDrape.depth / 2}
                width={singleDrape.width}
                height={singleDrape.depth}
                fill="none"
                stroke="var(--primary)"
                strokeOpacity={0.55}
                strokeDasharray="4 3"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
                className="pointer-events-none"
              />
              <RotateKnob
                x={0}
                z={-singleDrape.depth / 2 - stem}
                stemFrom={-singleDrape.depth / 2}
                r={r}
                label={`Rotate ${singleDrape.label}`}
                onPointerDown={(event) => beginRotate(event, single)}
                angleLabel={drag?.kind === "rotate" ? drag.angleLabel : null}
                labelSize={labelSize}
              />
              {CORNERS.map((corner) => (
                <Handle
                  key={corner.name}
                  cx={(corner.sx * singleDrape.width) / 2}
                  cz={(corner.sz * singleDrape.depth) / 2}
                  r={r}
                  cursor={cursorFor(corner.sx, corner.sz, singleDrape.rotation)}
                  label={`Resize ${singleDrape.label} from ${corner.name} corner`}
                  onPointerDown={(event) => beginResize(event, single, corner.sx, corner.sz)}
                />
              ))}
              {EDGES.map((edge) => (
                <Handle
                  key={edge.name}
                  cx={(edge.sx * singleDrape.width) / 2}
                  cz={(edge.sz * singleDrape.depth) / 2}
                  r={r * 0.8}
                  square
                  cursor={cursorFor(edge.sx, edge.sz, singleDrape.rotation)}
                  label={`Resize ${singleDrape.label} ${edge.name} edge`}
                  onPointerDown={(event) => beginResize(event, single, edge.sx, edge.sz)}
                />
              ))}
            </g>
          ) : (
            <DirectionHandle
              entry={single}
              lengthInches={DIRECTION_PX / ppi}
              r={r}
              labelSize={labelSize}
              angleLabel={drag?.kind === "direction" ? drag.angleLabel : null}
              onPointerDown={beginDirection}
            />
          )}
          {single.layout.hub ? (
            <HubHandle
              at={single.layout.hub}
              r={r}
              label={`Move ${singleDrape.label} hub`}
              onPointerDown={(event) => beginHub(event, single)}
            />
          ) : null}
        </g>
      ) : null}

      {ghost && ghostLayout ? (
        <g className="pointer-events-none">
          <g opacity={ghost.inside ? 0.6 : 0.25}>
            <CeilingDesignSymbol drape={ghost.drape} layout={ghostLayout} idPrefix={`${idPrefix}-ghost`} />
          </g>
          <PlacementCrosshair point={ghost.point} size={18 / ppi} inside={ghost.inside} />
        </g>
      ) : null}
    </g>
  );
});

function HubHandle({
  at,
  r,
  label,
  onPointerDown,
}: {
  at: StudioPoint;
  r: number;
  label: string;
  onPointerDown: (event: React.PointerEvent<SVGElement>) => void;
}) {
  const s = r * 1.15;
  return (
    <g
      className="cursor-move touch-none"
      role="button"
      aria-label={label}
      onPointerDown={onPointerDown}
      transform={`translate(${at.x} ${at.z})`}
    >
      <circle r={s * 2.4} fill="transparent" />
      <path
        d={`M 0 ${-s} L ${s} 0 L 0 ${s} L ${-s} 0 Z`}
        fill="var(--primary)"
        stroke="var(--background)"
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
      />
      <circle r={s * 0.28} fill="var(--background)" />
    </g>
  );
}

/** Arrow showing the run direction (rows / cascades) or first-spoke spin (radial); drag the knob to turn it. */
function DirectionHandle({
  entry,
  lengthInches,
  r,
  labelSize,
  angleLabel,
  onPointerDown,
}: {
  entry: CeilingEntry;
  lengthInches: number;
  r: number;
  labelSize: number;
  angleLabel: string | null;
  onPointerDown: (
    event: React.PointerEvent<SVGElement>,
    entry: CeilingEntry,
    centre: StudioPoint
  ) => void;
}) {
  const { drape, layout } = entry;
  const radial = ceilingUsesHub(drape.type);
  if (!radial && ceilingStyleFamily(drape.type) === "perimeter") return null;
  const centre = layout.hub ?? outlineCentroid(layout.outline);
  const u = ceilingAxis(drape.rotation);
  const n = { x: -u.z, z: u.x };
  const L = lengthInches;
  const tip = { x: centre.x + u.x * L, z: centre.z + u.z * L };
  const tail = radial ? centre : { x: centre.x - u.x * L, z: centre.z - u.z * L };
  const head = r * 1.3;
  const arrow = (at: StudioPoint, dir: number) =>
    `M ${at.x - u.x * head * dir + n.x * head * 0.7} ${at.z - u.z * head * dir + n.z * head * 0.7} L ${at.x} ${at.z} L ${at.x - u.x * head * dir - n.x * head * 0.7} ${at.z - u.z * head * dir - n.z * head * 0.7}`;
  const knob = { x: centre.x + u.x * (L + r * 2.2), z: centre.z + u.z * (L + r * 2.2) };
  return (
    <g>
      <g className="pointer-events-none" stroke="var(--primary)" fill="none" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <line x1={tail.x} y1={tail.z} x2={tip.x} y2={tip.z} vectorEffect="non-scaling-stroke" strokeDasharray={radial ? "4 3" : undefined} />
        <path d={arrow(tip, 1)} vectorEffect="non-scaling-stroke" />
        {radial ? null : <path d={arrow(tail, -1)} vectorEffect="non-scaling-stroke" />}
      </g>
      <g
        className="cursor-grab touch-none active:cursor-grabbing"
        role="button"
        aria-label={radial ? `Spin ${drape.label}` : `Turn ${drape.label} run direction`}
        onPointerDown={(event) => onPointerDown(event, entry, centre)}
      >
        <circle cx={knob.x} cy={knob.z} r={r * 2.4} fill="transparent" />
        <circle cx={knob.x} cy={knob.z} r={r * 1.15} fill="var(--primary)" stroke="var(--background)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
        <path
          d={`M ${knob.x - r * 0.55} ${knob.z + r * 0.1} A ${r * 0.55} ${r * 0.55} 0 1 1 ${knob.x + r * 0.1} ${knob.z + r * 0.55}`}
          fill="none"
          stroke="var(--primary-foreground)"
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />
      </g>
      {angleLabel ? (
        <text
          x={knob.x}
          y={knob.z - r * 2.6}
          textAnchor="middle"
          fontSize={labelSize * 0.9}
          fill="var(--primary)"
          stroke="var(--background)"
          strokeWidth={labelSize * 0.35}
          paintOrder="stroke"
          className="pointer-events-none font-semibold"
        >
          {angleLabel}
        </text>
      ) : null}
    </g>
  );
}

function PlacementCrosshair({
  point,
  size,
  inside,
}: {
  point: StudioPoint;
  size: number;
  inside: boolean;
}) {
  const color = inside ? "var(--primary)" : "#ef4444";
  return (
    <g stroke={color} fill="none" strokeWidth={1.5}>
      <circle cx={point.x} cy={point.z} r={size * 0.45} vectorEffect="non-scaling-stroke" />
      <path
        d={`M ${point.x - size} ${point.z} H ${point.x - size * 0.2} M ${point.x + size * 0.2} ${point.z} H ${point.x + size} M ${point.x} ${point.z - size} V ${point.z - size * 0.2} M ${point.x} ${point.z + size * 0.2} V ${point.z + size}`}
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={point.x} cy={point.z} r={size * 0.08} fill={color} stroke="none" />
    </g>
  );
}