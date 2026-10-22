"use client";

import {
  getDrapeColorHex,
  getStudioMaterials,
  type StudioDrapeRun,
  type StudioPoint,
  type StudioOpening,
  type StudioTreatment,
} from "@/data/studio";
import {
  clampDrapeRunToWall,
  clampOpeningToWall,
  clampTreatmentToWall,
  getWallSegments,
  inchesToFeetLabel,
  type StudioWallSegment,
} from "@/lib/studio-geometry";
import { snapStudioValue } from "@/lib/studio-interactions";
import {
  STUDIO_PLAN_WALL_THICKNESS,
  getRoomWindingSign,
  getWallInwardNormal,
  projectPointToWall,
  setWallItemSpan,
} from "@/lib/studio-room-editing";
import {
  memo,
  useCallback,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  getStudioHoveredId,
  setStudioHoveredId,
  useIsStudioHovered,
} from "../editor/hover-store";
import {
  useStudioEditorActions,
  useStudioSelection,
  useStudioSettings,
} from "../editor/studio-editor-context";
import type { StudioSelection } from "../studio-types";
import type { PlanLayerProps } from "./plan-types";
import { getFloorFill } from "./room-walls";
import { selectionHalo } from "./selection-overlay";
import {
  DRAPE_PLAN_INSET,
  DrapeSymbol,
  OpeningSymbol,
  TREATMENT_PLAN_BASE,
  TreatmentGlyph,
} from "./wall-item-symbols";
import { PlanBadge, uprightAngle } from "./wall-plan-badge";
import {
  activateOnKey,
  shouldSnap,
  usePlanPointerDrag,
} from "./wall-pointer-drag";

const WALL = STUDIO_PLAN_WALL_THICKNESS;
const MIN_SPAN = 12;
/** Pointer distance (inches) at which a dragged item jumps to another wall. */
const TRANSFER_DISTANCE = 24;

type WallItemEntry =
  | WallItemBase<"drape", StudioDrapeRun>
  | WallItemBase<"treatment", StudioTreatment>
  | WallItemBase<"opening", StudioOpening>;

type WallItemBase<K extends string, T> = {
  kind: K;
  id: string;
  label: string;
  wallIndex: number;
  start: number;
  end: number;
  locked: boolean;
  item: T;
};

type DragMode = "move" | "start" | "end";

