"use client";

import {
  getDrapeColorHex,
  getStudioMaterials,
  type StudioDrapeRun,
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
import { useId, useMemo, useRef, useState } from "react";
import { useStudioEditor } from "../editor/studio-editor-context";
import type { StudioSelection } from "../studio-types";
import type { PlanLayerProps } from "./plan-types";
import { getFloorFill } from "./room-walls";
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
export function WallItemsLayer2D({
  design,
  toPlanPoint,
  pixelsPerInch,
  handleRadius,
  labelSize,
}: PlanLayerProps) {
  const { settings, select, isSelected, hoveredId, setHoveredId, preview } =
    useStudioEditor();
  const startDrag = usePlanPointerDrag(toPlanPoint);
  const idPrefix = `studio-wall-items-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const [drag, setDrag] = useState<ItemDrag | null>(null);
  const suppressClick = useRef<string | null>(null);

  const floor = design.room.floor;
  const walls = useMemo(() => getWallSegments(floor), [floor]);
  const inwardSign = getRoomWindingSign(floor);
  const ppi = Math.max(pixelsPerInch, 1e-6);
  const px = (value: number) => value / ppi;
  const floorFill = getFloorFill(getStudioMaterials(design).floor);
  const { drapes: showDrapes, treatments: showTreatments, openings: showOpenings } =
    settings.layers;

  const entries = useMemo(() => {
    const list: WallItemEntry[] = [];
    if (showOpenings) {
      for (const raw of design.openings) {
        if (raw.hidden || !walls[raw.wallIndex]) continue;
        const opening = clampOpeningToWall(raw, floor);
        list.push({
          kind: "opening",
          id: raw.id,
          label: raw.label,
          wallIndex: raw.wallIndex,
          start: opening.offset,
          end: opening.offset + opening.width,
          locked: Boolean(raw.locked),
          item: raw,
        });
      }
    }
    if (showDrapes) {
      for (const raw of design.drapeRuns) {
        if (raw.hidden || !walls[raw.wallIndex]) continue;
        const run = clampDrapeRunToWall(raw, floor);
        list.push({
          kind: "drape",
          id: raw.id,
          label: raw.label,
          wallIndex: raw.wallIndex,
          start: run.startOffset,
          end: run.endOffset,
          locked: Boolean(raw.locked),
          item: run,
        });
      }
    }
    if (showTreatments) {
      for (const raw of design.treatments ?? []) {
        if (raw.hidden || !walls[raw.anchor.wallIndex]) continue;
        const treatment = clampTreatmentToWall(raw, floor);
        list.push({
          kind: "treatment",
          id: raw.id,
          label: raw.label,
          wallIndex: raw.anchor.wallIndex,
          start: treatment.anchor.startOffset,
          end: treatment.anchor.endOffset,
          locked: Boolean(raw.locked),
          item: treatment,
        });
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

  const frameFor = (wall: StudioWallSegment) =>
    `translate(${wall.start.x} ${wall.start.z}) rotate(${(wall.angle * 180) / Math.PI}) scale(1 ${inwardSign})`;

  const toWorld = (wall: StudioWallSegment, along: number, inward: number) => {
    const normal = getWallInwardNormal(floor, wall.index);
    const ux = Math.cos(wall.angle);
    const uz = Math.sin(wall.angle);
    return {
      x: wall.start.x + ux * along + normal.x * inward,
      z: wall.start.z + uz * along + normal.z * inward,
    };
  };

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

  const dragged = drag ? entries.find((entry) => entry.id === drag.id) : undefined;

  return (
    <g className="studio-wall-items-layer">
      <defs>
        <filter
          id={`${idPrefix}-glow`}
          x="-20%"
          y="-60%"
          width="140%"
          height="220%"
        >
          <feGaussianBlur stdDeviation={3 / ppi} result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
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
            return (
              <line
                x1={wall.start.x}
                y1={wall.start.z}
                x2={wall.end.x}
                y2={wall.end.z}
                stroke="var(--primary)"
                strokeOpacity={dragged.wallIndex === drag.originWall ? 0.45 : 0.9}
                strokeWidth={dragged.wallIndex === drag.originWall ? 3 : 5}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                filter={`url(#${idPrefix}-glow)`}
                pointerEvents="none"
              />
            );
          })()
        : null}

      {entries.map((entry) => {
        const wall = walls[entry.wallIndex];
        if (!wall) return null;
        const selected = isSelected(entry.id);
        const hovered = hoveredId === entry.id;
        const extent = itemExtent(entry);
        const height = Math.max(extent.max - extent.min, px(16));
        const span = Math.max(1, entry.end - entry.start);
        const kindLabel =
          entry.kind === "drape"
            ? "Drape run"
            : entry.kind === "treatment"
              ? "Treatment"
              : entry.item.type === "window"
                ? "Window"
                : entry.item.type === "entrance"
                  ? "Entrance"
                  : "Door";
        return (
          <g
            key={entry.id}
            transform={frameFor(wall)}
            role="button"
            tabIndex={0}
            aria-pressed={selected}
            aria-label={`${kindLabel}: ${entry.label}, ${inchesToFeetLabel(span)} on wall ${entry.wallIndex + 1}${entry.locked ? ", locked" : ". Drag along the wall or toward another wall to move it"}`}
            className={`${entry.locked ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"} touch-none outline-none select-none focus-visible:[&_.studio-wall-item-focus]:opacity-100`}
            onPointerEnter={() => setHoveredId(entry.id)}
            onPointerLeave={() => {
              if (hoveredId === entry.id) setHoveredId(null);
            }}
            onPointerDown={(event) => beginDrag(event, entry, "move")}
            onClick={(event) => handleClick(event, entry)}
            onKeyDown={(event) =>
              activateOnKey(event, () =>
                select(
                  selectionFor(entry),
                  event.shiftKey ? { additive: true } : undefined
                )
              )
            }
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
              <DrapeSymbol
                run={entry.item}
                pixelsPerInch={ppi}
                uplightGradientId={
                  entry.item.uplightColor
                    ? `${idPrefix}-uplight-${entry.item.uplightColor}`
                    : undefined
                }
              />
            ) : (
              <g transform={`translate(${(entry.start + entry.end) / 2} 0)`}>
                <TreatmentGlyph treatment={entry.item} />
              </g>
            )}
            <rect
              x={entry.start}
              y={extent.min}
              width={span}
              height={height}
              fill="transparent"
            />
            {selected || hovered ? (
              <rect
                x={entry.start - 2}
                y={extent.min - 2}
                width={span + 4}
                height={height + 4}
                rx={3}
                fill={selected ? "color-mix(in oklch, var(--primary) 10%, transparent)" : "none"}
                stroke="var(--primary)"
                strokeOpacity={selected ? 1 : 0.55}
                strokeWidth={selected ? 1.75 : 1}
                strokeDasharray={selected ? "6 4" : undefined}
                vectorEffect="non-scaling-stroke"
                filter={selected ? `url(#${idPrefix}-glow)` : undefined}
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
      })}

      {settings.showLabels
        ? entries.map((entry) => {
            const wall = walls[entry.wallIndex];
            if (!wall) return null;
            const span = entry.end - entry.start;
            const focused = isSelected(entry.id) || hoveredId === entry.id;
            if (entry.kind === "opening" ? !focused : span * ppi < 90 && !focused) {
              return null;
            }
            if (drag?.id === entry.id) return null;
            const at = toWorld(
              wall,
              (entry.start + entry.end) / 2,
              itemExtent(entry).max + labelSize * 0.9
            );
            return (
              <text
                key={`label-${entry.id}`}
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
                  onPointerDown={(event) => beginDrag(event, entry, edge)}
                  onClick={(event) => event.stopPropagation()}
                >
                  <title>
                    {entry.kind === "opening" ? "Drag to resize the opening" : "Drag to resize the span"}
                  </title>
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
}
