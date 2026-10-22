/**
 * Pure placement for ceiling lights: fairy / starlight point clouds, bistro
 * strings, real fill-light centroids, uplight washes and the chandelier.
 * Inputs are plan inches (heights as drops below the ceiling); outputs are
 * world feet ready for buffers. Plans are cached on the fields that change
 * them, so renaming or recolouring a design never re-scatters its lights.
 */
import type { StudioCeilingDrape, StudioPoint } from "@/data/studio";
import {
  catenaryBump,
  ceilingRunDrop,
  ceilingRunPoint,
  ceilingStyleFamily,
  getCeilingLayout,
  pointInCeilingPolygon,
  type CeilingLayout,
} from "@/lib/studio-ceiling";
import type { StudioBounds } from "@/lib/studio-geometry";
import { hashSeed, rng } from "../../texture-utils";
import { SCALE } from "../frame";
import {
  createCeilingSurface,
  fabricDrop,
  getPanelFrame,
  getRadialWedges,
  panelWidthAt,
  rayToOutline,
  wedgeDrop,
  type CeilingSurface,
} from "./surface";

export type Vec3 = [number, number, number];

export type SparkleKind = "fairy" | "starlight";

export type SparkleCloud = {
  kind: SparkleKind;
  /** xyz world feet per light. */
  positions: Float32Array;
  /** 0..1 per light: brightness and twinkle phase. */
  seeds: Float32Array;
};

export type BistroStrings = {
  /** xyz world feet where each bulb's socket meets the cord. */
  bulbs: Float32Array;
  /** One cord polyline per string, xyz world feet. */
  cords: Float32Array[];
};

/** Conformal grid laid just under the fabric for additive light pools. */
export type FabricGlowPatch = {
  /** size × size vertices, xyz world feet. */
  positions: Float32Array;
  /** 0..1 falloff per vertex (0 where there is no fabric). */
  weights: Float32Array;
  size: number;
};

export type CeilingWash = {
  source: Vec3;
  target: Vec3;
  /** Spot half-angle, radians. */
  angle: number;
  /** Share of the design's fabric this wash covers (0..1). */
  weight: number;
  patch: FabricGlowPatch | null;
};

export type CeilingLightPlan = {
  sparkle: SparkleCloud | null;
  bistro: BistroStrings | null;
  /** String-light cloud centroids (world feet) and their share of the output. */
  clouds: Array<{ position: Vec3; weight: number }>;
  /** Total output of the string lights in candela at practicalBoost 1. */
  candela: number;
  washes: CeilingWash[];
  chandelier: { position: Vec3; patch: FabricGlowPatch | null } | null;
};

export type CeilingLightDensity = {
  /** Most fairy / starlight points one design may scatter. */
  sparkleCap: number;
  /** Bistro bulb spacing along the cord, inches. */
  bistroPitch: number;
};

const EMPTY_PLAN: CeilingLightPlan = {
  sparkle: null,
  bistro: null,
  clouds: [],
  candela: 0,
  washes: [],
  chandelier: null,
};

/* ------------------------------------------------------------------ */
/* Tuning (inches unless noted)                                        */
/* ------------------------------------------------------------------ */

const SPARKLE_SPECS: Record<
  SparkleKind,
  {
    /** Bulb spacing along a strand. */
    pitch: number;
    /** Strand spacing across a panel. */
    lane: number;
    /** Below the fabric. */
    lift: number;
    /** Strand droop between ties to the fabric. */
    droop: number;
    /** Candela per bulb at practicalBoost 1. */
    candela: number;
  }
> = {
  fairy: { pitch: 4, lane: 14, lift: 0.75, droop: 1.1, candela: 0.012 },
  /* Fibre-optic pinpoints sit in the fabric itself, densely and evenly. */
  starlight: { pitch: 5, lane: 6, lift: 0.3, droop: 0, candela: 0.005 },
};

/** Fairy strands zig-zag across their lane with this period. */
const ZIGZAG_PERIOD = 22;
/** Strands and cords are tied to the fabric this often. */
const FAIRY_TIE_SPACING = 26;
const BISTRO_TIE_SPACING = 48;
const BISTRO_TIE_DROOP = 2.5;
/** Cord below the fabric centreline. */
const BISTRO_OFFSET = 4;
const BISTRO_CANDELA = 0.35;
/** Cords sampled this often. */
const CORD_STEP = 3;
/** Chandelier centre below the hub. */
const CHANDELIER_DROP = 18;
const CHANDELIER_GLOW_RADIUS = 66;
const MAX_WASHES = 4;
/** Uplight sources sit just above the floor. */
const WASH_SOURCE_HEIGHT = 6;

const R2_A = 0.7548776662466927;
const R2_B = 0.5698402909980532;

