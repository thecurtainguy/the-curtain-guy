/**
 * Pure helpers for manipulating ceiling designs in 3D: pick-proxy surfaces
 * that follow the fabric centreline, handle anchors and clearance limits.
 * Plan inches in, world feet out (scene centred on the room bounds).
 */
import type { StudioCeilingDrape, StudioPoint } from "@/data/studio";
import {
  CEILING_STYLE_FIELDS,
  catenaryBump,
  ceilingLowestDrop,
  ceilingRunDrop,
  ceilingRunPoint,
  ceilingUsesHub,
  insetCeilingPolygon,
  pointInCeilingPolygon,
  type CeilingField,
  type CeilingLayout,
  type CeilingRun,
} from "@/lib/studio-ceiling";
import { getPolygonCentroid, type StudioBounds } from "@/lib/studio-geometry";
import * as THREE from "three";
import { pickCeilingPoint } from "../../camera/ceiling-pick";
import {
  CEILING_FLUSH_CLEARANCE_IN,
  SCALE,
  dropToWorldY,
} from "../../ceiling/frame";

/** Lowest fabric point must stay at least this far above the floor, inches. */
export const MIN_CEILING_CLEARANCE = 84;
/** Thinnest pick ribbon, inches — narrow panels stay easy to hit. */
const MIN_PICK_WIDTH = 18;
/** Perimeter / valance pick bands sit this far inside the outline, inches. */
const EDGE_PICK_INSET = 6;
const VALANCE_DEPTH = 16;
const HUB_PICK_RADIUS = 12;

export type CeilingDropField = Extract<CeilingField, "hubDrop" | "edgeDrop" | "sag">;

type Vec3 = [number, number, number];

/** World position (feet) of a plan point `drop` inches below the ceiling. */
export function ceilingWorld(
  bounds: StudioBounds,
  wallHeight: number,
  point: StudioPoint,
  drop: number
): Vec3 {
  return [
    (point.x - bounds.centerX) * SCALE,
    dropToWorldY(wallHeight, Math.max(CEILING_FLUSH_CLEARANCE_IN, drop)),
    (point.z - bounds.centerZ) * SCALE,
  ];
}

export function isCeilingMovable(drape: StudioCeilingDrape): boolean {
  return drape.coverage === "area" || ceilingUsesHub(drape.type);
}

/**
 * The plan point a design is dragged by: the area centre, the hub for
 * room-wide radial styles, else the outline centroid (not movable).
 */
export function ceilingAnchor(
  drape: StudioCeilingDrape,
  layout: CeilingLayout
): StudioPoint {
  if (drape.coverage === "area") return { x: drape.x, z: drape.z };
  if (layout.hub) return layout.hub;
  return getPolygonCentroid(layout.outline);
}

/** Inches between the lowest fabric point and the floor. */
export function ceilingClearance(drape: StudioCeilingDrape, wallHeight: number) {
  return wallHeight - ceilingLowestDrop(drape);
}

export function ceilingFieldRange(drape: StudioCeilingDrape, field: CeilingDropField) {
  return CEILING_STYLE_FIELDS[drape.type].ranges[field] ?? { min: 0, max: 480, step: 1 };
}

/**
 * Largest value between `base` and `value` that keeps the clearance limit.
 * A design that already breaks the limit may only be raised.
 */
export function clampDropForClearance(
  drape: StudioCeilingDrape,
  field: CeilingDropField,
  value: number,
  wallHeight: number
): { value: number; limited: boolean } {
  const fits = (candidate: number) =>
    ceilingClearance({ ...drape, [field]: candidate }, wallHeight) >=
    MIN_CEILING_CLEARANCE - 1e-6;
  if (fits(value)) return { value, limited: false };
  const base = drape[field];
  if (!fits(base)) return { value: Math.min(value, base), limited: true };
  let low = base;
  let high = value;
  for (let index = 0; index < 18; index += 1) {
    const mid = (low + high) / 2;
    if (fits(mid)) low = mid;
    else high = mid;
  }
  return { value: Math.floor(low), limited: true };
}

/* ------------------------------------------------------------------ */
/* Pick proxy surface                                                  */
/* ------------------------------------------------------------------ */

