import type {
  StudioDesignJson,
  StudioDrapeRun,
  StudioOpening,
  StudioPoint,
} from "@/data/studio";

export type StudioWallSegment = {
  index: number;
  start: StudioPoint;
  end: StudioPoint;
  length: number;
  angle: number;
  center: StudioPoint;
};

export type StudioBounds = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  width: number;
  depth: number;
  centerX: number;
  centerZ: number;
};

export function feetToInches(feet: number, inches = 0): number {
  return Math.max(0, feet * 12 + inches);
}

export function inchesToFeetLabel(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const rounded = Math.round(Math.abs(value));
  const feet = Math.floor(rounded / 12);
  const inches = rounded % 12;
  const sign = value < 0 ? "−" : "";
  if (inches === 0) return `${sign}${feet}′`;
  return `${sign}${feet}′ ${inches}″`;
}

export function createRectangleRoom(width: number, length: number): StudioPoint[] {
  const safeWidth = Math.max(12, width);
  const safeLength = Math.max(12, length);
  return [
    { x: 0, z: 0 },
    { x: safeWidth, z: 0 },
    { x: safeWidth, z: safeLength },
    { x: 0, z: safeLength },
  ];
}

export function createLShapeRoom(
  width: number,
  length: number,
  cutoutWidth: number,
  cutoutDepth: number
): StudioPoint[] {
  const safeWidth = Math.max(24, width);
  const safeLength = Math.max(24, length);
  const safeCutoutWidth = Math.min(
    Math.max(12, cutoutWidth),
    safeWidth - 12
  );
  const safeCutoutDepth = Math.min(
    Math.max(12, cutoutDepth),
    safeLength - 12
  );

  return [
    { x: 0, z: 0 },
    { x: safeWidth, z: 0 },
    { x: safeWidth, z: safeLength - safeCutoutDepth },
    {
      x: safeWidth - safeCutoutWidth,
      z: safeLength - safeCutoutDepth,
    },
    { x: safeWidth - safeCutoutWidth, z: safeLength },
    { x: 0, z: safeLength },
  ];
}

export function getWallLength(start: StudioPoint, end: StudioPoint): number {
  return Math.hypot(end.x - start.x, end.z - start.z);
}

export function getWallAngle(start: StudioPoint, end: StudioPoint): number {
  return Math.atan2(end.z - start.z, end.x - start.x);
}

export function getWallSegments(floor: StudioPoint[]): StudioWallSegment[] {
  if (floor.length < 2) return [];
  return floor.map((start, index) => {
    const end = floor[(index + 1) % floor.length];
    return {
      index,
      start,
      end,
      length: getWallLength(start, end),
      angle: getWallAngle(start, end),
      center: {
        x: (start.x + end.x) / 2,
        z: (start.z + end.z) / 2,
      },
    };
  });
}

export function getPointAlongWall(
  wall: Pick<StudioWallSegment, "start" | "end" | "length">,
  offset: number
): StudioPoint {
  if (wall.length <= 0) return { ...wall.start };
  const t = Math.min(1, Math.max(0, offset / wall.length));
  return {
    x: wall.start.x + (wall.end.x - wall.start.x) * t,
    z: wall.start.z + (wall.end.z - wall.start.z) * t,
  };
}

export function clampDrapeRunToWall(
  drape: StudioDrapeRun,
  floor: StudioPoint[]
): StudioDrapeRun {
  const wall = getWallSegments(floor)[drape.wallIndex];
  if (!wall) return drape;
  const startOffset = Math.min(
    Math.max(0, drape.startOffset),
    Math.max(0, wall.length - 1)
  );
  const endOffset = Math.min(
    wall.length,
    Math.max(startOffset + 1, drape.endOffset)
  );
  return { ...drape, startOffset, endOffset };
}

export function clampOpeningToWall(
  opening: StudioOpening,
  floor: StudioPoint[]
): StudioOpening {
  const wall = getWallSegments(floor)[opening.wallIndex];
  if (!wall) return opening;
  const width = Math.min(Math.max(1, opening.width), wall.length);
  const offset = Math.min(
    Math.max(0, opening.offset),
    Math.max(0, wall.length - width)
  );
  return {
    ...opening,
    offset,
    width: Math.min(width, Math.max(0, wall.length - offset)),
  };
}

export function calculateDrapeLength(
  designOrRuns: StudioDesignJson | StudioDrapeRun[]
): number {
  const runs = Array.isArray(designOrRuns)
    ? designOrRuns
    : designOrRuns.drapeRuns;
  return runs.reduce(
    (total, run) => total + Math.max(0, run.endOffset - run.startOffset),
    0
  );
}

export function calculateRoomArea(floor: StudioPoint[]): number {
  if (floor.length < 3) return 0;
  let signedArea = 0;
  for (let index = 0; index < floor.length; index += 1) {
    const current = floor[index];
    const next = floor[(index + 1) % floor.length];
    signedArea += current.x * next.z - next.x * current.z;
  }
  return Math.abs(signedArea / 2);
}

