import {
  createStudioItemId,
  type StudioDesignJson,
  type StudioDrapeRun,
  type StudioOpening,
  type StudioPoint,
  type StudioRoom,
  type StudioTreatment,
} from "@/data/studio";
import {
  clampDrapeRunToWall,
  clampOpeningToWall,
  clampTreatmentToWall,
  getWallSegments,
  updateTemplateRoomDimensions,
  type StudioWallSegment,
} from "@/lib/studio-geometry";
import {
  STUDIO_MAX_COORDINATE,
  resizeRectangleRoom,
  snapStudioValue,
  type StudioRoomResizeHandle,
} from "@/lib/studio-interactions";

/**
 * Pure room-outline editing for the Studio plan: vertex/wall edits that keep
 * the polygon simple and keep every wall-anchored item (drapes, treatments,
 * openings) attached to the right wall with sensible offsets.
 *
 * Every operation returns the original `design` object (same reference) when
 * the edit is rejected or is a no-op, so callers can detect rejection with
 * `result === design`.
 */

/** Drawn wall thickness on the plan, inches (outward from the floor edge). */
export const STUDIO_PLAN_WALL_THICKNESS = 6;
export const STUDIO_ROOM_MIN_POINTS = 4;
export const STUDIO_ROOM_MAX_POINTS = 64;
/** Shortest wall any edit may produce, inches. */
export const STUDIO_MIN_WALL_LENGTH = 3;
/** Shortest span a remapped drape/treatment keeps when its wall shrinks. */
const MIN_ITEM_SPAN = 12;
const EDGE_STICKY_TOLERANCE = 0.75;

export type StudioRoomSnapOptions = {
  /** Snap to the grid increment. */
  snap?: boolean;
  snapIncrement?: number;
};

export type StudioVertexMoveOptions = StudioRoomSnapOptions & {
  /** Align with neighbouring vertices' x/z and snap to 0/45/90° (default true). */
  orthogonal?: boolean;
  /** Axis-alignment capture distance, inches (default 6). */
  tolerance?: number;
  /** Angle capture, degrees (default 3). */
  angleTolerance?: number;
};

export type StudioRoomGuide = {
  from: StudioPoint;
  to: StudioPoint;
  kind: "axis" | "angle";
};

export type StudioWallItemKind = "drape" | "treatment" | "opening";

export type StudioWallItemSpan = {
  wallIndex: number;
  start: number;
  end: number;
};

export type StudioWallItemInfo = StudioWallItemSpan & {
  kind: StudioWallItemKind;
  id: string;
  locked: boolean;
};

export type StudioWallProjection = {
  wallIndex: number;
  /** Offset along the wall clamped to [0, length]. */
  offset: number;
  /** Unclamped offset along the infinite wall line. */
  rawOffset: number;
  /** Distance from the point to the wall segment. */
  distance: number;
};

/* ------------------------------------------------------------------------ */
/* Basic geometry                                                            */
/* ------------------------------------------------------------------------ */

function samePoint(a: StudioPoint, b: StudioPoint, tolerance = 1e-6): boolean {
  return Math.abs(a.x - b.x) <= tolerance && Math.abs(a.z - b.z) <= tolerance;
}