const frac = (value: number) => value - Math.floor(value);
const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
/** Triangle wave in [-1, 1]. */
const triangle = (value: number) => 1 - 4 * Math.abs(frac(value + 0.25) - 0.5);

type World = (x: number, z: number, drop: number) => Vec3;

/* ------------------------------------------------------------------ */
/* Patches: anything a strand can be laid across                       */
/* ------------------------------------------------------------------ */

type Patch = {
  /** Plan length along the strand direction. */
  length: number;
  /** Extent across the strand direction at fraction t. */
  widthAt(t: number): number;
  /** Plan point + drop at fraction t, signed `across` inches, `lift` toward the guests. */
  place(t: number, across: number, lift: number): [number, number, number];
};

function runPatches(
  drape: StudioCeilingDrape,
  layout: CeilingLayout
): Patch[] {
  const patches: Patch[] = [];
  for (const run of layout.runs) {
    if (run.kind === "perimeter" || run.width <= 0) continue;
    const frame = getPanelFrame(run);
    if (!frame) continue;
    patches.push({
      length: frame.length,
      widthAt: (t) => panelWidthAt(run, t),
      place(t, across, lift) {
        const along = t * frame.length;
        return [
          frame.x0 + frame.ux * along + frame.vx * across,
          frame.z0 + frame.uz * along + frame.vz * across,
          fabricDrop(ceilingRunDrop(drape, run, t)) + lift,
        ];
      },
    });
  }
  return patches;
}

function signedArea(points: readonly StudioPoint[]) {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    area += a.x * b.z - b.x * a.z;
  }
  return area / 2;
}

/** Perimeter scallops hang like a valance: `across` runs from the top line (−) to the swag hem (+). */
function perimeterPatches(
  drape: StudioCeilingDrape,
  layout: CeilingLayout
): Patch[] {
  const inwardSign = signedArea(layout.outline) > 0 ? 1 : -1;
  const top = fabricDrop(drape.edgeDrop);
  return layout.runs
    .filter((run) => run.kind === "perimeter")
    .map((run) => {
      const a = run.points[0];
      const b = run.points[run.points.length - 1];
      const length = Math.hypot(b.x - a.x, b.z - a.z) || 1;
      const ux = (b.x - a.x) / length;
      const uz = (b.z - a.z) / length;
      const nx = -uz * inwardSign;
      const nz = ux * inwardSign;
      const depthAt = (t: number) => drape.sag * catenaryBump(t);
      return {
        length,
        widthAt: (t: number) => depthAt(t) + 2,
        place(t: number, across: number, lift: number): [number, number, number] {
          const w = depthAt(t) + 2;
          const f = clamp(across / w + 0.5, 0, 1);
          /* The swag bellies into the room as it drops. */
          const inward = 1.5 + 3 * f * catenaryBump(t) + lift;
          return [
            a.x + ux * t * length + nx * inward,
            a.z + uz * t * length + nz * inward,
            top + f * depthAt(t),
          ];
        },
      };
    });
}

function patchArea(patch: Patch) {
  let width = 0;
  for (let i = 0; i <= 4; i++) width += patch.widthAt(i / 4);
  return (patch.length * width) / 5;
}

/* ------------------------------------------------------------------ */
/* Sparkle scatter                                                     */
/* ------------------------------------------------------------------ */

type SparkleSink = { positions: number[]; seeds: number[] };

function pushSparkle(sink: SparkleSink, world: World, x: number, z: number, drop: number, seed: number) {
  const [wx, wy, wz] = world(x, z, drop);
  sink.positions.push(wx, wy, wz);
  sink.seeds.push(seed);
}

/** Lengthwise strands, each zig-zagging inside its lane and drooping between ties. */
function fairyOnPatch(
  patch: Patch,
  pitch: number,
  lane: number,
  spec: (typeof SPARKLE_SPECS)[SparkleKind],
  rand: () => number,
  world: World,
  sink: SparkleSink
) {
  const widest = Math.max(patch.widthAt(0), patch.widthAt(0.5), patch.widthAt(1));
  const strands = Math.max(1, Math.round(widest / lane));
  const count = Math.max(2, Math.ceil(patch.length / pitch));
  for (let k = 0; k < strands; k++) {
    const phase = rand();
    for (let i = 0; i < count; i++) {
      const t = clamp((i + 0.5 + (rand() - 0.5) * 0.5) / count, 0, 1);
      const width = patch.widthAt(t);
      const laneWidth = width / strands;
      const along = t * patch.length;
      const across =
        -width / 2 +
        (k + 0.5) * laneWidth +
        triangle(along / ZIGZAG_PERIOD + phase) * laneWidth * 0.4 +
        (rand() - 0.5) * 0.8;
      const droop = spec.droop * catenaryBump(frac(along / FAIRY_TIE_SPACING + phase));
      const [x, z, drop] = patch.place(t, across, spec.lift + droop + rand() * 0.25);
      pushSparkle(sink, world, x, z, drop, rand());
    }
  }
}

