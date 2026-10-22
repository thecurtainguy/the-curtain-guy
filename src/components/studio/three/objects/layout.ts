/**
 * Pure seating layout for Studio objects, in object-local FEET (origin at the
 * footprint centre, width along +X, depth along +Z). A chair with yaw 0 faces
 * -Z (backrest on +Z); yaw rotates around +Y like `group.rotation.y`.
 */
import {
  DEFAULT_CHAIR_STYLE,
  getStudioObjectOption,
  type DrapeColor,
  type StudioChairStyle,
  type StudioObject,
} from "@/data/studio";
import { resolveLinen } from "./types";

const SCALE = 1 / 12;

/** Floor-length linen profiles (`linenRows` in geometry.ts); tables.tsx builds the skirts from these. */
export const ROUND_LINEN = { foldDepth: 0.045, flare: 0.08, pool: 0.05 } as const;
export const BOX_LINEN = { foldDepth: 0.028, flare: 0.05, pool: 0.08 } as const;

type LinenProfile = { foldDepth: number; flare: number; pool: number };

/** Furthest the skirt reaches past the table edge, at the floor (rest offset + flare + pool + outermost fold). */
const hemReach = (linen: LinenProfile) =>
  0.04 + linen.flare + linen.pool + linen.foldDepth * 1.1 * 1.4;

/** Front legs of the deepest chair style reach this far ahead of the seat centre at the floor. */
const CHAIR_FRONT_REACH = 0.68;
const HEM_GAP = 0.04;
/** Seat centre outside a bare table edge: the seat front tucks just under the top. */
const SEAT_OFFSET = 0.52;
/** Seat centre outside a clothed table: front legs stand just clear of the hem. */
const ROUND_CLOTHED_OFFSET = CHAIR_FRONT_REACH + hemReach(ROUND_LINEN) + HEM_GAP;
const BOX_CLOTHED_OFFSET = CHAIR_FRONT_REACH + hemReach(BOX_LINEN) + HEM_GAP;
/** Minimum guest width along a table side. */
const SEAT_PITCH = 1.85;
/** Place setting centre inside the table edge. */
const SETTING_INSET = 0.72;

export type PlaceSetting = { x: number; z: number; yaw: number };

export type ChairPlacement = {
  x: number;
  z: number;
  yaw: number;
  setting?: PlaceSetting;
};

export type ClusterTable = { x: number; z: number; radius: number };

export type SeatingLayout = {
  chairs: ChairPlacement[];
  /** Height (feet) of the table surface the settings rest on. */
  settingHeight: number;
  /** table_area: the round tables that make up the cluster. */
  tables: ClusterTable[];
};

const EMPTY: SeatingLayout = { chairs: [], settingHeight: 0, tables: [] };

export function resolveChairStyle(object: StudioObject): StudioChairStyle {
  return (
    object.chairStyle ??
    getStudioObjectOption(object.type)?.chairStyle ??
    DEFAULT_CHAIR_STYLE
  );
}

export function resolveSeatingCount(object: StudioObject): number {
  const count =
    object.seatingCount ?? getStudioObjectOption(object.type)?.seatingCount ?? 0;
  return Math.max(0, Math.min(2000, Math.round(count)));
}

function setting(x: number, z: number, yaw: number, inset: number): PlaceSetting {
  return {
    x: x - Math.sin(yaw) * inset,
    z: z - Math.cos(yaw) * inset,
    yaw,
  };
}

/** Chairs evenly around an ellipse (round / oval tables) facing the centre. */
export function aroundEllipse(
  count: number,
  hx: number,
  hz: number,
  cx = 0,
  cz = 0,
  withSettings = true,
  offset = SEAT_OFFSET
): ChairPlacement[] {
  const chairs: ChairPlacement[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + Math.PI / count - Math.PI / 2;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const ex = hx * c;
    const ez = hz * s;
    const nl = Math.hypot(c / Math.max(hx, 0.01), s / Math.max(hz, 0.01)) || 1;
    const nx = c / Math.max(hx, 0.01) / nl;
    const nz = s / Math.max(hz, 0.01) / nl;
    const yaw = Math.atan2(nx, nz);
    const x = cx + ex + nx * offset;
    const z = cz + ez + nz * offset;
    chairs.push({
      x,
      z,
      yaw,
      setting: withSettings ? setting(x, z, yaw, offset + SETTING_INSET) : undefined,
    });
  }
  return chairs;
}