class TriangleSoup {
  readonly values: number[] = [];

  tri(a: Vec3, b: Vec3, c: Vec3) {
    this.values.push(...a, ...b, ...c);
  }

  quad(a: Vec3, b: Vec3, c: Vec3, d: Vec3) {
    this.tri(a, b, c);
    this.tri(a, c, d);
  }
}

function runSamples(run: CeilingRun): number[] {
  if (run.kind === "row" && run.points.length > 2) {
    const segments = run.points.length - 1;
    const perSegment = 8;
    return Array.from(
      { length: segments * perSegment + 1 },
      (_, index) => index / (segments * perSegment)
    );
  }
  return Array.from({ length: 17 }, (_, index) => index / 16);
}

function planTangent(run: CeilingRun, t: number): StudioPoint {
  const a = ceilingRunPoint(run, Math.max(0, t - 0.01));
  const b = ceilingRunPoint(run, Math.min(1, t + 0.01));
  const length = Math.hypot(b.x - a.x, b.z - a.z) || 1;
  return { x: (b.x - a.x) / length, z: (b.z - a.z) / length };
}

/** Flat ribbon along a run's fabric centreline, `run.width` across. */
function addRibbon(
  soup: TriangleSoup,
  drape: StudioCeilingDrape,
  run: CeilingRun,
  bounds: StudioBounds,
  wallHeight: number
) {
  const rows = runSamples(run).map((t) => {
    const point = ceilingRunPoint(run, t);
    const drop = ceilingRunDrop(drape, run, t);
    const tangent = planTangent(run, t);
    const taper =
      run.hubTaper !== undefined ? run.hubTaper + (1 - run.hubTaper) * t : 1;
    const half = Math.max(MIN_PICK_WIDTH, run.width * taper) / 2;
    const side = { x: -tangent.z * half, z: tangent.x * half };
    return [
      ceilingWorld(bounds, wallHeight, { x: point.x + side.x, z: point.z + side.z }, drop),
      ceilingWorld(bounds, wallHeight, { x: point.x - side.x, z: point.z - side.z }, drop),
    ];
  });
  for (let index = 1; index < rows.length; index += 1) {
    const [a, b] = rows[index - 1];
    const [c, d] = rows[index];
    soup.quad(a, b, d, c);
  }
}

/** Vertical band hanging from `topDrop` down to `bottomAt(t)` along a plan polyline. */
function addCurtainBand(
  soup: TriangleSoup,
  points: StudioPoint[],
  topDrop: number,
  bottomAt: (index: number) => number,
  bounds: StudioBounds,
  wallHeight: number
) {
  for (let index = 1; index < points.length; index += 1) {
    const a = points[index - 1];
    const b = points[index];
    soup.quad(
      ceilingWorld(bounds, wallHeight, a, topDrop),
      ceilingWorld(bounds, wallHeight, b, topDrop),
      ceilingWorld(bounds, wallHeight, b, bottomAt(index)),
      ceilingWorld(bounds, wallHeight, a, bottomAt(index - 1))
    );
  }
}

function inwardOffset(
  point: StudioPoint,
  tangent: StudioPoint,
  centroid: StudioPoint,
  distance: number
): StudioPoint {
  let normal = { x: -tangent.z, z: tangent.x };
  if ((centroid.x - point.x) * normal.x + (centroid.z - point.z) * normal.z < 0) {
    normal = { x: -normal.x, z: -normal.z };
  }
  return { x: point.x + normal.x * distance, z: point.z + normal.z * distance };
}

/** Perimeter scallop: a vertical band from the attach line to just under the swag. */
function addPerimeterBand(
  soup: TriangleSoup,
  drape: StudioCeilingDrape,
  run: CeilingRun,
  centroid: StudioPoint,
  bounds: StudioBounds,
  wallHeight: number
) {
  const samples = Array.from({ length: 9 }, (_, index) => index / 8);
  const tangent = planTangent(run, 0.5);
  const points = samples.map((t) =>
    inwardOffset(ceilingRunPoint(run, t), tangent, centroid, EDGE_PICK_INSET)
  );
  addCurtainBand(
    soup,
    points,
    Math.max(0, drape.edgeDrop - 2),
    (index) => ceilingRunDrop(drape, run, samples[index]) + 4,
    bounds,
    wallHeight
  );
}

