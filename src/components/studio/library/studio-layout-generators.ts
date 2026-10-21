import {
  createStudioObject,
  getStudioObjectOption,
  type StudioDesignJson,
  type StudioObject,
  type StudioObjectType,
  type StudioPoint,
} from "@/data/studio";
import {
  getPolygonCentroid,
  getStudioBounds,
  type StudioBounds,
} from "@/lib/studio-geometry";
import { isStudioPointInRoom } from "@/lib/studio-interactions";
import { footprintInsideRoom } from "./studio-library-placement";

export type StudioLayoutKey =
  | "banquet_grid"
  | "banquet_rows"
  | "classroom"
  | "ceremony"
  | "cocktail"
  | "gala";

export type StudioLayoutConfig = {
  key: StudioLayoutKey;
  label: string;
  description: string;
  countLabel: string;
  count: { min: number; max: number; step: number; default: number };
  spacingLabel: string;
  /** Inches. */
  spacing: { min: number; max: number; step: number; default: number };
};

export const STUDIO_LAYOUTS: StudioLayoutConfig[] = [
  {
    key: "banquet_grid",
    label: "Banquet grid",
    description: "60″ rounds in an even grid",
    countLabel: "Round tables",
    count: { min: 2, max: 80, step: 1, default: 12 },
    spacingLabel: "Table spacing",
    spacing: { min: 108, max: 192, step: 6, default: 126 },
  },
  {
    key: "banquet_rows",
    label: "Banquet rows",
    description: "Long 8′ tables, seats both sides",
    countLabel: "Tables",
    count: { min: 2, max: 80, step: 1, default: 12 },
    spacingLabel: "Row spacing",
    spacing: { min: 84, max: 144, step: 6, default: 102 },
  },
  {
    key: "classroom",
    label: "Classroom",
    description: "Rows facing a podium & screen",
    countLabel: "Tables",
    count: { min: 2, max: 80, step: 1, default: 12 },
    spacingLabel: "Row spacing",
    spacing: { min: 54, max: 96, step: 6, default: 66 },
  },
  {
    key: "ceremony",
    label: "Ceremony",
    description: "Seating, aisle & altar backdrop",
    countLabel: "Guests",
    count: { min: 20, max: 500, step: 10, default: 120 },
    spacingLabel: "Row pitch",
    spacing: { min: 32, max: 48, step: 2, default: 36 },
  },
  {
    key: "cocktail",
    label: "Cocktail party",
    description: "High-tops, bar & lounge",
    countLabel: "High-tops",
    count: { min: 4, max: 60, step: 1, default: 14 },
    spacingLabel: "Mingle spacing",
    spacing: { min: 72, max: 168, step: 6, default: 108 },
  },
  {
    key: "gala",
    label: "Gala",
    description: "Stage, dance floor & rounds",
    countLabel: "Guests",
    count: { min: 40, max: 800, step: 10, default: 200 },
    spacingLabel: "Table spacing",
    spacing: { min: 120, max: 192, step: 6, default: 132 },
  },
];

export function getStudioLayoutConfig(key: StudioLayoutKey) {
  return STUDIO_LAYOUTS.find((layout) => layout.key === key) ?? STUDIO_LAYOUTS[0];
}

export type StudioLayoutResult = {
  objects: StudioObject[];
  /** Primary items requested vs actually placed (tables / guests). */
  requested: number;
  placed: number;
};

type Rect = { minX: number; maxX: number; minZ: number; maxZ: number };

const WALL_MARGIN = 24;
const ALTAR_LABEL = "Altar backdrop";

type RoomContext = {
  floor: StudioPoint[];
  bounds: StudioBounds;
  center: StudioPoint;
};

function roomContext(design: StudioDesignJson): RoomContext {
  const floor = design.room.floor;
  const bounds = getStudioBounds(floor);
  const centroid = getPolygonCentroid(floor);
  return {
    floor,
    bounds,
    center: isStudioPointInRoom(centroid, floor)
      ? centroid
      : { x: bounds.centerX, z: bounds.centerZ },
  };
}