function distance(a: StudioPoint, b: StudioPoint): number {
  return Math.hypot(b.x - a.x, b.z - a.z);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function clampCoordinate(value: number): number {
  return Number.isFinite(value)
    ? clamp(value, -STUDIO_MAX_COORDINATE, STUDIO_MAX_COORDINATE)
    : 0;
}

function orient(a: StudioPoint, b: StudioPoint, c: StudioPoint): number {
  return (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
}

function distanceToSegment(
  point: StudioPoint,
  start: StudioPoint,
  end: StudioPoint
): number {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const lengthSquared = dx * dx + dz * dz;
  if (lengthSquared <= 1e-12) return distance(point, start);
  const t = clamp(
    ((point.x - start.x) * dx + (point.z - start.z) * dz) / lengthSquared,
    0,
    1
  );
  return Math.hypot(point.x - (start.x + dx * t), point.z - (start.z + dz * t));
}

function segmentsTouch(
  a: StudioPoint,
  b: StudioPoint,
  c: StudioPoint,
  d: StudioPoint,
  tolerance: number
): boolean {
  const o1 = orient(a, b, c);
  const o2 = orient(a, b, d);
  const o3 = orient(c, d, a);
  const o4 = orient(c, d, b);
  if (
    ((o1 > 0 && o2 < 0) || (o1 < 0 && o2 > 0)) &&
    ((o3 > 0 && o4 < 0) || (o3 < 0 && o4 > 0))
  ) {
    return true;
  }
  return (
    distanceToSegment(c, a, b) <= tolerance ||
    distanceToSegment(d, a, b) <= tolerance ||
    distanceToSegment(a, c, d) <= tolerance ||
    distanceToSegment(b, c, d) <= tolerance
  );
}

/** Edges sharing `shared` fold back onto each other (zero-angle spike). */
function edgesFoldBack(
  outerA: StudioPoint,
  shared: StudioPoint,
  outerB: StudioPoint
): boolean {
  const ux = outerA.x - shared.x;
  const uz = outerA.z - shared.z;
  const vx = outerB.x - shared.x;
  const vz = outerB.z - shared.z;
  const lengths = Math.hypot(ux, uz) * Math.hypot(vx, vz);
  if (lengths <= 1e-12) return true;
  const sine = (ux * vz - uz * vx) / lengths;
  const dot = ux * vx + uz * vz;
  return Math.abs(sine) <= 1e-6 && dot > 0;
}

/** Shoelace area; positive when the outline runs clockwise on screen (z down). */
export function getRoomSignedArea(floor: readonly StudioPoint[]): number {
  let doubled = 0;
  for (let index = 0; index < floor.length; index += 1) {
    const current = floor[index];
    const next = floor[(index + 1) % floor.length];
    doubled += current.x * next.z - next.x * current.z;
  }
  return doubled / 2;
}

export function getRoomWindingSign(floor: readonly StudioPoint[]): 1 | -1 {
  return getRoomSignedArea(floor) >= 0 ? 1 : -1;
}

/** Unit normal of a wall pointing into the room. */
export function getWallInwardNormal(
  floor: readonly StudioPoint[],
  wallIndex: number
): StudioPoint {
  const n = floor.length;
  const start = floor[wallIndex];
  const end = floor[(wallIndex + 1) % n];
  if (!start || !end) return { x: 0, z: 1 };
  const length = distance(start, end);
  if (length <= 1e-9) return { x: 0, z: 1 };
  const sign = getRoomWindingSign(floor);
  return {
    x: (-(end.z - start.z) / length) * sign,
    z: ((end.x - start.x) / length) * sign,
  };
}

export function getWallOutwardNormal(
  floor: readonly StudioPoint[],
  wallIndex: number
): StudioPoint {
  const inward = getWallInwardNormal(floor, wallIndex);
  return { x: -inward.x, z: -inward.z };
}

/**
 * Interior angle at each vertex in degrees (90 = square corner, 270 = reflex
 * corner, 180 = straight/collinear point).
 */
export function getRoomInteriorAngles(floor: readonly StudioPoint[]): number[] {
  const n = floor.length;
  const sign = getRoomWindingSign(floor);
  return floor.map((vertex, index) => {
    const prev = floor[(index - 1 + n) % n];
    const next = floor[(index + 1) % n];
    const e1x = vertex.x - prev.x;
    const e1z = vertex.z - prev.z;
    const e2x = next.x - vertex.x;
    const e2z = next.z - vertex.z;
    const cross = e1x * e2z - e1z * e2x;
    const dot = e1x * e2x + e1z * e2z;
    const turn = Math.atan2(sign * cross, dot);
    return ((Math.PI - turn) * 180) / Math.PI;
  });
}

/**
 * True when the outline is a valid simple polygon for the Studio: finite,
 * in range, no walls shorter than STUDIO_MIN_WALL_LENGTH, measurable area,
 * no crossings, touches or fold-backs.
 */
export function isSimpleRoomPolygon(points: readonly StudioPoint[]): boolean {
  const n = points.length;
  if (n < 3) return false;
  for (const point of points) {
    if (
      !Number.isFinite(point.x) ||
      !Number.isFinite(point.z) ||
      Math.abs(point.x) > STUDIO_MAX_COORDINATE ||
      Math.abs(point.z) > STUDIO_MAX_COORDINATE
    ) {
      return false;
    }
  }
  for (let index = 0; index < n; index += 1) {
    if (distance(points[index], points[(index + 1) % n]) < STUDIO_MIN_WALL_LENGTH) {
      return false;
    }
  }
  if (Math.abs(getRoomSignedArea(points)) < 144) return false;

  const tolerance = 0.01;
  for (let i = 0; i < n; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % n];
    for (let j = i + 1; j < n; j += 1) {
      const c = points[j];
      const d = points[(j + 1) % n];
      if (j === i + 1) {
        if (edgesFoldBack(a, b, d)) return false;
      } else if (i === 0 && j === n - 1) {
        if (edgesFoldBack(c, a, b)) return false;
      } else if (segmentsTouch(a, b, c, d, tolerance)) {
        return false;
      }
    }
  }
  return true;
}

/** Projects a point onto one wall segment. */
export function projectPointToWall(
  wall: Pick<StudioWallSegment, "index" | "start" | "end" | "length">,
  point: StudioPoint
): StudioWallProjection {
  if (wall.length <= 1e-9) {
    return {
      wallIndex: wall.index,
      offset: 0,
      rawOffset: 0,
      distance: distance(point, wall.start),
    };
  }
  const ux = (wall.end.x - wall.start.x) / wall.length;
  const uz = (wall.end.z - wall.start.z) / wall.length;
  const rawOffset = (point.x - wall.start.x) * ux + (point.z - wall.start.z) * uz;
  const offset = clamp(rawOffset, 0, wall.length);
  return {
    wallIndex: wall.index,
    offset,
    rawOffset,
    distance: Math.hypot(
      point.x - (wall.start.x + ux * offset),
      point.z - (wall.start.z + uz * offset)
    ),
  };
}

/** Nearest wall to a point (null for an empty outline). */
export function findNearestWall(
  floor: readonly StudioPoint[],
  point: StudioPoint
): StudioWallProjection | null {
  let best: StudioWallProjection | null = null;
  for (const wall of getWallSegments([...floor])) {
    const projection = projectPointToWall(wall, point);
    if (!best || projection.distance < best.distance) best = projection;
  }
  return best;
}

/* ------------------------------------------------------------------------ */
/* Wall-anchored item remapping                                              */
/* ------------------------------------------------------------------------ */

type WallItemMapper = (
  span: StudioWallItemSpan,
  kind: StudioWallItemKind
) => StudioWallItemSpan | StudioWallItemSpan[] | null;

/** Keeps `span` inside [0, length], preserving a sensible minimum span. */
function fitSpan(
  start: number,
  end: number,
  length: number,
  originalSpan: number
): { start: number; end: number } {
  const minimum = Math.min(MIN_ITEM_SPAN, Math.max(1, originalSpan));
  const span = Math.min(Math.max(end - start, minimum), Math.max(1, length));
  const nextStart = clamp(start, 0, Math.max(0, length - span));
  return { start: nextStart, end: nextStart + span };
}

/** Clamps every wall item to its wall; drops items on missing/tiny walls. */
export function reclampWallItems(design: StudioDesignJson): StudioDesignJson {
  const floor = design.room.floor;
  const walls = getWallSegments(floor);
  const fits = (wallIndex: number) =>
    Number.isInteger(wallIndex) &&
    wallIndex >= 0 &&
    wallIndex < walls.length &&
    walls[wallIndex].length >= 2;
  return {
    ...design,
    drapeRuns: design.drapeRuns
      .filter((run) => fits(run.wallIndex))
      .map((run) => clampDrapeRunToWall(run, floor)),
    treatments: (design.treatments ?? [])
      .filter((treatment) => fits(treatment.anchor.wallIndex))
      .map((treatment) => clampTreatmentToWall(treatment, floor)),
    openings: design.openings
      .filter((opening) => fits(opening.wallIndex))
      .map((opening) => clampOpeningToWall(opening, floor)),
  };
}

function mapWallItems(
  design: StudioDesignJson,
  mapper: WallItemMapper
): StudioDesignJson {
  const toList = (
    value: StudioWallItemSpan | StudioWallItemSpan[] | null
  ): StudioWallItemSpan[] =>
    value === null ? [] : Array.isArray(value) ? value : [value];

  const drapeRuns: StudioDrapeRun[] = design.drapeRuns.flatMap((run) =>
    toList(
      mapper(
        { wallIndex: run.wallIndex, start: run.startOffset, end: run.endOffset },
        "drape"
      )
    ).map((span, index) => ({
      ...run,
      ...(index > 0
        ? { id: createStudioItemId("drape"), label: `${run.label} (${index + 1})` }
        : {}),
      wallIndex: span.wallIndex,
      startOffset: span.start,
      endOffset: span.end,
    }))
  );
  const treatments: StudioTreatment[] = (design.treatments ?? []).flatMap(
    (treatment) => {
      const [span] = toList(
        mapper(
          {
            wallIndex: treatment.anchor.wallIndex,
            start: treatment.anchor.startOffset,
            end: treatment.anchor.endOffset,
          },
          "treatment"
        )
      );
      if (!span) return [];
      return [
        {
          ...treatment,
          anchor: {
            ...treatment.anchor,
            wallIndex: span.wallIndex,
            startOffset: span.start,
            endOffset: span.end,
          },
        },
      ];
    }
  );
  const openings: StudioOpening[] = design.openings.flatMap((opening) => {
    const [span] = toList(
      mapper(
        {
          wallIndex: opening.wallIndex,
          start: opening.offset,
          end: opening.offset + opening.width,
        },
        "opening"
      )
    );
    if (!span) return [];
    return [
      {
        ...opening,
        wallIndex: span.wallIndex,
        offset: span.start,
        width: Math.max(1, span.end - span.start),
      },
    ];
  });
  return reclampWallItems({ ...design, drapeRuns, treatments, openings });
}

type OffsetRule = "start" | "end" | "scale";

function remapSpanOnWall(
  span: StudioWallItemSpan,
  oldLength: number,
  newLength: number,
  rule: OffsetRule,
  rigid: boolean
): StudioWallItemSpan {
  const map = (offset: number) =>
    rule === "start"
      ? offset
      : rule === "end"
        ? offset + (newLength - oldLength)
        : oldLength > 1e-9
          ? (offset * newLength) / oldLength
          : offset;
  const width = span.end - span.start;
  if (rigid) {
    const center = map((span.start + span.end) / 2);
    const fitted = fitSpan(center - width / 2, center + width / 2, newLength, width);
    return { wallIndex: span.wallIndex, ...fitted };
  }
  const start = span.start <= EDGE_STICKY_TOLERANCE ? 0 : map(span.start);
  const end =
    span.end >= oldLength - EDGE_STICKY_TOLERANCE ? newLength : map(span.end);
  return { wallIndex: span.wallIndex, ...fitSpan(start, end, newLength, width) };
}

/**
 * Replaces the room (same vertex count) and re-bases wall items: on a wall
 * whose start stayed put items keep their offsets; on a wall whose end stayed
 * put items keep their distance from the end; otherwise offsets scale. Item
 * edges touching a wall end stay attached to it (full-wall drapes stretch).
 * Different vertex counts just re-clamp.
 */
export function applyRoomOutline(
  design: StudioDesignJson,
  room: StudioRoom
): StudioDesignJson {
  const oldFloor = design.room.floor;
  const newFloor = room.floor;
  const next: StudioDesignJson = { ...design, room };
  if (oldFloor.length !== newFloor.length) return reclampWallItems(next);
  const oldWalls = getWallSegments(oldFloor);
  const newWalls = getWallSegments(newFloor);
  return mapWallItems(next, (span, kind) => {
    const oldWall = oldWalls[span.wallIndex];
    const newWall = newWalls[span.wallIndex];
    if (!oldWall || !newWall) return null;
    const startFixed = samePoint(oldWall.start, newWall.start);
    const endFixed = samePoint(oldWall.end, newWall.end);
    if (startFixed && endFixed) return span;
    const rule: OffsetRule = startFixed ? "start" : endFixed ? "end" : "scale";
    return remapSpanOnWall(
      span,
      oldWall.length,
      newWall.length,
      rule,
      kind === "opening"
    );
  });
}

/* ------------------------------------------------------------------------ */
/* Shape conversion                                                          */
/* ------------------------------------------------------------------------ */

/** Turns a template room into a free outline, keeping the exact floor. */
export function convertRoomToCustom(design: StudioDesignJson): StudioDesignJson {
  if (
    design.room.shape === "custom" &&
    design.room.templateDimensions === undefined
  ) {
    return design;
  }
  const room: StudioRoom = {
    ...design.room,
    shape: "custom",
    floor: design.room.floor.map((point) => ({ x: point.x, z: point.z })),
  };
  delete room.templateDimensions;
  return { ...design, room };
}

function withCustomFloor(
  design: StudioDesignJson,
  floor: StudioPoint[]
): StudioDesignJson | null {
  if (
    floor.length < STUDIO_ROOM_MIN_POINTS ||
    floor.length > STUDIO_ROOM_MAX_POINTS ||
    !isSimpleRoomPolygon(floor)
  ) {
    return null;
  }
  const base = convertRoomToCustom(design);
  return { ...base, room: { ...base.room, floor } };
}

/* ------------------------------------------------------------------------ */
/* Vertex editing                                                            */
/* ------------------------------------------------------------------------ */

/**
 * Applies grid, neighbour-axis and 0/45/90° snapping to a dragged vertex.
 * Pure helper; also returns guide lines for the UI.
 */
export function resolveRoomVertexPoint(
  floor: readonly StudioPoint[],
  index: number,
  point: StudioPoint,
  options: StudioVertexMoveOptions = {}
): { point: StudioPoint; guides: StudioRoomGuide[] } {
  const n = floor.length;
  const raw = { x: clampCoordinate(point.x), z: clampCoordinate(point.z) };
  let next = options.snap
    ? {
        x: snapStudioValue(raw.x, { snapIncrement: options.snapIncrement }),
        z: snapStudioValue(raw.z, { snapIncrement: options.snapIncrement }),
      }
    : { ...raw };
  const guides: StudioRoomGuide[] = [];
  if (options.orthogonal === false || n < 3) return { point: next, guides };

  const prev = floor[(index - 1 + n) % n];
  const following = floor[(index + 1) % n];
  const tolerance = Math.max(0, options.tolerance ?? 6);
  const angleTolerance = ((options.angleTolerance ?? 3) * Math.PI) / 180;
  let alignedX: StudioPoint | null = null;
  let alignedZ: StudioPoint | null = null;
  for (const neighbour of [prev, following]) {
    if (!alignedX && Math.abs(raw.x - neighbour.x) <= tolerance) {
      next = { ...next, x: neighbour.x };
      alignedX = neighbour;
    }
    if (!alignedZ && Math.abs(raw.z - neighbour.z) <= tolerance) {
      next = { ...next, z: neighbour.z };
      alignedZ = neighbour;
    }
  }

  if (!alignedX && !alignedZ) {
    const step = Math.PI / 4;
    for (const neighbour of [prev, following]) {
      const dx = raw.x - neighbour.x;
      const dz = raw.z - neighbour.z;
      const length = Math.hypot(dx, dz);
      if (length < 1) continue;
      const angle = Math.atan2(dz, dx);
      const snapped = Math.round(angle / step) * step;
      if (Math.abs(angle - snapped) <= angleTolerance) {
        const snappedLength = options.snap
          ? Math.max(
              STUDIO_MIN_WALL_LENGTH,
              snapStudioValue(length, { snapIncrement: options.snapIncrement })
            )
          : length;
        next = {
          x: neighbour.x + Math.cos(snapped) * snappedLength,
          z: neighbour.z + Math.sin(snapped) * snappedLength,
        };
        guides.push({ from: neighbour, to: next, kind: "angle" });
        break;
      }
    }
  }
  if (alignedX) guides.push({ from: alignedX, to: next, kind: "axis" });
  if (alignedZ) guides.push({ from: alignedZ, to: next, kind: "axis" });
  return { point: next, guides };
}

/** Like `moveRoomVertex` but also returns the resolved point and guides. */
export function moveRoomVertexWithGuides(
  design: StudioDesignJson,
  index: number,
  point: StudioPoint,
  options: StudioVertexMoveOptions = {}
): {
  design: StudioDesignJson;
  point: StudioPoint;
  guides: StudioRoomGuide[];
  /** True when the outline would become invalid (design is unchanged). */
  rejected: boolean;
} {
  const floor = design.room.floor;
  if (!Number.isInteger(index) || index < 0 || index >= floor.length) {
    return { design, point, guides: [], rejected: true };
  }
  const resolved = resolveRoomVertexPoint(floor, index, point, options);
  if (samePoint(resolved.point, floor[index])) {
    return {
      design,
      point: resolved.point,
      guides: resolved.guides,
      rejected: false,
    };
  }
  const nextFloor = floor.map((vertex, vertexIndex) =>
    vertexIndex === index ? resolved.point : { x: vertex.x, z: vertex.z }
  );
  const next = withCustomFloor(design, nextFloor);
  if (!next) {
    return { design, point: floor[index], guides: [], rejected: true };
  }
  return {
    design: applyRoomOutline(convertRoomToCustom(design), next.room),
    point: resolved.point,
    guides: resolved.guides,
    rejected: false,
  };
}

/**
 * Moves one outline vertex (converts template rooms to custom). Snaps to the
 * grid when `snap`, aligns with neighbours / 0-45-90° unless
 * `orthogonal: false`. Rejects self-intersecting results.
 */
export function moveRoomVertex(
  design: StudioDesignJson,
  index: number,
  point: StudioPoint,
  options: StudioVertexMoveOptions = {}
): StudioDesignJson {
  return moveRoomVertexWithGuides(design, index, point, options).design;
}

/**
 * Corner drag. Template rooms keep their template by pushing the two walls
 * that meet at the corner; custom rooms move the vertex freely.
 */
export function moveRoomCorner(
  design: StudioDesignJson,
  index: number,
  delta: StudioPoint,
  options: StudioVertexMoveOptions = {}
): StudioDesignJson {
  const floor = design.room.floor;
  const n = floor.length;
  if (!Number.isInteger(index) || index < 0 || index >= n) return design;
  if (design.room.shape === "custom") {
    return moveRoomVertex(
      design,
      index,
      { x: floor[index].x + delta.x, z: floor[index].z + delta.z },
      options
    );
  }
  const previousWall = (index - 1 + n) % n;
  const previousNormal = getWallOutwardNormal(floor, previousWall);
  const currentNormal = getWallOutwardNormal(floor, index);
  const first = moveWall(
    design,
    previousWall,
    delta.x * previousNormal.x + delta.z * previousNormal.z,
    options
  );
  return moveWall(
    first,
    index,
    delta.x * currentNormal.x + delta.z * currentNormal.z,
    options
  );
}

/**
 * Splits wall `wallIndex` by inserting `point` (default: wall midpoint) after
 * its start vertex. Items on the split wall move to the segment they mostly
 * overlap with re-based offsets (drape runs spanning both halves are split in
 * two); items on later walls shift to wallIndex + 1. Converts to custom.
 */
export function insertRoomVertex(
  design: StudioDesignJson,
  wallIndex: number,
  point?: StudioPoint
): StudioDesignJson {
  const floor = design.room.floor;
  const n = floor.length;
  if (
    !Number.isInteger(wallIndex) ||
    wallIndex < 0 ||
    wallIndex >= n ||
    n >= STUDIO_ROOM_MAX_POINTS
  ) {
    return design;
  }
  const wall = getWallSegments(floor)[wallIndex];
  if (wall.length < STUDIO_MIN_WALL_LENGTH * 2) return design;
  const inserted = point
    ? { x: clampCoordinate(point.x), z: clampCoordinate(point.z) }
    : { ...wall.center };
  const split = clamp(
    projectPointToWall(wall, inserted).rawOffset,
    STUDIO_MIN_WALL_LENGTH,
    wall.length - STUDIO_MIN_WALL_LENGTH
  );
  const nextFloor = [
    ...floor.slice(0, wallIndex + 1).map((vertex) => ({ ...vertex })),
    inserted,
    ...floor.slice(wallIndex + 1).map((vertex) => ({ ...vertex })),
  ];
  const next = withCustomFloor(design, nextFloor);
  if (!next) return design;
  const firstLength = distance(wall.start, inserted);
  const secondLength = distance(inserted, wall.end);
  const firstScale = firstLength / split;
  const secondScale = secondLength / (wall.length - split);

  return mapWallItems(next, (span, kind) => {
    if (span.wallIndex < wallIndex) return span;
    if (span.wallIndex > wallIndex) {
      return { ...span, wallIndex: span.wallIndex + 1 };
    }
    const width = span.end - span.start;
    const onFirst = (start: number, end: number): StudioWallItemSpan => ({
      wallIndex,
      ...fitSpan(start * firstScale, end * firstScale, firstLength, width),
    });
    const onSecond = (start: number, end: number): StudioWallItemSpan => ({
      wallIndex: wallIndex + 1,
      ...fitSpan(
        (start - split) * secondScale,
        (end - split) * secondScale,
        secondLength,
        width
      ),
    });
    if (kind === "opening") {
      const center = (span.start + span.end) / 2;
      return center <= split
        ? onFirst(center - width / 2 / firstScale, center + width / 2 / firstScale)
        : onSecond(
            center - width / 2 / secondScale,
            center + width / 2 / secondScale
          );
    }
    const firstOverlap = Math.max(0, Math.min(span.end, split) - span.start);
    const secondOverlap = Math.max(0, span.end - Math.max(span.start, split));
    if (
      kind === "drape" &&
      firstOverlap >= MIN_ITEM_SPAN &&
      secondOverlap >= MIN_ITEM_SPAN
    ) {
      return [onFirst(span.start, split), onSecond(split, span.end)];
    }
    return firstOverlap >= secondOverlap
      ? onFirst(span.start, Math.min(span.end, split))
      : onSecond(Math.max(span.start, split), span.end);
  });
}

/**
 * Removes vertex `index`, merging its two walls into one. Items on the merged
 * walls are projected onto the new wall (dropped if they no longer fit);
 * later walls shift down by one. Needs at least 5 points (custom rooms keep 4+).
 */
export function removeRoomVertex(
  design: StudioDesignJson,
  index: number
): StudioDesignJson {
  const floor = design.room.floor;
  const n = floor.length;
  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index >= n ||
    n <= STUDIO_ROOM_MIN_POINTS
  ) {
    return design;
  }
  const nextFloor = floor
    .filter((_, vertexIndex) => vertexIndex !== index)
    .map((vertex) => ({ ...vertex }));
  const next = withCustomFloor(design, nextFloor);
  if (!next) return design;

  const oldWalls = getWallSegments(floor);
  const previousWall = (index - 1 + n) % n;
  const mergedIndex = index === 0 ? n - 2 : index - 1;
  const mergedStart = floor[previousWall];
  const mergedEnd = floor[(index + 1) % n];
  const merged: StudioWallSegment = {
    index: mergedIndex,
    start: mergedStart,
    end: mergedEnd,
    length: distance(mergedStart, mergedEnd),
    angle: Math.atan2(mergedEnd.z - mergedStart.z, mergedEnd.x - mergedStart.x),
    center: {
      x: (mergedStart.x + mergedEnd.x) / 2,
      z: (mergedStart.z + mergedEnd.z) / 2,
    },
  };
  const pointOn = (wall: StudioWallSegment, offset: number): StudioPoint => {
    const t = wall.length > 0 ? offset / wall.length : 0;
    return {
      x: wall.start.x + (wall.end.x - wall.start.x) * t,
      z: wall.start.z + (wall.end.z - wall.start.z) * t,
    };
  };

  return mapWallItems(next, (span, kind) => {
    if (span.wallIndex === previousWall || span.wallIndex === index) {
      const oldWall = oldWalls[span.wallIndex];
      const a = projectPointToWall(merged, pointOn(oldWall, span.start)).offset;
      const b = projectPointToWall(merged, pointOn(oldWall, span.end)).offset;
      const start = Math.min(a, b);
      const end = Math.max(a, b);
      const width = span.end - span.start;
      if (kind === "opening") {
        if (width > merged.length) return null;
        const center = (start + end) / 2;
        return {
          wallIndex: mergedIndex,
          ...fitSpan(center - width / 2, center + width / 2, merged.length, width),
        };
      }
      if (end - start < 1) return null;
      return { wallIndex: mergedIndex, start, end };
    }
    if (index === 0) return { ...span, wallIndex: span.wallIndex - 1 };
    return span.wallIndex < index
      ? span
      : { ...span, wallIndex: span.wallIndex - 1 };
  });
}

