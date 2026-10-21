/**
 * Procedural drape geometry (feet). Pure functions — callers memoize and
 * dispose. UVs are authored in feet (see textures.ts).
 *
 * Pleated panels are built along a 2D "hang path" in the Y/Z plane (rod pocket
 * arc → straight drop → optional floor puddle). Folds displace each vertex
 * along the path normal, so the same fold field wraps the pipe, hangs, and
 * pools on the floor without seams.
 */
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { rng } from "../texture-utils";
import type { FabricQuality } from "./materials";

const TAU = Math.PI * 2;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smoothstep = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a || 1));
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

type QualityProfile = {
  /** Grid columns per fold. */
  columnsPerFold: number;
  /** Body rows per foot of drop. */
  rowsPerFoot: number;
  minRows: number;
  maxColumns: number;
  arcRows: number;
  puddleRows: number;
};

const QUALITY: Record<FabricQuality, QualityProfile> = {
  draft: { columnsPerFold: 5, rowsPerFoot: 1.6, minRows: 12, maxColumns: 520, arcRows: 3, puddleRows: 4 },
  high: { columnsPerFold: 8, rowsPerFoot: 3, minRows: 22, maxColumns: 1100, arcRows: 6, puddleRows: 7 },
  ultra: { columnsPerFold: 12, rowsPerFoot: 4.6, minRows: 34, maxColumns: 1800, arcRows: 9, puddleRows: 10 },
};

export function qualityProfile(quality: FabricQuality = "high") {
  return QUALITY[quality] ?? QUALITY.high;
}

/** Folds per foot of hanging width for a given fullness. */
export function foldsPerFoot(fullness: number) {
  return 0.85 + 0.32 * Math.max(1, fullness);
}

/** Peak fold depth (feet) for a given fullness. */
export function foldDepth(fullness: number) {
  return Math.min(0.3, Math.max(0.018, 0.135 * (Math.max(1, fullness) - 0.82)));
}

/** Seeded, irregular fold field. Returns roughly [-1, 1]. */
export function createFoldField(seed: number, folds: number) {
  const rand = rng(seed);
  const p = Array.from({ length: 8 }, () => rand() * TAU);
  const f2 = 0.47 + rand() * 0.12;
  const f3 = 1.83 + rand() * 0.2;
  const drift = 0.22 + rand() * 0.18;
  return {
    /** Main hanging folds. `u` 0..1 across the fabric, `y` feet. */
    main(u: number, y: number) {
      const wander = drift * Math.sin(y * 0.38 + p[0]) + 0.12 * Math.sin(y * 0.91 + p[1]);
      const a = Math.sin(TAU * u * folds + p[2] + wander);
      // Broad, rounded front lobes; tighter back creases.
      const shaped = a >= 0 ? Math.pow(a, 0.78) : -Math.pow(-a, 1.35);
      const depthMod =
        0.72 +
        0.2 * Math.sin(TAU * u * folds * 0.143 + p[3]) +
        0.12 * Math.sin(TAU * u * folds * 0.31 + p[4]);
      return (
        shaped * depthMod * 0.74 +
        0.22 * Math.sin(TAU * u * folds * f2 + p[5] + wander * 1.6) +
        0.09 * Math.sin(TAU * u * folds * f3 + p[6] - wander)
      );
    },
    /** Tight rod-pocket / pinch gathers. */
    gather(u: number) {
      return (
        0.62 * Math.sin(TAU * u * folds * 2.4 + p[7]) +
        0.28 * Math.sin(TAU * u * folds * 5.1 + p[2] * 1.7)
      );
    },
    phase: p,
  };
}

type PathSample = {
  y: number;
  z: number;
  /** Unit path normal (fold displacement direction) in Y/Z. */
  ny: number;
  nz: number;
  /** Arc length from the top, feet. */
  s: number;
  region: "pocket" | "body" | "puddle";
  /** 0..1 within the puddle region. */
  puddleT: number;
};

export type TiebackSpec = {
  /** Height of the tie point above the floor, feet. */
  y: number;
  /** Edge the fabric is pulled toward: -1 = left (x0), 1 = right. */
  side: -1 | 1;
  /** Bundle width at the tie, feet. */
  bundle?: number;
};

