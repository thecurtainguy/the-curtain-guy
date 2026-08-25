import {
  createLShapeRoom,
  createRectangleRoom,
} from "@/lib/studio-geometry";

export const STUDIO_DESIGN_VERSION = 1 as const;
export const STUDIO_MAX_PAYLOAD_BYTES = 256 * 1024;
export const STUDIO_TITLE_MAX_LENGTH = 160;
export const STUDIO_LABEL_MAX_LENGTH = 160;
export const STUDIO_NOTES_MAX_LENGTH = 5000;
export const STUDIO_OBJECT_NOTES_MAX_LENGTH = 1000;
export const STUDIO_MAX_SEATING_COUNT = 10000;

export const STUDIO_STATUSES = ["draft", "saved", "archived"] as const;
export type StudioDesignStatus = (typeof STUDIO_STATUSES)[number];

export const ROOM_SHAPES = ["rectangle", "l_shape", "custom"] as const;
export type StudioRoomShape = (typeof ROOM_SHAPES)[number];

export const STUDIO_FLOOR_FINISHES = [
  { value: "warm_wood", label: "Warm ballroom wood" },
  { value: "event_carpet", label: "Neutral event carpet" },
  { value: "polished_concrete", label: "Polished venue concrete" },
  { value: "black_event", label: "Black event floor" },
  { value: "light_neutral", label: "Light neutral floor" },
] as const;
export type StudioFloorFinish =
  (typeof STUDIO_FLOOR_FINISHES)[number]["value"];

export const STUDIO_WALL_FINISHES = [
  { value: "warm_ivory", label: "Warm ivory" },
  { value: "soft_grey", label: "Soft grey" },
  { value: "black_box", label: "Black box" },
  { value: "neutral_beige", label: "Neutral beige" },
] as const;
export type StudioWallFinish =
  (typeof STUDIO_WALL_FINISHES)[number]["value"];

export const STUDIO_LIGHTING_MOODS = [
  { value: "neutral", label: "Neutral" },
  { value: "warm_gala", label: "Warm gala" },
  { value: "dark_venue", label: "Dark venue" },
  { value: "bright_setup", label: "Bright setup" },
] as const;
export type StudioLightingMood =
  (typeof STUDIO_LIGHTING_MOODS)[number]["value"];

export type StudioMaterials = {
  floor: StudioFloorFinish;
  walls: StudioWallFinish;
  lighting: StudioLightingMood;
};

export const DEFAULT_STUDIO_MATERIALS: StudioMaterials = {
  floor: "warm_wood",
  walls: "warm_ivory",
  lighting: "warm_gala",
};

export type StudioPoint = {
  x: number;
  z: number;
};

export type StudioOpening = {
  id: string;
  type: "door" | "entrance";
  wallIndex: number;
  offset: number;
  width: number;
  label: string;
};

export const STUDIO_OBJECT_TYPES = [
  "stage",
  "dance_floor",
  "entrance_marker",
  "round_table",
  "rectangle_table",
  "cocktail_table",
  "table_area",
  "dj_booth",
  "bar",
  "lounge_area",
] as const;
export type StudioObjectType = (typeof STUDIO_OBJECT_TYPES)[number];

export const DANCE_FLOOR_FINISHES = [
  { value: "white_gloss", label: "White gloss" },
  { value: "black_gloss", label: "Black gloss" },
  { value: "checkerboard", label: "Checkerboard" },
  { value: "warm_parquet", label: "Warm parquet" },
  { value: "oak", label: "Oak" },
  { value: "dark_wood", label: "Dark wood" },
  { value: "neutral_event_carpet", label: "Neutral event carpet" },
  { value: "led_starlit", label: "LED / starlit (placeholder)" },
  {
    value: "custom_wrap_monogram",
    label: "Custom wrap / monogram (placeholder)",
  },
] as const;
export type DanceFloorFinish =
  (typeof DANCE_FLOOR_FINISHES)[number]["value"];
export const DEFAULT_DANCE_FLOOR_FINISH: DanceFloorFinish = "white_gloss";

