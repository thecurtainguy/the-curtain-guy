/**
 * Ceiling drape layout — the single source of truth shared by the 2D plan,
 * the 3D scene, the inspector and fabric estimates.
 *
 * Everything here is pure and works in plan inches (the `room.floor` space).
 * Heights are DROPS measured down from the ceiling plane: 0 = flush with the
 * ceiling, positive = lower. Convert to a floor height with
 * `wallHeight - drop`.
 */
import {
  createStudioItemId,
  getCeilingDrapes,
  type CeilingDrapeStyle,
  type DrapeColor,
  type StudioCeilingDrape,
  type StudioDesignJson,
  type StudioPoint,
} from "@/data/studio";
import { getPolygonCentroid, getStudioBounds } from "@/lib/studio-geometry";

/* ------------------------------------------------------------------ */
/* Style metadata                                                      */
/* ------------------------------------------------------------------ */

export type CeilingStyleFamily = "radial" | "rows" | "perimeter" | "cascades";

export type CeilingField =
  | "hub"
  | "count"
  | "panelWidth"
  | "scallops"
  | "sag"
  | "edgeDrop"
  | "hubDrop"
  | "direction"
  | "hubDecor";

export type CeilingStyleFields = {
  family: CeilingStyleFamily;
  /** Inspector label per relevant numeric field (absent = field unused). */
  labels: Partial<Record<CeilingField, string>>;
  /** Slider ranges for the numeric fields, inches or counts. */
  ranges: Partial<Record<CeilingField, { min: number; max: number; step: number }>>;
};

/**
 * Which fields each style uses and what they mean. UI should only show the
 * fields listed in `labels`.
 */
export const CEILING_STYLE_FIELDS: Record<CeilingDrapeStyle, CeilingStyleFields> = {
  starburst: {
    family: "radial",
    labels: {
      hub: "Centre hub",
      count: "Panels",
      panelWidth: "Panel width",
      sag: "Panel belly",
      hubDrop: "Hub drop",
      edgeDrop: "Wall attach drop",
      direction: "Spin",
      hubDecor: "Hub décor",
    },
    ranges: {
      count: { min: 4, max: 48, step: 1 },
      panelWidth: { min: 24, max: 144, step: 6 },
      sag: { min: 0, max: 96, step: 2 },
      hubDrop: { min: 0, max: 96, step: 2 },
      edgeDrop: { min: 0, max: 72, step: 2 },
    },
  },
  canopy: {
    family: "radial",
    labels: {
      hub: "Gather point",
      count: "Spokes",
      sag: "Swag between spokes",
      hubDrop: "Gather drop",
      edgeDrop: "Edge drop",
      direction: "Spin",
      hubDecor: "Hub décor",
    },
    ranges: {
      count: { min: 6, max: 48, step: 1 },
      sag: { min: 0, max: 60, step: 2 },
      hubDrop: { min: 6, max: 120, step: 2 },
      edgeDrop: { min: 0, max: 72, step: 2 },
    },
  },
  tent: {
    family: "radial",
    labels: {
      hub: "Peak",
      count: "Seams",
      sag: "Edge scallop",
      hubDrop: "Peak drop",
      edgeDrop: "Edge drop",
      direction: "Spin",
      hubDecor: "Peak décor",
    },
    ranges: {
      count: { min: 6, max: 48, step: 1 },
      sag: { min: 0, max: 48, step: 2 },
      hubDrop: { min: 0, max: 72, step: 2 },
      edgeDrop: { min: 6, max: 120, step: 2 },
    },
  },
  swag_rows: {
    family: "rows",
    labels: {
      count: "Rows",
      panelWidth: "Panel width",
      sag: "Swag depth",
      edgeDrop: "Attach drop",
      direction: "Run direction",
    },
    ranges: {
      count: { min: 1, max: 32, step: 1 },
      panelWidth: { min: 24, max: 144, step: 6 },
      sag: { min: 0, max: 120, step: 2 },
      edgeDrop: { min: 0, max: 72, step: 2 },
    },
  },
  billow_rows: {
    family: "rows",
    labels: {
      count: "Rows",
      panelWidth: "Panel width",
      scallops: "Billows per row",
      sag: "Billow depth",
      edgeDrop: "Support drop",
      direction: "Run direction",
    },
    ranges: {
      count: { min: 1, max: 32, step: 1 },
      panelWidth: { min: 24, max: 144, step: 6 },
      scallops: { min: 1, max: 12, step: 1 },
      sag: { min: 0, max: 72, step: 2 },
      edgeDrop: { min: 0, max: 72, step: 2 },
    },
  },
  stretch_panels: {
    family: "rows",
    labels: {
      count: "Bands",
      panelWidth: "Band width",
      sag: "Soft sag",
      edgeDrop: "Height below ceiling",
      direction: "Run direction",
    },
    ranges: {
      count: { min: 1, max: 32, step: 1 },
      panelWidth: { min: 24, max: 240, step: 6 },
      sag: { min: 0, max: 24, step: 1 },
      edgeDrop: { min: 0, max: 96, step: 2 },
    },
  },
  crisscross: {
    family: "rows",
    labels: {
      count: "Swags each way",
      panelWidth: "Panel width",
      sag: "Swag depth",
      edgeDrop: "Attach drop",
      direction: "Angle",
    },
    ranges: {
      count: { min: 1, max: 16, step: 1 },
      panelWidth: { min: 24, max: 120, step: 6 },
      sag: { min: 0, max: 96, step: 2 },
      edgeDrop: { min: 0, max: 72, step: 2 },
    },
  },
  perimeter_swag: {
    family: "perimeter",
    labels: {
      panelWidth: "Scallop width",
      sag: "Scallop drop",
      edgeDrop: "Top line drop",
    },
    ranges: {
      panelWidth: { min: 36, max: 240, step: 6 },
      sag: { min: 4, max: 60, step: 2 },
      edgeDrop: { min: 0, max: 48, step: 2 },
    },
  },
  cascades: {
    family: "cascades",
    labels: {
      count: "Falls per row",
      scallops: "Rows",
      panelWidth: "Fall width",
      sag: "Fall length",
      direction: "Grid angle",
    },
    ranges: {
      count: { min: 1, max: 16, step: 1 },
      scallops: { min: 1, max: 12, step: 1 },
      panelWidth: { min: 12, max: 120, step: 6 },
      sag: { min: 12, max: 240, step: 6 },
    },
  },
};