export type PleatedPanelOptions = {
  /** Hanging width at the top, feet. */
  width: number;
  /** Height of the top of the fabric above the floor, feet. */
  height: number;
  fullness: number;
  seed: number;
  quality?: FabricQuality;
  /** Left edge (feet). Defaults to `-width / 2`. */
  x0?: number;
  /** Front face plane of the hanging fabric (z of the pipe face), feet. */
  z?: number;
  /** Rod pocket wraps a pipe of this radius; otherwise a pinch-pleat header. */
  pipeRadius?: number;
  /** Mid-panel sag of the header, feet. */
  sag?: number;
  /** Floor puddle length, feet (0 = floor-length hem). */
  puddle?: number;
  /** Bottom of the fabric above the floor, feet. */
  bottom?: number;
  tieback?: TiebackSpec;
  /** Multiplier on fold depth. */
  depthScale?: number;
};

function buildHangPath(
  options: PleatedPanelOptions,
  profile: QualityProfile,
  amplitude: number
): PathSample[] {
  const samples: PathSample[] = [];
  const height = options.height;
  const bottom = options.bottom ?? 0.03;
  const puddle = Math.max(0, options.puddle ?? 0);
  const z = options.z ?? 0;
  let s = 0;

  let bodyTop = height;
  if (options.pipeRadius) {
    const r = options.pipeRadius + 0.012;
    const centerY = height - r;
    const centerZ = z - r;
    const start = (155 * Math.PI) / 180;
    const steps = profile.arcRows;
    for (let i = 0; i <= steps; i++) {
      const theta = start * (1 - i / steps);
      samples.push({
        y: centerY + r * Math.sin(theta),
        z: centerZ + r * Math.cos(theta),
        ny: Math.sin(theta),
        nz: Math.cos(theta),
        s,
        region: "pocket",
        puddleT: 0,
      });
      s += (r * start) / steps;
    }
    samples.pop();
    s -= (r * start) / steps;
    bodyTop = centerY;
  }

  const bend = puddle > 0 ? Math.min(0.32, Math.max(0.12, amplitude * 1.6)) : 0;
  const bodyBottom = puddle > 0 ? bend : bottom;
  const drop = Math.max(0.05, bodyTop - bodyBottom);
  const rows = Math.max(profile.minRows, Math.ceil(drop * profile.rowsPerFoot));
  for (let i = 0; i <= rows; i++) {
    const t = i / rows;
    samples.push({
      y: bodyTop - drop * t,
      z,
      ny: 0,
      nz: 1,
      s: s + drop * t,
      region: "body",
      puddleT: 0,
    });
  }
  s += drop;

  if (puddle > 0) {
    const bendSteps = Math.max(2, Math.round(profile.puddleRows / 2));
    for (let i = 1; i <= bendSteps; i++) {
      const phi = (Math.PI / 2) * (i / bendSteps);
      samples.push({
        y: bend - bend * Math.sin(phi),
        z: z + bend - bend * Math.cos(phi),
        ny: Math.sin(phi),
        nz: Math.cos(phi),
        s: s + bend * phi,
        region: "puddle",
        puddleT: (i / bendSteps) * 0.25,
      });
    }
    s += (bend * Math.PI) / 2;
    const flatSteps = profile.puddleRows;
    for (let i = 1; i <= flatSteps; i++) {
      const t = i / flatSteps;
      samples.push({
        y: 0,
        z: z + bend + puddle * t,
        ny: 1,
        nz: 0,
        s: s + puddle * t,
        region: "puddle",
        puddleT: 0.25 + 0.75 * t,
      });
    }
  }
  return samples;
}

function gridIndices(columns: number, rows: number) {
  const indices: number[] = [];
  const rowLength = columns + 1;
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const a = row * rowLength + column;
      const b = a + 1;
      const c = a + rowLength;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  return indices;
}

function finishGeometry(positions: Float32Array, uvs: Float32Array, columns: number, rows: number) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(gridIndices(columns, rows));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  geometry.computeBoundingBox();
  return geometry;
}

export function clampTieY(y: number, height: number) {
  return Math.min(height * 0.9, Math.max(0.6, y));
}

export function tieBundleWidth(width: number) {
  return Math.min(0.55, width * 0.16);
}

/** X of the gathered bundle center for a tied-back panel. */
export function tiebackAnchorX(
  x0: number,
  width: number,
  side: -1 | 1,
  bundle = tieBundleWidth(width)
) {
  const inset = Math.min(width * 0.12, 0.45) + bundle / 2;
  return side < 0 ? x0 + inset : x0 + width - inset;
}

/** Fold depth at the tie point (bundle half-depth), feet. */
export function tieBundleDepth(width: number, fullness: number) {
  return Math.max(foldDepth(fullness) * 1.3, tieBundleWidth(width) * 0.42);
}