/* ------------------------------------------------------------------------ */
/* Wall editing                                                              */
/* ------------------------------------------------------------------------ */

const RECTANGLE_WALL_HANDLES: StudioRoomResizeHandle[] = [
  "north",
  "east",
  "south",
  "west",
];

function lineIntersection(
  p: StudioPoint,
  u: StudioPoint,
  q: StudioPoint,
  v: StudioPoint
): StudioPoint | null {
  const denominator = u.x * v.z - u.z * v.x;
  if (Math.abs(denominator) <= 1e-9) return null;
  const t = ((q.x - p.x) * v.z - (q.z - p.z) * v.x) / denominator;
  return { x: p.x + u.x * t, z: p.z + u.z * t };
}

function unit(from: StudioPoint, to: StudioPoint): StudioPoint {
  const length = distance(from, to);
  return length > 1e-9
    ? { x: (to.x - from.x) / length, z: (to.z - from.z) / length }
    : { x: 1, z: 0 };
}

function moveLShapeWall(
  design: StudioDesignJson,
  wallIndex: number,
  rawDistance: number
): StudioDesignJson {
  const dims = design.room.templateDimensions;
  if (!dims || design.room.floor.length !== 6) return design;
  const w = dims.width;
  const l = dims.length;
  const ox = dims.originX ?? 0;
  const oz = dims.originZ ?? 0;
  const cw = dims.cutoutWidth ?? w / 3;
  const cd = dims.cutoutDepth ?? l / 2;
  const ranges: Array<[number, number]> = [
    [Math.max(24 - l, cd + 12 - l), Infinity],
    [Math.max(24 - w, 12 - cw), Infinity],
    [cd - (l - 12), cd - 12],
    [cw - (w - 12), cw - 12],
    [Math.max(24 - l, 12 - cd), Infinity],
    [Math.max(24 - w, cw + 12 - w), Infinity],
  ];
  const [min, max] = ranges[wallIndex] ?? [0, 0];
  const d = clamp(rawDistance, min, max);
  if (d === 0) return design;
  const patches = [
    { originZ: oz - d, length: l + d },
    { width: w + d, cutoutWidth: cw + d },
    { cutoutDepth: cd - d },
    { cutoutWidth: cw - d },
    { length: l + d, cutoutDepth: cd + d },
    { originX: ox - d, width: w + d },
  ];
  const resized = updateTemplateRoomDimensions(design, {
    width: w,
    length: l,
    originX: ox,
    originZ: oz,
    cutoutWidth: cw,
    cutoutDepth: cd,
    ...patches[wallIndex],
  });
  return applyRoomOutline(design, resized.room);
}