export function ceilingStyleFamily(style: CeilingDrapeStyle): CeilingStyleFamily {
  return CEILING_STYLE_FIELDS[style].family;
}

export function ceilingUsesHub(style: CeilingDrapeStyle) {
  return ceilingStyleFamily(style) === "radial";
}

/* ------------------------------------------------------------------ */
/* Polygon helpers (plan inches)                                       */
/* ------------------------------------------------------------------ */

function signedArea(points: readonly StudioPoint[]) {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    area += a.x * b.z - b.x * a.z;
  }
  return area / 2;
}

/** Mitred inward offset (positive = inward). Miters clamp at 4× distance. */
export function insetCeilingPolygon(
  points: readonly StudioPoint[],
  distance: number
): StudioPoint[] {
  const n = points.length;
  if (n < 3 || distance === 0) return points.map((p) => ({ x: p.x, z: p.z }));
  const area = signedArea(points);
  const normals = points.map((a, i) => {
    const b = points[(i + 1) % n];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz) || 1;
    return area > 0 ? { x: -dz / len, z: dx / len } : { x: dz / len, z: -dx / len };
  });
  return points.map((p, i) => {
    const prev = normals[(i - 1 + n) % n];
    const next = normals[i];
    const bx = prev.x + next.x;
    const bz = prev.z + next.z;
    const dot = prev.x * next.x + prev.z * next.z;
    const len = Math.hypot(bx, bz);
    if (len < 1e-6 || 1 + dot < 1e-6) {
      return { x: p.x + next.x * distance, z: p.z + next.z * distance };
    }
    const scale = Math.min(4, 1 / Math.sqrt((1 + dot) / 2));
    return {
      x: p.x + (bx / len) * distance * scale,
      z: p.z + (bz / len) * distance * scale,
    };
  });
}

export function pointInCeilingPolygon(
  points: readonly StudioPoint[],
  x: number,
  z: number
) {
  let within = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i];
    const b = points[j];
    if (a.z > z !== b.z > z && x < ((b.x - a.x) * (z - a.z)) / (b.z - a.z) + a.x) {
      within = !within;
    }
  }
  return within;
}

const DEG = Math.PI / 180;

/** Unit vector of the area's local +X (row run direction) for a rotation in degrees. */
export function ceilingAxis(rotation: number): StudioPoint {
  const r = (Number.isFinite(rotation) ? rotation : 0) * DEG;
  return { x: Math.cos(r), z: Math.sin(r) };
}

