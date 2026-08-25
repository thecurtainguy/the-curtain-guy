import type {
  StudioDesignJson,
  StudioObject,
  StudioObjectType,
  StudioPoint,
} from "@/data/studio";
import {
  getStudioBounds,
  updateTemplateRoomDimensions,
} from "@/lib/studio-geometry";

export const STUDIO_SNAP_INCREMENT = 12;
export const STUDIO_MAX_COORDINATE = 120000;

export type StudioResizeHandle =
  | "north_west"
  | "north_east"
  | "south_east"
  | "south_west";

export type StudioRoomResizeHandle =
  | StudioResizeHandle
  | "north"
  | "east"
  | "south"
  | "west";

export type StudioDragDelta = {
  x: number;
  z: number;
};

export type StudioInteractionOptions = {
  bypassSnap?: boolean;
  snapIncrement?: number;
};

export type StudioObjectResizeOptions = StudioInteractionOptions & {
  minWidth?: number;
  minDepth?: number;
};

export type StudioRoomDimensionPatch = {
  width?: number;
  length?: number;
  cutoutWidth?: number;
  cutoutDepth?: number;
};

export type StudioObjectBoundsResult = {
  contained: boolean;
  outsideCornerIndexes: number[];
  crossingEdgeIndexes: number[];
  corners: StudioPoint[];
  warning: string | null;
};

export type StudioObjectContainmentResult = {
  object: StudioObject;
  contained: boolean;
  adjusted: boolean;
  warning: string | null;
};

export const STUDIO_OBJECT_MIN_DIMENSIONS: Record<
  StudioObjectType,
  { width: number; depth: number }
> = {
  stage: { width: 24, depth: 24 },
  dance_floor: { width: 36, depth: 36 },
  entrance_marker: { width: 24, depth: 12 },
  round_table: { width: 24, depth: 24 },
  rectangle_table: { width: 36, depth: 18 },
  cocktail_table: { width: 24, depth: 24 },
  table_area: { width: 36, depth: 36 },
  dj_booth: { width: 36, depth: 18 },
  bar: { width: 36, depth: 18 },
  lounge_area: { width: 36, depth: 36 },
};

export function clampFinite(
  value: number,
  minimum: number,
  maximum: number,
  fallback = minimum
): number {
  const safeMinimum = Number.isFinite(minimum) ? minimum : 0;
  const safeMaximum =
    Number.isFinite(maximum) && maximum >= safeMinimum
      ? maximum
      : safeMinimum;
  const safeFallback = Number.isFinite(fallback) ? fallback : safeMinimum;
  const safeValue = Number.isFinite(value) ? value : safeFallback;
  return Math.min(safeMaximum, Math.max(safeMinimum, safeValue));
}

export function snapStudioValue(
  value: number,
  options: StudioInteractionOptions = {}
): number {
  if (!Number.isFinite(value)) return 0;
  if (options.bypassSnap) return value;
  const increment =
    Number.isFinite(options.snapIncrement) &&
    (options.snapIncrement ?? 0) > 0
      ? (options.snapIncrement ?? STUDIO_SNAP_INCREMENT)
      : STUDIO_SNAP_INCREMENT;
  return Math.round(value / increment) * increment;
}

function getHandleSigns(handle: StudioResizeHandle): {
  x: -1 | 1;
  z: -1 | 1;
} {
  return {
    x: handle.endsWith("west") ? -1 : 1,
    z: handle.startsWith("north") ? -1 : 1,
  };
}

function rotatePoint(point: StudioPoint, radians: number): StudioPoint {
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  return {
    x: point.x * cosine - point.z * sine,
    z: point.x * sine + point.z * cosine,
  };
}

function getObjectMinimums(
  object: StudioObject,
  options: StudioObjectResizeOptions
): { width: number; depth: number } {
  const defaults = STUDIO_OBJECT_MIN_DIMENSIONS[object.type];
  return {
    width: clampFinite(
      options.minWidth ?? defaults.width,
      1,
      STUDIO_MAX_COORDINATE,
      defaults.width
    ),
    depth: clampFinite(
      options.minDepth ?? defaults.depth,
      1,
      STUDIO_MAX_COORDINATE,
      defaults.depth
    ),
  };
}