function rectAround(x: number, z: number, halfX: number, halfZ: number): Rect {
  return { minX: x - halfX, maxX: x + halfX, minZ: z - halfZ, maxZ: z + halfZ };
}

function inflate(rect: Rect, by: number): Rect {
  return {
    minX: rect.minX - by,
    maxX: rect.maxX + by,
    minZ: rect.minZ - by,
    maxZ: rect.maxZ + by,
  };
}

function intersects(a: Rect, b: Rect) {
  return a.minX < b.maxX && a.maxX > b.minX && a.minZ < b.maxZ && a.maxZ > b.minZ;
}

function fits(ctx: RoomContext, x: number, z: number, halfX: number, halfZ: number) {
  return footprintInsideRoom(
    ctx.floor,
    x,
    z,
    halfX + WALL_MARGIN,
    halfZ + WALL_MARGIN
  );
}

type LatticeOptions = {
  anchor: StudioPoint;
  spacingX: number;
  spacingZ: number;
  halfX: number;
  halfZ: number;
  reserved?: Rect[];
  stagger?: boolean;
};

/**
 * Tries quarter-spacing phases per axis (and staggered rows when reserved
 * zones break up the grid) and keeps the best fit; ties keep the symmetric
 * whole-spacing phase.
 */
function latticePoints(ctx: RoomContext, options: LatticeOptions): StudioPoint[] {
  let best: StudioPoint[] = [];
  const staggers = options.stagger || options.reserved?.length ? [false, true] : [false];
  for (const stagger of staggers) {
    for (const phaseX of [0, 0.5, 0.25, 0.75]) {
      for (const phaseZ of [0, 0.5, 0.25, 0.75]) {
        const points = latticePhase(ctx, {
          ...options,
          stagger: options.stagger || stagger,
          anchor: {
            x: options.anchor.x + phaseX * options.spacingX,
            z: options.anchor.z + phaseZ * options.spacingZ,
          },
        });
        if (points.length > best.length) best = points;
      }
    }
  }
  return best;
}

function latticePhase(ctx: RoomContext, options: LatticeOptions): StudioPoint[] {
  const { anchor, spacingX, spacingZ, halfX, halfZ } = options;
  const reserved = options.reserved ?? [];
  const { bounds } = ctx;
  const iMin = Math.floor((bounds.minX - anchor.x) / spacingX) - 1;
  const iMax = Math.ceil((bounds.maxX - anchor.x) / spacingX) + 1;
  const jMin = Math.floor((bounds.minZ - anchor.z) / spacingZ) - 1;
  const jMax = Math.ceil((bounds.maxZ - anchor.z) / spacingZ) + 1;
  const points: StudioPoint[] = [];
  for (let j = jMin; j <= jMax; j += 1) {
    const shift = options.stagger && Math.abs(j) % 2 === 1 ? spacingX / 2 : 0;
    for (let i = iMin; i <= iMax; i += 1) {
      const x = anchor.x + i * spacingX + shift;
      const z = anchor.z + j * spacingZ;
      if (!fits(ctx, x, z, halfX, halfZ)) continue;
      const rect = rectAround(x, z, halfX, halfZ);
      if (reserved.some((zone) => intersects(rect, zone))) continue;
      points.push({ x, z });
    }
  }
  return points;
}

/** Picks the `count` points closest to `anchor`, shaped like the room. */
function pickCentral(
  ctx: RoomContext,
  points: StudioPoint[],
  anchor: StudioPoint,
  count: number,
  metric: "room" | "radial" = "room"
): StudioPoint[] {
  const { width, depth } = ctx.bounds;
  return [...points]
    .map((point) => {
      const dx = point.x - anchor.x;
      const dz = point.z - anchor.z;
      const score =
        metric === "radial"
          ? Math.hypot(dx, dz)
          : Math.max(Math.abs(dx) / width, Math.abs(dz) / depth) * 1000 +
            Math.hypot(dx, dz) / 1000;
      return { point, score };
    })
    .sort((a, b) => a.score - b.score)
    .slice(0, Math.max(0, count))
    .map(({ point }) => point)
    .sort((a, b) => a.z - b.z || a.x - b.x);
}