/** Area rectangle corners (same rotation convention as objects). */
export function getCeilingAreaCorners(
  drape: Pick<StudioCeilingDrape, "x" | "z" | "width" | "depth" | "rotation">
): StudioPoint[] {
  const u = ceilingAxis(drape.rotation);
  const v = { x: -u.z, z: u.x };
  const hw = drape.width / 2;
  const hd = drape.depth / 2;
  return [
    [-hw, -hd],
    [hw, -hd],
    [hw, hd],
    [-hw, hd],
  ].map(([a, b]) => ({
    x: drape.x + u.x * a + v.x * b,
    z: drape.z + u.z * a + v.z * b,
  }));
}

/** Plan outline the design covers, inches. */
export function getCeilingOutline(
  drape: StudioCeilingDrape,
  floor: readonly StudioPoint[]
): StudioPoint[] {
  if (drape.coverage === "area" || floor.length < 3) {
    return getCeilingAreaCorners(drape);
  }
  return insetCeilingPolygon(floor, Math.max(0, drape.inset));
}

/** Distance along `dir` from `origin` to the first outline crossing, or null. */
function rayToOutline(
  outline: readonly StudioPoint[],
  origin: StudioPoint,
  dir: StudioPoint
): number | null {
  let best = Infinity;
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i];
    const b = outline[(i + 1) % outline.length];
    const ex = b.x - a.x;
    const ez = b.z - a.z;
    const denom = dir.x * ez - dir.z * ex;
    if (Math.abs(denom) < 1e-9) continue;
    const ax = a.x - origin.x;
    const az = a.z - origin.z;
    const t = (ax * ez - az * ex) / denom;
    const s = (ax * dir.z - az * dir.x) / denom;
    if (t > 1e-6 && s >= -1e-9 && s <= 1 + 1e-9 && t < best) best = t;
  }
  return Number.isFinite(best) ? best : null;
}

/** Sorted [enter, exit] parameter pairs where the infinite line crosses the outline. */
function lineSegmentsInOutline(
  outline: readonly StudioPoint[],
  origin: StudioPoint,
  dir: StudioPoint
): Array<[number, number]> {
  const hits: number[] = [];
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i];
    const b = outline[(i + 1) % outline.length];
    const ex = b.x - a.x;
    const ez = b.z - a.z;
    const denom = dir.x * ez - dir.z * ex;
    if (Math.abs(denom) < 1e-9) continue;
    const ax = a.x - origin.x;
    const az = a.z - origin.z;
    const t = (ax * ez - az * ex) / denom;
    const s = (ax * dir.z - az * dir.x) / denom;
    // Half-open edge test so a line through a vertex counts it once.
    if (s >= 0 && s < 1) hits.push(t);
  }
  hits.sort((p, q) => p - q);
  const pairs: Array<[number, number]> = [];
  for (let i = 0; i + 1 < hits.length; i += 2) {
    if (hits[i + 1] - hits[i] > 1) pairs.push([hits[i], hits[i + 1]]);
  }
  return pairs;
}

function polygonCentroid(points: readonly StudioPoint[]): StudioPoint {
  return getPolygonCentroid(points as StudioPoint[]);
}

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

export type CeilingRunKind = "spoke" | "row" | "perimeter";

export type CeilingRun = {
  /** Stable within one layout (e.g. "row-2-0"); safe as a React key / seed salt. */
  key: string;
  kind: CeilingRunKind;
  /**
   * Plan support points, inches. The first and last are the attach ends;
   * interior points are intermediate supports (billow lines). Spokes start
   * at the hub.
   */
  points: StudioPoint[];
  /** Fabric width as hung, inches. */
  width: number;
  color: DrapeColor;
  /** Spokes only: width multiplier at the hub end (0 = fully gathered). */
  hubTaper?: number;
};

export type CeilingPerimeterPoint = StudioPoint & {
  /** True where a radial spoke lands; false for outline corners in between. */
  spoke: boolean;
};

export type CeilingLayout = {
  /** Covered plan outline, inches. */
  outline: StudioPoint[];
  /** Radial styles only (clamped inside the outline). */
  hub: StudioPoint | null;
  runs: CeilingRun[];
  /**
   * Radial styles: outline points ordered by angle around the hub (spoke
   * landings plus the outline corners between them). Canopy / tent fabric
   * fills the wedge between consecutive points.
   */
  perimeter: CeilingPerimeterPoint[];
  /** Cascades: plan points where a fabric fall hangs. */
  drops: StudioPoint[];
};

function runColor(drape: StudioCeilingDrape, index: number): DrapeColor {
  return drape.accentColor && index % 2 === 1 ? drape.accentColor : drape.color;
}