/** A single pleated panel hanging from a pipe or pinch-pleat header. */
export function createPleatedPanelGeometry(options: PleatedPanelOptions) {
  const profile = qualityProfile(options.quality);
  const width = Math.max(0.2, options.width);
  const height = Math.max(0.3, options.height);
  const fullness = Math.max(1, options.fullness);
  const x0 = options.x0 ?? -width / 2;
  const folds = Math.max(2, Math.round(width * foldsPerFoot(fullness)));
  const amplitude = foldDepth(fullness) * (options.depthScale ?? 1);
  const field = createFoldField(options.seed, folds);
  const rand = rng(options.seed ^ 0x5bd1e995);
  const puddleJitter = rand() * TAU;
  const path = buildHangPath({ ...options, height }, profile, amplitude);
  const columns = Math.min(profile.maxColumns, Math.max(12, folds * profile.columnsPerFold));
  const rows = path.length - 1;
  const rowLength = columns + 1;
  const positions = new Float32Array(rowLength * path.length * 3);
  const uvs = new Float32Array(rowLength * path.length * 2);
  const sag = options.sag ?? 0;
  const tie = options.tieback;
  const tieY = tie ? clampTieY(tie.y, height) : 0;
  const bundle = tie ? (tie.bundle ?? tieBundleWidth(width)) : 0;
  const anchorX = tie ? tiebackAnchorX(x0, width, tie.side, bundle) : 0;
  const flatWidth = width * fullness;
  const pocketFront = options.z ?? 0;

  let i = 0;
  for (let row = 0; row < path.length; row++) {
    const sample = path[row];
    const fromTop = Math.max(0, height - sample.y);
    const hemZone = sample.region === "body" ? 1 - smoothstep(0, 0.45, sample.y) : 0;
    const headerBlend = sample.region === "pocket" ? 0 : smoothstep(0.05, 0.7, fromTop);
    const ampRamp = 0.62 + 0.38 * smoothstep(0, Math.max(1, height * 0.55), fromTop);

    // Tieback gather factor 0 (free) .. 1 (fully gathered at the tie).
    let gather = 0;
    if (tie && sample.region !== "pocket") {
      if (sample.y >= tieY) {
        const t = clamp01((height - sample.y) / Math.max(0.2, height - tieY));
        gather = t * t * (3 - 2 * t);
      } else {
        const t = clamp01((tieY - sample.y) / Math.max(0.2, tieY));
        gather = 1 - 0.58 * Math.pow(smoothstep(0, 1, t), 0.75);
      }
    }
    const tieBulge = tie
      ? 0.14 * Math.exp(-Math.pow((sample.y - tieY) / 0.7, 2))
      : 0;

    // Header sag fades out over the top 40% of the drop.
    const sagWeight = sample.region === "pocket" ? 1 : 1 - smoothstep(0, height * 0.4, fromTop);
    const bodyPush =
      sample.region === "pocket" ? 0 : amplitude * 0.55 * smoothstep(0, 0.45, fromTop);

    for (let column = 0; column <= columns; column++) {
      const u = column / columns;
      let x = x0 + u * width;
      if (gather > 0) {
        const tiedX = anchorX + (u - 0.5) * bundle;
        x = lerp(x, tiedX, gather);
      }

      const main = field.main(u, sample.y);
      const pinch = field.gather(u);
      let fold: number;
      if (sample.region === "pocket") {
        fold = pinch * 0.32;
      } else {
        fold = lerp(pinch * 0.5, main * ampRamp, headerBlend);
      }
      let amp =
        lerp(amplitude, Math.max(amplitude * 1.3, bundle * 0.42), gather) *
        (1 + 0.22 * hemZone);

      let py = sample.y;
      let pz = sample.z;
      if (sample.region === "puddle") {
        // Fabric lies on the floor: folds swell upward, never through it.
        const lump = 0.5 + 0.5 * fold;
        const spread = 1 + 0.5 * sample.puddleT;
        amp *= spread;
        fold = sample.ny > 0.9 ? lump * (1 - 0.55 * sample.puddleT) : fold;
        const reach =
          0.62 + 0.38 * (0.5 + 0.5 * Math.sin(TAU * u * folds * 0.27 + puddleJitter));
        if (sample.ny > 0.99) {
          pz = pocketFront + (sample.z - pocketFront) * lerp(1, reach, sample.puddleT);
        }
        pz += bodyPush * (1 - sample.puddleT);
      } else {
        pz += bodyPush;
      }

      const displacement = fold * amp;
      py += sample.ny * displacement;
      pz += sample.nz * displacement + tieBulge * gather;
      if (sample.region === "body") {
        py -= sag * Math.sin(Math.PI * u) * sagWeight;
        if (row === path.length - 1 && !options.puddle) {
          // Weighted hem lifts slightly on the fold lobes.
          py += 0.02 * Math.max(0, main);
          pz -= 0.01;
        }
      } else if (sample.region === "pocket") {
        py -= sag * Math.sin(Math.PI * u);
      }
      if (sample.region === "puddle") py = Math.max(0.006, py);

      positions[i * 3] = x;
      positions[i * 3 + 1] = py;
      positions[i * 3 + 2] = pz;
      uvs[i * 2] = u * flatWidth;
      uvs[i * 2 + 1] = height - sample.s;
      i++;
    }
  }
  return finishGeometry(positions, uvs, columns, rows);
}