function spread(count: number, length: number) {
  return Array.from(
    { length: count },
    (_, i) => -length / 2 + ((i + 0.5) * length) / count
  );
}

/** Banquet: both long sides, ends once the sides are full. */
function banquet(count: number, w: number, d: number, offset: number): ChairPlacement[] {
  const swap = d > w;
  const long = swap ? d : w;
  const short = swap ? w : d;
  const perSide = Math.max(1, Math.floor(long / SEAT_PITCH));
  let endsEach = 0;
  if (count > perSide * 2) {
    endsEach = Math.min(
      Math.max(1, Math.floor(short / SEAT_PITCH)),
      Math.ceil((count - perSide * 2) / 2)
    );
  }
  const sides = count - endsEach * 2;
  const front = Math.ceil(sides / 2);
  const back = sides - front;
  const chairs: ChairPlacement[] = [];
  const inset = offset + SETTING_INSET;
  for (const x of spread(front, long)) {
    const z = short / 2 + offset;
    chairs.push({ x, z, yaw: 0, setting: setting(x, z, 0, inset) });
  }
  for (const x of spread(back, long)) {
    const z = -short / 2 - offset;
    chairs.push({ x, z, yaw: Math.PI, setting: setting(x, z, Math.PI, inset) });
  }
  for (const z of spread(endsEach, short)) {
    const right = long / 2 + offset;
    chairs.push({ x: right, z, yaw: Math.PI / 2, setting: setting(right, z, Math.PI / 2, inset) });
    chairs.push({ x: -right, z, yaw: -Math.PI / 2, setting: setting(-right, z, -Math.PI / 2, inset) });
  }
  if (!swap) return chairs;
  return chairs.map((chair) => ({
    x: chair.z,
    z: chair.x,
    yaw: Math.PI / 2 - chair.yaw,
    setting: chair.setting && {
      x: chair.setting.z,
      z: chair.setting.x,
      yaw: Math.PI / 2 - chair.setting.yaw,
    },
  }));
}

/** Head / sweetheart: one row behind the table, facing the room (+Z). */
function oneSided(count: number, w: number, d: number, offset: number): ChairPlacement[] {
  const z = -d / 2 - offset;
  const span = Math.min(w, Math.max(count * SEAT_PITCH * 0.9, w * 0.5));
  return spread(count, count <= 2 ? Math.min(w, count * 2.1) : span).map((x) => ({
    x,
    z,
    yaw: Math.PI,
    setting: setting(x, z, Math.PI, offset + SETTING_INSET * 0.9),
  }));
}

const CEREMONY_AISLE = 4;
const CEREMONY_SEAT = 1.75;
const CEREMONY_SEAT_MIN = 1.55;
const CEREMONY_SEAT_MAX = 2;
const CEREMONY_ROW = 3.1;

/** Rows split by a centre aisle, filled front (-Z) to back, facing -Z. */
function ceremony(count: number, w: number, d: number): ChairPlacement[] {
  if (count === 0) return [];
  const aisle = Math.min(CEREMONY_AISLE, Math.max(0, w - CEREMONY_SEAT * 2));
  const half = Math.max(CEREMONY_SEAT_MIN, (w - aisle) / 2);
  const perSideMax = Math.max(1, Math.floor(half / CEREMONY_SEAT_MIN));
  const comfortableRows = Math.max(1, Math.floor((d - 1.5) / CEREMONY_ROW) + 1);
  const perSide = Math.max(
    1,
    Math.min(perSideMax, Math.ceil(count / comfortableRows / 2))
  );
  const seatPitch = Math.min(CEREMONY_SEAT_MAX, half / perSide);
  const perRow = perSide * 2;
  const rows = Math.ceil(count / perRow);
  const pitch = rows > 1 ? Math.min(CEREMONY_ROW, (d - 1.5) / (rows - 1)) : 0;
  const block = pitch * (rows - 1);
  const startZ = -block / 2;
  const chairs: ChairPlacement[] = [];
  let placed = 0;
  for (let r = 0; r < rows && placed < count; r++) {
    const z = startZ + r * pitch;
    const inRow = Math.min(perRow, count - placed);
    // Fill from the aisle outward, alternating sides.
    for (let k = 0; k < inRow; k++) {
      const seat = Math.floor(k / 2);
      const side = k % 2 === 0 ? -1 : 1;
      const x = side * (aisle / 2 + seatPitch * (seat + 0.5));
      chairs.push({ x, z, yaw: 0 });
    }
    placed += inRow;
  }
  return chairs;
}