/** Hub actually used for layout: the stored hub, or the outline centroid when it falls outside. */
export function resolveCeilingHub(
  drape: StudioCeilingDrape,
  outline: readonly StudioPoint[]
): StudioPoint {
  if (pointInCeilingPolygon(outline, drape.hubX, drape.hubZ)) {
    return { x: drape.hubX, z: drape.hubZ };
  }
  return polygonCentroid(outline);
}

function radialLayout(drape: StudioCeilingDrape, outline: StudioPoint[]): CeilingLayout {
  const hub = resolveCeilingHub(drape, outline);
  const count = Math.max(3, Math.round(drape.count));
  const start = (Number.isFinite(drape.rotation) ? drape.rotation : 0) * DEG;
  const runs: CeilingRun[] = [];
  const landings: Array<{ angle: number; point: StudioPoint }> = [];
  for (let k = 0; k < count; k++) {
    const angle = start + (k / count) * Math.PI * 2;
    const dir = { x: Math.cos(angle), z: Math.sin(angle) };
    const t = rayToOutline(outline, hub, dir);
    if (t === null) continue;
    const point = { x: hub.x + dir.x * t, z: hub.z + dir.z * t };
    landings.push({ angle, point });
    runs.push({
      key: `spoke-${k}`,
      kind: "spoke",
      points: [hub, point],
      width: drape.type === "starburst" ? drape.panelWidth : 0,
      color: runColor(drape, k),
      hubTaper: drape.type === "starburst" ? 0.08 : 0,
    });
  }

  const norm = (a: number) => {
    const twoPi = Math.PI * 2;
    return ((a - start) % twoPi + twoPi) % twoPi;
  };
  const corners = outline.map((p) => ({
    angle: Math.atan2(p.z - hub.z, p.x - hub.x),
    point: p,
  }));
  const perimeter: CeilingPerimeterPoint[] = [
    ...landings.map((l) => ({ ...l.point, spoke: true, order: norm(l.angle) })),
    ...corners
      .filter((c) => {
        // Only corners visible from the hub (no wall in between).
        const dx = c.point.x - hub.x;
        const dz = c.point.z - hub.z;
        const len = Math.hypot(dx, dz);
        if (len < 1) return false;
        const t = rayToOutline(outline, hub, { x: dx / len, z: dz / len });
        return t !== null && Math.abs(t - len) < 0.5;
      })
      .map((c) => ({ ...c.point, spoke: false, order: norm(c.angle) })),
  ]
    .sort((a, b) => a.order - b.order)
    .map(({ x, z, spoke }) => ({ x, z, spoke }));

  return { outline, hub, runs, perimeter, drops: [] };
}

function rowFamily(
  drape: StudioCeilingDrape,
  outline: StudioPoint[],
  angleDeg: number,
  count: number,
  keyPrefix: string,
  colorOffset: number
): CeilingRun[] {
  const u = ceilingAxis(angleDeg);
  const v = { x: -u.z, z: u.x };
  const center = polygonCentroid(outline);
  let minV = Infinity;
  let maxV = -Infinity;
  for (const p of outline) {
    const d = (p.x - center.x) * v.x + (p.z - center.z) * v.z;
    minV = Math.min(minV, d);
    maxV = Math.max(maxV, d);
  }
  const span = maxV - minV;
  if (!(span > 1)) return [];
  const spacing = span / count;
  const width = Math.max(6, Math.min(drape.panelWidth, spacing * (drape.type === "crisscross" ? 1.6 : 1)));
  const supports =
    drape.type === "billow_rows" ? Math.max(1, Math.round(drape.scallops)) : 1;
  const runs: CeilingRun[] = [];
  for (let k = 0; k < count; k++) {
    const offset = minV + spacing * (k + 0.5);
    const origin = { x: center.x + v.x * offset, z: center.z + v.z * offset };
    lineSegmentsInOutline(outline, origin, u).forEach(([t0, t1], segment) => {
      const points: StudioPoint[] = [];
      for (let i = 0; i <= supports; i++) {
        const t = t0 + ((t1 - t0) * i) / supports;
        points.push({ x: origin.x + u.x * t, z: origin.z + u.z * t });
      }
      runs.push({
        key: `${keyPrefix}-${k}-${segment}`,
        kind: "row",
        points,
        width,
        color: runColor(drape, k + colorOffset),
      });
    });
  }
  return runs;
}