/** Canopy / tent: fabric wedges from the hub out to each pair of perimeter points. */
function addWedges(
  soup: TriangleSoup,
  drape: StudioCeilingDrape,
  layout: CeilingLayout,
  bounds: StudioBounds,
  wallHeight: number
) {
  const hub = layout.hub;
  const perimeter = layout.perimeter;
  if (!hub || perimeter.length < 2) return;
  const radial = 6;
  const across = 4;
  const vertex = (a: StudioPoint, b: StudioPoint, s: number, u: number): Vec3 => {
    const edge = { x: a.x + (b.x - a.x) * u, z: a.z + (b.z - a.z) * u };
    const point = { x: hub.x + (edge.x - hub.x) * s, z: hub.z + (edge.z - hub.z) * s };
    const drop =
      drape.hubDrop +
      (drape.edgeDrop - drape.hubDrop) * s +
      drape.sag * 0.25 * catenaryBump(s) +
      drape.sag * catenaryBump(u) * s;
    return ceilingWorld(bounds, wallHeight, point, drop);
  };
  for (let index = 0; index < perimeter.length; index += 1) {
    const a = perimeter[index];
    const b = perimeter[(index + 1) % perimeter.length];
    for (let r = 0; r < radial; r += 1) {
      const s0 = r / radial;
      const s1 = (r + 1) / radial;
      for (let k = 0; k < across; k += 1) {
        const u0 = k / across;
        const u1 = (k + 1) / across;
        soup.quad(
          vertex(a, b, s0, u0),
          vertex(a, b, s0, u1),
          vertex(a, b, s1, u1),
          vertex(a, b, s1, u0)
        );
      }
    }
  }
}

/** Cascades: a square column per fall, ceiling to hem. */
function addFall(
  soup: TriangleSoup,
  drape: StudioCeilingDrape,
  point: StudioPoint,
  bounds: StudioBounds,
  wallHeight: number
) {
  const half = Math.max(MIN_PICK_WIDTH, drape.panelWidth * 0.6) / 2;
  const ring = [
    { x: point.x - half, z: point.z - half },
    { x: point.x + half, z: point.z - half },
    { x: point.x + half, z: point.z + half },
    { x: point.x - half, z: point.z + half },
  ];
  addCurtainBand(soup, [...ring, ring[0]], 0, () => drape.sag, bounds, wallHeight);
  const bottom = ring.map((corner) => ceilingWorld(bounds, wallHeight, corner, drape.sag));
  soup.quad(bottom[0], bottom[1], bottom[2], bottom[3]);
}

function addHub(
  soup: TriangleSoup,
  drape: StudioCeilingDrape,
  hub: StudioPoint,
  bounds: StudioBounds,
  wallHeight: number
) {
  const [x, y, z] = ceilingWorld(bounds, wallHeight, hub, drape.hubDrop);
  const sphere = getHubSphere();
  for (let index = 0; index < sphere.length; index += 3) {
    soup.values.push(sphere[index] + x, sphere[index + 1] + y, sphere[index + 2] + z);
  }
}

/* Hub pick sphere at the origin, built once (proxies rebuild on every drag frame). */
let hubSphere: Float32Array | null = null;

function getHubSphere(): Float32Array {
  if (!hubSphere) {
    const sphere = new THREE.IcosahedronGeometry(HUB_PICK_RADIUS * SCALE, 1);
    hubSphere = Float32Array.from(sphere.getAttribute("position").array);
    sphere.dispose();
  }
  return hubSphere;
}

/**
 * Invisible pick surface for one ceiling design, built from the same layout
 * and centreline drops the fabric hangs on. Caller owns (and disposes) it.
 */