/** Even low-discrepancy pinpoints (R2 sequence) with a little jitter. */
function starsOnPatch(
  patch: Patch,
  areaPer: number,
  spec: (typeof SPARKLE_SPECS)[SparkleKind],
  rand: () => number,
  world: World,
  sink: SparkleSink
) {
  const count = Math.round(patchArea(patch) / areaPer);
  const ox = rand();
  const oy = rand();
  const jitter = 0.35 / Math.sqrt(Math.max(1, count));
  for (let i = 0; i < count; i++) {
    const t = clamp(frac(ox + i * R2_A) + (rand() - 0.5) * jitter, 0, 1);
    const v = clamp(frac(oy + i * R2_B) + (rand() - 0.5) * jitter, 0, 1);
    const [x, z, drop] = patch.place(t, (v - 0.5) * patch.widthAt(t), spec.lift);
    pushSparkle(sink, world, x, z, drop, rand());
  }
}

type Wedge = { a0: number; a1: number; reach: number };

function canopyWedges(layout: CeilingLayout): { hub: StudioPoint; wedges: Wedge[] } | null {
  const radial = getRadialWedges(layout);
  if (!radial) return null;
  const { hub, angles } = radial;
  const wedges: Wedge[] = [];
  for (let i = 0; i < angles.length - 1; i++) {
    const a0 = angles[i];
    const a1 = angles[i + 1];
    let reach = 0;
    for (let k = 0; k < 3; k++) {
      const a = a0 + ((a1 - a0) * (k + 0.5)) / 3;
      reach += rayToOutline(layout.outline, hub.x, hub.z, Math.cos(a), Math.sin(a)) ?? 0;
    }
    reach /= 3;
    if (reach > 1 && a1 > a0) wedges.push({ a0, a1, reach });
  }
  return { hub, wedges };
}

const wedgeArea = (wedge: Wedge) => 0.5 * wedge.reach * wedge.reach * (wedge.a1 - wedge.a0);

/**
 * Canopy / tent: fairy strands swag across each wedge in rings around the
 * gather (even density, the way installers lace a canopy); starlight is an
 * even area scatter.
 */
function sparkleOnWedges(
  drape: StudioCeilingDrape,
  layout: CeilingLayout,
  hub: StudioPoint,
  wedges: Wedge[],
  kind: SparkleKind,
  pitch: number,
  lane: number,
  areaPer: number,
  rand: () => number,
  world: World,
  sink: SparkleSink
) {
  const spec = SPARKLE_SPECS[kind];
  const place = (a: number, r: number, s: number, lift: number) => {
    const dx = Math.cos(a);
    const dz = Math.sin(a);
    const reach = rayToOutline(layout.outline, hub.x, hub.z, dx, dz);
    if (reach === null) return;
    const rr = clamp(r, 0.02, 0.995);
    pushSparkle(
      sink,
      world,
      hub.x + dx * rr * reach,
      hub.z + dz * rr * reach,
      wedgeDrop(drape, rr, s) + lift,
      rand()
    );
  };
  for (const wedge of wedges) {
    const span = wedge.a1 - wedge.a0;
    if (kind === "starlight") {
      const count = Math.round(wedgeArea(wedge) / areaPer);
      const ox = rand();
      const oy = rand();
      for (let i = 0; i < count; i++) {
        const r = Math.sqrt(frac(ox + i * R2_A));
        const s = frac(oy + i * R2_B);
        place(wedge.a0 + span * s, r, s, spec.lift);
      }
      continue;
    }
    const rings = Math.max(1, Math.round(wedge.reach / lane));
    for (let j = 0; j < rings; j++) {
      const r = (j + 0.5) / rings;
      const arc = r * wedge.reach * span;
      const count = Math.max(1, Math.round(arc / pitch));
      const phase = rand();
      for (let i = 0; i < count; i++) {
        const s = clamp((i + 0.5 + (rand() - 0.5) * 0.5) / count, 0, 1);
        const along = s * arc;
        const rr =
          r +
          (triangle(along / ZIGZAG_PERIOD + phase) * 0.4 + (rand() - 0.5) * 0.3) / rings;
        const droop = spec.droop * catenaryBump(frac(along / FAIRY_TIE_SPACING + phase));
        place(wedge.a0 + span * s, rr, s, spec.lift + droop + rand() * 0.25);
      }
    }
  }
}

function cascadeRadius(drape: StudioCeilingDrape, f: number) {
  return Math.max(2, drape.panelWidth * (0.14 + 0.2 * f)) + 0.75;
}

