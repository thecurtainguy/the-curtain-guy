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
  | "family_style"
  | "buffet"
  | "gala"
  | "wedding"
  | "ceremony"
  | "theater"
  | "classroom"
  | "cocktail"
  | "trade_show"
  | "runway";

export type StudioLayoutConfig = {
  key: StudioLayoutKey;
  label: string;
  description: string;
  countLabel: string;
  count: { min: number; max: number; step: number; default: number };
  spacingLabel: string;
  /** Inches. */
  spacing: { min: number; max: number; step: number; default: number };
  /** Row pitches read better in inches than feet. */
  spacingInInches?: boolean;
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
    key: "family_style",
    label: "Family style",
    description: "Head table & long joined runs",
    countLabel: "Tables",
    count: { min: 2, max: 60, step: 1, default: 12 },
    spacingLabel: "Run spacing",
    spacing: { min: 84, max: 144, step: 6, default: 108 },
  },
  {
    key: "buffet",
    label: "Buffet dinner",
    description: "Buffet line, bar & rounds",
    countLabel: "Guests",
    count: { min: 40, max: 400, step: 10, default: 120 },
    spacingLabel: "Table spacing",
    spacing: { min: 108, max: 192, step: 6, default: 126 },
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
  {
    key: "wedding",
    label: "Wedding reception",
    description: "Sweetheart, dance floor & rounds",
    countLabel: "Guests",
    count: { min: 40, max: 400, step: 10, default: 120 },
    spacingLabel: "Table spacing",
    spacing: { min: 108, max: 192, step: 6, default: 132 },
  },
  {
    key: "ceremony",
    label: "Ceremony",
    description: "Seating, aisle & altar backdrop",
    countLabel: "Guests",
    count: { min: 20, max: 500, step: 10, default: 120 },
    spacingLabel: "Row pitch",
    spacing: { min: 32, max: 48, step: 2, default: 36 },
    spacingInInches: true,
  },
  {
    key: "theater",
    label: "Theater",
    description: "Stage, screen & rows of seats",
    countLabel: "Guests",
    count: { min: 20, max: 800, step: 10, default: 200 },
    spacingLabel: "Row pitch",
    spacing: { min: 32, max: 48, step: 2, default: 36 },
    spacingInInches: true,
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
    key: "cocktail",
    label: "Cocktail party",
    description: "High-tops, bar & lounge",
    countLabel: "High-tops",
    count: { min: 4, max: 60, step: 1, default: 14 },
    spacingLabel: "Mingle spacing",
    spacing: { min: 72, max: 168, step: 6, default: 108 },
  },
  {
    key: "trade_show",
    label: "Trade show",
    description: "10′×10′ drape booths & aisles",
    countLabel: "Booths",
    count: { min: 2, max: 60, step: 1, default: 16 },
    spacingLabel: "Aisle width",
    spacing: { min: 72, max: 144, step: 6, default: 120 },
  },
  {
    key: "runway",
    label: "Fashion runway",
    description: "Catwalk, backdrop & side seating",
    countLabel: "Guests",
    count: { min: 20, max: 400, step: 10, default: 120 },
    spacingLabel: "Row pitch",
    spacing: { min: 32, max: 48, step: 2, default: 36 },
    spacingInInches: true,
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
const SWEETHEART_BACKDROP_LABEL = "Sweetheart backdrop";
const RUNWAY_BACKDROP_LABEL = "Runway backdrop";
const BOOTH_WALL_LABEL = "Booth back wall";
const BOOTH_RAIL_LABEL = "Booth side rail";
/** Backdrops a layout generates itself, so "replace" swaps them out with the furniture. */
const LAYOUT_DRAPE_LABELS: ReadonlySet<string> = new Set([
  ALTAR_LABEL,
  SWEETHEART_BACKDROP_LABEL,
  RUNWAY_BACKDROP_LABEL,
  BOOTH_WALL_LABEL,
  BOOTH_RAIL_LABEL,
]);

type RoomContext = {
  floor: StudioPoint[];
  bounds: StudioBounds;
  center: StudioPoint;
};

/** Layouts only depend on the room outline. */
type StudioLayoutRoom = { room: Pick<StudioDesignJson["room"], "floor"> };

function roomContext(design: StudioLayoutRoom): RoomContext {
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

const SEAT_WIDTH = 22;
const CENTRE_AISLE = 60;

type SeatBlock = { center: StudioPoint; width: number; depth: number; seats: number };

/**
 * Chair rows split by a centre aisle, starting at `front` and growing toward
 * the back wall; drops rows until the block fits the room.
 */
function seatingBlock(
  ctx: RoomContext,
  guests: number,
  rowPitch: number,
  front: number,
  backClearance: number
): SeatBlock | null {
  const usableWidth = ctx.bounds.width - WALL_MARGIN * 2 - 24;
  const maxPerRow = Math.max(4, Math.floor((usableWidth - CENTRE_AISLE) / SEAT_WIDTH / 2) * 2);
  const idealPerRow = Math.max(4, Math.ceil(Math.sqrt(guests * 2.2) / 2) * 2);
  const perRow = Math.min(maxPerRow, idealPerRow);
  const availableDepth = ctx.bounds.maxZ - WALL_MARGIN - backClearance - front;
  const width = perRow * SEAT_WIDTH + CENTRE_AISLE;
  for (
    let rows = Math.min(Math.max(1, Math.floor(availableDepth / rowPitch)), Math.ceil(guests / perRow));
    rows >= 1;
    rows -= 1
  ) {
    const depth = rows * rowPitch;
    const center = { x: ctx.center.x, z: front + depth / 2 };
    if (fits(ctx, center.x, center.z, width / 2, depth / 2)) {
      return { center, width, depth, seats: Math.min(guests, rows * perRow) };
    }
  }
  return null;
}

function ceremony(ctx: RoomContext, guests: number, rowPitch: number) {
  const objects: StudioObject[] = [];
  const altarDepth = 24;
  const altarZ = frontZ(ctx, altarDepth) + 12;
  const altar = settle(ctx, { x: ctx.center.x, z: altarZ }, 72, 12);
  const seating = seatingBlock(
    ctx,
    guests,
    rowPitch,
    (altar?.z ?? altarZ) + altarDepth / 2 + 120,
    72
  );

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

  if (seating) {
    const { center, width, depth, seats } = seating;
    objects.push(
      place("ceremony_seating", center, {
        label: "Ceremony seating",
        width,
        depth,
        seatingCount: seats,
      })
    );
    const archZ = center.z + depth / 2 + 48;
    if (fits(ctx, center.x, archZ, 36, 12)) {
      objects.push(
        place("entrance_marker", { x: center.x, z: archZ }, {
          label: "Aisle entrance arch",
        })
      );
    }
  }
  return { objects, requested: guests, placed: seating?.seats ?? 0 };
}

function theater(ctx: RoomContext, guests: number, rowPitch: number) {
  const objects: StudioObject[] = [];
  const screen = settle(ctx, { x: ctx.center.x, z: frontZ(ctx, 24) }, 60, 12);
  if (screen) objects.push(place("av_screen", screen));
  const stageWidth = Math.min(360, Math.max(192, Math.round((ctx.bounds.width * 0.5) / 24) * 24));
  const stageZ = (screen?.z ?? frontZ(ctx, 24)) + 12 + 48 + 12;
  const stage = settle(ctx, { x: ctx.center.x, z: stageZ }, stageWidth / 2, 48);
  if (stage) objects.push(place("stage", stage, { width: stageWidth }));
  const seating = seatingBlock(ctx, guests, rowPitch, (stage?.z ?? stageZ) + 48 + 96, 48);
  if (seating) {
    objects.push(
      place("ceremony_seating", seating.center, {
        label: "Theater seating",
        width: seating.width,
        depth: seating.depth,
        seatingCount: seating.seats,
        chairStyle: "banquet",
      })
    );
  }
  return { objects, requested: guests, placed: seating?.seats ?? 0 };
}

function jitter(index: number, amount: number) {
  const value = Math.sin(index * 12.9898 + 78.233) * 43758.5453;
  return (value - Math.floor(value) - 0.5) * 2 * amount;
}

/** Bar against the back wall, facing the room, with a queue zone kept clear. */
function placeBackBar(ctx: RoomContext, objects: StudioObject[], reserved: Rect[]) {
  const bar = settle(ctx, { x: ctx.center.x, z: backZ(ctx, 30) }, 48, 15);
  if (!bar) return;
  objects.push(place("bar", bar, { rotation: 180 }));
  // The queue forms in front of the bar; its ends only need a walkway.
  reserved.push({
    minX: bar.x - 48 - 36,
    maxX: bar.x + 48 + 36,
    minZ: bar.z - 15 - 72,
    maxZ: bar.z + 15 + 36,
  });
}

/** Square dance floor sized for roughly 45% of guests dancing at once, in 3′ panels. */
function danceFloorSide(ctx: RoomContext, guests: number) {
  const danceFeet = Math.sqrt(guests * 3 * 0.45);
  const maxSide = Math.min(ctx.bounds.width, ctx.bounds.depth) * 0.4;
  return Math.min(
    Math.max(144, Math.round(danceFeet / 3) * 36),
    Math.max(144, Math.floor(maxSide / 36) * 36)
  );
}

const PACK_STEP = 6;

/**
 * Greedy packing outward from `focus`: the nearest open spot first, each kept
 * `spacing` from those already placed, so tables flow around reserved zones
 * that leave gaps a fixed lattice cannot use.
 */
function packAround(
  ctx: RoomContext,
  focus: StudioPoint,
  count: number,
  spacing: number,
  half: number,
  reserved: Rect[]
): StudioPoint[] {
  const { bounds } = ctx;
  const candidates: Array<{ point: StudioPoint; distance: number }> = [];
  const iMin = Math.ceil((bounds.minX - focus.x) / PACK_STEP);
  const iMax = Math.floor((bounds.maxX - focus.x) / PACK_STEP);
  const jMin = Math.ceil((bounds.minZ - focus.z) / PACK_STEP);
  const jMax = Math.floor((bounds.maxZ - focus.z) / PACK_STEP);
  for (let j = jMin; j <= jMax; j += 1) {
    for (let i = iMin; i <= iMax; i += 1) {
      const x = focus.x + i * PACK_STEP;
      const z = focus.z + j * PACK_STEP;
      if (!fits(ctx, x, z, half, half)) continue;
      const rect = rectAround(x, z, half, half);
      if (reserved.some((zone) => intersects(rect, zone))) continue;
      candidates.push({ point: { x, z }, distance: Math.hypot(i, j) });
    }
  }
  candidates.sort((a, b) => a.distance - b.distance || a.point.z - b.point.z || a.point.x - b.point.x);
  const chosen: StudioPoint[] = [];
  for (const { point } of candidates) {
    if (chosen.length >= count) break;
    if (chosen.every((other) => Math.hypot(other.x - point.x, other.z - point.z) >= spacing)) {
      chosen.push(point);
    }
  }
  return chosen.sort((a, b) => a.z - b.z || a.x - b.x);
}

/**
 * Rounds around `focus` outside the reserved zones: a tidy lattice when it
 * seats everyone, otherwise whichever of lattice or packing fits more.
 */
function roundsAround(
  ctx: RoomContext,
  focus: StudioPoint,
  tables: number,
  spacing: number,
  reserved: Rect[],
  half = 52
) {
  const lattice = pickCentral(
    ctx,
    latticePoints(ctx, {
      anchor: focus,
      spacingX: spacing,
      spacingZ: spacing,
      halfX: half,
      halfZ: half,
      reserved,
    }),
    focus,
    tables,
    "radial"
  );
  if (lattice.length >= tables) return lattice;
  const packed = packAround(ctx, focus, tables, spacing, half, reserved);
  return packed.length > lattice.length ? packed : lattice;
}

function cocktail(ctx: RoomContext, count: number, spacing: number) {
  const objects: StudioObject[] = [];
  const reserved: Rect[] = [];

  placeBackBar(ctx, objects, reserved);
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

  const danceSide = danceFloorSide(ctx, guests);
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

  const points = roundsAround(ctx, dance ?? ctx.center, Math.ceil(guests / 10), spacing, reserved, 58);
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

function wedding(ctx: RoomContext, guests: number, spacing: number) {
  const objects: StudioObject[] = [];
  const reserved: Rect[] = [];
  const x = ctx.center.x;

  const backdrop = settle(ctx, { x, z: frontZ(ctx, 24) }, 84, 12);
  const sweetheartZ = (backdrop?.z ?? frontZ(ctx, 24)) + 12 + 44 + 15;
  const sweetheart = settle(ctx, { x, z: sweetheartZ }, 30, 15);
  if (backdrop) {
    objects.push(
      place("drape_backdrop", backdrop, {
        label: SWEETHEART_BACKDROP_LABEL,
        width: 168,
        fabric: "sheer",
        drapeColor: "ivory",
      })
    );
  }
  if (sweetheart) {
    objects.push(place("sweetheart_table", sweetheart));
    reserved.push(
      inflate(
        {
          minX: x - 84,
          maxX: x + 84,
          minZ: (backdrop?.z ?? sweetheart.z) - 12,
          maxZ: sweetheart.z + 15,
        },
        36
      )
    );
    const flanks = [
      { type: "cake_table", side: -1, halfX: 18 },
      { type: "dj_booth", side: 1, halfX: 36 },
    ] as const;
    for (const { type, side, halfX } of flanks) {
      const spot = settle(ctx, { x: sweetheart.x + side * 168, z: sweetheart.z }, halfX, 18);
      if (!spot) continue;
      objects.push(place(type, spot));
      reserved.push(inflate(rectAround(spot.x, spot.z, halfX, 18), 36));
    }
  }

  const danceSide = danceFloorSide(ctx, guests);
  const dance = settle(
    ctx,
    { x, z: (sweetheart?.z ?? sweetheartZ) + 15 + 60 + danceSide / 2 },
    danceSide / 2,
    danceSide / 2
  );
  if (dance) {
    objects.push(place("dance_floor", dance, { width: danceSide, depth: danceSide }));
    reserved.push(inflate(rectAround(dance.x, dance.z, danceSide / 2, danceSide / 2), 30));
  }
  placeBackBar(ctx, objects, reserved);

  const points = roundsAround(ctx, dance ?? ctx.center, Math.ceil(guests / 8), spacing, reserved);
  objects.push(...numbered(points.map((point) => place("round_table", point)), "Table"));
  return {
    objects,
    requested: guests,
    placed: Math.min(guests, points.length * 8 + (sweetheart ? 2 : 0)),
  };
}

function buffet(ctx: RoomContext, guests: number, spacing: number) {
  const objects: StudioObject[] = [];
  const reserved: Rect[] = [];

  const lineTables = Math.min(6, Math.max(2, Math.ceil(guests / 60)));
  // A 30″ service lane stays open between the wall and the line.
  const lineX = ctx.bounds.minX + WALL_MARGIN + 30 + 15;
  const line: StudioObject[] = [];
  for (let index = 0; index < lineTables; index += 1) {
    const z = ctx.center.z + (index - (lineTables - 1) / 2) * 96;
    if (fits(ctx, lineX, z, 15, 48)) {
      line.push(place("buffet_table", { x: lineX, z }, { rotation: 90 }));
    }
  }
  objects.push(...numbered(line, "Buffet"));
  if (line.length > 0) {
    const zs = line.map((table) => table.z);
    reserved.push({
      minX: ctx.bounds.minX,
      maxX: lineX + 15 + 96,
      minZ: Math.min(...zs) - 48 - 36,
      maxZ: Math.max(...zs) + 48 + 36,
    });
  }
  placeBackBar(ctx, objects, reserved);

  const points = roundsAround(ctx, ctx.center, Math.ceil(guests / 8), spacing, reserved);
  objects.push(...numbered(points.map((point) => place("round_table", point)), "Table"));
  return { objects, requested: guests, placed: Math.min(guests, points.length * 8) };
}

function familyStyle(ctx: RoomContext, count: number, spacing: number) {
  const objects: StudioObject[] = [];
  const headWidth = Math.min(288, Math.max(144, Math.round((ctx.bounds.width * 0.4) / 24) * 24));
  // Head-table guests sit on the wall side, so leave them room behind it.
  const head = settle(ctx, { x: ctx.center.x, z: frontZ(ctx, 30) + 40 }, headWidth / 2, 15);
  if (head) {
    objects.push(
      place("head_table", head, { width: headWidth, seatingCount: Math.floor(headWidth / 24) })
    );
  }

  const start = (head?.z ?? frontZ(ctx, 30)) + 15 + 108;
  const perRun = Math.max(1, Math.floor((ctx.bounds.maxZ - WALL_MARGIN - 24 - start) / 96));
  // Half a table plus a seated guest on each side of a run.
  const sideRoom = 18 + 22;
  const maxRuns = Math.max(
    1,
    Math.floor((ctx.bounds.width - WALL_MARGIN * 2 - sideRoom * 2) / spacing) + 1
  );
  const runs = Math.min(maxRuns, Math.ceil(count / perRun));
  const tables: StudioObject[] = [];
  let remaining = count;
  for (let run = 0; run < runs; run += 1) {
    const inRun = Math.min(perRun, Math.ceil(remaining / (runs - run)));
    remaining -= inRun;
    const x = ctx.center.x + (run - (runs - 1) / 2) * spacing;
    for (let index = 0; index < inRun; index += 1) {
      const z = start + 48 + index * 96;
      if (fits(ctx, x, z, sideRoom, 48)) {
        tables.push(place("rectangle_table", { x, z }, { rotation: 90 }));
      }
    }
  }
  objects.push(...numbered(tables, "Family table"));
  return { objects, requested: count, placed: tables.length };
}

const BOOTH = 120;

/** A row of booths sharing one back wall; `side` is the direction the booths open toward. */
type BoothRow = { wall: number; side: -1 | 1 };

/**
 * Stacks booth rows front to back: back-to-back island rows, plus rows backed
 * onto the front/back walls when the room is too shallow for another island.
 */
function boothRows(ctx: RoomContext, aisle: number): BoothRow[] {
  const { minZ, maxZ } = ctx.bounds;
  const edge = Math.min(aisle, 72);
  // 1″ keeps wall-backed booths clear of the margin check's boundary.
  const start = minZ + WALL_MARGIN + 1;
  const inner = maxZ - WALL_MARGIN - 1 - start;
  let plan = { islands: 0, walls: 0, slack: 0 };
  for (let walls = 0; walls <= 2; walls += 1) {
    const fixed = walls * BOOTH + (2 - walls) * edge + (walls - 1) * aisle;
    const islands = Math.max(0, Math.floor((inner - fixed) / (2 * BOOTH + aisle)));
    if (islands + walls === 0) continue;
    const slack = inner - fixed - islands * (2 * BOOTH + aisle);
    if (slack < 0) continue;
    if (2 * islands + walls > 2 * plan.islands + plan.walls) plan = { islands, walls, slack };
  }

  const { islands, walls, slack } = plan;
  const gap = aisle + (walls === 2 ? slack / (islands + 1) : 0);
  const rows: BoothRow[] = [];
  let z = start;
  if (walls === 2) {
    rows.push({ wall: z, side: 1 });
    z += BOOTH + gap;
  } else {
    z += edge + (walls === 0 ? slack / 2 : slack);
  }
  for (let island = 0; island < islands; island += 1) {
    rows.push({ wall: z + BOOTH, side: -1 }, { wall: z + BOOTH, side: 1 });
    z += 2 * BOOTH + gap;
  }
  if (walls > 0) rows.push({ wall: z + BOOTH, side: -1 });
  return rows;
}

function tradeShow(ctx: RoomContext, count: number, aisle: number) {
  const objects: StudioObject[] = [];
  const edge = Math.min(aisle, 72);
  const cols = Math.floor((ctx.bounds.width - 2 * (WALL_MARGIN + edge)) / BOOTH);
  const rows = boothRows(ctx, aisle);
  if (cols < 1 || rows.length === 0) return { objects, requested: count, placed: 0 };

  const x0 = ctx.center.x - ((cols - 1) * BOOTH) / 2;
  type Booth = { row: number; col: number };
  const candidates = new Map<StudioPoint, Booth>();
  rows.forEach(({ wall, side }, row) => {
    for (let col = 0; col < cols; col += 1) {
      const point = { x: x0 + col * BOOTH, z: wall + (side * BOOTH) / 2 };
      if (fits(ctx, point.x, point.z, BOOTH / 2, BOOTH / 2)) candidates.set(point, { row, col });
    }
  });
  const chosen = pickCentral(ctx, [...candidates.keys()], ctx.center, count);
  const taken = new Set(
    chosen.map((point) => {
      const booth = candidates.get(point) as Booth;
      return `${booth.row}:${booth.col}`;
    })
  );
  const has = (row: number, col: number) => taken.has(`${row}:${col}`);
  const drape = { fabric: "poly", drapeColor: "black" } as const;

  // Island rows share one pipe & drape back wall between them.
  for (const wall of new Set(rows.map((row) => row.wall))) {
    for (let col = 0; col < cols; col += 1) {
      if (!rows.some((row, index) => row.wall === wall && has(index, col))) continue;
      objects.push(
        place("drape_backdrop", { x: x0 + col * BOOTH, z: wall }, {
          label: BOOTH_WALL_LABEL,
          width: BOOTH,
          height: 96,
          ...drape,
        })
      );
    }
  }
  rows.forEach(({ wall, side }, row) => {
    for (let edgeIndex = 0; edgeIndex <= cols; edgeIndex += 1) {
      if (!has(row, edgeIndex - 1) && !has(row, edgeIndex)) continue;
      objects.push(
        place(
          "drape_backdrop",
          { x: x0 + (edgeIndex - 0.5) * BOOTH, z: wall + (side * BOOTH) / 2 },
          { label: BOOTH_RAIL_LABEL, width: BOOTH, height: 36, rotation: 90, ...drape }
        )
      );
    }
  });

  const tables = chosen.map((point) => {
    const { wall, side } = rows[(candidates.get(point) as Booth).row];
    return place(
      "rectangle_table",
      { x: point.x, z: wall + side * (12 + 24 + 15) },
      { width: 72, depth: 30, seatingCount: 0, linenColor: "black" }
    );
  });
  objects.push(...numbered(tables, "Booth"));
  return { objects, requested: count, placed: tables.length };
}

function runway(ctx: RoomContext, guests: number, rowPitch: number) {
  const objects: StudioObject[] = [];
  const x = ctx.center.x;
  const backdrop = settle(ctx, { x, z: frontZ(ctx, 24) }, 96, 12);
  if (backdrop) {
    objects.push(
      place("drape_backdrop", backdrop, {
        label: RUNWAY_BACKDROP_LABEL,
        width: 192,
        fabric: "velvet",
        drapeColor: "ivory",
      })
    );
  }
  const start = (backdrop?.z ?? frontZ(ctx, 24)) + 12;
  // Keep 8′ past the end of the catwalk for photographers.
  const length = Math.min(720, Math.floor((ctx.bounds.maxZ - WALL_MARGIN - 96 - start) / 24) * 24);
  if (length < 144) return { objects, requested: guests, placed: 0 };
  const walkWidth = 48;
  const walk = { x, z: start + length / 2 };
  if (fits(ctx, walk.x, walk.z, walkWidth / 2, length / 2)) {
    objects.push(place("stage", walk, { label: "Runway", width: walkWidth, depth: length }));
  }

  // Seating rows run parallel to the catwalk on both sides, front row at its edge.
  const gap = 36;
  const blockLength = length - 24;
  const perRow = Math.max(2, Math.floor((blockLength - 48) / SEAT_WIDTH));
  const sideRoom = ctx.bounds.width / 2 - WALL_MARGIN - walkWidth / 2 - gap;
  const maxRows = Math.max(1, Math.floor(sideRoom / rowPitch));
  let remaining = guests;
  for (const side of [-1, 1] as const) {
    const want = side < 0 ? Math.ceil(guests / 2) : remaining;
    for (let rows = Math.min(maxRows, Math.ceil(want / perRow)); rows >= 1; rows -= 1) {
      const depth = rows * rowPitch;
      const center = {
        x: x + side * (walkWidth / 2 + gap + depth / 2),
        z: start + 12 + blockLength / 2,
      };
      if (!fits(ctx, center.x, center.z, depth / 2, blockLength / 2)) continue;
      const seats = Math.min(want, rows * perRow);
      objects.push(
        place("ceremony_seating", center, {
          label: side < 0 ? "Runway seating left" : "Runway seating right",
          width: blockLength,
          depth,
          rotation: side < 0 ? 90 : 270,
          seatingCount: seats,
        })
      );
      remaining -= seats;
      break;
    }
  }
  return { objects, requested: guests, placed: guests - remaining };
}

export function generateStudioLayout(
  design: StudioLayoutRoom,
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
    case "wedding":
      return wedding(ctx, count, spacing);
    case "buffet":
      return buffet(ctx, count, spacing);
    case "family_style":
      return familyStyle(ctx, count, spacing);
    case "theater":
      return theater(ctx, count, spacing);
    case "trade_show":
      return tradeShow(ctx, count, spacing);
    case "runway":
      return runway(ctx, count, spacing);
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
      (PRESERVED_ON_REPLACE.includes(object.type) && !LAYOUT_DRAPE_LABELS.has(object.label))
  );
}