export function buildCeilingProxyGeometry(
  drape: StudioCeilingDrape,
  layout: CeilingLayout,
  bounds: StudioBounds,
  wallHeight: number
): THREE.BufferGeometry {
  const soup = new TriangleSoup();
  const centroid = getPolygonCentroid(layout.outline);
  if (drape.type === "canopy" || drape.type === "tent") {
    addWedges(soup, drape, layout, bounds, wallHeight);
  }
  for (const run of layout.runs) {
    if (run.kind === "perimeter") {
      addPerimeterBand(soup, drape, run, centroid, bounds, wallHeight);
    } else if (run.kind === "row" || run.width > 0) {
      addRibbon(soup, drape, run, bounds, wallHeight);
    }
  }
  for (const point of layout.drops) addFall(soup, drape, point, bounds, wallHeight);
  if (layout.hub) addHub(soup, drape, layout.hub, bounds, wallHeight);
  if (
    drape.perimeterValance &&
    drape.type !== "perimeter_swag" &&
    layout.outline.length >= 3
  ) {
    const band = insetCeilingPolygon(layout.outline, EDGE_PICK_INSET);
    addCurtainBand(
      soup,
      [...band, band[0]],
      0,
      () => VALANCE_DEPTH,
      bounds,
      wallHeight
    );
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(soup.values, 3)
  );
  geometry.computeBoundingSphere();
  geometry.computeBoundingBox();
  return geometry;
}

/* ------------------------------------------------------------------ */
/* Handle anchors                                                      */
/* ------------------------------------------------------------------ */

export type CeilingDropHandle = {
  field: CeilingDropField;
  label: string;
  position: Vec3;
};

export type CeilingHandleAnchors = {
  /** Rotation pivot / readout anchor in plan inches. */
  pivot: StudioPoint;
  hub: Vec3 | null;
  drops: CeilingDropHandle[];
  /** Area coverage: rectangle corners on the ceiling plane, plan inches. */
  corners: StudioPoint[] | null;
  /** Whether the style or the area exposes a rotation. */
  rotatable: boolean;
};

/** Grips at the wall line move this far into the room so walls never cover them, inches. */
const HANDLE_WALL_INSET = 10;

function toward(point: StudioPoint, target: StudioPoint, inches: number): StudioPoint {
  const dx = target.x - point.x;
  const dz = target.z - point.z;
  const length = Math.hypot(dx, dz);
  if (length < 1e-6) return point;
  const step = Math.min(inches, length * 0.25) / length;
  return { x: point.x + dx * step, z: point.z + dz * step };
}

function pickRun(layout: CeilingLayout): CeilingRun | null {
  const rows = layout.runs.filter((run) => run.kind !== "spoke");
  if (rows.length > 0) return rows[Math.floor(rows.length / 2)];
  return layout.runs[0] ?? null;
}

/** Arc-length fraction of the run's lowest fabric point. */
function lowestT(drape: StudioCeilingDrape, run: CeilingRun) {
  if (run.kind === "row" && drape.type === "billow_rows" && run.points.length > 2) {
    const segments = run.points.length - 1;
    return (Math.floor(segments / 2) + 0.5) / segments;
  }
  let best = 0.5;
  let deepest = -Infinity;
  for (let index = 0; index <= 20; index += 1) {
    const t = index / 20;
    const drop = ceilingRunDrop(drape, run, t);
    if (drop > deepest + 1e-6) {
      deepest = drop;
      best = t;
    }
  }
  return best;
}