/** Fairy lights spiral down each fall; starlight dots its surface. */
function sparkleOnCascades(
  drape: StudioCeilingDrape,
  layout: CeilingLayout,
  kind: SparkleKind,
  pitch: number,
  areaPer: number,
  rand: () => number,
  world: World,
  sink: SparkleSink
) {
  const length = Math.max(12, drape.sag);
  const top = fabricDrop(0) + 2;
  for (const point of layout.drops) {
    if (kind === "starlight") {
      const count = Math.round((Math.PI * 2 * cascadeRadius(drape, 0.5) * length) / areaPer);
      for (let i = 0; i < count; i++) {
        const f = rand();
        const a = rand() * Math.PI * 2;
        const r = cascadeRadius(drape, f) - 0.5;
        pushSparkle(sink, world, point.x + Math.cos(a) * r, point.z + Math.sin(a) * r, top + f * (length - top), rand());
      }
      continue;
    }
    /* ~3 turns per yard of fall, bulbs every `pitch` along the helix. */
    const rise = 12;
    let angle = rand() * Math.PI * 2;
    let drop = top;
    while (drop < length) {
      const f = drop / length;
      const r = cascadeRadius(drape, f) * (0.92 + rand() * 0.16);
      pushSparkle(sink, world, point.x + Math.cos(angle) * r, point.z + Math.sin(angle) * r, drop, rand());
      const step = pitch / r;
      angle += step;
      drop += (rise * step) / (Math.PI * 2);
    }
  }
}

function buildSparkle(
  drape: StudioCeilingDrape,
  layout: CeilingLayout,
  kind: SparkleKind,
  cap: number,
  rand: () => number,
  world: World
): SparkleCloud | null {
  const spec = SPARKLE_SPECS[kind];
  const family = ceilingStyleFamily(drape.type);
  const radial = drape.type === "canopy" || drape.type === "tent";
  const patches = radial
    ? []
    : family === "perimeter"
      ? perimeterPatches(drape, layout)
      : runPatches(drape, layout);
  const fan = radial ? canopyWedges(layout) : null;

  /* Thin the scatter evenly when a huge room would exceed the cap. */
  let area = 0;
  for (const patch of patches) area += patchArea(patch);
  for (const wedge of fan?.wedges ?? []) area += wedgeArea(wedge);
  if (family === "cascades") {
    area +=
      layout.drops.length *
      Math.PI * 2 * cascadeRadius(drape, 0.5) * Math.max(12, drape.sag);
  }
  const baseAreaPer = spec.pitch * spec.lane;
  const thin = Math.max(1, area / baseAreaPer / Math.max(1, cap));
  const pitch = spec.pitch * Math.sqrt(thin);
  const lane = spec.lane * Math.sqrt(thin);
  const areaPer = baseAreaPer * thin;

  const sink: SparkleSink = { positions: [], seeds: [] };
  for (const patch of patches) {
    if (kind === "fairy") fairyOnPatch(patch, pitch, lane, spec, rand, world, sink);
    else starsOnPatch(patch, areaPer, spec, rand, world, sink);
  }
  if (fan) {
    sparkleOnWedges(drape, layout, fan.hub, fan.wedges, kind, pitch, lane, areaPer, rand, world, sink);
  }
  if (family === "cascades") {
    sparkleOnCascades(drape, layout, kind, pitch, areaPer, rand, world, sink);
  }
  if (sink.seeds.length === 0) return null;
  return {
    kind,
    positions: new Float32Array(sink.positions),
    seeds: new Float32Array(sink.seeds),
  };
}

/* ------------------------------------------------------------------ */
/* Bistro strings                                                      */
/* ------------------------------------------------------------------ */

type StringPath = {
  length: number;
  /** Plan point + drop of the fabric (or hang line) the cord follows. */
  at(t: number): [number, number, number];
  /** Leave this much cord bare at the start (crowded hubs). */
  skipStart: number;
};

function bistroPaths(drape: StudioCeilingDrape, layout: CeilingLayout): StringPath[] {
  const family = ceilingStyleFamily(drape.type);
  if (family === "perimeter") {
    return perimeterPatches(drape, layout).map((patch) => ({
      length: patch.length,
      skipStart: 0,
      at: (t: number) => patch.place(t, patch.widthAt(t) / 2, 1.5),
    }));
  }
  if (family === "cascades") {
    /* Swagged between the tops of neighbouring falls. */
    const paths: StringPath[] = [];
    const drops = layout.drops;
    let nearest = Infinity;
    for (let i = 1; i < drops.length; i++) {
      nearest = Math.min(nearest, Math.hypot(drops[i].x - drops[i - 1].x, drops[i].z - drops[i - 1].z));
    }
    for (let i = 1; i < drops.length; i++) {
      const a = drops[i - 1];
      const b = drops[i];
      const length = Math.hypot(b.x - a.x, b.z - a.z);
      if (!(length > 1) || length > nearest * 1.6) continue;
      const sag = Math.min(18, length * 0.08);
      paths.push({
        length,
        skipStart: 0,
        at: (t: number) => [a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t, 6 + sag * catenaryBump(t)],
      });
    }
    return paths;
  }
  return layout.runs
    .filter((run) => run.kind !== "perimeter")
    .map((run) => {
      const frame = getPanelFrame(run);
      return {
        length: frame?.length ?? 0,
        skipStart: run.kind === "spoke" ? 14 : 0,
        at: (t: number): [number, number, number] => {
          const point = ceilingRunPoint(run, t);
          return [point.x, point.z, fabricDrop(ceilingRunDrop(drape, run, t))];
        },
      };
    })
    .filter((path) => path.length > 1);
}