/** Room behind each seat centre for the chair back and a little elbow room. */
const CHAIR_BACK_REACH = 1.03;

/** Round-table cluster filling a table_area zone. */
function tableCluster(count: number, w: number, d: number, offset: number) {
  const perTable = count <= 10 ? Math.max(count, 1) : 8;
  const tableCount = Math.max(1, Math.ceil(count / perTable));
  const cols = Math.max(1, Math.min(tableCount, Math.round(Math.sqrt((tableCount * w) / Math.max(d, 0.1)))));
  const rows = Math.ceil(tableCount / cols);
  const cellW = w / cols;
  const cellD = d / rows;
  const radius = Math.max(
    1,
    Math.min(2.75, Math.min(cellW, cellD) / 2 - offset - CHAIR_BACK_REACH)
  );
  const tables: ClusterTable[] = [];
  for (let i = 0; i < tableCount; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const inRow = row === rows - 1 ? tableCount - row * cols : cols;
    const rowOffset = ((cols - inRow) * cellW) / 2;
    tables.push({
      x: -w / 2 + rowOffset + cellW * (col + 0.5),
      z: -d / 2 + cellD * (row + 0.5),
      radius,
    });
  }
  const chairs: ChairPlacement[] = [];
  let remaining = count;
  tables.forEach((table, index) => {
    const share = Math.ceil(remaining / (tables.length - index));
    remaining -= share;
    chairs.push(
      ...aroundEllipse(share, table.radius, table.radius, table.x, table.z, true, offset)
    );
  });
  return { tables, chairs };
}

export function layoutSeating(object: StudioObject): SeatingLayout {
  const w = Math.max(0.1, object.width * SCALE);
  const d = Math.max(0.1, object.depth * SCALE);
  const h = Math.max(0.1, object.height * SCALE);
  const count = resolveSeatingCount(object);
  const clothed = resolveLinen(object) !== null;
  const boxOffset = clothed ? BOX_CLOTHED_OFFSET : SEAT_OFFSET;
  switch (object.type) {
    case "chair":
      return { chairs: [{ x: 0, z: 0, yaw: 0 }], settingHeight: 0, tables: [] };
    case "round_table":
      return {
        chairs: aroundEllipse(
          count,
          w / 2,
          d / 2,
          0,
          0,
          true,
          clothed ? ROUND_CLOTHED_OFFSET : SEAT_OFFSET
        ),
        settingHeight: h,
        tables: [],
      };
    case "cocktail_table":
      return {
        chairs: aroundEllipse(count, w / 2, d / 2, 0, 0, false),
        settingHeight: h,
        tables: [],
      };
    case "rectangle_table":
      return { chairs: banquet(count, w, d, boxOffset), settingHeight: h, tables: [] };
    case "head_table":
    case "sweetheart_table":
      return { chairs: oneSided(count, w, d, boxOffset), settingHeight: h, tables: [] };
    case "ceremony_seating":
      return { chairs: ceremony(count, w, d), settingHeight: 0, tables: [] };
    case "table_area": {
      const cluster = tableCluster(count, w, d, clusterSeatOffset(object));
      return {
        chairs: cluster.chairs,
        settingHeight: Math.min(3.2, Math.max(2.2, h)),
        tables: cluster.tables,
      };
    }
    default:
      return EMPTY;
  }
}

/** table_area rounds are dressed in ivory unless linen is explicitly off. */
export function clusterLinen(object: StudioObject): DrapeColor | null {
  return object.linenColor === null ? null : (object.linenColor ?? "ivory");
}

function clusterSeatOffset(object: StudioObject) {
  return clusterLinen(object) ? ROUND_CLOTHED_OFFSET : SEAT_OFFSET;
}

/** table_area tables without chairs (for the furniture model). */
export function clusterTables(object: StudioObject): ClusterTable[] {
  return tableCluster(
    resolveSeatingCount(object),
    Math.max(0.1, object.width * SCALE),
    Math.max(0.1, object.depth * SCALE),
    clusterSeatOffset(object)
  ).tables;
}