function perimeterLayout(drape: StudioCeilingDrape, outline: StudioPoint[]): CeilingLayout {
  const runs: CeilingRun[] = [];
  const target = Math.max(12, drape.panelWidth);
  let index = 0;
  outline.forEach((a, i) => {
    const b = outline[(i + 1) % outline.length];
    const length = Math.hypot(b.x - a.x, b.z - a.z);
    const scallops = Math.max(1, Math.round(length / target));
    for (let s = 0; s < scallops; s++) {
      const t0 = s / scallops;
      const t1 = (s + 1) / scallops;
      runs.push({
        key: `perimeter-${i}-${s}`,
        kind: "perimeter",
        points: [
          { x: a.x + (b.x - a.x) * t0, z: a.z + (b.z - a.z) * t0 },
          { x: a.x + (b.x - a.x) * t1, z: a.z + (b.z - a.z) * t1 },
        ],
        width: length / scallops,
        color: runColor(drape, index),
      });
      index += 1;
    }
  });
  return { outline, hub: null, runs, perimeter: [], drops: [] };
}

function cascadeLayout(drape: StudioCeilingDrape, outline: StudioPoint[]): CeilingLayout {
  const u = ceilingAxis(drape.rotation);
  const v = { x: -u.z, z: u.x };
  const center = polygonCentroid(outline);
  let minU = Infinity;
  let maxU = -Infinity;
  let minV = Infinity;
  let maxV = -Infinity;
  for (const p of outline) {
    const du = (p.x - center.x) * u.x + (p.z - center.z) * u.z;
    const dv = (p.x - center.x) * v.x + (p.z - center.z) * v.z;
    minU = Math.min(minU, du);
    maxU = Math.max(maxU, du);
    minV = Math.min(minV, dv);
    maxV = Math.max(maxV, dv);
  }
  const columns = Math.max(1, Math.round(drape.count));
  const rows = Math.max(1, Math.round(drape.scallops));
  const drops: StudioPoint[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
      const du = minU + ((maxU - minU) * (c + 0.5)) / columns;
      const dv = minV + ((maxV - minV) * (r + 0.5)) / rows;
      const point = {
        x: center.x + u.x * du + v.x * dv,
        z: center.z + u.z * du + v.z * dv,
      };
      if (pointInCeilingPolygon(outline, point.x, point.z)) drops.push(point);
    }
  }
  return { outline, hub: null, runs: [], perimeter: [], drops };
}

/** Full plan layout for one ceiling design. */
export function getCeilingLayout(
  drape: StudioCeilingDrape,
  floor: readonly StudioPoint[]
): CeilingLayout {
  const outline = getCeilingOutline(drape, floor);
  if (outline.length < 3) {
    return { outline, hub: null, runs: [], perimeter: [], drops: [] };
  }
  switch (ceilingStyleFamily(drape.type)) {
    case "radial":
      return radialLayout(drape, outline);
    case "perimeter":
      return perimeterLayout(drape, outline);
    case "cascades":
      return cascadeLayout(drape, outline);
    case "rows": {
      const count = Math.max(1, Math.round(drape.count));
      const runs =
        drape.type === "crisscross"
          ? [
              ...rowFamily(drape, outline, drape.rotation + 45, count, "cross-a", 0),
              ...rowFamily(drape, outline, drape.rotation - 45, count, "cross-b", 1),
            ]
          : rowFamily(drape, outline, drape.rotation, count, "row", 0);
      return { outline, hub: null, runs, perimeter: [], drops: [] };
    }
  }
}

/* ------------------------------------------------------------------ */
/* Height profile                                                      */
/* ------------------------------------------------------------------ */

function runLength(points: readonly StudioPoint[]) {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z);
  }
  return total;
}

/** Plan point at arc-length fraction `t` (0..1) along a run's support polyline. */
export function ceilingRunPoint(run: CeilingRun, t: number): StudioPoint {
  const points = run.points;
  if (points.length === 1) return points[0];
  const total = runLength(points);
  let target = Math.min(1, Math.max(0, t)) * total;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const segment = Math.hypot(b.x - a.x, b.z - a.z);
    if (target <= segment || i === points.length - 1) {
      const k = segment > 0 ? Math.min(1, target / segment) : 0;
      return { x: a.x + (b.x - a.x) * k, z: a.z + (b.z - a.z) * k };
    }
    target -= segment;
  }
  return points[points.length - 1];
}

/** 0 at both ends, 1 at the middle — a hanging-chain (catenary) shape. */
export function catenaryBump(t: number) {
  const a = 1.6;
  const x = 2 * Math.min(1, Math.max(0, t)) - 1;
  return 1 - (Math.cosh(a * x) - 1) / (Math.cosh(a) - 1);
}