export const GENERIC_OBJECT_FINISHES = [
  { value: "natural_wood", label: "Natural wood" },
  { value: "painted_white", label: "Painted white" },
  { value: "painted_black", label: "Painted black" },
  { value: "metal", label: "Metal" },
  { value: "upholstered", label: "Upholstered" },
  { value: "custom", label: "Custom" },
] as const;
export type GenericStudioObjectFinish =
  (typeof GENERIC_OBJECT_FINISHES)[number]["value"];
export type StudioObjectFinish =
  | DanceFloorFinish
  | GenericStudioObjectFinish;

type StudioObjectBase = {
  id: string;
  label: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  rotation: number;
  notes?: string;
  seatingCount?: number;
};

export type StudioObjectFinishFor<T extends StudioObjectType> =
  T extends "dance_floor" ? DanceFloorFinish : GenericStudioObjectFinish;

export type StudioObject = {
  [T in StudioObjectType]: StudioObjectBase & {
    type: T;
    finish?: StudioObjectFinishFor<T>;
  };
}[StudioObjectType];

export type StudioObjectOfType<T extends StudioObjectType> = Extract<
  StudioObject,
  { type: T }
>;

export const DRAPE_RUN_TYPES = [
  "wall_drape",
  "partial_drape",
  "backdrop",
  "divider",
] as const;
export type DrapeRunType = (typeof DRAPE_RUN_TYPES)[number];

export const DRAPE_FABRICS = [
  { value: "velvet", label: "Velvet" },
  { value: "velour", label: "Velour" },
  { value: "poly", label: "Poly premier" },
  { value: "sheer", label: "Sheer" },
] as const;
export type DrapeFabric = (typeof DRAPE_FABRICS)[number]["value"];

export const DRAPE_COLORS = [
  { value: "ivory", label: "Ivory", hex: "#eee6d7" },
  { value: "white", label: "White", hex: "#f4f2ed" },
  { value: "black", label: "Black", hex: "#171513" },
  { value: "champagne", label: "Champagne", hex: "#c9ab78" },
  { value: "gold", label: "Gold", hex: "#b98b3d" },
  { value: "navy", label: "Navy", hex: "#1d2a44" },
  { value: "burgundy", label: "Burgundy", hex: "#5a1f2b" },
  { value: "blush", label: "Blush", hex: "#c99b9e" },
  { value: "charcoal", label: "Charcoal", hex: "#343333" },
] as const;
export type DrapeColor = (typeof DRAPE_COLORS)[number]["value"];

export type StudioDrapeRun = {
  id: string;
  type: DrapeRunType;
  wallIndex: number;
  startOffset: number;
  endOffset: number;
  height: number;
  fabric: DrapeFabric;
  color: DrapeColor;
  fullness: number;
  label: string;
  notes?: string;
};

export type StudioRoom = {
  shape: StudioRoomShape;
  name: string;
  wallHeight: number;
  floor: StudioPoint[];
  templateDimensions?: {
    width: number;
    length: number;
    originX?: number;
    originZ?: number;
    cutoutWidth?: number;
    cutoutDepth?: number;
  };
};

export type StudioDesignJson = {
  version: typeof STUDIO_DESIGN_VERSION;
  units: "inches";
  room: StudioRoom;
  openings: StudioOpening[];
  objects: StudioObject[];
  drapeRuns: StudioDrapeRun[];
  view: {
    cameraMode: "orbit";
    transparentWalls?: boolean;
  };
  materials?: StudioMaterials;
  notes: string;
};

export type StudioDesignRow = {
  id: string;
  owner_user_id: string | null;
  created_by_user_id: string | null;
  estimate_request_id: string | null;
  quote_id: string | null;
  job_id: string | null;
  opportunity_ref: string | null;
  title: string;
  status: StudioDesignStatus;
  design_json: StudioDesignJson;
  preview_image_url: string | null;
  thumbnail_data_url: string | null;
  created_at: string;
  updated_at: string;
};