/**
 * Push/pull a whole wall along its normal. Positive `distance` moves the wall
 * outward (room grows). Rectangle and L-shape rooms stay templates (resize);
 * custom rooms slide the wall's endpoints along their neighbouring walls so
 * adjacent walls keep their direction.
 */
export function moveWall(
  design: StudioDesignJson,
  wallIndex: number,
  distanceOutward: number,
  options: StudioRoomSnapOptions = {}
): StudioDesignJson {
  const floor = design.room.floor;
  const n = floor.length;
  if (
    !Number.isInteger(wallIndex) ||
    wallIndex < 0 ||
    wallIndex >= n ||
    !Number.isFinite(distanceOutward)
  ) {
    return design;
  }
  const snapOptions = { snapIncrement: options.snapIncrement };

  if (design.room.shape === "rectangle" && n === 4) {
    const handle = RECTANGLE_WALL_HANDLES[wallIndex];
    const normal = getWallOutwardNormal(floor, wallIndex);
    const resized = resizeRectangleRoom(
      design,
      handle,
      { x: normal.x * distanceOutward, z: normal.z * distanceOutward },
      { bypassSnap: !options.snap, snapIncrement: options.snapIncrement }
    );
    if (resized === design) return design;
    if (
      resized.room.floor.every((point, index) => samePoint(point, floor[index]))
    ) {
      return design;
    }
    return applyRoomOutline(design, resized.room);
  }

  const d = options.snap
    ? snapStudioValue(distanceOutward, snapOptions)
    : distanceOutward;
  if (d === 0) return design;

  if (design.room.shape === "l_shape") {
    return moveLShapeWall(design, wallIndex, d);
  }

  const start = floor[wallIndex];
  const end = floor[(wallIndex + 1) % n];
  const previous = floor[(wallIndex - 1 + n) % n];
  const following = floor[(wallIndex + 2) % n];
  const outward = getWallOutwardNormal(floor, wallIndex);
  const direction = unit(start, end);
  const shiftedStart = { x: start.x + outward.x * d, z: start.z + outward.z * d };
  const shiftedEnd = { x: end.x + outward.x * d, z: end.z + outward.z * d };
  const parallelLimit = Math.sin((5 * Math.PI) / 180);
  const slide = (
    shifted: StudioPoint,
    anchor: StudioPoint,
    neighbour: StudioPoint
  ): StudioPoint => {
    const along = unit(neighbour, anchor);
    const sine = Math.abs(direction.x * along.z - direction.z * along.x);
    if (sine < parallelLimit) return shifted;
    return lineIntersection(shifted, direction, anchor, along) ?? shifted;
  };
  const nextStart = slide(shiftedStart, start, previous);
  const nextEnd = slide(shiftedEnd, end, following);
  const nextFloor = floor.map((vertex, index) =>
    index === wallIndex
      ? { x: clampCoordinate(nextStart.x), z: clampCoordinate(nextStart.z) }
      : index === (wallIndex + 1) % n
        ? { x: clampCoordinate(nextEnd.x), z: clampCoordinate(nextEnd.z) }
        : { ...vertex }
  );
  const next = withCustomFloor(design, nextFloor);
  if (!next) return design;
  return applyRoomOutline(convertRoomToCustom(design), next.room);
}