export type PleatedRunOptions = Omit<PleatedPanelOptions, "width" | "x0" | "sag" | "tieback"> & {
  /** Total run length, feet; centered on x = 0. */
  length: number;
  /** Panel break positions (x, feet) — typically pipe uprights. */
  breaks: number[];
  /** Sag per bay (feet) for pipe & drape crossbars. */
  sagPerBay?: number;
};

/** Merges one pleated panel per bay into a single geometry (one draw call). */
export function createPleatedRunGeometry(options: PleatedRunOptions) {
  const breaks = [...options.breaks].sort((a, b) => a - b);
  const geometries: THREE.BufferGeometry[] = [];
  for (let index = 0; index < breaks.length - 1; index++) {
    const left = breaks[index];
    const right = breaks[index + 1];
    const overlap = index < breaks.length - 2 ? 0.04 : 0;
    geometries.push(
      createPleatedPanelGeometry({
        ...options,
        x0: left - (index > 0 ? 0.02 : 0),
        width: right - left + overlap + (index > 0 ? 0.02 : 0),
        sag: options.sagPerBay ?? 0,
        z: (options.z ?? 0) + (index % 2 === 0 ? 0 : 0.008),
        seed: options.seed + index * 7919,
      })
    );
  }
  if (geometries.length === 1) return geometries[0];
  const merged = mergeGeometries(geometries, false) ?? geometries[0];
  if (merged !== geometries[0]) geometries.forEach((geometry) => geometry.dispose());
  merged.computeBoundingSphere();
  return merged;
}

/** Evenly spaced upright positions (feet), every ≤ `maxBay`, centered on 0. */
export function bayBreaks(length: number, maxBay = 10) {
  const bays = Math.max(1, Math.ceil(length / maxBay - 0.05));
  const spacing = length / bays;
  return Array.from({ length: bays + 1 }, (_, index) => -length / 2 + index * spacing);
}

export type SwagOptions = {
  /** Span between the two gather points, feet. */
  width: number;
  /** Depth of the lowest point below the anchors, feet. */
  drop: number;
  seed: number;
  quality?: FabricQuality;
  /** Top-edge sag as a fraction of drop (0 = straight along a rod). */
  topSag?: number;
  /** Number of draped folds stacked in the scallop. */
  folds?: number;
  /** How far the bottom swings out from the anchor plane, feet. */
  belly?: number;
};

/**
 * Swag scallop: anchored at (±width/2, 0, 0), hanging below y = 0 in a
 * catenary with stacked folds radiating from the gathered ends.
 */