/**
 * Drop below the ceiling (inches) of a run's fabric centreline at
 * arc-length fraction `t`. 3D fabric must hang its centreline on this curve
 * so lights, labels and handles agree with the mesh.
 */
export function ceilingRunDrop(
  drape: StudioCeilingDrape,
  run: CeilingRun,
  t: number
): number {
  const tc = Math.min(1, Math.max(0, t));
  switch (run.kind) {
    case "spoke": {
      const base = drape.hubDrop + (drape.edgeDrop - drape.hubDrop) * tc;
      const belly = drape.type === "starburst" ? drape.sag : drape.sag * 0.25;
      return base + belly * catenaryBump(tc);
    }
    case "perimeter":
      return drape.edgeDrop + drape.sag * catenaryBump(tc);
    case "row": {
      if (drape.type === "billow_rows") {
        const segments = Math.max(1, run.points.length - 1);
        const local = (tc * segments) % 1;
        const atSupport = tc >= 1 || (local < 1e-6 && tc > 0);
        return drape.edgeDrop + (atSupport ? 0 : drape.sag * catenaryBump(local));
      }
      return drape.edgeDrop + drape.sag * catenaryBump(tc);
    }
  }
}

/** Lowest point of the design below the ceiling, inches (for clearance warnings). */
export function ceilingLowestDrop(drape: StudioCeilingDrape): number {
  switch (drape.type) {
    case "starburst":
      return Math.max(drape.hubDrop, drape.edgeDrop) + drape.sag;
    case "canopy":
    case "tent":
      return Math.max(drape.hubDrop, drape.edgeDrop + drape.sag) + drape.sag * 0.25;
    case "cascades":
      return drape.sag;
    default:
      return drape.edgeDrop + drape.sag;
  }
}

/* ------------------------------------------------------------------ */
/* Estimates                                                           */
/* ------------------------------------------------------------------ */

export type CeilingFabricEstimate = {
  /** Finished linear yards of fabric, including fullness. */
  linearYards: number;
  /** Separate fabric pieces (panels, wedges, falls, scallops). */
  pieces: number;
  /** Rigging points on the ceiling / walls. */
  riggingPoints: number;
  /** Plan area covered, square feet. */
  coveredSqFt: number;
};

/** Standard wide-width drapery bolt, inches. */
const BOLT_WIDTH_IN = 118;

function runFabricLength(drape: StudioCeilingDrape, run: CeilingRun) {
  const samples = 24;
  let total = 0;
  let prev = ceilingRunPoint(run, 0);
  let prevDrop = ceilingRunDrop(drape, run, 0);
  for (let i = 1; i <= samples; i++) {
    const t = i / samples;
    const point = ceilingRunPoint(run, t);
    const drop = ceilingRunDrop(drape, run, t);
    total += Math.hypot(point.x - prev.x, point.z - prev.z, drop - prevDrop);
    prev = point;
    prevDrop = drop;
  }
  return total;
}

export function estimateCeilingFabric(
  drape: StudioCeilingDrape,
  floor: readonly StudioPoint[]
): CeilingFabricEstimate {
  const layout = getCeilingLayout(drape, floor);
  const coveredSqFt = Math.abs(signedArea(layout.outline)) / 144;
  const gather = 1 + 0.35 * (Math.max(1, drape.fullness) - 1);
  let inches = 0;
  let pieces = 0;
  let riggingPoints = 0;

  if (drape.type === "canopy" || drape.type === "tent") {
    // Surface area of the wedges, cut from bolt-width fabric.
    const hub = layout.hub ?? polygonCentroid(layout.outline);
    let area = 0;
    for (let i = 0; i < layout.perimeter.length; i++) {
      const a = layout.perimeter[i];
      const b = layout.perimeter[(i + 1) % layout.perimeter.length];
      const flat = Math.abs((a.x - hub.x) * (b.z - hub.z) - (b.x - hub.x) * (a.z - hub.z)) / 2;
      const reach = (Math.hypot(a.x - hub.x, a.z - hub.z) + Math.hypot(b.x - hub.x, b.z - hub.z)) / 2;
      const rise = Math.abs(drape.hubDrop - drape.edgeDrop) + drape.sag;
      area += flat * (reach > 0 ? Math.hypot(reach, rise) / reach : 1);
    }
    inches = (area / BOLT_WIDTH_IN) * gather;
    pieces = layout.perimeter.filter((p) => p.spoke).length;
    riggingPoints = layout.perimeter.length + 1;
  } else if (drape.type === "cascades") {
    pieces = layout.drops.length;
    inches = pieces * (drape.sag + 12) * gather * Math.max(1, Math.ceil(drape.panelWidth / BOLT_WIDTH_IN));
    riggingPoints = pieces;
  } else {
    const widths = Math.max(1, Math.ceil(drape.panelWidth / BOLT_WIDTH_IN));
    for (const run of layout.runs) {
      inches += runFabricLength(drape, run) * gather * widths + 12;
      pieces += 1;
      riggingPoints += run.points.length;
    }
    if (layout.hub) riggingPoints = layout.runs.length + 1;
  }

  if (drape.perimeterValance && drape.type !== "perimeter_swag") {
    inches += runLength([...layout.outline, layout.outline[0]]) * 1.5;
  }

  return {
    linearYards: Math.round((inches / 36) * 10) / 10,
    pieces,
    riggingPoints,
    coveredSqFt: Math.round(coveredSqFt),
  };
}