/**
 * Sets one wall's length. Rectangle / L-shape rooms resize their template
 * (keeping the template); custom rooms move the wall's end vertex along the
 * wall direction. Rejected (original returned) if the outline would break.
 */
export function setWallLength(
  design: StudioDesignJson,
  wallIndex: number,
  inches: number
): StudioDesignJson {
  const floor = design.room.floor;
  const n = floor.length;
  if (
    !Number.isInteger(wallIndex) ||
    wallIndex < 0 ||
    wallIndex >= n ||
    !Number.isFinite(inches)
  ) {
    return design;
  }
  const target = clamp(inches, 12, STUDIO_MAX_COORDINATE);
  const dims = design.room.templateDimensions;

  if (design.room.shape === "rectangle" && dims && n === 4) {
    const horizontal = wallIndex % 2 === 0;
    const resized = updateTemplateRoomDimensions(design, {
      width: horizontal ? target : dims.width,
      length: horizontal ? dims.length : target,
      originX: dims.originX ?? 0,
      originZ: dims.originZ ?? 0,
    });
    return applyRoomOutline(design, resized.room);
  }

  if (design.room.shape === "l_shape" && dims && n === 6) {
    const w = dims.width;
    const l = dims.length;
    const cw = dims.cutoutWidth ?? w / 3;
    const cd = dims.cutoutDepth ?? l / 2;
    const patches = [
      { width: Math.max(target, cw + 12, 24) },
      { cutoutDepth: l - clamp(target, 12, l - 12) },
      { cutoutWidth: clamp(target, 12, w - 12) },
      { cutoutDepth: clamp(target, 12, l - 12) },
      { cutoutWidth: w - clamp(target, 12, w - 12) },
      { length: Math.max(target, cd + 12, 24) },
    ];
    const resized = updateTemplateRoomDimensions(design, {
      width: w,
      length: l,
      originX: dims.originX ?? 0,
      originZ: dims.originZ ?? 0,
      cutoutWidth: cw,
      cutoutDepth: cd,
      ...patches[wallIndex],
    });
    return applyRoomOutline(design, resized.room);
  }

  const start = floor[wallIndex];
  const end = floor[(wallIndex + 1) % n];
  const direction = unit(start, end);
  const nextEnd = {
    x: clampCoordinate(start.x + direction.x * target),
    z: clampCoordinate(start.z + direction.z * target),
  };
  if (samePoint(nextEnd, end)) return design;
  const endIndex = (wallIndex + 1) % n;
  const nextFloor = floor.map((vertex, index) =>
    index === endIndex ? nextEnd : { ...vertex }
  );
  const next = withCustomFloor(design, nextFloor);
  if (!next) return design;
  return applyRoomOutline(convertRoomToCustom(design), next.room);
}