export function createSwagGeometry(options: SwagOptions) {
  const profile = qualityProfile(options.quality);
  const width = Math.max(0.3, options.width);
  const drop = Math.max(0.15, options.drop);
  const folds = options.folds ?? Math.max(3, Math.min(7, Math.round(drop * 2.2 + 1.5)));
  const topSag = options.topSag ?? 0.22;
  const belly = options.belly ?? Math.min(0.55, drop * 0.22 + 0.08);
  const rand = rng(options.seed);
  const p1 = rand() * TAU;
  const p2 = rand() * TAU;
  const columns = Math.min(160, Math.max(24, Math.round(width * profile.columnsPerFold * 1.6)));
  const rows = Math.max(12, folds * Math.round(profile.columnsPerFold * 0.9));
  const positions = new Float32Array((columns + 1) * (rows + 1) * 3);
  const uvs = new Float32Array((columns + 1) * (rows + 1) * 2);
  const a = 1.7;
  const coshA = Math.cosh(a) - 1;
  const endGather = Math.min(0.32, drop * 0.18 + 0.06);
  const amp = Math.min(0.12, 0.035 + drop * 0.025);

  let i = 0;
  for (let row = 0; row <= rows; row++) {
    const v = row / rows;
    for (let column = 0; column <= columns; column++) {
      const u = column / columns;
      const cat = (Math.cosh(a * (2 * u - 1)) - 1) / coshA;
      const h = 1 - cat;
      const hv = Math.pow(h, 0.9);
      const x = (u - 0.5) * width * (1 - 0.05 * v * h);
      // Uneven fold spacing and depth so the scallop doesn't read as rings.
      const warp = 0.055 * Math.sin(TAU * v * 1.6 + p2) + 0.03 * Math.sin(TAU * (v * 3.1 + u * 0.7) + p1);
      const ripple = Math.sin(TAU * ((v + warp) * folds) + p1 + 0.5 * Math.sin(TAU * u * 1.3 + p2));
      // Smooth asymmetric profile (rounded crests, shallow troughs); a pow()
      // shaping has an infinite slope at zero and terraces the scallop.
      const ridge = ripple + 0.28 * (ripple * ripple - 0.5);
      const foldVariation = 0.7 + 0.3 * Math.sin(TAU * v * folds * 0.5 + p2 + u * 2.1);
      const foldAmp = amp * Math.pow(h, 0.55) * (0.55 + 0.45 * v) * foldVariation;
      const y =
        -(topSag * drop * h + v * ((1 - topSag) * drop * hv + endGather * (1 - h))) +
        ridge * foldAmp * 0.22;
      const z =
        belly * h * (0.35 * Math.sin(Math.PI * v) + 0.65 * v) +
        ridge * foldAmp +
        (1 - h) * 0.04 * Math.sin(v * Math.PI);
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      uvs[i * 2] = x;
      uvs[i * 2 + 1] = y + v * drop * 0.6;
      i++;
    }
  }
  return finishGeometry(positions, uvs, columns, rows);
}

export type JabotOptions = {
  width: number;
  /** Length of the long (outer) edge, feet. */
  longLength: number;
  /** Length of the short (inner) edge, feet. */
  shortLength: number;
  /** Long edge side: -1 = left, 1 = right. */
  side: -1 | 1;
  seed: number;
  quality?: FabricQuality;
};

/** Cascading jabot / tail: accordion pleats with a diagonal hem, hanging below y = 0. */
export function createJabotGeometry(options: JabotOptions) {
  const profile = qualityProfile(options.quality);
  const pleats = Math.max(3, Math.round(options.width * 5));
  const columns = pleats * Math.max(4, Math.round(profile.columnsPerFold * 0.75));
  const rows = Math.max(10, Math.round(options.longLength * profile.rowsPerFoot * 1.5));
  const positions = new Float32Array((columns + 1) * (rows + 1) * 3);
  const uvs = new Float32Array((columns + 1) * (rows + 1) * 2);
  const depth = (options.width / pleats) * 0.75;
  const rand = rng(options.seed);
  const phase = rand() * 0.3;
  let i = 0;
  for (let row = 0; row <= rows; row++) {
    const v = row / rows;
    for (let column = 0; column <= columns; column++) {
      const u = column / columns;
      const outer = options.side > 0 ? u : 1 - u;
      const length = lerp(options.shortLength, options.longLength, outer);
      // Rounded accordion profile.
      const tri = Math.abs(((u * pleats + phase) % 1) * 2 - 1);
      const pleat = (tri * tri * (3 - 2 * tri) - 0.5) * depth * (0.55 + 0.45 * v);
      // The cascade fans open toward the hem.
      const x = (u - 0.5) * options.width * (0.55 + 0.45 * Math.pow(v, 0.8));
      positions[i * 3] = x;
      positions[i * 3 + 1] = -length * v;
      positions[i * 3 + 2] = pleat + 0.06 * v + 0.03 * Math.sin(v * Math.PI);
      uvs[i * 2] = u * options.width * 2.2;
      uvs[i * 2 + 1] = -length * v;
      i++;
    }
  }
  return finishGeometry(positions, uvs, columns, rows);
}

export type CanopyOptions = {
  /** Footprint, feet. */
  width: number;
  depth: number;
  /** Height of the ceiling attachment, feet. */
  top: number;
  /** Lowest point below `top`, feet. */
  drop: number;
  fullness: number;
  seed: number;
  quality?: FabricQuality;
};