export function moveStudioObject(
  object: StudioObject,
  delta: StudioDragDelta,
  options: StudioInteractionOptions = {}
): StudioObject {
  const currentX = Number.isFinite(object.x) ? object.x : 0;
  const currentZ = Number.isFinite(object.z) ? object.z : 0;
  const deltaX = Number.isFinite(delta.x) ? delta.x : 0;
  const deltaZ = Number.isFinite(delta.z) ? delta.z : 0;
  return {
    ...object,
    x: clampFinite(
      snapStudioValue(currentX + deltaX, options),
      -STUDIO_MAX_COORDINATE,
      STUDIO_MAX_COORDINATE,
      currentX
    ),
    z: clampFinite(
      snapStudioValue(currentZ + deltaZ, options),
      -STUDIO_MAX_COORDINATE,
      STUDIO_MAX_COORDINATE,
      currentZ
    ),
  };
}

export function resizeStudioObjectFromCorner(
  object: StudioObject,
  handle: StudioResizeHandle,
  pointer: StudioPoint,
  options: StudioObjectResizeOptions = {}
): StudioObject {
  const minimums = getObjectMinimums(object, options);
  const width = clampFinite(
    object.width,
    minimums.width,
    STUDIO_MAX_COORDINATE,
    minimums.width
  );
  const depth = clampFinite(
    object.depth,
    minimums.depth,
    STUDIO_MAX_COORDINATE,
    minimums.depth
  );
  const center = {
    x: Number.isFinite(object.x) ? object.x : 0,
    z: Number.isFinite(object.z) ? object.z : 0,
  };
  const radians = ((Number.isFinite(object.rotation) ? object.rotation : 0) *
    Math.PI) /
    180;
  const signs = getHandleSigns(handle);
  const oppositeOffset = rotatePoint(
    { x: (-signs.x * width) / 2, z: (-signs.z * depth) / 2 },
    radians
  );
  const anchor = {
    x: center.x + oppositeOffset.x,
    z: center.z + oppositeOffset.z,
  };
  const currentCornerOffset = rotatePoint(
    { x: (signs.x * width) / 2, z: (signs.z * depth) / 2 },
    radians
  );
  const safePointer = {
    x: Number.isFinite(pointer.x)
      ? pointer.x
      : center.x + currentCornerOffset.x,
    z: Number.isFinite(pointer.z)
      ? pointer.z
      : center.z + currentCornerOffset.z,
  };
  const localDelta = rotatePoint(
    { x: safePointer.x - anchor.x, z: safePointer.z - anchor.z },
    -radians
  );
  const nextWidth = clampFinite(
    snapStudioValue(signs.x * localDelta.x, options),
    minimums.width,
    STUDIO_MAX_COORDINATE,
    width
  );
  const nextDepth = clampFinite(
    snapStudioValue(signs.z * localDelta.z, options),
    minimums.depth,
    STUDIO_MAX_COORDINATE,
    depth
  );
  const centerOffset = rotatePoint(
    { x: (signs.x * nextWidth) / 2, z: (signs.z * nextDepth) / 2 },
    radians
  );

  return {
    ...object,
    x: clampFinite(
      anchor.x + centerOffset.x,
      -STUDIO_MAX_COORDINATE,
      STUDIO_MAX_COORDINATE,
      center.x
    ),
    z: clampFinite(
      anchor.z + centerOffset.z,
      -STUDIO_MAX_COORDINATE,
      STUDIO_MAX_COORDINATE,
      center.z
    ),
    width: nextWidth,
    depth: nextDepth,
  };
}

export function resizeCircularStudioObject(
  object: StudioObject,
  pointer: StudioPoint,
  options: StudioObjectResizeOptions = {}
): StudioObject {
  if (!Number.isFinite(pointer.x) || !Number.isFinite(pointer.z)) {
    return { ...object };
  }
  const minimums = getObjectMinimums(object, options);
  const minimumDiameter = Math.max(minimums.width, minimums.depth);
  const centerX = Number.isFinite(object.x) ? object.x : 0;
  const centerZ = Number.isFinite(object.z) ? object.z : 0;
  const pointerX = Number.isFinite(pointer.x) ? pointer.x : centerX;
  const pointerZ = Number.isFinite(pointer.z) ? pointer.z : centerZ;
  const fallbackDiameter = Math.max(
    minimumDiameter,
    Number.isFinite(object.width) ? object.width : minimumDiameter,
    Number.isFinite(object.depth) ? object.depth : minimumDiameter
  );
  const diameter = clampFinite(
    snapStudioValue(
      Math.hypot(pointerX - centerX, pointerZ - centerZ) * 2,
      options
    ),
    minimumDiameter,
    STUDIO_MAX_COORDINATE,
    fallbackDiameter
  );
  return { ...object, width: diameter, depth: diameter };
}