function buildBistro(
  drape: StudioCeilingDrape,
  layout: CeilingLayout,
  pitch: number,
  world: World
): BistroStrings | null {
  const bulbs: number[] = [];
  const cords: Float32Array[] = [];
  const hang = (path: StringPath, t: number): Vec3 => {
    const [x, z, drop] = path.at(t);
    const tie = BISTRO_TIE_DROOP * catenaryBump(frac((t * path.length) / BISTRO_TIE_SPACING));
    return world(x, z, drop + BISTRO_OFFSET + tie);
  };
  for (const path of bistroPaths(drape, layout)) {
    const segments = Math.max(2, Math.ceil(path.length / CORD_STEP));
    const cord = new Float32Array((segments + 1) * 3);
    for (let i = 0; i <= segments; i++) cord.set(hang(path, i / segments), i * 3);
    cords.push(cord);
    const usable = path.length - path.skipStart;
    const count = Math.floor(usable / pitch);
    const start = path.skipStart + (usable - (count - 1) * pitch) / 2;
    for (let i = 0; i < count; i++) {
      bulbs.push(...hang(path, (start + i * pitch) / path.length));
    }
  }
  if (bulbs.length === 0) return null;
  return { bulbs: new Float32Array(bulbs), cords };
}

/* ------------------------------------------------------------------ */
/* Clustering (k-means, deterministic farthest-point seeding)          */
/* ------------------------------------------------------------------ */

type Cluster = { center: Vec3; weight: number; spread: number };

function clusterPoints(points: Vec3[], k: number): Cluster[] {
  if (points.length === 0) return [];
  const count = Math.min(k, points.length);
  const centers: Vec3[] = [];
  const mean: Vec3 = [0, 0, 0];
  for (const p of points) {
    mean[0] += p[0] / points.length;
    mean[1] += p[1] / points.length;
    mean[2] += p[2] / points.length;
  }
  const flat = (a: Vec3, b: Vec3) => (a[0] - b[0]) ** 2 + (a[2] - b[2]) ** 2;
  let seed = mean;
  while (centers.length < count) {
    let best = points[0];
    let bestDistance = -1;
    for (const p of points) {
      const d = centers.length
        ? Math.min(...centers.map((c) => flat(c, p)))
        : flat(seed, p);
      if (d > bestDistance) {
        bestDistance = d;
        best = p;
      }
    }
    centers.push([...best] as Vec3);
    seed = best;
  }
  const owner = new Int32Array(points.length);
  for (let iteration = 0; iteration < 8; iteration++) {
    points.forEach((p, i) => {
      let best = 0;
      for (let c = 1; c < centers.length; c++) {
        if (flat(centers[c], p) < flat(centers[best], p)) best = c;
      }
      owner[i] = best;
    });
    const sums = centers.map(() => [0, 0, 0, 0]);
    points.forEach((p, i) => {
      const sum = sums[owner[i]];
      sum[0] += p[0];
      sum[1] += p[1];
      sum[2] += p[2];
      sum[3] += 1;
    });
    sums.forEach((sum, c) => {
      if (sum[3] > 0) centers[c] = [sum[0] / sum[3], sum[1] / sum[3], sum[2] / sum[3]];
    });
  }
  const spread = centers.map(() => 0);
  const members = centers.map(() => 0);
  points.forEach((p, i) => {
    spread[owner[i]] += flat(centers[owner[i]], p);
    members[owner[i]] += 1;
  });
  return centers
    .map((center, c) => ({
      center,
      weight: members[c] / points.length,
      spread: members[c] ? Math.sqrt(spread[c] / members[c]) : 0,
    }))
    .filter((cluster) => cluster.weight > 0);
}

function subsample(positions: Float32Array, limit: number): Vec3[] {
  const total = positions.length / 3;
  const stride = Math.max(1, Math.floor(total / limit));
  const points: Vec3[] = [];
  for (let i = 0; i < total; i += stride) {
    points.push([positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]]);
  }
  return points;
}

