"use client";

import { getStudioMaterials, type StudioPoint } from "@/data/studio";
import { inchesToFeetLabel } from "@/lib/studio-geometry";
import { snapStudioValue } from "@/lib/studio-interactions";
import {
  STUDIO_PLAN_WALL_THICKNESS,
  STUDIO_ROOM_MAX_POINTS,
  STUDIO_ROOM_MIN_POINTS,
  getWallOutwardNormal,
  insertRoomVertex,
  moveRoomCorner,
  moveRoomVertex,
  moveRoomVertexWithGuides,
  moveWall,
  projectPointToWall,
  removeRoomVertex,
  type StudioRoomGuide,
} from "@/lib/studio-room-editing";
import { useId, useMemo, useState } from "react";
import { useStudioEditor } from "../editor/studio-editor-context";
import type { PlanLayerProps } from "./plan-types";
import {
  CornerAngleMarkers,
  RoomDefs,
  RoomFloor,
  WallDimensions,
  WallPoche,
  computeRoomOutline,
  getDimensionPlacement,
  pointsAttr,
} from "./room-walls";
import { PlanBadge } from "./wall-plan-badge";
import {
  activateOnKey,
  arrowStep,
  shouldSnap,
  usePlanPointerDrag,
  type PlanDragModifiers,
} from "./wall-pointer-drag";

const WALL = STUDIO_PLAN_WALL_THICKNESS;

type RoomDrag = {
  kind: "vertex" | "corner" | "wall" | "insert";
  /** Walls whose live length badge is shown. */
  walls: number[];
  vertex?: number;
  wallIndex?: number;
  /** Push (+) / pull (−) distance for wall drags, inches. */
  distance?: number;
  guides: StudioRoomGuide[];
  snapping: boolean;
};

function wallCursor(outward: StudioPoint): string {
  const ax = Math.abs(outward.x);
  const az = Math.abs(outward.z);
  if (ax > 0.92) return "cursor-ew-resize";
  if (az > 0.92) return "cursor-ns-resize";
  return outward.x * outward.z > 0 ? "cursor-nwse-resize" : "cursor-nesw-resize";
}

function signedFeet(value: number): string {
  const rounded = Math.round(value);
  if (rounded === 0) return "0″";
  return `${rounded > 0 ? "+" : ""}${inchesToFeetLabel(rounded)}`;
}

/**
 * Room outline, architectural walls, wall hit-targets, CAD dimensions, angle
 * markers and room-shape handles: corner handles (template corners resize,
 * custom vertices move freely; Ctrl/⌘-drag bends a template), push/pull bars
 * on every wall, "+" handles / double-click to add corners, Alt-click or
 * right-click to remove a corner.
 */