export function replaceStudioObject(
  design: StudioDesignJson,
  object: StudioObject
): StudioDesignJson {
  return {
    ...design,
    objects: design.objects.map((item) =>
      item.id === object.id ? { ...object } : item
    ),
  };
}

export function resizeRectangleRoom(
  design: StudioDesignJson,
  handle: StudioRoomResizeHandle,
  delta: StudioDragDelta,
  options: StudioInteractionOptions = {}
): StudioDesignJson {
  if (design.room.shape !== "rectangle") return design;
  const dimensions = design.room.templateDimensions;
  if (!dimensions) return design;
  const deltaX = Number.isFinite(delta.x) ? delta.x : 0;
  const deltaZ = Number.isFinite(delta.z) ? delta.z : 0;
  const adjustsWest = handle === "west" || handle.endsWith("west");
  const adjustsEast = handle === "east" || handle.endsWith("east");
  const adjustsNorth = handle === "north" || handle.startsWith("north");
  const adjustsSouth = handle === "south" || handle.startsWith("south");
  const currentLeft = dimensions.originX ?? 0;
  const currentTop = dimensions.originZ ?? 0;
  const currentRight = currentLeft + dimensions.width;
  const currentBottom = currentTop + dimensions.length;
  const nextLeft = adjustsWest
    ? clampFinite(
        snapStudioValue(currentLeft + deltaX, options),
        -STUDIO_MAX_COORDINATE,
        currentRight - 12,
        currentLeft
      )
    : currentLeft;
  const nextRight = adjustsEast
    ? clampFinite(
        snapStudioValue(currentRight + deltaX, options),
        currentLeft + 12,
        STUDIO_MAX_COORDINATE,
        currentRight
      )
    : currentRight;
  const nextTop = adjustsNorth
    ? clampFinite(
        snapStudioValue(currentTop + deltaZ, options),
        -STUDIO_MAX_COORDINATE,
        currentBottom - 12,
        currentTop
      )
    : currentTop;
  const nextBottom = adjustsSouth
    ? clampFinite(
        snapStudioValue(currentBottom + deltaZ, options),
        currentTop + 12,
        STUDIO_MAX_COORDINATE,
        currentBottom
      )
    : currentBottom;
  return updateTemplateRoomDimensions(design, {
    width: nextRight - nextLeft,
    length: nextBottom - nextTop,
    originX: nextLeft,
    originZ: nextTop,
  });
}

export function updateLShapeRoomDimensions(
  design: StudioDesignJson,
  patch: StudioRoomDimensionPatch,
  options: StudioInteractionOptions = {}
): StudioDesignJson {
  if (design.room.shape !== "l_shape") return design;
  const current = design.room.templateDimensions;
  if (!current) return design;
  const width = clampFinite(
    snapStudioValue(patch.width ?? current.width, options),
    24,
    STUDIO_MAX_COORDINATE,
    current.width
  );
  const length = clampFinite(
    snapStudioValue(patch.length ?? current.length, options),
    24,
    STUDIO_MAX_COORDINATE,
    current.length
  );
  const cutoutWidth = clampFinite(
    snapStudioValue(
      patch.cutoutWidth ?? current.cutoutWidth ?? width / 3,
      options
    ),
    12,
    width - 12,
    Math.min(width - 12, current.cutoutWidth ?? width / 3)
  );
  const cutoutDepth = clampFinite(
    snapStudioValue(
      patch.cutoutDepth ?? current.cutoutDepth ?? length / 2,
      options
    ),
    12,
    length - 12,
    Math.min(length - 12, current.cutoutDepth ?? length / 2)
  );
  return updateTemplateRoomDimensions(design, {
    width,
    length,
    cutoutWidth,
    cutoutDepth,
  });
}