export type StudioTemplateKey = "rectangle" | "l_shape" | "custom";

export const STUDIO_TEMPLATES: Record<StudioTemplateKey, StudioDesignJson> = {
  rectangle: {
    version: 1,
    units: "inches",
    room: {
      shape: "rectangle",
      name: "Main room",
      wallHeight: 144,
      floor: [
        { x: 0, z: 0 },
        { x: 720, z: 0 },
        { x: 720, z: 480 },
        { x: 0, z: 480 },
      ],
      templateDimensions: { width: 720, length: 480 },
    },
    openings: [],
    objects: [],
    drapeRuns: [],
    view: { cameraMode: "orbit", transparentWalls: false },
    materials: { ...DEFAULT_STUDIO_MATERIALS },
    notes: "",
  },
  l_shape: {
    version: 1,
    units: "inches",
    room: {
      shape: "l_shape",
      name: "L-shaped room",
      wallHeight: 144,
      floor: [
        { x: 0, z: 0 },
        { x: 720, z: 0 },
        { x: 720, z: 240 },
        { x: 480, z: 240 },
        { x: 480, z: 480 },
        { x: 0, z: 480 },
      ],
      templateDimensions: {
        width: 720,
        length: 480,
        cutoutWidth: 240,
        cutoutDepth: 240,
      },
    },
    openings: [],
    objects: [],
    drapeRuns: [],
    view: { cameraMode: "orbit", transparentWalls: false },
    materials: { ...DEFAULT_STUDIO_MATERIALS },
    notes: "",
  },
  custom: {
    version: 1,
    units: "inches",
    room: {
      shape: "custom",
      name: "Custom room",
      wallHeight: 144,
      floor: [
        { x: 0, z: 0 },
        { x: 600, z: 0 },
        { x: 600, z: 420 },
        { x: 0, z: 420 },
      ],
    },
    openings: [],
    objects: [],
    drapeRuns: [],
    view: { cameraMode: "orbit", transparentWalls: false },
    materials: { ...DEFAULT_STUDIO_MATERIALS },
    notes: "",
  },
};

export const STUDIO_OBJECT_OPTIONS = [
  {
    type: "stage",
    label: "Stage",
    width: 240,
    depth: 96,
    height: 24,
  },
  {
    type: "dance_floor",
    label: "Dance floor",
    width: 240,
    depth: 240,
    height: 2,
    finish: DEFAULT_DANCE_FLOOR_FINISH,
  },
  {
    type: "entrance_marker",
    label: "Entrance marker",
    width: 72,
    depth: 24,
    height: 84,
  },
  {
    type: "round_table",
    label: "Round table",
    width: 60,
    depth: 60,
    height: 30,
    seatingCount: 8,
  },
  {
    type: "rectangle_table",
    label: "Rectangle table",
    width: 96,
    depth: 36,
    height: 30,
    seatingCount: 8,
  },
  {
    type: "cocktail_table",
    label: "Cocktail table",
    width: 36,
    depth: 36,
    height: 42,
    seatingCount: 4,
  },
  {
    type: "table_area",
    label: "Table area",
    width: 120,
    depth: 120,
    height: 30,
    seatingCount: 10,
  },
  {
    type: "dj_booth",
    label: "DJ booth",
    width: 72,
    depth: 36,
    height: 42,
  },
  {
    type: "bar",
    label: "Bar",
    width: 96,
    depth: 30,
    height: 42,
  },
  {
    type: "lounge_area",
    label: "Lounge area",
    width: 144,
    depth: 120,
    height: 36,
    seatingCount: 8,
  },
] satisfies Array<{
  type: StudioObjectType;
  label: string;
  width: number;
  depth: number;
  height: number;
  finish?: DanceFloorFinish;
  seatingCount?: number;
}>;

export const STUDIO_STATUS_LABELS: Record<StudioDesignStatus, string> = {
  draft: "Draft",
  saved: "Saved",
  archived: "Archived",
};