/* ------------------------------------------------------------------ */
/* Creation & editing                                                  */
/* ------------------------------------------------------------------ */

type StyleDefaults = Partial<
  Omit<StudioCeilingDrape, "id" | "type" | "x" | "z" | "hubX" | "hubZ" | "width" | "depth">
>;

const STYLE_DEFAULTS: Record<CeilingDrapeStyle, StyleDefaults> = {
  starburst: {
    count: 16, panelWidth: 60, sag: 30, hubDrop: 18, edgeDrop: 6,
    fabric: "chiffon", color: "white", hubDecor: "chandelier", inset: 0,
  },
  canopy: {
    count: 20, sag: 16, hubDrop: 36, edgeDrop: 0,
    fabric: "sheer", color: "ivory", hubDecor: "rosette", inset: 0,
  },
  tent: {
    count: 24, sag: 8, hubDrop: 0, edgeDrop: 30,
    fabric: "poly", color: "white", hubDecor: "medallion", inset: 0,
  },
  swag_rows: {
    panelWidth: 72, sag: 36, edgeDrop: 0, fabric: "sheer", color: "white", inset: 6,
  },
  billow_rows: {
    panelWidth: 90, scallops: 4, sag: 24, edgeDrop: 0,
    fabric: "chiffon", color: "ivory", lights: "fairy", inset: 6,
  },
  stretch_panels: {
    panelWidth: 96, sag: 4, edgeDrop: 12, fabric: "poly", color: "white", inset: 12,
  },
  crisscross: {
    count: 4, panelWidth: 48, sag: 30, edgeDrop: 0, fabric: "satin", color: "champagne", inset: 6,
  },
  perimeter_swag: {
    panelWidth: 96, sag: 20, edgeDrop: 0, fabric: "satin", color: "champagne", inset: 0,
  },
  cascades: {
    count: 4, scallops: 3, panelWidth: 30, sag: 48,
    fabric: "chiffon", color: "white", lights: "fairy",
  },
};

const STYLE_LABELS: Record<CeilingDrapeStyle, string> = {
  starburst: "Starburst ceiling",
  canopy: "Gathered canopy",
  tent: "Tented ceiling",
  swag_rows: "Ceiling swags",
  billow_rows: "Ceiling billows",
  stretch_panels: "Stretched panels",
  crisscross: "Criss-cross swags",
  perimeter_swag: "Perimeter swags",
  cascades: "Fabric cascades",
};

/**
 * New ceiling design centred in the room. Row counts scale with the room so
 * a default always looks right; `overrides` win over everything.
 */
export function createCeilingDrape(
  type: CeilingDrapeStyle,
  floor: readonly StudioPoint[],
  overrides: Partial<Omit<StudioCeilingDrape, "id" | "type">> = {}
): StudioCeilingDrape {
  const bounds = getStudioBounds(floor as StudioPoint[]);
  const centre = floor.length >= 3 ? polygonCentroid(floor) : { x: bounds.centerX, z: bounds.centerZ };
  const defaults = STYLE_DEFAULTS[type];
  const rowsFor = (spacing: number) =>
    Math.max(2, Math.min(24, Math.round(bounds.depth / spacing)));
  const autoCount =
    type === "swag_rows"
      ? rowsFor(96)
      : type === "billow_rows"
        ? rowsFor(108)
        : type === "stretch_panels"
          ? rowsFor(144)
          : undefined;
  const drape: StudioCeilingDrape = {
    id: createStudioItemId("ceiling"),
    type,
    label: STYLE_LABELS[type],
    coverage: "room",
    x: centre.x,
    z: centre.z,
    width: Math.max(48, Math.round(bounds.width * 0.6)),
    depth: Math.max(48, Math.round(bounds.depth * 0.6)),
    rotation: 0,
    inset: 0,
    hubX: centre.x,
    hubZ: centre.z,
    edgeDrop: 0,
    hubDrop: 0,
    sag: 24,
    count: autoCount ?? 8,
    panelWidth: 72,
    scallops: 3,
    fabric: "chiffon",
    color: "white",
    accentColor: null,
    fullness: 2,
    lights: "none",
    lightColor: "ivory",
    hubDecor: "none",
    perimeterValance: false,
    uplightColor: null,
    notes: "",
    ...defaults,
    ...(autoCount !== undefined ? { count: autoCount } : {}),
    ...overrides,
  };
  return drape;
}