function place(
  type: StudioObjectType,
  point: StudioPoint,
  overrides: Partial<Omit<StudioObject, "type">> = {}
): StudioObject {
  return createStudioObject(
    type,
    { x: Math.round(point.x), z: Math.round(point.z) },
    overrides
  );
}

function numbered(objects: StudioObject[], base: string): StudioObject[] {
  return objects.map((object, index) => ({
    ...object,
    label: `${base} ${index + 1}`,
  }));
}

function frontZ(ctx: RoomContext, depth: number) {
  return ctx.bounds.minZ + WALL_MARGIN + depth / 2;
}

function backZ(ctx: RoomContext, depth: number) {
  return ctx.bounds.maxZ - WALL_MARGIN - depth / 2;
}

/** Nudges a point toward the room centre until the footprint fits. */
function settle(
  ctx: RoomContext,
  point: StudioPoint,
  halfX: number,
  halfZ: number
): StudioPoint | null {
  for (let step = 0; step <= 12; step += 1) {
    const t = step / 12;
    const x = point.x + (ctx.center.x - point.x) * t;
    const z = point.z + (ctx.center.z - point.z) * t;
    if (fits(ctx, x, z, halfX, halfZ)) return { x, z };
  }
  return null;
}

function banquetGrid(ctx: RoomContext, count: number, spacing: number) {
  const half = 52;
  const points = pickCentral(
    ctx,
    latticePoints(ctx, {
      anchor: ctx.center,
      spacingX: spacing,
      spacingZ: spacing,
      halfX: half,
      halfZ: half,
    }),
    ctx.center,
    count
  );
  return {
    objects: numbered(
      points.map((point) => place("round_table", point)),
      "Table"
    ),
    requested: count,
    placed: points.length,
  };
}

function banquetRows(ctx: RoomContext, count: number, spacing: number) {
  const points = pickCentral(
    ctx,
    latticePoints(ctx, {
      anchor: ctx.center,
      spacingX: 102,
      spacingZ: spacing,
      halfX: 48,
      halfZ: 40,
    }),
    ctx.center,
    count
  );
  return {
    objects: numbered(
      points.map((point) => place("rectangle_table", point)),
      "Banquet table"
    ),
    requested: count,
    placed: points.length,
  };
}

function classroom(ctx: RoomContext, count: number, spacing: number) {
  const objects: StudioObject[] = [];
  const presenterZ = frontZ(ctx, 24);
  const screen = settle(ctx, { x: ctx.center.x, z: presenterZ }, 60, 12);
  if (screen) objects.push(place("av_screen", screen));
  const podium = settle(
    ctx,
    { x: ctx.center.x + 108, z: presenterZ + 30 },
    12,
    10
  );
  if (podium) objects.push(place("podium", podium));
  const presenterZone: Rect = {
    minX: ctx.bounds.minX,
    maxX: ctx.bounds.maxX,
    minZ: ctx.bounds.minZ,
    maxZ: presenterZ + 120,
  };
  const anchor = {
    x: ctx.center.x,
    z: presenterZone.maxZ + 30 + WALL_MARGIN,
  };
  const candidates = latticePoints(ctx, {
    anchor,
    spacingX: 102,
    spacingZ: spacing,
    halfX: 48,
    halfZ: 30,
    reserved: [presenterZone],
  });
  const points = [...candidates]
    .sort(
      (a, b) =>
        a.z - b.z ||
        Math.abs(a.x - anchor.x) - Math.abs(b.x - anchor.x)
    )
    .slice(0, count)
    .sort((a, b) => a.z - b.z || a.x - b.x);
  objects.push(
    ...numbered(
      points.map((point) =>
        place("rectangle_table", point, {
          depth: 24,
          seatingCount: 3,
          linenColor: "white",
        })
      ),
      "Classroom table"
    )
  );
  return { objects, requested: count, placed: points.length };
}