/* ------------------------------------------------------------------------ */
/* Wall item placement                                                       */
/* ------------------------------------------------------------------------ */

export function getWallItemInfo(
  design: StudioDesignJson,
  id: string
): StudioWallItemInfo | null {
  const drape = design.drapeRuns.find((item) => item.id === id);
  if (drape) {
    return {
      kind: "drape",
      id,
      wallIndex: drape.wallIndex,
      start: drape.startOffset,
      end: drape.endOffset,
      locked: Boolean(drape.locked),
    };
  }
  const treatment = (design.treatments ?? []).find((item) => item.id === id);
  if (treatment) {
    return {
      kind: "treatment",
      id,
      wallIndex: treatment.anchor.wallIndex,
      start: treatment.anchor.startOffset,
      end: treatment.anchor.endOffset,
      locked: Boolean(treatment.locked),
    };
  }
  const opening = design.openings.find((item) => item.id === id);
  if (opening) {
    return {
      kind: "opening",
      id,
      wallIndex: opening.wallIndex,
      start: opening.offset,
      end: opening.offset + opening.width,
      locked: Boolean(opening.locked),
    };
  }
  return null;
}

/**
 * Places a wall item on `span.wallIndex` at [start, end] (clamped to that
 * wall). Works for drapes, treatments and openings; locked items are ignored.
 */