export function calculateRoomAreaSquareFeet(floor: StudioPoint[]): number {
  return calculateRoomArea(floor) / 144;
}

export function getStudioBounds(floor: StudioPoint[]): StudioBounds {
  if (floor.length === 0) {
    return {
      minX: 0,
      maxX: 1,
      minZ: 0,
      maxZ: 1,
      width: 1,
      depth: 1,
      centerX: 0.5,
      centerZ: 0.5,
    };
  }

  const xs = floor.map((point) => point.x);
  const zs = floor.map((point) => point.z);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minZ = Math.min(...zs);
  const maxZ = Math.max(...zs);
  return {
    minX,
    maxX,
    minZ,
    maxZ,
    width: Math.max(1, maxX - minX),
    depth: Math.max(1, maxZ - minZ),
    centerX: (minX + maxX) / 2,
    centerZ: (minZ + maxZ) / 2,
  };
}

export function getPolygonCentroid(floor: StudioPoint[]): StudioPoint {
  if (floor.length === 0) return { x: 0, z: 0 };
  const area = calculateRoomArea(floor);
  if (area === 0) {
    const bounds = getStudioBounds(floor);
    return { x: bounds.centerX, z: bounds.centerZ };
  }

  let centroidX = 0;
  let centroidZ = 0;
  let crossTotal = 0;
  for (let index = 0; index < floor.length; index += 1) {
    const current = floor[index];
    const next = floor[(index + 1) % floor.length];
    const cross = current.x * next.z - next.x * current.z;
    crossTotal += cross;
    centroidX += (current.x + next.x) * cross;
    centroidZ += (current.z + next.z) * cross;
  }
  const factor = 1 / (3 * crossTotal);
  return { x: centroidX * factor, z: centroidZ * factor };
}

export function updateTemplateRoomDimensions(
  design: StudioDesignJson,
  dimensions: {
    width: number;
    length: number;
    cutoutWidth?: number;
    cutoutDepth?: number;
    wallHeight?: number;
  }
): StudioDesignJson {
  const fallbackWallHeight = Number.isFinite(design.room.wallHeight)
    ? design.room.wallHeight
    : 144;
  const wallHeight = Number.isFinite(dimensions.wallHeight)
    ? Math.min(600, Math.max(72, dimensions.wallHeight ?? fallbackWallHeight))
    : Math.min(600, Math.max(72, fallbackWallHeight));
  if (design.room.shape === "custom") {
    return {
      ...design,
      room: {
        ...design.room,
        wallHeight,
        floor: design.room.floor,
        templateDimensions: undefined,
      },
    };
  }

  const minimumSide = design.room.shape === "l_shape" ? 24 : 12;
  const requestedWidth = Number.isFinite(dimensions.width)
    ? dimensions.width
    : design.room.templateDimensions?.width;
  const requestedLength = Number.isFinite(dimensions.length)
    ? dimensions.length
    : design.room.templateDimensions?.length;
  const width = Number.isFinite(requestedWidth)
    ? Math.min(120000, Math.max(minimumSide, requestedWidth ?? minimumSide))
    : minimumSide;
  const length = Number.isFinite(requestedLength)
    ? Math.min(120000, Math.max(minimumSide, requestedLength ?? minimumSide))
    : minimumSide;
  const requestedCutoutWidth = Number.isFinite(dimensions.cutoutWidth)
    ? (dimensions.cutoutWidth ?? width / 3)
    : width / 3;
  const requestedCutoutDepth = Number.isFinite(dimensions.cutoutDepth)
    ? (dimensions.cutoutDepth ?? length / 2)
    : length / 2;
  const cutoutWidth = Math.min(
    width - 12,
    Math.max(12, requestedCutoutWidth)
  );
  const cutoutDepth = Math.min(
    length - 12,
    Math.max(12, requestedCutoutDepth)
  );
  const floor =
    design.room.shape === "l_shape"
      ? createLShapeRoom(width, length, cutoutWidth, cutoutDepth)
      : createRectangleRoom(width, length);

  const next = {
    ...design,
    room: {
      ...design.room,
      wallHeight,
      floor,
      templateDimensions: {
        width,
        length,
        ...(design.room.shape === "l_shape"
          ? {
              cutoutWidth,
              cutoutDepth,
            }
          : {}),
      },
    },
  };

  return {
    ...next,
    drapeRuns: next.drapeRuns
      .filter((run) => run.wallIndex < next.room.floor.length)
      .map((run) => clampDrapeRunToWall(run, next.room.floor)),
    openings: next.openings
      .filter(
        (opening) =>
          Number.isInteger(opening.wallIndex) &&
          opening.wallIndex >= 0 &&
          opening.wallIndex < next.room.floor.length
      )
      .map((opening) => clampOpeningToWall(opening, next.room.floor)),
  };
}