/** Perimeter attachment points walking the footprint rectangle. */
export function canopyPerimeter(width: number, depth: number) {
  const hw = width / 2;
  const hd = depth / 2;
  const corners: Array<[number, number]> = [
    [hw, hd],
    [-hw, hd],
    [-hw, -hd],
    [hw, -hd],
  ];
  const points: Array<[number, number]> = [];
  for (let side = 0; side < 4; side++) {
    const [ax, az] = corners[side];
    const [bx, bz] = corners[(side + 1) % 4];
    const length = Math.hypot(bx - ax, bz - az);
    const segments = Math.max(2, Math.round(length / 6));
    for (let k = 0; k < segments; k++) {
      const t = k / segments;
      points.push([lerp(ax, bx, t), lerp(az, bz, t)]);
    }
  }
  return points;
}

/**
 * Ceiling canopy: radial swags from a central gather point to perimeter
 * attachment points, each sagging between its spokes. Local space: centered
 * on the footprint, y = floor.
 */
export function createCanopyGeometry(options: CanopyOptions) {
  const profile = qualityProfile(options.quality);
  const perimeter = canopyPerimeter(options.width, options.depth);
  const drop = Math.max(0.3, options.drop);
  const centerY = options.top - Math.min(0.6, drop * 0.25);
  const edgeY = options.top - 0.12;
  const spokeSag = drop * 0.45;
  const radialSteps = Math.max(10, Math.round(profile.rowsPerFoot * 5));
  const acrossSteps = Math.max(8, Math.round(profile.columnsPerFold * 2));
  const folds = Math.max(2, Math.round(1.5 * options.fullness));
  const rand = rng(options.seed);
  const geometries: THREE.BufferGeometry[] = [];
  const maxSpan = Math.max(1, Math.hypot(options.width, options.depth) / 2);

  for (let k = 0; k < perimeter.length; k++) {
    const [ax, az] = perimeter[k];
    const [bx, bz] = perimeter[(k + 1) % perimeter.length];
    const chord = Math.hypot(bx - ax, bz - az);
    const crossSag = Math.min(drop * 0.6, chord * 0.22 + drop * 0.18);
    const phase = rand() * TAU;
    const positions = new Float32Array((acrossSteps + 1) * (radialSteps + 1) * 3);
    const uvs = new Float32Array((acrossSteps + 1) * (radialSteps + 1) * 2);
    let i = 0;
    for (let row = 0; row <= radialSteps; row++) {
      const r = row / radialSteps;
      for (let column = 0; column <= acrossSteps; column++) {
        const t = column / acrossSteps;
        const px = lerp(ax, bx, t) * r;
        const pz = lerp(az, bz, t) * r;
        const spokeY = lerp(centerY, edgeY, r) - spokeSag * 4 * r * (1 - r);
        const across = Math.sin(Math.PI * t);
        const reach = Math.hypot(px, pz) / maxSpan;
        const belly = crossSag * across * Math.pow(r, 0.9) * (1 - 0.65 * Math.pow(r, 6));
        const gather =
          Math.sin(TAU * t * folds + phase + r * 1.4) * 0.07 * (1 - r * 0.6) * across;
        positions[i * 3] = px;
        positions[i * 3 + 1] = spokeY - belly + gather;
        positions[i * 3 + 2] = pz;
        uvs[i * 2] = t * chord;
        uvs[i * 2 + 1] = reach * maxSpan;
        i++;
      }
    }
    geometries.push(finishGeometry(positions, uvs, acrossSteps, radialSteps));
  }
  const merged = mergeGeometries(geometries, false);
  geometries.forEach((geometry) => geometry.dispose());
  merged.computeBoundingSphere();
  return merged;
}

/** Front-face z for a panel whose rod pocket wraps a pipe centered at `pipeZ`. */
export function pocketFrontZ(pipeZ: number, pipeRadius: number) {
  return pipeZ + pipeRadius + 0.012;
}

/** Fabric top height for a rod pocket over a pipe centered at `pipeY`. */
export function pocketTopY(pipeY: number, pipeRadius: number) {
  return pipeY + pipeRadius + 0.012;
}

/** Lowest point of a canopy built by `createCanopyGeometry`. */
export function canopyCenterY(top: number, drop: number) {
  return top - Math.min(0.6, Math.max(0.3, drop) * 0.25);
}