export function getStudioObjectCorners(object: StudioObject): StudioPoint[] {
  const width = Math.max(0, Number.isFinite(object.width) ? object.width : 0);
  const depth = Math.max(0, Number.isFinite(object.depth) ? object.depth : 0);
  const centerX = Number.isFinite(object.x) ? object.x : 0;
  const centerZ = Number.isFinite(object.z) ? object.z : 0;
  const radians = ((Number.isFinite(object.rotation) ? object.rotation : 0) *
    Math.PI) /
    180;
  return [
    { x: -width / 2, z: -depth / 2 },
    { x: width / 2, z: -depth / 2 },
    { x: width / 2, z: depth / 2 },
    { x: -width / 2, z: depth / 2 },
  ].map((corner) => {
    const rotated = rotatePoint(corner, radians);
    return { x: centerX + rotated.x, z: centerZ + rotated.z };
  });
}

export function isStudioPointInRoom(
  point: StudioPoint,
  floor: StudioPoint[]
): boolean {
  if (floor.length < 3 || !Number.isFinite(point.x) || !Number.isFinite(point.z)) {
    return false;
  }
  let inside = false;
  for (let index = 0, previous = floor.length - 1; index < floor.length; previous = index++) {
    const start = floor[previous];
    const end = floor[index];
    const cross =
      (point.x - start.x) * (end.z - start.z) -
      (point.z - start.z) * (end.x - start.x);
    const onSegment =
      Math.abs(cross) <= 1e-7 &&
      point.x >= Math.min(start.x, end.x) - 1e-7 &&
      point.x <= Math.max(start.x, end.x) + 1e-7 &&
      point.z >= Math.min(start.z, end.z) - 1e-7 &&
      point.z <= Math.max(start.z, end.z) + 1e-7;
    if (onSegment) return true;
    const crosses =
      start.z > point.z !== end.z > point.z &&
      point.x <
        ((end.x - start.x) * (point.z - start.z)) / (end.z - start.z) +
          start.x;
    if (crosses) inside = !inside;
  }
  return inside;
}

export function getStudioObjectBoundsResult(
  object: StudioObject,
  floor: StudioPoint[]
): StudioObjectBoundsResult {
  const corners = getStudioObjectCorners(object);
  const outsideCornerIndexes = corners.flatMap((corner, index) =>
    isStudioPointInRoom(corner, floor) ? [] : [index]
  );
  const crossingEdgeIndexes = corners.flatMap((corner, index) => {
    const end = corners[(index + 1) % corners.length];
    const intersectionParameters = [0, 1];
    for (let wallIndex = 0; wallIndex < floor.length; wallIndex += 1) {
      intersectionParameters.push(
        ...getSegmentIntersectionParameters(
          corner,
          end,
          floor[wallIndex],
          floor[(wallIndex + 1) % floor.length]
        )
      );
    }
    const sortedParameters = [...new Set(intersectionParameters)]
      .sort((a, b) => a - b)
      .filter(
        (parameter, parameterIndex, parameters) =>
          parameterIndex === 0 ||
          Math.abs(parameter - parameters[parameterIndex - 1]) > 1e-8
      );
    const crossesOutside = sortedParameters.some((parameter, parameterIndex) => {
      const nextParameter = sortedParameters[parameterIndex + 1];
      if (nextParameter === undefined || nextParameter - parameter <= 1e-8) {
        return false;
      }
      const midpoint = (parameter + nextParameter) / 2;
      return !isStudioPointInRoom(
        {
          x: corner.x + (end.x - corner.x) * midpoint,
          z: corner.z + (end.z - corner.z) * midpoint,
        },
        floor
      );
    });
    return crossesOutside ? [index] : [];
  });
  const contained =
    outsideCornerIndexes.length === 0 && crossingEdgeIndexes.length === 0;
  return {
    contained,
    outsideCornerIndexes,
    crossingEdgeIndexes,
    corners,
    warning: contained ? null : `${object.label} extends outside the room.`,
  };
}