type ItemDrag = {
  id: string;
  mode: DragMode;
  snapping: boolean;
  originWall: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function snapItemStart(
  start: number,
  width: number,
  wallLength: number,
  increment: number
): number {
  const sticky = Math.max(2, Math.min(12, increment / 2));
  const endStart = wallLength - width;
  if (Math.abs(start) <= sticky) return 0;
  if (Math.abs(start - endStart) <= sticky) return endStart;
  if (Math.abs(start - endStart / 2) <= sticky) return endStart / 2;
  return snapStudioValue(start, { snapIncrement: increment });
}

function snapEdge(offset: number, wallLength: number, increment: number): number {
  const sticky = Math.max(2, Math.min(12, increment / 2));
  if (offset <= sticky) return 0;
  if (wallLength - offset <= sticky) return wallLength;
  return snapStudioValue(offset, { snapIncrement: increment });
}

function selectionFor(entry: WallItemEntry): StudioSelection {
  return { kind: entry.kind, id: entry.id };
}

/** Local y-extent (inward from the wall face) used for hit areas and outlines. */
function itemExtent(entry: WallItemEntry): { min: number; max: number } {
  if (entry.kind === "opening") return { min: -WALL - 2, max: 14 };
  if (entry.kind === "drape") return { min: 0, max: DRAPE_PLAN_INSET + 9 };
  const depth = Math.min(36, Math.max(10, entry.item.swagDrop * 0.45));
  return {
    min: TREATMENT_PLAN_BASE - 10,
    max: TREATMENT_PLAN_BASE + Math.max(20, depth + 6),
  };
}

const entryCache = new WeakMap<object, { floor: StudioPoint[]; entry: WallItemEntry }>();

/** Entry per (immutable) raw item + floor, so untouched items keep their identity. */
function cachedEntry(raw: object, floor: StudioPoint[], build: () => WallItemEntry): WallItemEntry {
  const hit = entryCache.get(raw);
  if (hit && hit.floor === floor) return hit.entry;
  const entry = build();
  entryCache.set(raw, { floor, entry });
  return entry;
}

function kindLabelOf(entry: WallItemEntry): string {
  if (entry.kind === "drape") return "Drape run";
  if (entry.kind === "treatment") return "Treatment";
  if (entry.item.type === "window") return "Window";
  if (entry.item.type === "entrance") return "Entrance";
  return "Door";
}

function wallFrame(wall: StudioWallSegment, inwardSign: number): string {
  return `translate(${wall.start.x} ${wall.start.z}) rotate(${(wall.angle * 180) / Math.PI}) scale(1 ${inwardSign})`;
}

type WallItemPointerHandler = (
  event: React.PointerEvent<SVGElement>,
  entry: WallItemEntry,
  mode: DragMode
) => void;

/** One wall item (symbol, hit area, hover/selection outline). Hover re-renders only this item. */
const WallItemView = memo(function WallItemView({
  entry,
  wall,
  inwardSign,
  selected,
  ppi,
  floorFill,
  uplightGradientId,
  onBeginDrag,
  onItemClick,
  onActivate,
}: {
  entry: WallItemEntry;
  wall: StudioWallSegment;
  inwardSign: number;
  selected: boolean;
  ppi: number;
  floorFill: string;
  uplightGradientId: string | undefined;
  onBeginDrag: WallItemPointerHandler;
  onItemClick: (event: React.MouseEvent<SVGElement>, entry: WallItemEntry) => void;
  onActivate: (entry: WallItemEntry, additive: boolean) => void;
}) {
  const hovered = useIsStudioHovered(entry.id);
  const extent = itemExtent(entry);
  const height = Math.max(extent.max - extent.min, 16 / ppi);
  const span = Math.max(1, entry.end - entry.start);
  const outline = {
    x: entry.start - 2,
    y: extent.min - 2,
    width: span + 4,
    height: height + 4,
    rx: 3,
  };
  return (
    <g
      transform={wallFrame(wall, inwardSign)}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`${kindLabelOf(entry)}: ${entry.label}, ${inchesToFeetLabel(span)} on wall ${entry.wallIndex + 1}${entry.locked ? ", locked" : ". Drag along the wall or toward another wall to move it"}`}
      className={`${entry.locked ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"} touch-none outline-none select-none focus-visible:[&_.studio-wall-item-focus]:opacity-100`}
      onPointerEnter={() => setStudioHoveredId(entry.id)}
      onPointerLeave={() => {
        if (getStudioHoveredId() === entry.id) setStudioHoveredId(null);
      }}
      onPointerDown={(event) => onBeginDrag(event, entry, "move")}
      onClick={(event) => onItemClick(event, entry)}
      onKeyDown={(event) => activateOnKey(event, () => onActivate(entry, event.shiftKey))}
    >
      {entry.kind === "opening" ? (
        <g transform={`translate(${entry.start} 0)`}>
          <OpeningSymbol
            opening={entry.item}
            width={span}
            wallThickness={WALL}
            floorFill={floorFill}
            selected={selected}
          />
        </g>
      ) : entry.kind === "drape" ? (
        <DrapeSymbol run={entry.item} pixelsPerInch={ppi} uplightGradientId={uplightGradientId} />
      ) : (
        <g transform={`translate(${(entry.start + entry.end) / 2} 0)`}>
          <TreatmentGlyph treatment={entry.item} />
        </g>
      )}
      <rect x={entry.start} y={extent.min} width={span} height={height} fill="transparent" />
      {selected
        ? selectionHalo().map((halo, index) => (
            <rect key={`halo-${index}`} {...outline} {...halo} />
          ))
        : null}
      {selected || hovered ? (
        <rect
          {...outline}
          fill={selected ? "color-mix(in oklch, var(--primary) 10%, transparent)" : "none"}
          stroke="var(--primary)"
          strokeOpacity={selected ? 1 : 0.55}
          strokeWidth={selected ? 1.75 : 1}
          strokeDasharray={selected ? "6 4" : undefined}
          vectorEffect="non-scaling-stroke"
          pointerEvents="none"
        />
      ) : null}
      <rect
        className="studio-wall-item-focus pointer-events-none opacity-0"
        x={entry.start - 4}
        y={extent.min - 4}
        width={span + 8}
        height={height + 8}
        rx={4}
        fill="none"
        stroke="var(--ring)"
        strokeWidth={3}
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
});

/** Item name along its wall; shown when there is room for it or when focused. */
const WallItemLabel = memo(function WallItemLabel({
  entry,
  wall,
  floor,
  selected,
  ppi,
  labelSize,
}: {
  entry: WallItemEntry;
  wall: StudioWallSegment;
  floor: StudioPoint[];
  selected: boolean;
  ppi: number;
  labelSize: number;
}) {
  const hovered = useIsStudioHovered(entry.id);
  const span = entry.end - entry.start;
  const focused = selected || hovered;
  if (entry.kind === "opening" ? !focused : span * ppi < 90 && !focused) return null;
  const at = wallPoint(floor, wall, (entry.start + entry.end) / 2, itemExtent(entry).max + labelSize * 0.9);
  return (
    <text
      x={at.x}
      y={at.z}
      transform={`rotate(${uprightAngle(wall.angle)} ${at.x} ${at.z})`}
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={labelSize * 0.72}
      fill={focused ? "var(--primary)" : "var(--muted-foreground)"}
      stroke="var(--background)"
      strokeWidth={labelSize * 0.32}
      paintOrder="stroke"
      className="pointer-events-none font-medium select-none"
    >
      {entry.label}
    </text>
  );
});

/** Plan point `along` the wall and `inward` from its face. */
function wallPoint(floor: StudioPoint[], wall: StudioWallSegment, along: number, inward: number) {
  const normal = getWallInwardNormal(floor, wall.index);
  const ux = Math.cos(wall.angle);
  const uz = Math.sin(wall.angle);
  return {
    x: wall.start.x + ux * along + normal.x * inward,
    z: wall.start.z + uz * along + normal.z * inward,
  };
}

function handleCursor(wall: StudioWallSegment): string {
  const ux = Math.abs(Math.cos(wall.angle));
  if (ux > 0.92) return "cursor-ew-resize";
  if (ux < 0.39) return "cursor-ns-resize";
  return Math.cos(wall.angle) * Math.sin(wall.angle) > 0
    ? "cursor-nwse-resize"
    : "cursor-nesw-resize";
}

/**
 * Wall-anchored items on the plan: drape runs (pleated fabric, pipe & drape
 * uprights, uplight glows), treatments, and openings (door swings, entrance
 * gaps, glazing). Drag to slide along the wall (snaps to grid, wall ends and
 * centre; Shift/Alt = free), drag toward another wall to transfer, and use
 * the end handles on the selection to resize the span or opening width.
 */
export const WallItemsLayer2D = memo(function WallItemsLayer2D({
  design,
  toPlanPoint,
  pixelsPerInch,
  handleRadius,
  labelSize,
}: PlanLayerProps) {
  const { select, preview } = useStudioEditorActions();
  const { isSelected } = useStudioSelection();
  const settings = useStudioSettings();
  const startDrag = usePlanPointerDrag(toPlanPoint);
  const idPrefix = `studio-wall-items-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const [drag, setDrag] = useState<ItemDrag | null>(null);
  const suppressClick = useRef<string | null>(null);

  const floor = design.room.floor;
  const walls = useMemo(() => getWallSegments(floor), [floor]);
  const inwardSign = getRoomWindingSign(floor);
  const ppi = Math.max(pixelsPerInch, 1e-6);
  const floorFill = getFloorFill(getStudioMaterials(design).floor);
  const { drapes: showDrapes, treatments: showTreatments, openings: showOpenings } =
    settings.layers;

  const entries = useMemo(() => {
    const list: WallItemEntry[] = [];
    if (showOpenings) {
      for (const raw of design.openings) {
        if (raw.hidden || !walls[raw.wallIndex]) continue;
        list.push(
          cachedEntry(raw, floor, () => {
            const opening = clampOpeningToWall(raw, floor);
            return {
              kind: "opening",
              id: raw.id,
              label: raw.label,
              wallIndex: raw.wallIndex,
              start: opening.offset,
              end: opening.offset + opening.width,
              locked: Boolean(raw.locked),
              item: raw,
            };
          })
        );
      }
    }
    if (showDrapes) {
      for (const raw of design.drapeRuns) {
        if (raw.hidden || !walls[raw.wallIndex]) continue;
        list.push(
          cachedEntry(raw, floor, () => {
            const run = clampDrapeRunToWall(raw, floor);
            return {
              kind: "drape",
              id: raw.id,
              label: raw.label,
              wallIndex: raw.wallIndex,
              start: run.startOffset,
              end: run.endOffset,
              locked: Boolean(raw.locked),
              item: run,
            };
          })
        );
      }
    }
    if (showTreatments) {
      for (const raw of design.treatments ?? []) {
        if (raw.hidden || !walls[raw.anchor.wallIndex]) continue;
        list.push(
          cachedEntry(raw, floor, () => {
            const treatment = clampTreatmentToWall(raw, floor);
            return {
              kind: "treatment",
              id: raw.id,
              label: raw.label,
              wallIndex: raw.anchor.wallIndex,
              start: treatment.anchor.startOffset,
              end: treatment.anchor.endOffset,
              locked: Boolean(raw.locked),
              item: treatment,
            };
          })
        );
      }
    }
    return list;
  }, [
    design.openings,
    design.drapeRuns,
    design.treatments,
    floor,
    walls,
    showDrapes,
    showTreatments,
    showOpenings,
  ]);

  const uplightColors = useMemo(
    () =>
      [
        ...new Set(
          entries.flatMap((entry) =>
            entry.kind === "drape" && entry.item.uplightColor
              ? [entry.item.uplightColor]
              : []
          )
        ),
      ],
    [entries]
  );

  const frameFor = (wall: StudioWallSegment) => wallFrame(wall, inwardSign);
  const toWorld = (wall: StudioWallSegment, along: number, inward: number) =>
    wallPoint(floor, wall, along, inward);

  function beginDrag(
    event: React.PointerEvent<SVGElement>,
    entry: WallItemEntry,
    mode: DragMode
  ) {
    if (event.button !== 0) return;
    suppressClick.current = null;
    const additive = event.shiftKey || event.ctrlKey || event.metaKey;
    if (mode === "move" && !additive && !isSelected(entry.id)) {
      select(selectionFor(entry));
    }
    const start = toPlanPoint(event);
    if (entry.locked || !start) {
      event.stopPropagation();
      return;
    }
    if (mode !== "move") event.preventDefault();
    const base = design;
    const baseWalls = getWallSegments(base.room.floor);
    const originWall = baseWalls[entry.wallIndex];
    if (!originWall) {
      event.stopPropagation();
      return;
    }
    const span = entry.end - entry.start;
    const grab = clamp(
      projectPointToWall(originWall, start).rawOffset - entry.start,
      0,
      span
    );
    const snapEnabled = settings.snapEnabled;
    const increment = settings.snapIncrement;
    const transferDistance = Math.max(TRANSFER_DISTANCE, 18 / ppi);
    let currentWall = entry.wallIndex;

    startDrag(
      event,
      {
        onMove(point, modifiers) {
          const snap = shouldSnap(snapEnabled, modifiers);
          if (mode === "move") {
            let target = projectPointToWall(baseWalls[currentWall], point);
            for (const wall of baseWalls) {
              if (wall.index === currentWall || wall.length < Math.min(span, MIN_SPAN)) {
                continue;
              }
              const projection = projectPointToWall(wall, point);
              if (
                projection.distance <= transferDistance &&
                projection.distance < target.distance - 2
              ) {
                target = projection;
              }
            }
            currentWall = target.wallIndex;
            const wall = baseWalls[currentWall];
            const width = Math.min(span, wall.length);
            let nextStart = target.rawOffset - Math.min(grab, width);
            if (snap) nextStart = snapItemStart(nextStart, width, wall.length, increment);
            nextStart = clamp(nextStart, 0, Math.max(0, wall.length - width));
            preview(
              setWallItemSpan(base, entry.id, {
                wallIndex: currentWall,
                start: nextStart,
                end: nextStart + width,
              })
            );
          } else {
            let along = projectPointToWall(originWall, point).offset;
            if (snap) along = snapEdge(along, originWall.length, increment);
            const minimum = Math.min(MIN_SPAN, originWall.length);
            const nextSpan =
              mode === "start"
                ? { start: clamp(along, 0, entry.end - minimum), end: entry.end }
                : {
                    start: entry.start,
                    end: clamp(along, entry.start + minimum, originWall.length),
                  };
            preview(
              setWallItemSpan(base, entry.id, {
                wallIndex: entry.wallIndex,
                ...nextSpan,
              })
            );
          }
          setDrag({ id: entry.id, mode, snapping: snap, originWall: entry.wallIndex });
        },
        onEnd(moved) {
          setDrag(null);
          if (moved) suppressClick.current = entry.id;
        },
        onCancel() {
          setDrag(null);
        },
      },
      { threshold: mode === "move" ? 3 : 1 }
    );
  }

  function handleClick(event: React.MouseEvent<SVGElement>, entry: WallItemEntry) {
    event.stopPropagation();
    if (suppressClick.current === entry.id) {
      suppressClick.current = null;
      return;
    }
    const additive = event.shiftKey || event.ctrlKey || event.metaKey;
    select(selectionFor(entry), additive ? { additive: true } : undefined);
  }

  const actions = useRef({ beginDrag, handleClick, select });
  useLayoutEffect(() => {
    actions.current = { beginDrag, handleClick, select };
  });
  const onBeginDrag = useCallback<WallItemPointerHandler>(
    (event, entry, mode) => actions.current.beginDrag(event, entry, mode),
    []
  );
  const onItemClick = useCallback(
    (event: React.MouseEvent<SVGElement>, entry: WallItemEntry) =>
      actions.current.handleClick(event, entry),
    []
  );
  const onActivate = useCallback(
    (entry: WallItemEntry, additive: boolean) =>
      actions.current.select(selectionFor(entry), additive ? { additive: true } : undefined),
    []
  );

  const dragged = drag ? entries.find((entry) => entry.id === drag.id) : undefined;

  return (
    <g className="studio-wall-items-layer">
      <defs>
        {uplightColors.map((color) => (
          <radialGradient key={color} id={`${idPrefix}-uplight-${color}`}>
            <stop offset="0%" stopColor={getDrapeColorHex(color)} stopOpacity={0.6} />
            <stop offset="55%" stopColor={getDrapeColorHex(color)} stopOpacity={0.18} />
            <stop offset="100%" stopColor={getDrapeColorHex(color)} stopOpacity={0} />
          </radialGradient>
        ))}
      </defs>

      {dragged && drag?.mode === "move"
        ? (() => {
            const wall = walls[dragged.wallIndex];
            if (!wall) return null;
            const origin = dragged.wallIndex === drag.originWall;
            return (
              <g pointerEvents="none" opacity={origin ? 0.6 : 1}>
                {selectionHalo().map((halo, index) => (
                  <line
                    key={`halo-${index}`}
                    x1={wall.start.x}
                    y1={wall.start.z}
                    x2={wall.end.x}
                    y2={wall.end.z}
                    {...halo}
                    strokeWidth={halo.strokeWidth + (origin ? 3 : 5)}
                  />
                ))}
                <line
                  x1={wall.start.x}
                  y1={wall.start.z}
                  x2={wall.end.x}
                  y2={wall.end.z}
                  stroke="var(--primary)"
                  strokeOpacity={origin ? 0.75 : 0.9}
                  strokeWidth={origin ? 3 : 5}
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            );
          })()
        : null}

      {entries.map((entry) => {
        const wall = walls[entry.wallIndex];
        if (!wall) return null;
        return (
          <WallItemView
            key={entry.id}
            entry={entry}
            wall={wall}
            inwardSign={inwardSign}
            selected={isSelected(entry.id)}
            ppi={ppi}
            floorFill={floorFill}
            uplightGradientId={
              entry.kind === "drape" && entry.item.uplightColor
                ? `${idPrefix}-uplight-${entry.item.uplightColor}`
                : undefined
            }
            onBeginDrag={onBeginDrag}
            onItemClick={onItemClick}
            onActivate={onActivate}
          />
        );
      })}

      {settings.showLabels
        ? entries.map((entry) => {
            const wall = walls[entry.wallIndex];
            if (!wall || drag?.id === entry.id) return null;
            return (
              <WallItemLabel
                key={`label-${entry.id}`}
                entry={entry}
                wall={wall}
                floor={floor}
                selected={isSelected(entry.id)}
                ppi={ppi}
                labelSize={labelSize}
              />
            );
          })
        : null}

      {entries.map((entry) => {
        if (entry.locked || !isSelected(entry.id)) return null;
        const wall = walls[entry.wallIndex];
        if (!wall) return null;
        const r = handleRadius * 0.78;
        const anchorY =
          entry.kind === "opening"
            ? -WALL / 2
            : entry.kind === "drape"
              ? DRAPE_PLAN_INSET
              : TREATMENT_PLAN_BASE;
        // Keep span handles clear of the room's corner handles on the wall band.
        const y = entry.kind === "opening" ? anchorY : Math.max(anchorY, r * 2.4);
        return (
          <g key={`handles-${entry.id}`} transform={frameFor(wall)}>
            {(["start", "end"] as const).map((edge) => {
              const x = edge === "start" ? entry.start : entry.end;
              return (
                <g
                  key={edge}
                  className={`${handleCursor(wall)} touch-none`}
                  aria-hidden
                  data-studio-tip={
                    entry.kind === "opening" ? "Drag to resize the opening" : "Drag to resize the span"
                  }
                  onPointerDown={(event) => beginDrag(event, entry, edge)}
                  onClick={(event) => event.stopPropagation()}
                >
                  <circle cx={x} cy={y} r={r * 1.7} fill="transparent" />
                  {y !== anchorY ? (
                    <line
                      x1={x}
                      y1={anchorY}
                      x2={x}
                      y2={y - r}
                      stroke="var(--primary)"
                      strokeWidth={1.25}
                      vectorEffect="non-scaling-stroke"
                    />
                  ) : null}
                  {entry.kind === "opening" ? (
                    <rect
                      x={x - r * 0.55}
                      y={y - r * 1.15}
                      width={r * 1.1}
                      height={r * 2.3}
                      rx={r * 0.45}
                      fill="var(--background)"
                      stroke="var(--primary)"
                      strokeWidth={2.25}
                      vectorEffect="non-scaling-stroke"
                    />
                  ) : (
                    <circle
                      cx={x}
                      cy={y}
                      r={r}
                      fill="var(--background)"
                      stroke="var(--primary)"
                      strokeWidth={2.5}
                      vectorEffect="non-scaling-stroke"
                    />
                  )}
                </g>
              );
            })}
          </g>
        );
      })}

      {dragged && drag
        ? (() => {
            const wall = walls[dragged.wallIndex];
            if (!wall) return null;
            const extent = itemExtent(dragged);
            const span = dragged.end - dragged.start;
            const lineY = extent.max + labelSize * 0.8;
            const before = dragged.start;
            const center = toWorld(
              wall,
              (dragged.start + dragged.end) / 2,
              extent.max + labelSize * 2.2
            );
            const gapBadge = (from: number, to: number, key: string) => {
              const gap = to - from;
              if (gap < 0.5 || gap * ppi < 46) return null;
              const at = toWorld(wall, (from + to) / 2, lineY);
              return (
                <PlanBadge
                  key={key}
                  x={at.x}
                  z={at.z}
                  text={inchesToFeetLabel(gap)}
                  fontSize={labelSize * 0.7}
                  tone="muted"
                />
              );
            };
            return (
              <g pointerEvents="none">
                <g transform={frameFor(wall)}>
                  {[
                    [0, dragged.start],
                    [dragged.end, wall.length],
                  ].map(([from, to]) =>
                    to - from > 0.5 ? (
                      <g key={`${from}-${to}`}>
                        <line
                          x1={from}
                          y1={lineY}
                          x2={to}
                          y2={lineY}
                          stroke="var(--primary)"
                          strokeOpacity={0.7}
                          strokeWidth={1}
                          strokeDasharray="4 3"
                          vectorEffect="non-scaling-stroke"
                        />
                        {[from, to].map((x) => (
                          <line
                            key={x}
                            x1={x}
                            y1={lineY - labelSize * 0.35}
                            x2={x}
                            y2={lineY + labelSize * 0.35}
                            stroke="var(--primary)"
                            strokeWidth={1}
                            vectorEffect="non-scaling-stroke"
                          />
                        ))}
                      </g>
                    ) : null
                  )}
                </g>
                {gapBadge(0, before, "before")}
                {gapBadge(dragged.end, wall.length, "after")}
                <PlanBadge
                  x={center.x}
                  z={center.z}
                  text={`${inchesToFeetLabel(span)} · wall ${dragged.wallIndex + 1}`}
                  detail={drag.snapping ? `snap ${inchesToFeetLabel(settings.snapIncrement)}` : "free"}
                  fontSize={labelSize * 0.82}
                />
              </g>
            );
          })()
        : null}
    </g>
  );
});