export function cloneStudioTemplate(
  template: StudioTemplateKey = "rectangle"
): StudioDesignJson {
  return structuredClone(STUDIO_TEMPLATES[template]);
}

export function getDrapeColorHex(color: string): string {
  return DRAPE_COLORS.find((option) => option.value === color)?.hex ?? "#eee6d7";
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getStudioMaterials(design: {
  materials?: unknown;
}): StudioMaterials {
  const materials = isRecord(design.materials) ? design.materials : {};
  const floor = STUDIO_FLOOR_FINISHES.some(
    (option) => option.value === materials.floor
  )
    ? (materials.floor as StudioFloorFinish)
    : DEFAULT_STUDIO_MATERIALS.floor;
  const walls = STUDIO_WALL_FINISHES.some(
    (option) => option.value === materials.walls
  )
    ? (materials.walls as StudioWallFinish)
    : DEFAULT_STUDIO_MATERIALS.walls;
  const lighting = STUDIO_LIGHTING_MOODS.some(
    (option) => option.value === materials.lighting
  )
    ? (materials.lighting as StudioLightingMood)
    : DEFAULT_STUDIO_MATERIALS.lighting;
  return { floor, walls, lighting };
}

function hasStableId(
  value: unknown
): value is Record<string, unknown> & { id: string } {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    value.id.length > 0 &&
    value.id.length <= 100
  );
}

function isRequiredString(value: unknown, maxLength: number): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= maxLength
  );
}

function isOptionalString(value: unknown, maxLength: number): boolean {
  return value === undefined || (typeof value === "string" && value.length <= maxLength);
}

function isOptionalSeatingCount(value: unknown): boolean {
  return (
    value === undefined ||
    (typeof value === "number" &&
      Number.isInteger(value) &&
      value >= 0 &&
      value <= STUDIO_MAX_SEATING_COUNT)
  );
}

function isValidStudioObjectFinish(type: unknown, finish: unknown): boolean {
  if (finish === undefined) return true;
  const options =
    type === "dance_floor" ? DANCE_FLOOR_FINISHES : GENERIC_OBJECT_FINISHES;
  return options.some((option) => option.value === finish);
}

function getFloorWallLength(
  floor: StudioPoint[] | null,
  wallIndex: number
): number | null {
  if (!floor || !Number.isInteger(wallIndex) || wallIndex < 0 || wallIndex >= floor.length) {
    return null;
  }
  const start = floor[wallIndex];
  const end = floor[(wallIndex + 1) % floor.length];
  return Math.hypot(end.x - start.x, end.z - start.z);
}

function pointDistanceSquared(a: StudioPoint, b: StudioPoint): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return dx * dx + dz * dz;
}