/* ------------------------------------------------------------------ */
/* Washes + glow patches                                               */
/* ------------------------------------------------------------------ */

function buildGlowPatch(
  surface: CeilingSurface,
  cx: number,
  cz: number,
  radius: number,
  world: World
): FabricGlowPatch | null {
  const cell = Math.max(6, radius / 24);
  const half = Math.ceil(radius / cell);
  const size = half * 2 + 1;
  const drops = new Float64Array(size * size).fill(Number.NaN);
  const valid = new Uint8Array(size * size);
  let any = false;
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const drop = surface.dropAt(cx + (i - half) * cell, cz + (j - half) * cell);
      if (drop === null) continue;
      drops[j * size + i] = drop;
      valid[j * size + i] = 1;
      any = true;
    }
  }
  if (!any) return null;
  /* Grow heights into gaps so faded edge triangles stay on the fabric plane. */
  for (let pass = 0; pass < 3; pass++) {
    const next = drops.slice();
    for (let j = 0; j < size; j++) {
      for (let i = 0; i < size; i++) {
        if (!Number.isNaN(drops[j * size + i])) continue;
        let sum = 0;
        let n = 0;
        for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const ii = i + di;
          const jj = j + dj;
          if (ii < 0 || jj < 0 || ii >= size || jj >= size) continue;
          const d = drops[jj * size + ii];
          if (!Number.isNaN(d)) {
            sum += d;
            n += 1;
          }
        }
        if (n) next[j * size + i] = sum / n;
      }
    }
    drops.set(next);
  }
  let fallback = 0;
  let fallbackCount = 0;
  drops.forEach((d) => {
    if (!Number.isNaN(d)) {
      fallback += d;
      fallbackCount += 1;
    }
  });
  fallback /= Math.max(1, fallbackCount);
  const positions = new Float32Array(size * size * 3);
  const weights = new Float32Array(size * size);
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const index = j * size + i;
      const x = cx + (i - half) * cell;
      const z = cz + (j - half) * cell;
      const drop = Number.isNaN(drops[index]) ? fallback : drops[index];
      positions.set(world(x, z, drop + 1), index * 3);
      const r2 = ((x - cx) ** 2 + (z - cz) ** 2) / (radius * radius);
      weights[index] = valid[index] && r2 < 1 ? Math.exp(-r2 * 3) * (1 - r2) : 0;
    }
  }
  return { positions, weights, size };
}

type WashSample = { x: number; z: number; drop: number };

function washSamples(
  drape: StudioCeilingDrape,
  layout: CeilingLayout,
  surface: CeilingSurface | null
): { samples: WashSample[]; areaSqFt: number } {
  const family = ceilingStyleFamily(drape.type);
  if (surface) {
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (const p of layout.outline) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minZ = Math.min(minZ, p.z);
      maxZ = Math.max(maxZ, p.z);
    }
    const step = Math.max(18, Math.sqrt(((maxX - minX) * (maxZ - minZ)) / 600));
    const samples: WashSample[] = [];
    for (let x = minX + step / 2; x < maxX; x += step) {
      for (let z = minZ + step / 2; z < maxZ; z += step) {
        if (!pointInCeilingPolygon(layout.outline, x, z)) continue;
        const drop = surface.dropAt(x, z);
        if (drop !== null) samples.push({ x, z, drop });
      }
    }
    return { samples, areaSqFt: (samples.length * step * step) / 144 };
  }
  if (family === "perimeter") {
    const samples = perimeterPatches(drape, layout).map((patch) => {
      const [x, z, drop] = patch.place(0.5, patch.widthAt(0.5) * 0.2, 0);
      return { x, z, drop };
    });
    return { samples, areaSqFt: samples.length * 40 };
  }
  if (family === "cascades") {
    const drop = Math.max(12, drape.sag) * 0.45;
    const samples = layout.drops.map((p) => ({ x: p.x, z: p.z, drop }));
    return { samples, areaSqFt: samples.length * 60 };
  }
  return { samples: [], areaSqFt: 0 };
}