export function RoomLayer2D({
  design,
  toPlanPoint,
  pixelsPerInch,
  handleRadius,
  labelSize,
}: PlanLayerProps) {
  const { selection, select, commit, preview, settings } = useStudioEditor();
  const startDrag = usePlanPointerDrag(toPlanPoint);
  const idPrefix = `studio-room-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const [hoveredWall, setHoveredWall] = useState<number | null>(null);
  const [hoveredHandle, setHoveredHandle] = useState<string | null>(null);
  const [drag, setDrag] = useState<RoomDrag | null>(null);

  const floor = design.room.floor;
  const n = floor.length;
  const custom = design.room.shape === "custom";
  const finish = getStudioMaterials(design).floor;
  const geometry = useMemo(() => computeRoomOutline(floor, WALL), [floor]);
  const ppi = Math.max(pixelsPerInch, 1e-6);
  const px = (value: number) => value / ppi;
  const selectedWall = selection?.kind === "wall" ? selection.index : null;
  const canRemove = n > STUDIO_ROOM_MIN_POINTS;
  const canInsert = n < STUDIO_ROOM_MAX_POINTS;
  const snapIncrement = settings.snapIncrement;
  const snapFor = (modifiers: Pick<PlanDragModifiers, "shiftKey" | "altKey">) =>
    shouldSnap(settings.snapEnabled, modifiers);
  const clearDrag = () => setDrag(null);

  function removeVertex(index: number) {
    const next = removeRoomVertex(design, index);
    if (next !== design) commit(next);
  }

  function beginVertexDrag(event: React.PointerEvent<SVGElement>, index: number) {
    if (event.button !== 0) return;
    if (event.altKey) {
      event.stopPropagation();
      event.preventDefault();
      if (canRemove) removeVertex(index);
      return;
    }
    const start = toPlanPoint(event);
    if (!start) return;
    event.preventDefault();
    const base = design;
    const origin = base.room.floor[index];
    const freeform = custom || event.ctrlKey || event.metaKey;
    const walls = [(index - 1 + n) % n, index];
    startDrag(
      event,
      {
        onMove(point, modifiers) {
          const snap = snapFor(modifiers);
          if (freeform) {
            const result = moveRoomVertexWithGuides(
              base,
              index,
              { x: origin.x + point.x - start.x, z: origin.z + point.z - start.z },
              { snap, snapIncrement, orthogonal: !modifiers.altKey }
            );
            if (!result.rejected) preview(result.design);
            setDrag({ kind: "vertex", vertex: index, walls, guides: result.guides, snapping: snap });
            return;
          }
          preview(
            moveRoomCorner(
              base,
              index,
              { x: point.x - start.x, z: point.z - start.z },
              { snap, snapIncrement }
            )
          );
          setDrag({ kind: "corner", vertex: index, walls, guides: [], snapping: snap });
        },
        onEnd: clearDrag,
        onCancel: clearDrag,
      },
      { threshold: 1 }
    );
  }

  function beginWallDrag(
    event: React.PointerEvent<SVGElement>,
    wallIndex: number,
    threshold: number
  ) {
    if (event.button !== 0) return;
    const start = toPlanPoint(event);
    if (!start) return;
    const base = design;
    const baseFloor = base.room.floor;
    const outward = getWallOutwardNormal(baseFloor, wallIndex);
    const walls = [(wallIndex - 1 + n) % n, wallIndex, (wallIndex + 1) % n];
    startDrag(
      event,
      {
        onMove(point, modifiers) {
          const snap = snapFor(modifiers);
          const raw =
            (point.x - start.x) * outward.x + (point.z - start.z) * outward.z;
          const requested = snap ? snapStudioValue(raw, { snapIncrement }) : raw;
          const next = moveWall(base, wallIndex, raw, { snap, snapIncrement });
          if (next !== base || requested === 0 || base.room.shape !== "custom") {
            preview(next);
          }
          const moved = next.room.floor[wallIndex];
          const distance = moved
            ? (moved.x - baseFloor[wallIndex].x) * outward.x +
              (moved.z - baseFloor[wallIndex].z) * outward.z
            : 0;
          setDrag({ kind: "wall", wallIndex, walls, distance, guides: [], snapping: snap });
        },
        onEnd: clearDrag,
        onCancel: clearDrag,
      },
      { threshold }
    );
  }

  function beginInsertDrag(event: React.PointerEvent<SVGElement>, wallIndex: number) {
    if (event.button !== 0) return;
    const start = toPlanPoint(event);
    if (!start) return;
    event.preventDefault();
    const base = design;
    const inserted = insertRoomVertex(base, wallIndex);
    if (inserted === base) {
      event.stopPropagation();
      return;
    }
    const vertex = wallIndex + 1;
    const origin = inserted.room.floor[vertex];
    const walls = [wallIndex, vertex % (n + 1)];
    startDrag(
      event,
      {
        onMove(point, modifiers) {
          const snap = snapFor(modifiers);
          const result = moveRoomVertexWithGuides(
            inserted,
            vertex,
            { x: origin.x + point.x - start.x, z: origin.z + point.z - start.z },
            { snap, snapIncrement, orthogonal: !modifiers.altKey }
          );
          if (!result.rejected) preview(result.design);
          setDrag({ kind: "insert", vertex, walls, guides: result.guides, snapping: snap });
        },
        onEnd(moved) {
          setDrag(null);
          if (!moved) commit(inserted);
        },
        onCancel: clearDrag,
      },
      { threshold: 2 }
    );
  }

  function insertAtPointer(event: React.MouseEvent<SVGElement>, wallIndex: number) {
    event.stopPropagation();
    event.preventDefault();
    const point = toPlanPoint(event);
    const wall = geometry.walls[wallIndex];
    if (!point || !wall || wall.length <= 0) return;
    let offset = projectPointToWall(wall, point).offset;
    if (settings.snapEnabled && !event.shiftKey) {
      offset = snapStudioValue(offset, { snapIncrement });
    }
    const t = offset / wall.length;
    const next = insertRoomVertex(design, wallIndex, {
      x: wall.start.x + (wall.end.x - wall.start.x) * t,
      z: wall.start.z + (wall.end.z - wall.start.z) * t,
    });
    if (next !== design) commit(next);
  }

  function handleVertexKey(event: React.KeyboardEvent<SVGElement>, index: number) {
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      event.stopPropagation();
      if (canRemove) removeVertex(index);
      return;
    }
    const step = arrowStep(event, settings.snapEnabled, snapIncrement);
    if (!step) return;
    event.preventDefault();
    event.stopPropagation();
    const next = custom
      ? moveRoomVertex(
          design,
          index,
          { x: floor[index].x + step.dx, z: floor[index].z + step.dz },
          { orthogonal: false }
        )
      : moveRoomCorner(design, index, { x: step.dx, z: step.dz });
    if (next !== design) commit(next, { coalesceKey: `room-vertex-${index}` });
  }

  function handleWallKey(event: React.KeyboardEvent<SVGElement>, wallIndex: number) {
    if (event.key === "Enter" || event.key === " ") {
      activateOnKey(event, () => select({ kind: "wall", index: wallIndex }));
      return;
    }
    if ((event.key === "+" || event.key === "Insert") && canInsert) {
      event.preventDefault();
      event.stopPropagation();
      const next = insertRoomVertex(design, wallIndex);
      if (next !== design) commit(next);
      return;
    }
    const step = arrowStep(event, settings.snapEnabled, snapIncrement);
    if (!step) return;
    const outward = getWallOutwardNormal(floor, wallIndex);
    const length = Math.hypot(step.dx, step.dz);
    const dot = (step.dx * outward.x + step.dz * outward.z) / length;
    if (Math.abs(dot) < 0.5) return;
    event.preventDefault();
    event.stopPropagation();
    const next = moveWall(design, wallIndex, Math.sign(dot) * length);
    if (next !== design) commit(next, { coalesceKey: `room-wall-${wallIndex}` });
  }

  const badgeWalls = new Set(drag?.walls ?? []);
  const highlightWall =
    drag?.kind === "wall" ? (drag.wallIndex ?? null) : (hoveredWall ?? selectedWall);
  const snapDetail = drag
    ? drag.snapping
      ? `snap ${inchesToFeetLabel(snapIncrement)}`
      : "free"
    : undefined;

  return (
    <g className="studio-room-layer">
      <RoomDefs idPrefix={idPrefix} finish={finish} pixelsPerInch={ppi} />
      <RoomFloor floor={floor} finish={finish} idPrefix={idPrefix} />
      <WallPoche floor={floor} geometry={geometry} idPrefix={idPrefix} />

      {geometry.walls.map((wall) => {
        const inward = geometry.inward[wall.index];
        const band = geometry.bands[wall.index];
        if (!inward || !band) return null;
        const outward = { x: -inward.x, z: -inward.z };
        const selected = selectedWall === wall.index;
        const hovered = hoveredWall === wall.index;
        const centerStart = {
          x: wall.start.x + (outward.x * WALL) / 2,
          z: wall.start.z + (outward.z * WALL) / 2,
        };
        const centerEnd = {
          x: wall.end.x + (outward.x * WALL) / 2,
          z: wall.end.z + (outward.z * WALL) / 2,
        };
        return (
          <g
            key={wall.index}
            role="button"
            tabIndex={0}
            aria-pressed={selected}
            aria-label={`Wall ${wall.index + 1}, ${inchesToFeetLabel(wall.length)}. Drag or use arrow keys to push or pull; double-click or press plus to add a corner.`}
            className={`${wallCursor(outward)} touch-none outline-none select-none focus-visible:[&_.studio-room-focus]:opacity-100`}
            onPointerEnter={() => setHoveredWall(wall.index)}
            onPointerLeave={() =>
              setHoveredWall((current) => (current === wall.index ? null : current))
            }
            onPointerDown={(event) => beginWallDrag(event, wall.index, 4)}
            onClick={(event) => {
              event.stopPropagation();
              select({ kind: "wall", index: wall.index });
            }}
            onDoubleClick={(event) => insertAtPointer(event, wall.index)}
            onKeyDown={(event) => handleWallKey(event, wall.index)}
          >
            <polygon
              points={pointsAttr(band)}
              fill={
                selected
                  ? "color-mix(in oklch, var(--primary) 55%, transparent)"
                  : hovered
                    ? "color-mix(in oklch, var(--primary) 28%, transparent)"
                    : "transparent"
              }
            />
            <line
              x1={centerStart.x}
              y1={centerStart.z}
              x2={centerEnd.x}
              y2={centerEnd.z}
              stroke="transparent"
              strokeWidth={Math.max(16, WALL * ppi + 10)}
              vectorEffect="non-scaling-stroke"
            />
            {selected || hovered ? (
              <line
                x1={wall.start.x}
                y1={wall.start.z}
                x2={wall.end.x}
                y2={wall.end.z}
                stroke="var(--primary)"
                strokeWidth={selected ? 3 : 2}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                filter={selected ? `url(#${idPrefix}-glow)` : undefined}
                pointerEvents="none"
              />
            ) : null}
            <polygon
              className="studio-room-focus pointer-events-none opacity-0"
              points={pointsAttr(band)}
              fill="none"
              stroke="var(--ring)"
              strokeWidth={3}
              vectorEffect="non-scaling-stroke"
            />
          </g>
        );
      })}

      {settings.showDimensions ? (
        <>
          <WallDimensions
            geometry={geometry}
            thickness={WALL}
            labelSize={labelSize}
            hiddenWalls={badgeWalls}
            highlightWall={highlightWall}
          />
          <CornerAngleMarkers floor={floor} angles={geometry.angles} labelSize={labelSize} />
        </>
      ) : null}

      {drag?.guides.map((guide, index) => {
        const dx = guide.to.x - guide.from.x;
        const dz = guide.to.z - guide.from.z;
        const length = Math.hypot(dx, dz) || 1;
        const extend = px(28);
        return (
          <g key={index} pointerEvents="none">
            <line
              x1={guide.from.x - (dx / length) * extend}
              y1={guide.from.z - (dz / length) * extend}
              x2={guide.to.x + (dx / length) * extend}
              y2={guide.to.z + (dz / length) * extend}
              stroke="var(--primary)"
              strokeWidth={1}
              strokeDasharray="5 4"
              vectorEffect="non-scaling-stroke"
            />
            <circle cx={guide.from.x} cy={guide.from.z} r={px(3)} fill="var(--primary)" />
          </g>
        );
      })}

      {geometry.walls.map((wall) => {
        const inward = geometry.inward[wall.index];
        if (!inward || wall.length * ppi < 36) return null;
        const outward = { x: -inward.x, z: -inward.z };
        const active =
          hoveredWall === wall.index ||
          selectedWall === wall.index ||
          hoveredHandle === `bar-${wall.index}` ||
          drag?.wallIndex === wall.index;
        const barLength = Math.min(wall.length * 0.36, px(46));
        const barThickness = px(9);
        const mid = {
          x: wall.center.x + (outward.x * WALL) / 2,
          z: wall.center.z + (outward.z * WALL) / 2,
        };
        const rotation = (wall.angle * 180) / Math.PI;
        return (
          <g
            key={`bar-${wall.index}`}
            transform={`translate(${mid.x} ${mid.z}) rotate(${rotation})`}
            className={`${wallCursor(outward)} touch-none`}
            opacity={active ? 1 : 0.62}
            aria-hidden
            onPointerEnter={() => setHoveredHandle(`bar-${wall.index}`)}
            onPointerLeave={() =>
              setHoveredHandle((current) => (current === `bar-${wall.index}` ? null : current))
            }
            onPointerDown={(event) => {
              event.preventDefault();
              beginWallDrag(event, wall.index, 1);
            }}
            onClick={(event) => {
              event.stopPropagation();
              select({ kind: "wall", index: wall.index });
            }}
          >
            <title>Drag to push or pull this wall</title>
            <rect
              x={-barLength / 2 - px(6)}
              y={-barThickness / 2 - px(6)}
              width={barLength + px(12)}
              height={barThickness + px(12)}
              fill="transparent"
            />
            <rect
              x={-barLength / 2}
              y={-barThickness / 2}
              width={barLength}
              height={barThickness}
              rx={barThickness / 2}
              fill={active ? "var(--primary)" : "var(--background)"}
              stroke="var(--primary)"
              strokeWidth={1.75}
              vectorEffect="non-scaling-stroke"
            />
            {[-px(3), 0, px(3)].map((offset) => (
              <line
                key={offset}
                x1={offset}
                y1={-barThickness * 0.26}
                x2={offset}
                y2={barThickness * 0.26}
                stroke={active ? "var(--primary-foreground)" : "var(--primary)"}
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </g>
        );
      })}

      {canInsert
        ? geometry.walls.map((wall) => {
            const inward = geometry.inward[wall.index];
            if (!inward || wall.length * ppi < 64) return null;
            if (!custom && selectedWall !== wall.index) return null;
            const key = `plus-${wall.index}`;
            const active =
              hoveredHandle === key ||
              hoveredWall === wall.index ||
              selectedWall === wall.index;
            const position = {
              x: wall.center.x + inward.x * px(26),
              z: wall.center.z + inward.z * px(26),
            };
            const r = handleRadius * 0.72;
            return (
              <g
                key={key}
                transform={`translate(${position.x} ${position.z})`}
                className="cursor-copy touch-none"
                opacity={active ? 1 : 0.5}
                aria-hidden
                onPointerEnter={() => setHoveredHandle(key)}
                onPointerLeave={() =>
                  setHoveredHandle((current) => (current === key ? null : current))
                }
                onPointerDown={(event) => beginInsertDrag(event, wall.index)}
                onClick={(event) => event.stopPropagation()}
              >
                <title>
                  {custom
                    ? "Add a corner (drag to shape)"
                    : "Add a corner — converts this room to a custom outline"}
                </title>
                <circle
                  r={r}
                  fill="color-mix(in oklch, var(--background) 88%, transparent)"
                  stroke="var(--primary)"
                  strokeWidth={1.5}
                  strokeDasharray={active ? undefined : "3 2"}
                  vectorEffect="non-scaling-stroke"
                />
                <path
                  d={`M${-r * 0.5} 0H${r * 0.5}M0 ${-r * 0.5}V${r * 0.5}`}
                  stroke="var(--primary)"
                  strokeWidth={1.75}
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            );
          })
        : null}

      {floor.map((vertex, index) => {
        const outer = geometry.outer[index] ?? vertex;
        const cx = (vertex.x + outer.x) / 2;
        const cz = (vertex.z + outer.z) / 2;
        const key = `v-${index}`;
        const active = hoveredHandle === key || drag?.vertex === index;
        const r = handleRadius * (active ? 1.12 : 0.92);
        const label = custom
          ? `Corner ${index + 1}. Drag or use arrow keys to move${canRemove ? "; Alt-click, right-click or Delete removes it" : ""}.`
          : `Corner ${index + 1}. Drag to resize the room; Ctrl or Command drag to bend it freely.`;
        return (
          <g
            key={key}
            role="button"
            tabIndex={0}
            aria-label={label}
            className="cursor-move touch-none outline-none focus-visible:[&_.studio-room-handle]:stroke-[var(--ring)]"
            onPointerEnter={() => setHoveredHandle(key)}
            onPointerLeave={() =>
              setHoveredHandle((current) => (current === key ? null : current))
            }
            onPointerDown={(event) => beginVertexDrag(event, index)}
            onClick={(event) => event.stopPropagation()}
            onContextMenu={(event) => {
              event.preventDefault();
              event.stopPropagation();
              if (canRemove) removeVertex(index);
            }}
            onKeyDown={(event) => handleVertexKey(event, index)}
          >
            <title>{label}</title>
            <circle cx={cx} cy={cz} r={r * 1.6} fill="transparent" />
            {custom ? (
              <>
                <circle
                  className="studio-room-handle"
                  cx={cx}
                  cy={cz}
                  r={r}
                  fill="var(--background)"
                  stroke="var(--primary)"
                  strokeWidth={active ? 3 : 2.25}
                  vectorEffect="non-scaling-stroke"
                />
                <circle cx={cx} cy={cz} r={r * 0.38} fill="var(--primary)" />
              </>
            ) : (
              <rect
                className="studio-room-handle"
                x={cx - r}
                y={cz - r}
                width={r * 2}
                height={r * 2}
                rx={r * 0.45}
                fill={active ? "var(--primary)" : "var(--background)"}
                stroke="var(--primary)"
                strokeWidth={active ? 3 : 2.25}
                vectorEffect="non-scaling-stroke"
              />
            )}
          </g>
        );
      })}

      {drag
        ? [...badgeWalls].map((wallIndex, order) => {
            const wall = geometry.walls[wallIndex];
            const inward = geometry.inward[wallIndex];
            if (!wall || !inward) return null;
            const place = getDimensionPlacement(wall, inward, WALL, labelSize);
            const primary = drag.kind !== "wall" && order === 0;
            return (
              <PlanBadge
                key={`badge-${wallIndex}`}
                x={place.label.x}
                z={place.label.z}
                text={inchesToFeetLabel(wall.length)}
                detail={primary ? snapDetail : undefined}
                fontSize={labelSize * 0.92}
              />
            );
          })
        : null}

      {drag?.kind === "wall" && drag.wallIndex !== undefined
        ? (() => {
            const wall = geometry.walls[drag.wallIndex];
            const inward = geometry.inward[drag.wallIndex];
            if (!wall || !inward) return null;
            const at = {
              x: wall.center.x + inward.x * labelSize * 2.6,
              z: wall.center.z + inward.z * labelSize * 2.6,
            };
            return (
              <g>
                <line
                  x1={wall.center.x}
                  y1={wall.center.z}
                  x2={at.x}
                  y2={at.z}
                  stroke="var(--primary)"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  vectorEffect="non-scaling-stroke"
                  pointerEvents="none"
                />
                <PlanBadge
                  x={at.x}
                  z={at.z}
                  text={`${(drag.distance ?? 0) >= 0 ? "Push" : "Pull"} ${signedFeet(drag.distance ?? 0)}`}
                  detail={snapDetail}
                  fontSize={labelSize * 0.88}
                />
              </g>
            );
          })()
        : null}

      {drag && (drag.kind === "vertex" || drag.kind === "insert") && drag.vertex !== undefined
        ? (() => {
            const vertex = floor[drag.vertex];
            const angle = geometry.angles[drag.vertex];
            if (!vertex || !Number.isFinite(angle)) return null;
            return (
              <PlanBadge
                x={vertex.x}
                z={vertex.z - handleRadius * 3.2}
                text={`${Math.round(angle * 10) / 10}°`}
                fontSize={labelSize * 0.8}
                tone="muted"
              />
            );
          })()
        : null}
    </g>
  );
}