export function setWallItemSpan(
  design: StudioDesignJson,
  id: string,
  span: StudioWallItemSpan
): StudioDesignJson {
  const floor = design.room.floor;
  const wall = getWallSegments(floor)[span.wallIndex];
  if (!wall || wall.length < 2) return design;
  const info = getWallItemInfo(design, id);
  if (!info || info.locked) return design;
  const start = Number.isFinite(span.start) ? span.start : info.start;
  const end = Number.isFinite(span.end) ? span.end : info.end;
  if (info.kind === "drape") {
    return {
      ...design,
      drapeRuns: design.drapeRuns.map((run) =>
        run.id === id
          ? clampDrapeRunToWall(
              { ...run, wallIndex: span.wallIndex, startOffset: start, endOffset: end },
              floor
            )
          : run
      ),
    };
  }
  if (info.kind === "treatment") {
    return {
      ...design,
      treatments: design.treatments.map((treatment) =>
        treatment.id === id
          ? clampTreatmentToWall(
              {
                ...treatment,
                anchor: {
                  ...treatment.anchor,
                  wallIndex: span.wallIndex,
                  startOffset: start,
                  endOffset: end,
                },
              },
              floor
            )
          : treatment
      ),
    };
  }
  return {
    ...design,
    openings: design.openings.map((opening) =>
      opening.id === id
        ? clampOpeningToWall(
            {
              ...opening,
              wallIndex: span.wallIndex,
              offset: start,
              width: Math.max(1, end - start),
            },
            floor
          )
        : opening
    ),
  };
}