function buildWashes(
  drape: StudioCeilingDrape,
  layout: CeilingLayout,
  surface: CeilingSurface | null,
  wallHeight: number,
  room: StudioPoint,
  world: World
): CeilingWash[] {
  const { samples, areaSqFt } = washSamples(drape, layout, surface);
  if (samples.length === 0) return [];
  const k = clamp(Math.round(areaSqFt / 260), 1, MAX_WASHES);
  /* Cluster in plan inches; y carries the drop. */
  const clusters = clusterPoints(
    samples.map((s) => [s.x, s.drop, s.z] as Vec3),
    k
  );
  /* Vertical fabric (swags, falls) is lit from a few feet into the room. */
  const pullIn = !surface;
  return clusters.map((cluster) => {
    const [tx, drop, tz] = cluster.center;
    const radius = Math.max(36, cluster.spread * 1.3);
    let sx = tx;
    let sz = tz;
    if (pullIn) {
      const dx = room.x - tx;
      const dz = room.z - tz;
      const distance = Math.hypot(dx, dz);
      const pull = Math.min(72, distance * 0.35);
      if (distance > 1) {
        sx += (dx / distance) * pull;
        sz += (dz / distance) * pull;
      }
    }
    const reach = Math.hypot(tx - sx, tz - sz, wallHeight - drop - WASH_SOURCE_HEIGHT);
    return {
      source: world(sx, sz, wallHeight - WASH_SOURCE_HEIGHT),
      target: world(tx, tz, drop),
      angle: clamp(Math.atan((radius * 1.1) / Math.max(12, reach)), 0.22, 1.0),
      weight: cluster.weight,
      patch: surface ? buildGlowPatch(surface, tx, tz, radius * 1.15, world) : null,
    };
  });
}

/* ------------------------------------------------------------------ */
/* Plan                                                                */
/* ------------------------------------------------------------------ */

export type CeilingLightPlanInput = {
  drape: StudioCeilingDrape;
  floor: readonly StudioPoint[];
  wallHeight: number;
  bounds: StudioBounds;
  density: CeilingLightDensity;
};

function centroid(points: readonly StudioPoint[]): StudioPoint {
  let x = 0;
  let z = 0;
  for (const p of points) {
    x += p.x;
    z += p.z;
  }
  return points.length ? { x: x / points.length, z: z / points.length } : { x: 0, z: 0 };
}

type PlanContext = {
  layout: CeilingLayout;
  world: World;
  chandelierHub: StudioPoint | null;
};

function planContext({ drape, floor, wallHeight, bounds }: CeilingLightPlanInput): PlanContext | null {
  const layout = getCeilingLayout(drape, floor);
  if (layout.outline.length < 3) return null;
  const world: World = (x, z, drop) => [
    (x - bounds.centerX) * SCALE,
    (wallHeight - drop) * SCALE,
    (z - bounds.centerZ) * SCALE,
  ];
  const chandelierHub =
    drape.hubDecor === "chandelier" && layout.hub ? layout.hub : null;
  return { layout, world, chandelierHub };
}

type LightsPart = Pick<CeilingLightPlan, "sparkle" | "bistro" | "clouds" | "candela">;
type FixturesPart = Pick<CeilingLightPlan, "washes" | "chandelier">;

const NO_LIGHTS: LightsPart = { sparkle: null, bistro: null, clouds: [], candela: 0 };
const NO_FIXTURES: FixturesPart = { washes: [], chandelier: null };

/** String lights (sparkle cloud or bistro strings) and their fill-light centroids. */
function buildLightsPart(
  { drape, density }: CeilingLightPlanInput,
  { layout, world, chandelierHub }: PlanContext
): LightsPart {
  const rand = rng(hashSeed(`${drape.id}:${drape.lights}`));
  let sparkle: SparkleCloud | null = null;
  let bistro: BistroStrings | null = null;
  let candela = 0;
  let lightPositions: Float32Array | null = null;
  if (drape.lights === "fairy" || drape.lights === "starlight") {
    sparkle = buildSparkle(drape, layout, drape.lights, density.sparkleCap, rand, world);
    if (sparkle) {
      lightPositions = sparkle.positions;
      candela = sparkle.seeds.length * SPARKLE_SPECS[drape.lights].candela;
    }
  } else if (drape.lights === "bistro") {
    bistro = buildBistro(drape, layout, density.bistroPitch, world);
    if (bistro) {
      lightPositions = bistro.bulbs;
      candela = (bistro.bulbs.length / 3) * BISTRO_CANDELA;
    }
  }
  if (!lightPositions) return NO_LIGHTS;

  const clouds: CeilingLightPlan["clouds"] = [];
  const points = subsample(lightPositions, 900);
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p[0]);
    maxX = Math.max(maxX, p[0]);
    minZ = Math.min(minZ, p[2]);
    maxZ = Math.max(maxZ, p[2]);
  }
  const extent = Math.hypot(maxX - minX, maxZ - minZ);
  /* ≤ 3 real lights per design, counting the chandelier. */
  const most = chandelierHub ? 2 : 3;
  const k = Math.min(most, extent < 20 ? 1 : extent < 45 ? 2 : 3);
  for (const cluster of clusterPoints(points, k)) {
    clouds.push({ position: cluster.center, weight: cluster.weight });
  }
  return { sparkle, bistro, clouds, candela };
}