function ceremony(ctx: RoomContext, guests: number, rowPitch: number) {
  const objects: StudioObject[] = [];
  const seatWidth = 22;
  const aisle = 60;
  const usableWidth = ctx.bounds.width - WALL_MARGIN * 2 - 24;
  const maxPerRow = Math.max(
    4,
    Math.floor((usableWidth - aisle) / seatWidth / 2) * 2
  );
  const idealPerRow = Math.max(
    4,
    Math.ceil(Math.sqrt(guests * 2.2) / 2) * 2
  );
  const perRow = Math.min(maxPerRow, idealPerRow);

  const altarDepth = 24;
  const altarZ = frontZ(ctx, altarDepth) + 12;
  const altar = settle(ctx, { x: ctx.center.x, z: altarZ }, 72, 12);
  const seatingFront = (altar?.z ?? altarZ) + altarDepth / 2 + 120;
  const availableDepth = ctx.bounds.maxZ - WALL_MARGIN - 72 - seatingFront;
  const maxRows = Math.max(1, Math.floor(availableDepth / rowPitch));
  let rows = Math.min(maxRows, Math.ceil(guests / perRow));
  const width = perRow * seatWidth + aisle;

  let block: StudioPoint | null = null;
  while (rows >= 1 && !block) {
    const depth = rows * rowPitch;
    const candidate = { x: ctx.center.x, z: seatingFront + depth / 2 };
    if (fits(ctx, candidate.x, candidate.z, width / 2, depth / 2)) {
      block = candidate;
    } else {
      rows -= 1;
    }
  }

  if (altar) {
    objects.push(
      place("drape_backdrop", altar, {
        label: ALTAR_LABEL,
        width: 144,
        fabric: "sheer",
        drapeColor: "ivory",
      })
    );
    for (const side of [-1, 1]) {
      const plant = settle(ctx, { x: altar.x + side * 96, z: altar.z + 12 }, 12, 12);
      if (plant) objects.push(place("plant", plant, { label: "Altar greenery" }));
    }
  }

  let placed = 0;
  if (block) {
    const depth = rows * rowPitch;
    placed = Math.min(guests, rows * perRow);
    objects.push(
      place("ceremony_seating", block, {
        label: "Ceremony seating",
        width,
        depth,
        seatingCount: placed,
      })
    );
    const archZ = block.z + depth / 2 + 48;
    if (fits(ctx, block.x, archZ, 36, 12)) {
      objects.push(
        place("entrance_marker", { x: block.x, z: archZ }, {
          label: "Aisle entrance arch",
        })
      );
    }
  }
  return { objects, requested: guests, placed };
}

function jitter(index: number, amount: number) {
  const value = Math.sin(index * 12.9898 + 78.233) * 43758.5453;
  return (value - Math.floor(value) - 0.5) * 2 * amount;
}

function cocktail(ctx: RoomContext, count: number, spacing: number) {
  const objects: StudioObject[] = [];
  const reserved: Rect[] = [];

  const bar = settle(ctx, { x: ctx.center.x, z: backZ(ctx, 30) }, 48, 15);
  if (bar) {
    objects.push(place("bar", bar, { rotation: 180 }));
    reserved.push(inflate(rectAround(bar.x, bar.z, 48, 15), 72));
  }
  const loungeOption = getStudioObjectOption("lounge_area");
  const loungeHalfX = (loungeOption?.width ?? 144) / 2;
  const loungeHalfZ = (loungeOption?.depth ?? 120) / 2;
  const lounge = settle(
    ctx,
    {
      x: ctx.bounds.minX + WALL_MARGIN + loungeHalfX,
      z: ctx.bounds.minZ + WALL_MARGIN + loungeHalfZ,
    },
    loungeHalfX,
    loungeHalfZ
  );
  if (lounge) {
    objects.push(place("lounge_area", lounge));
    reserved.push(inflate(rectAround(lounge.x, lounge.z, loungeHalfX, loungeHalfZ), 36));
  }

  const points = pickCentral(
    ctx,
    latticePoints(ctx, {
      anchor: ctx.center,
      spacingX: spacing,
      spacingZ: spacing * 0.87,
      halfX: 36,
      halfZ: 36,
      reserved,
      stagger: true,
    }),
    ctx.center,
    count,
    "radial"
  ).map((point, index) => {
    const moved = {
      x: point.x + jitter(index, 10),
      z: point.z + jitter(index + 31, 10),
    };
    return fits(ctx, moved.x, moved.z, 15, 15) ? moved : point;
  });
  objects.push(
    ...numbered(
      points.map((point) => place("cocktail_table", point)),
      "High-top"
    )
  );
  return { objects, requested: count, placed: points.length };
}