function crossProduct(
  a: StudioPoint,
  b: StudioPoint,
  c: StudioPoint
): number {
  return (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
}

function pointOnSegment(
  point: StudioPoint,
  start: StudioPoint,
  end: StudioPoint,
  tolerance: number
): boolean {
  const segmentLength = Math.max(
    1,
    Math.hypot(end.x - start.x, end.z - start.z)
  );
  if (Math.abs(crossProduct(start, end, point)) > tolerance * segmentLength) {
    return false;
  }
  return (
    point.x >= Math.min(start.x, end.x) - tolerance &&
    point.x <= Math.max(start.x, end.x) + tolerance &&
    point.z >= Math.min(start.z, end.z) - tolerance &&
    point.z <= Math.max(start.z, end.z) + tolerance
  );
}

function segmentsIntersect(
  a: StudioPoint,
  b: StudioPoint,
  c: StudioPoint,
  d: StudioPoint,
  tolerance: number
): boolean {
  const abLength = Math.max(1, Math.hypot(b.x - a.x, b.z - a.z));
  const cdLength = Math.max(1, Math.hypot(d.x - c.x, d.z - c.z));
  const abTolerance = tolerance * abLength;
  const cdTolerance = tolerance * cdLength;
  const abc = crossProduct(a, b, c);
  const abd = crossProduct(a, b, d);
  const cda = crossProduct(c, d, a);
  const cdb = crossProduct(c, d, b);

  if (
    ((abc > abTolerance && abd < -abTolerance) ||
      (abc < -abTolerance && abd > abTolerance)) &&
    ((cda > cdTolerance && cdb < -cdTolerance) ||
      (cda < -cdTolerance && cdb > cdTolerance))
  ) {
    return true;
  }

  return (
    (Math.abs(abc) <= abTolerance && pointOnSegment(c, a, b, tolerance)) ||
    (Math.abs(abd) <= abTolerance && pointOnSegment(d, a, b, tolerance)) ||
    (Math.abs(cda) <= cdTolerance && pointOnSegment(a, c, d, tolerance)) ||
    (Math.abs(cdb) <= cdTolerance && pointOnSegment(b, c, d, tolerance))
  );
}

function adjacentEdgesOverlap(
  outerA: StudioPoint,
  shared: StudioPoint,
  outerB: StudioPoint,
  tolerance: number
): boolean {
  const collinear =
    Math.abs(crossProduct(outerA, shared, outerB)) <=
    tolerance *
      Math.max(
        1,
        Math.hypot(shared.x - outerA.x, shared.z - outerA.z),
        Math.hypot(outerB.x - shared.x, outerB.z - shared.z)
      );
  return (
    collinear &&
    (pointOnSegment(outerA, shared, outerB, tolerance) ||
      pointOnSegment(outerB, outerA, shared, tolerance))
  );
}

function validateRoomPolygon(points: StudioPoint[]): string[] {
  const xs = points.map((point) => point.x);
  const zs = points.map((point) => point.z);
  const span = Math.max(
    1,
    Math.max(...xs) - Math.min(...xs),
    Math.max(...zs) - Math.min(...zs)
  );
  const coordinateTolerance = Math.max(1e-7, span * 1e-10);
  const distanceToleranceSquared = coordinateTolerance * coordinateTolerance;
  const errors: string[] = [];

  const hasDuplicateAdjacentPoint = points.some((point, index) => {
    const next = points[(index + 1) % points.length];
    return pointDistanceSquared(point, next) <= distanceToleranceSquared;
  });
  if (hasDuplicateAdjacentPoint) {
    errors.push(
      "The room outline has duplicate neighboring points. Move or remove one of them."
    );
  }

  let doubledArea = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    doubledArea += current.x * next.z - next.x * current.z;
  }
  const areaTolerance = Math.max(1e-4, span * span * 1e-10);
  if (Math.abs(doubledArea) / 2 <= areaTolerance) {
    errors.push(
      "The room outline must enclose a measurable area; its points appear collinear."
    );
  }

  let selfIntersects = false;
  for (
    let firstIndex = 0;
    firstIndex < points.length && !selfIntersects;
    firstIndex += 1
  ) {
    const firstStart = points[firstIndex];
    const firstEnd = points[(firstIndex + 1) % points.length];
    for (
      let secondIndex = firstIndex + 1;
      secondIndex < points.length;
      secondIndex += 1
    ) {
      const secondStart = points[secondIndex];
      const secondEnd = points[(secondIndex + 1) % points.length];
      const consecutive = secondIndex === firstIndex + 1;
      const closesPolygon =
        firstIndex === 0 && secondIndex === points.length - 1;

      if (consecutive) {
        selfIntersects = adjacentEdgesOverlap(
          firstStart,
          firstEnd,
          secondEnd,
          coordinateTolerance
        );
      } else if (closesPolygon) {
        selfIntersects = adjacentEdgesOverlap(
          secondStart,
          secondEnd,
          firstEnd,
          coordinateTolerance
        );
      } else {
        selfIntersects = segmentsIntersect(
          firstStart,
          firstEnd,
          secondStart,
          secondEnd,
          coordinateTolerance
        );
      }
      if (selfIntersects) break;
    }
  }
  if (selfIntersects) {
    errors.push(
      "The room outline crosses or overlaps itself. Adjust the walls so they form one simple boundary."
    );
  }

  return errors;
}