/** Uplight washes and the hub chandelier, with their fabric glow patches. */
function buildFixturesPart(
  { drape, wallHeight }: CeilingLightPlanInput,
  { layout, world, chandelierHub }: PlanContext
): FixturesPart {
  if (drape.uplightColor === null && !chandelierHub) return NO_FIXTURES;
  const surface = createCeilingSurface(drape, layout);
  const washes = drape.uplightColor
    ? buildWashes(drape, layout, surface, wallHeight, centroid(layout.outline), world)
    : [];
  const chandelier = chandelierHub
    ? {
        position: world(
          chandelierHub.x,
          chandelierHub.z,
          fabricDrop(drape.hubDrop) + CHANDELIER_DROP
        ),
        patch: surface
          ? buildGlowPatch(surface, chandelierHub.x, chandelierHub.z, CHANDELIER_GLOW_RADIUS, world)
          : null,
      }
    : null;
  return { washes, chandelier };
}

export function buildCeilingLightPlan(input: CeilingLightPlanInput): CeilingLightPlan {
  const context = planContext(input);
  if (!context) return EMPTY_PLAN;
  return { ...buildLightsPart(input, context), ...buildFixturesPart(input, context) };
}

/* ------------------------------------------------------------------ */
/* Caches keyed on the fields that move lights                         */
/* ------------------------------------------------------------------ */

/**
 * Strings and fixtures cache separately so toggling an uplight never
 * re-scatters the string lights (and their GPU buffers), and a sparkle-cap
 * change never rebuilds bistro strings or washes.
 */
const PLAN_CACHE_LIMIT = 48;

class LruCache<T> {
  private readonly map = new Map<string, T>();

  get(key: string): T | undefined {
    const value = this.map.get(key);
    if (value !== undefined) {
      this.map.delete(key);
      this.map.set(key, value);
    }
    return value;
  }

  set(key: string, value: T) {
    this.map.set(key, value);
    if (this.map.size > PLAN_CACHE_LIMIT) {
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) this.map.delete(oldest);
    }
  }
}

const lightsCache = new LruCache<LightsPart>();
const fixturesCache = new LruCache<FixturesPart>();
const planCache = new LruCache<CeilingLightPlan>();

function shapeKey({ drape, floor, wallHeight, bounds }: CeilingLightPlanInput) {
  return [
    drape.id,
    drape.type,
    drape.coverage,
    drape.x,
    drape.z,
    drape.width,
    drape.depth,
    drape.rotation,
    drape.inset,
    drape.hubX,
    drape.hubZ,
    drape.edgeDrop,
    drape.hubDrop,
    drape.sag,
    drape.count,
    drape.panelWidth,
    drape.scallops,
    wallHeight,
    bounds.centerX,
    bounds.centerZ,
    floor.map((p) => `${p.x},${p.z}`).join(";"),
  ].join("|");
}

function lightsKey(shape: string, { drape, density }: CeilingLightPlanInput) {
  const spacing =
    drape.lights === "bistro"
      ? `p${density.bistroPitch}`
      : drape.lights === "none"
        ? ""
        : `c${density.sparkleCap}`;
  return `${shape}|${drape.lights}|${spacing}|${drape.hubDecor === "chandelier" ? 1 : 0}`;
}

function fixturesKey(shape: string, { drape }: CeilingLightPlanInput) {
  return `${shape}|${drape.uplightColor ? 1 : 0}|${drape.hubDecor === "chandelier" ? 1 : 0}`;
}

/** Cached `buildCeilingLightPlan`; returns the same objects while the inputs that matter are unchanged. */
export function getCeilingLightPlan(input: CeilingLightPlanInput): CeilingLightPlan {
  if (
    input.drape.lights === "none" &&
    input.drape.uplightColor === null &&
    input.drape.hubDecor !== "chandelier"
  ) {
    return EMPTY_PLAN;
  }
  const shape = shapeKey(input);
  const keyL = lightsKey(shape, input);
  const keyF = fixturesKey(shape, input);
  const planKey = `${keyL}#${keyF}`;
  const cachedPlan = planCache.get(planKey);
  if (cachedPlan) return cachedPlan;

  let context: PlanContext | null | undefined;
  const getContext = () => (context === undefined ? (context = planContext(input)) : context);

  let lights = lightsCache.get(keyL);
  if (!lights) {
    const ctx = getContext();
    lights = ctx && input.drape.lights !== "none" ? buildLightsPart(input, ctx) : NO_LIGHTS;
    lightsCache.set(keyL, lights);
  }
  let fixtures = fixturesCache.get(keyF);
  if (!fixtures) {
    const ctx = getContext();
    fixtures = ctx ? buildFixturesPart(input, ctx) : NO_FIXTURES;
    fixturesCache.set(keyF, fixtures);
  }
  const plan: CeilingLightPlan = { ...lights, ...fixtures };
  planCache.set(planKey, plan);
  return plan;
}