/** Where the hub / edge / sag grips sit for a single selected design. */
export function getCeilingHandleAnchors(
  drape: StudioCeilingDrape,
  layout: CeilingLayout,
  bounds: StudioBounds,
  wallHeight: number
): CeilingHandleAnchors {
  const fields = CEILING_STYLE_FIELDS[drape.type];
  const labels = fields.labels;
  const world = (point: StudioPoint, drop: number) =>
    ceilingWorld(bounds, wallHeight, point, drop);
  const drops: CeilingDropHandle[] = [];
  const pivot = ceilingAnchor(drape, layout);
  const hub = layout.hub ? world(layout.hub, drape.hubDrop) : null;

  if (layout.hub && labels.hubDrop) {
    drops.push({
      field: "hubDrop",
      label: labels.hubDrop,
      position: world(layout.hub, drape.hubDrop),
    });
  }

  if (fields.family === "radial") {
    const spokes = layout.runs.filter((run) => run.kind === "spoke");
    const first = spokes[0];
    if (first && labels.edgeDrop) {
      const landing = first.points[first.points.length - 1];
      drops.push({
        field: "edgeDrop",
        label: labels.edgeDrop,
        position: world(toward(landing, first.points[0], HANDLE_WALL_INSET), drape.edgeDrop),
      });
    }
    if (labels.sag) {
      if (drape.type === "starburst") {
        const spoke = spokes[Math.floor(spokes.length / 4)] ?? first;
        if (spoke) {
          const t = lowestT(drape, spoke);
          drops.push({
            field: "sag",
            label: labels.sag,
            position: world(ceilingRunPoint(spoke, t), ceilingRunDrop(drape, spoke, t)),
          });
        }
      } else if (layout.perimeter.length >= 2) {
        const landings = layout.perimeter
          .map((point, index) => ({ point, index }))
          .filter((entry) => entry.point.spoke);
        const start =
          landings[Math.floor(landings.length / 4)]?.index ?? 0;
        const a = layout.perimeter[start];
        const b = layout.perimeter[(start + 1) % layout.perimeter.length];
        const middle = { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 };
        drops.push({
          field: "sag",
          label: labels.sag,
          position: world(
            layout.hub ? toward(middle, layout.hub, HANDLE_WALL_INSET) : middle,
            drape.edgeDrop + drape.sag
          ),
        });
      }
    }
  } else if (fields.family === "cascades") {
    if (labels.sag && layout.drops.length > 0) {
      const nearest = layout.drops.reduce((best, point) =>
        Math.hypot(point.x - pivot.x, point.z - pivot.z) <
        Math.hypot(best.x - pivot.x, best.z - pivot.z)
          ? point
          : best
      );
      drops.push({ field: "sag", label: labels.sag, position: world(nearest, drape.sag) });
    }
  } else {
    const run = pickRun(layout);
    if (run && labels.edgeDrop) {
      const centroid = getPolygonCentroid(layout.outline);
      const attach =
        run.kind === "perimeter"
          ? toward(run.points[0], centroid, HANDLE_WALL_INSET)
          : toward(run.points[0], run.points[run.points.length - 1], HANDLE_WALL_INSET);
      drops.push({
        field: "edgeDrop",
        label: labels.edgeDrop,
        position: world(attach, drape.edgeDrop),
      });
    }
    if (run && labels.sag) {
      const t = lowestT(drape, run);
      const point = ceilingRunPoint(run, t);
      drops.push({
        field: "sag",
        label: labels.sag,
        position: world(
          run.kind === "perimeter"
            ? toward(point, getPolygonCentroid(layout.outline), HANDLE_WALL_INSET)
            : point,
          ceilingRunDrop(drape, run, t)
        ),
      });
    }
  }

  return {
    pivot,
    hub,
    drops,
    corners: drape.coverage === "area" ? layout.outline : null,
    rotatable: Boolean(labels.direction) || drape.coverage === "area",
  };
}

/* ------------------------------------------------------------------ */
/* Placement picking                                                   */
/* ------------------------------------------------------------------ */

const placementPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const placementHit = new THREE.Vector3();

/**
 * Ceiling point under the ray, plan inches: from below (in-room) via the
 * shared ceiling picker, or from above (top / dollhouse) through the open
 * ceiling. Null when the ray misses the room outline.
 */
export function pickPlacementPoint(
  raycaster: THREE.Raycaster,
  floor: StudioPoint[],
  bounds: StudioBounds,
  wallHeight: number
): StudioPoint | null {
  const below = pickCeilingPoint(raycaster, floor, bounds, wallHeight);
  if (below) return below;
  const height = wallHeight * SCALE;
  const { ray } = raycaster;
  if (ray.origin.y <= height || ray.direction.y >= -1e-4) return null;
  placementPlane.constant = -height;
  if (!ray.intersectPlane(placementPlane, placementHit)) return null;
  const x = placementHit.x / SCALE + bounds.centerX;
  const z = placementHit.z / SCALE + bounds.centerZ;
  return pointInCeilingPolygon(floor, x, z) ? { x, z } : null;
}