/** Converts an existing design to another style, keeping placement, fabric and colours. */
export function changeCeilingDrapeStyle(
  drape: StudioCeilingDrape,
  type: CeilingDrapeStyle,
  floor: readonly StudioPoint[]
): StudioCeilingDrape {
  if (drape.type === type) return drape;
  const fresh = createCeilingDrape(type, floor);
  return {
    ...fresh,
    id: drape.id,
    label: drape.label === STYLE_LABELS[drape.type] ? fresh.label : drape.label,
    coverage: drape.coverage,
    x: drape.x,
    z: drape.z,
    width: drape.width,
    depth: drape.depth,
    rotation: drape.rotation,
    hubX: drape.hubX,
    hubZ: drape.hubZ,
    fabric: drape.fabric,
    color: drape.color,
    accentColor: drape.accentColor,
    fullness: drape.fullness,
    lights: drape.lights,
    lightColor: drape.lightColor,
    uplightColor: drape.uplightColor,
    notes: drape.notes,
    locked: drape.locked,
    hidden: drape.hidden,
  };
}

/** Clamps numeric fields into their valid ranges (validation-safe). */
export function sanitizeCeilingDrape(drape: StudioCeilingDrape): StudioCeilingDrape {
  const clamp = (value: number, min: number, max: number, fallback: number) =>
    Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
  return {
    ...drape,
    label: drape.label.trim() ? drape.label : STYLE_LABELS[drape.type],
    width: clamp(drape.width, 12, 120000, 240),
    depth: clamp(drape.depth, 12, 120000, 240),
    rotation: clamp(drape.rotation, -36000, 36000, 0),
    inset: clamp(drape.inset, 0, 600, 0),
    edgeDrop: clamp(drape.edgeDrop, 0, 480, 0),
    hubDrop: clamp(drape.hubDrop, 0, 480, 0),
    sag: clamp(drape.sag, 0, 480, 24),
    count: Math.round(clamp(drape.count, 1, 64, 8)),
    panelWidth: clamp(drape.panelWidth, 6, 480, 72),
    scallops: Math.round(clamp(drape.scallops, 1, 16, 3)),
    fullness: clamp(drape.fullness, 1, 4, 2),
  };
}

export function findCeilingDrape(
  design: StudioDesignJson,
  id: string
): StudioCeilingDrape | undefined {
  return getCeilingDrapes(design).find((drape) => drape.id === id);
}

/** Immutable patch of one ceiling design (sanitized). */
export function updateCeilingDrape(
  design: StudioDesignJson,
  id: string,
  patch: Partial<Omit<StudioCeilingDrape, "id">>
): StudioDesignJson {
  return {
    ...design,
    ceilingDrapes: getCeilingDrapes(design).map((drape) =>
      drape.id === id ? sanitizeCeilingDrape({ ...drape, ...patch }) : drape
    ),
  };
}

export function addCeilingDrape(
  design: StudioDesignJson,
  drape: StudioCeilingDrape
): StudioDesignJson {
  return {
    ...design,
    ceilingDrapes: [...getCeilingDrapes(design), sanitizeCeilingDrape(drape)],
  };
}

/** Moves the area and the hub together, inches. */
export function moveCeilingDrape(
  drape: StudioCeilingDrape,
  dx: number,
  dz: number
): StudioCeilingDrape {
  return {
    ...drape,
    x: drape.x + dx,
    z: drape.z + dz,
    hubX: drape.hubX + dx,
    hubZ: drape.hubZ + dz,
  };
}

/** Normalised degrees in [0, 360). */
export function normalizeCeilingRotation(degrees: number) {
  if (!Number.isFinite(degrees)) return 0;
  return Math.round((((degrees % 360) + 360) % 360) * 100) / 100;
}