function getSegmentIntersectionParameters(
  start: StudioPoint,
  end: StudioPoint,
  wallStart: StudioPoint,
  wallEnd: StudioPoint
): number[] {
  const segmentX = end.x - start.x;
  const segmentZ = end.z - start.z;
  const wallX = wallEnd.x - wallStart.x;
  const wallZ = wallEnd.z - wallStart.z;
  const denominator = segmentX * wallZ - segmentZ * wallX;
  const offsetX = wallStart.x - start.x;
  const offsetZ = wallStart.z - start.z;
  const tolerance = 1e-8;

  if (Math.abs(denominator) > tolerance) {
    const segmentParameter =
      (offsetX * wallZ - offsetZ * wallX) / denominator;
    const wallParameter =
      (offsetX * segmentZ - offsetZ * segmentX) / denominator;
    return segmentParameter >= -tolerance &&
      segmentParameter <= 1 + tolerance &&
      wallParameter >= -tolerance &&
      wallParameter <= 1 + tolerance
      ? [clampFinite(segmentParameter, 0, 1)]
      : [];
  }

  if (Math.abs(offsetX * segmentZ - offsetZ * segmentX) > tolerance) {
    return [];
  }
  const lengthSquared = segmentX * segmentX + segmentZ * segmentZ;
  if (lengthSquared <= tolerance) return [];
  return [wallStart, wallEnd]
    .map(
      (point) =>
        ((point.x - start.x) * segmentX + (point.z - start.z) * segmentZ) /
        lengthSquared
    )
    .filter(
      (parameter) => parameter >= -tolerance && parameter <= 1 + tolerance
    )
    .map((parameter) => clampFinite(parameter, 0, 1));
}

function isAxisAlignedRectangle(floor: StudioPoint[]): boolean {
  if (floor.length !== 4) return false;
  const bounds = getStudioBounds(floor);
  return floor.every(
    (point) =>
      (Math.abs(point.x - bounds.minX) <= 1e-8 ||
        Math.abs(point.x - bounds.maxX) <= 1e-8) &&
      (Math.abs(point.z - bounds.minZ) <= 1e-8 ||
        Math.abs(point.z - bounds.maxZ) <= 1e-8)
  );
}

export function containStudioObjectInRoomBounds(
  object: StudioObject,
  floor: StudioPoint[]
): StudioObjectContainmentResult {
  const currentResult = getStudioObjectBoundsResult(object, floor);
  if (currentResult.contained) {
    return {
      object: { ...object },
      contained: true,
      adjusted: false,
      warning: null,
    };
  }
  if (!isAxisAlignedRectangle(floor)) {
    return {
      object: { ...object },
      contained: false,
      adjusted: false,
      warning: `${currentResult.warning ?? `${object.label} extends outside the room.`} Automatic containment is only available for rectangular rooms.`,
    };
  }
  const roomBounds = getStudioBounds(floor);
  const corners = getStudioObjectCorners(object);
  const objectMinX = Math.min(...corners.map((corner) => corner.x));
  const objectMaxX = Math.max(...corners.map((corner) => corner.x));
  const objectMinZ = Math.min(...corners.map((corner) => corner.z));
  const objectMaxZ = Math.max(...corners.map((corner) => corner.z));
  const objectWidth = objectMaxX - objectMinX;
  const objectDepth = objectMaxZ - objectMinZ;
  const x =
    objectWidth > roomBounds.width
      ? roomBounds.centerX
      : object.x +
        Math.max(roomBounds.minX - objectMinX, 0) -
        Math.max(objectMaxX - roomBounds.maxX, 0);
  const z =
    objectDepth > roomBounds.depth
      ? roomBounds.centerZ
      : object.z +
        Math.max(roomBounds.minZ - objectMinZ, 0) -
        Math.max(objectMaxZ - roomBounds.maxZ, 0);
  const containedObject: StudioObject = {
    ...object,
    x: clampFinite(
      x,
      -STUDIO_MAX_COORDINATE,
      STUDIO_MAX_COORDINATE,
      object.x
    ),
    z: clampFinite(
      z,
      -STUDIO_MAX_COORDINATE,
      STUDIO_MAX_COORDINATE,
      object.z
    ),
  };
  const containedResult = getStudioObjectBoundsResult(containedObject, floor);
  return {
    object: containedObject,
    contained: containedResult.contained,
    adjusted:
      containedObject.x !== object.x || containedObject.z !== object.z,
    warning: containedResult.warning,
  };
}