function gala(ctx: RoomContext, guests: number, spacing: number) {
  const objects: StudioObject[] = [];
  const reserved: Rect[] = [];

  const stageWidth = Math.min(288, Math.max(144, ctx.bounds.width * 0.35));
  const stage = settle(ctx, { x: ctx.center.x, z: frontZ(ctx, 96) }, stageWidth / 2, 48);
  if (stage) {
    objects.push(place("stage", stage, { width: Math.round(stageWidth) }));
    reserved.push(inflate(rectAround(stage.x, stage.z, stageWidth / 2, 48), 48));
  }

  const danceFeet = Math.sqrt(guests * 3 * 0.45);
  const maxSide = Math.min(ctx.bounds.width, ctx.bounds.depth) * 0.4;
  const danceSide = Math.min(
    Math.max(144, Math.round(danceFeet / 3) * 36),
    Math.max(144, Math.floor(maxSide / 36) * 36)
  );
  const danceAnchor = {
    x: ctx.center.x,
    z: stage
      ? Math.min(
          ctx.center.z,
          stage.z + 48 + 72 + danceSide / 2
        )
      : ctx.center.z,
  };
  const dance = settle(ctx, danceAnchor, danceSide / 2, danceSide / 2);
  if (dance) {
    objects.push(
      place("dance_floor", dance, { width: danceSide, depth: danceSide })
    );
    reserved.push(inflate(rectAround(dance.x, dance.z, danceSide / 2, danceSide / 2), 30));
  }

  const tables = Math.ceil(guests / 10);
  const focus = dance ?? ctx.center;
  const points = pickCentral(
    ctx,
    latticePoints(ctx, {
      anchor: focus,
      spacingX: spacing,
      spacingZ: spacing,
      halfX: 58,
      halfZ: 58,
      reserved,
    }),
    focus,
    tables,
    "radial"
  );
  objects.push(
    ...numbered(
      points.map((point) =>
        place("round_table", point, {
          width: 72,
          depth: 72,
          seatingCount: 10,
        })
      ),
      "Gala round"
    )
  );
  return {
    objects,
    requested: guests,
    placed: Math.min(guests, points.length * 10),
  };
}

export function generateStudioLayout(
  design: StudioDesignJson,
  key: StudioLayoutKey,
  count: number,
  spacing: number
): StudioLayoutResult {
  const ctx = roomContext(design);
  switch (key) {
    case "banquet_grid":
      return banquetGrid(ctx, count, spacing);
    case "banquet_rows":
      return banquetRows(ctx, count, spacing);
    case "classroom":
      return classroom(ctx, count, spacing);
    case "ceremony":
      return ceremony(ctx, count, spacing);
    case "cocktail":
      return cocktail(ctx, count, spacing);
    case "gala":
      return gala(ctx, count, spacing);
  }
}

/** Object types a "replace" clears; venue architecture and drapery stay. */
const PRESERVED_ON_REPLACE: readonly StudioObjectType[] = [
  "column",
  "drape_backdrop",
  "ceiling_drape",
  "chandelier",
];

export function clearFurnitureForLayout(
  objects: StudioObject[]
): StudioObject[] {
  return objects.filter(
    (object) =>
      object.locked ||
      (PRESERVED_ON_REPLACE.includes(object.type) &&
        object.label !== ALTAR_LABEL)
  );
}