function roomFloorMatchesTemplate(
  actual: StudioPoint[],
  expected: StudioPoint[],
  tolerance = 1e-6
): boolean {
  return (
    actual.length === expected.length &&
    actual.every(
      (point, index) =>
        Math.abs(point.x - expected[index].x) <= tolerance &&
        Math.abs(point.z - expected[index].z) <= tolerance
    )
  );
}

export type StudioValidationResult =
  | { valid: true; design: StudioDesignJson; bytes: number }
  | { valid: false; errors: string[]; bytes: number };

export function validateStudioDesign(
  value: unknown,
  maxBytes = STUDIO_MAX_PAYLOAD_BYTES
): StudioValidationResult {
  let serialized = "";
  try {
    serialized = JSON.stringify(value);
  } catch {
    return { valid: false, errors: ["The room design is not valid JSON."], bytes: 0 };
  }

  const bytes = new TextEncoder().encode(serialized).byteLength;
  const errors: string[] = [];
  if (bytes > maxBytes) {
    errors.push("The room design is too large to save.");
  }
  if (!isRecord(value)) {
    return { valid: false, errors: [...errors, "The room design is invalid."], bytes };
  }
  if (value.version !== STUDIO_DESIGN_VERSION || value.units !== "inches") {
    errors.push("This room design version is not supported.");
  }

  let floorPoints: StudioPoint[] | null = null;
  let expectedTemplateFloor: StudioPoint[] | null = null;
  const room = value.room;
  if (!isRecord(room)) {
    errors.push("Room details are required.");
  } else {
    if (!ROOM_SHAPES.includes(room.shape as StudioRoomShape)) {
      errors.push("Choose a supported room shape.");
    }
    if (
      typeof room.name !== "string" ||
      room.name.trim().length === 0 ||
      room.name.length > STUDIO_LABEL_MAX_LENGTH
    ) {
      errors.push("Enter a room name under 160 characters.");
    }
    if (
      !isFiniteNumber(room.wallHeight) ||
      room.wallHeight < 72 ||
      room.wallHeight > 600
    ) {
      errors.push("Wall height must be between 6 and 50 feet.");
    }
    const templateDimensions = room.templateDimensions;
    if (room.shape === "custom") {
      if (templateDimensions !== undefined) {
        errors.push("Custom room outlines cannot include template dimensions.");
      }
    } else if (room.shape === "rectangle" || room.shape === "l_shape") {
      const minimumSide = room.shape === "l_shape" ? 24 : 12;
      if (
        !isRecord(templateDimensions) ||
        !isFiniteNumber(templateDimensions.width) ||
        templateDimensions.width < minimumSide ||
        templateDimensions.width > 120000 ||
        !isFiniteNumber(templateDimensions.length) ||
        templateDimensions.length < minimumSide ||
        templateDimensions.length > 120000 ||
        (templateDimensions.originX !== undefined &&
          (!isFiniteNumber(templateDimensions.originX) ||
            Math.abs(templateDimensions.originX) > 120000)) ||
        (templateDimensions.originZ !== undefined &&
          (!isFiniteNumber(templateDimensions.originZ) ||
            Math.abs(templateDimensions.originZ) > 120000))
      ) {
        errors.push(
          "Room template width and length must use valid, in-range dimensions."
        );
      } else if (room.shape === "l_shape") {
        if (
          !isFiniteNumber(templateDimensions.cutoutWidth) ||
          templateDimensions.cutoutWidth < 12 ||
          templateDimensions.cutoutWidth >
            templateDimensions.width - 12 ||
          !isFiniteNumber(templateDimensions.cutoutDepth) ||
          templateDimensions.cutoutDepth < 12 ||
          templateDimensions.cutoutDepth >
            templateDimensions.length - 12
        ) {
          errors.push(
            "L-shape cutout dimensions must fit inside the room with at least one foot remaining."
          );
        } else {
          const originX = templateDimensions.originX ?? 0;
          const originZ = templateDimensions.originZ ?? 0;
          expectedTemplateFloor = createLShapeRoom(
            templateDimensions.width,
            templateDimensions.length,
            templateDimensions.cutoutWidth,
            templateDimensions.cutoutDepth
          ).map((point) => ({
            x: point.x + originX,
            z: point.z + originZ,
          }));
        }
      } else if (
        templateDimensions.cutoutWidth !== undefined ||
        templateDimensions.cutoutDepth !== undefined
      ) {
        errors.push(
          "Rectangle room templates cannot include L-shape cutout dimensions."
        );
      } else {
        const originX = templateDimensions.originX ?? 0;
        const originZ = templateDimensions.originZ ?? 0;
        expectedTemplateFloor = createRectangleRoom(
          templateDimensions.width,
          templateDimensions.length
        ).map((point) => ({
          x: point.x + originX,
          z: point.z + originZ,
        }));
      }
    }
    const floor = room.floor;
    const minimumPoints = room.shape === "l_shape" ? 6 : 4;
    if (!Array.isArray(floor) || floor.length < minimumPoints || floor.length > 64) {
      errors.push(`The ${String(room.shape)} room outline is incomplete.`);
    } else if (
      floor.some(
        (point) =>
          !isRecord(point) ||
          !isFiniteNumber(point.x) ||
          !isFiniteNumber(point.z) ||
          Math.abs(point.x) > 120000 ||
          Math.abs(point.z) > 120000
      )
    ) {
      errors.push("Room outline points must use valid dimensions.");
    } else {
      floorPoints = floor as StudioPoint[];
      errors.push(...validateRoomPolygon(floorPoints));
      if (
        expectedTemplateFloor &&
        !roomFloorMatchesTemplate(floorPoints, expectedTemplateFloor)
      ) {
        errors.push(
          "The room outline does not match its template dimensions. Reapply the room dimensions before saving."
        );
      }
    }
  }

  const seenIds = new Set<string>();
  const openings = value.openings;
  if (!Array.isArray(openings) || openings.length > 100) {
    errors.push("Openings must be a valid list.");
  } else {
    for (const opening of openings) {
      const stableId = hasStableId(opening);
      if (stableId && seenIds.has(opening.id)) {
        errors.push("Studio item IDs must be unique.");
        break;
      }
      if (stableId) seenIds.add(opening.id);
      const wallIndex =
        isRecord(opening) && isFiniteNumber(opening.wallIndex)
          ? opening.wallIndex
          : -1;
      const wallLength = getFloorWallLength(floorPoints, wallIndex);
      if (
        !stableId ||
        !isRecord(opening) ||
        (opening.type !== "door" && opening.type !== "entrance") ||
        !isRequiredString(opening.label, STUDIO_LABEL_MAX_LENGTH) ||
        !Number.isInteger(wallIndex) ||
        wallLength === null ||
        !isFiniteNumber(opening.offset) ||
        opening.offset < 0 ||
        opening.offset > 120000 ||
        !isFiniteNumber(opening.width) ||
        opening.width <= 0 ||
        opening.width > 120000 ||
        (wallLength !== null &&
          opening.offset + opening.width > wallLength + 0.001)
      ) {
        errors.push("One or more door/opening markers are invalid.");
        break;
      }
    }
  }

  const objects = value.objects;
  if (!Array.isArray(objects) || objects.length > 100) {
    errors.push("Room objects must be a valid list.");
  } else {
    for (const object of objects) {
      const stableId = hasStableId(object);
      if (stableId && seenIds.has(object.id)) {
        errors.push("Studio item IDs must be unique.");
        break;
      }
      if (stableId) seenIds.add(object.id);
      if (
        !stableId ||
        !isRecord(object) ||
        !STUDIO_OBJECT_TYPES.includes(object.type as StudioObjectType) ||
        !isRequiredString(object.label, STUDIO_LABEL_MAX_LENGTH) ||
        !isFiniteNumber(object.x) ||
        Math.abs(object.x) > 120000 ||
        !isFiniteNumber(object.z) ||
        Math.abs(object.z) > 120000 ||
        !isFiniteNumber(object.width) ||
        object.width <= 0 ||
        object.width > 120000 ||
        !isFiniteNumber(object.depth) ||
        object.depth <= 0 ||
        object.depth > 120000 ||
        !isFiniteNumber(object.height) ||
        object.height < 0 ||
        object.height > 600 ||
        !isFiniteNumber(object.rotation) ||
        Math.abs(object.rotation) > 36000 ||
        !isOptionalString(object.notes, STUDIO_OBJECT_NOTES_MAX_LENGTH) ||
        !isValidStudioObjectFinish(object.type, object.finish) ||
        !isOptionalSeatingCount(object.seatingCount)
      ) {
        errors.push("One or more room objects are invalid.");
        break;
      }
    }
  }

  const drapeRuns = value.drapeRuns;
  if (!Array.isArray(drapeRuns) || drapeRuns.length > 200) {
    errors.push("Drape runs must be a valid list.");
  } else {
    for (const drape of drapeRuns) {
      const stableId = hasStableId(drape);
      if (stableId && seenIds.has(drape.id)) {
        errors.push("Studio item IDs must be unique.");
        break;
      }
      if (stableId) seenIds.add(drape.id);
      const wallIndex =
        isRecord(drape) && isFiniteNumber(drape.wallIndex)
          ? drape.wallIndex
          : -1;
      const wallLength = getFloorWallLength(floorPoints, wallIndex);
      if (
        !stableId ||
        !isRecord(drape) ||
        !DRAPE_RUN_TYPES.includes(drape.type as DrapeRunType) ||
        !DRAPE_FABRICS.some((fabric) => fabric.value === drape.fabric) ||
        !DRAPE_COLORS.some((color) => color.value === drape.color) ||
        !isRequiredString(drape.label, STUDIO_LABEL_MAX_LENGTH) ||
        !isOptionalString(drape.notes, STUDIO_NOTES_MAX_LENGTH) ||
        !Number.isInteger(wallIndex) ||
        wallLength === null ||
        !isFiniteNumber(drape.startOffset) ||
        drape.startOffset < 0 ||
        drape.startOffset > 120000 ||
        !isFiniteNumber(drape.endOffset) ||
        drape.endOffset <= drape.startOffset ||
        drape.endOffset > 120000 ||
        (wallLength !== null && drape.endOffset > wallLength + 0.001) ||
        !isFiniteNumber(drape.height) ||
        drape.height <= 0 ||
        drape.height > 600 ||
        !isFiniteNumber(drape.fullness) ||
        drape.fullness < 1 ||
        drape.fullness > 4
      ) {
        errors.push("One or more drape runs are invalid.");
        break;
      }
    }
  }

  if (
    typeof value.notes !== "string" ||
    value.notes.length > STUDIO_NOTES_MAX_LENGTH
  ) {
    errors.push(`Design notes must be under ${STUDIO_NOTES_MAX_LENGTH} characters.`);
  }

  if (
    !isRecord(value.view) ||
    value.view.cameraMode !== "orbit" ||
    (value.view.transparentWalls !== undefined &&
      typeof value.view.transparentWalls !== "boolean")
  ) {
    errors.push("Studio view settings are invalid.");
  }

  if (value.materials !== undefined) {
    const materials = value.materials;
    if (
      !isRecord(materials) ||
      !STUDIO_FLOOR_FINISHES.some(
        (option) => option.value === materials.floor
      ) ||
      !STUDIO_WALL_FINISHES.some(
        (option) => option.value === materials.walls
      ) ||
      !STUDIO_LIGHTING_MOODS.some(
        (option) => option.value === materials.lighting
      )
    ) {
      errors.push("Studio room finish settings are invalid.");
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors, bytes };
  }
  return {
    valid: true,
    design: {
      ...(value as StudioDesignJson),
      materials: getStudioMaterials(value),
    },
    bytes,
  };
}

export function createStudioItemId(prefix: "drape" | "object" | "opening"): string {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  return `${prefix}_${id}`;
}
