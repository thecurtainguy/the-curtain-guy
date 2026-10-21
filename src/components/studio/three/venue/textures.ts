/**
 * Seeded procedural PBR maps for venue floors and walls (browser only).
 * Every finish renders colour, height (→ normal) and roughness in one pass so
 * the three maps line up exactly. Maps tile seamlessly; `tileIn` is the real
 * world size of one tile in inches, so UVs authored in feet get
 * `repeat = 12 / tileIn` and planks/bricks land at true scale.
 */
import type { StudioFloorFinish, StudioWallFinish } from "@/data/studio";
import * as THREE from "three";
import {
  cachedCanvasTexture,
  makeCanvas,
  normalMapFromHeight,
  rgbOf,
  rng,
  wrapDraw,
} from "../texture-utils";
import { clamp01, fbm, hash2, mod, smoothstep, vnoise } from "./noise";

export type VenueQuality = "draft" | "high" | "ultra";

type Px = { r: number; g: number; b: number; h: number; ro: number };

type MapSet = {
  color: HTMLCanvasElement;
  height: HTMLCanvasElement;
  rough: HTMLCanvasElement;
};

type Rgb = [number, number, number];

function setRgb(o: Px, c: Rgb, k: number) {
  o.r = c[0] * k;
  o.g = c[1] * k;
  o.b = c[2] * k;
}

function lerpRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** Runs `fn` per pixel (centre coords) and writes colour / height / roughness. */
function renderMaps(
  w: number,
  h: number,
  fn: (x: number, y: number, o: Px) => void
): MapSet {
  const canvases = [0, 1, 2].map(() => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
  });
  const ctx = canvases.map((c) => c.getContext("2d")!);
  const img = ctx.map((g) => g.createImageData(w, h));
  const [cd, hd, rd] = img.map((i) => i.data);
  const o: Px = { r: 0, g: 0, b: 0, h: 0.5, ro: 0.8 };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      o.h = 0.5;
      o.ro = 0.8;
      fn(x + 0.5, y + 0.5, o);
      const i = (y * w + x) * 4;
      cd[i] = o.r;
      cd[i + 1] = o.g;
      cd[i + 2] = o.b;
      cd[i + 3] = 255;
      const hv = clamp01(o.h) * 255;
      hd[i] = hd[i + 1] = hd[i + 2] = hv;
      hd[i + 3] = 255;
      const rv = clamp01(o.ro) * 255;
      rd[i] = rd[i + 1] = rd[i + 2] = rv;
      rd[i + 3] = 255;
    }
  }
  ctx.forEach((g, i) => g.putImageData(img[i], 0, 0));
  return { color: canvases[0], height: canvases[1], rough: canvases[2] };
}

/* ------------------------------------------------------------------ wood */

type Plank = {
  tone: Rgb;
  k: number;
  s1: number;
  s2: number;
  slope: number;
  center: number;
  rough: number;
  knots: { a: number; c: number; r: number }[];
};

type WoodStyle = {
  ringFreq: number;
  grain: number;
  /** Ring distortion (default 2.8); lower reads as calmer, straighter grain. */
  warp?: number;
  /** Fibre streak contrast (default 1). */
  fibre?: number;
  seam: number;
  bevel: number;
};

function makePlank(
  rand: () => number,
  tones: Rgb[],
  width: number,
  length: number,
  rough: number,
  knotChance: number
): Plank {
  const knots: Plank["knots"] = [];
  if (rand() < knotChance) {
    knots.push({
      a: length * (0.15 + rand() * 0.7),
      c: width * (0.25 + rand() * 0.5),
      r: 0.25 + rand() * 0.45,
    });
  }
  return {
    tone: tones[Math.floor(rand() * tones.length)],
    k: 0.86 + rand() * 0.24,
    s1: rand() * 100,
    s2: rand() * 100,
    slope: (rand() - 0.5) * 0.05,
    center: width * (rand() * 1.4 - 0.2),
    rough: rough + (rand() - 0.5) * 0.08,
    knots,
  };
}

/** Shades one point of a plank. `along`/`across` are plank-local inches. */
function woodSample(
  along: number,
  across: number,
  width: number,
  length: number,
  p: Plank,
  style: WoodStyle,
  o: Px
) {
  const warp = vnoise(along * 0.04 + p.s1, across * 0.3 + p.s2, 7);
  let ring =
    Math.abs(across - p.center) * style.ringFreq + warp * (style.warp ?? 2.8) + along * p.slope;
  let knot = 0;
  for (const kn of p.knots) {
    const da = (along - kn.a) / 2.4;
    const dc = across - kn.c;
    const d2 = da * da + dc * dc;
    const r2 = kn.r * kn.r;
    ring += (r2 * 2.2) / (d2 + r2 * 0.5);
    knot = Math.max(knot, Math.exp(-d2 / (r2 * 0.3)));
  }
  const f = ring - Math.floor(ring);
  const late = smoothstep(0.5, 0.88, f) * (1 - smoothstep(0.9, 1, f));
  const fibre = vnoise(along * 0.45 + p.s2, across * 7 + p.s1, 11);
  const pores = vnoise(along * 2.5 + p.s1, across * 22, 13);
  const sweep = vnoise(along * 0.025 + p.s1, p.s2, 3);
  const edge = Math.min(across, width - across, along, length - along);
  const groove = 1 - smoothstep(0, style.seam, edge);
  const bevel = smoothstep(0, style.bevel, edge);
  const k =
    p.k *
    (1 - style.grain * 0.42 * late) *
    (1 - 0.11 * (style.fibre ?? 1) + 0.16 * (style.fibre ?? 1) * fibre) *
    (0.96 + 0.06 * pores) *
    (0.95 + 0.09 * sweep) *
    (1 - 0.5 * knot) *
    (1 - groove * 0.62);
  setRgb(o, p.tone, k);
  o.h =
    0.42 + 0.3 * bevel + 0.05 * fibre - 0.04 * late - 0.04 * knot - groove * 0.4;
  o.ro = p.rough + 0.07 * late + 0.05 * pores + groove * 0.35 + knot * 0.08;
}

function plankFloor(
  size: number,
  cfg: {
    seed: number;
    tileIn: number;
    width: number;
    minLen: number;
    maxLen: number;
    tones: string[];
    rough: number;
    grain: number;
    ringFreq: number;
    knotChance: number;
  }
): MapSet {
  const rand = rng(cfg.seed);
  const tones = cfg.tones.map(rgbOf);
  const rows = Math.round(cfg.tileIn / cfg.width);
  const avg = (cfg.minLen + cfg.maxLen) / 2;
  const rowPlanks = Array.from({ length: rows }, () => {
    const count = Math.max(2, Math.round(cfg.tileIn / avg));
    const lengths = Array.from(
      { length: count },
      () => cfg.minLen + rand() * (cfg.maxLen - cfg.minLen)
    );
    const total = lengths.reduce((a, b) => a + b, 0);
    let cursor = rand() * cfg.tileIn;
    return lengths.map((raw) => {
      const len = (raw / total) * cfg.tileIn;
      const plank = {
        start: cursor,
        len,
        info: makePlank(rand, tones, cfg.width, len, cfg.rough, cfg.knotChance),
      };
      cursor += len;
      return plank;
    });
  });
  const inPerPx = cfg.tileIn / size;
  const style: WoodStyle = {
    ringFreq: cfg.ringFreq,
    grain: cfg.grain,
    seam: Math.max(0.05, inPerPx * 1.3),
    bevel: Math.max(0.12, inPerPx * 3),
  };
  return renderMaps(size, size, (x, y, o) => {
    const X = x * inPerPx;
    const Y = y * inPerPx;
    const row = Math.min(rows - 1, Math.floor(Y / cfg.width));
    const across = Y - row * cfg.width;
    const planks = rowPlanks[row];
    for (const plank of planks) {
      const along = mod(X - plank.start, cfg.tileIn);
      if (along < plank.len) {
        woodSample(along, across, cfg.width, plank.len, plank.info, style, o);
        return;
      }
    }
    woodSample(0, across, cfg.width, 1, planks[0].info, style, o);
  });
}

const HERRINGBONE = { width: 3, ratio: 4, cells: 16 };
const HERRINGBONE_TILE_IN =
  HERRINGBONE.cells * Math.SQRT2 * HERRINGBONE.width;

/** 45° herringbone parquet, evaluated analytically per pixel. */
function herringboneFloor(size: number): MapSet {
  const { width: W, ratio: k, cells: n } = HERRINGBONE;
  const L = W * k;
  const tones = ["#9a7048", "#a77b50", "#8c6440", "#b38657", "#946a43"].map(
    rgbOf
  );
  const inPerPx = HERRINGBONE_TILE_IN / size;
  const style: WoodStyle = {
    ringFreq: 1.4,
    grain: 0.8,
    seam: Math.max(0.04, inPerPx * 1.2),
    bevel: Math.max(0.08, inPerPx * 2.5),
  };
  const planks = new Map<number, Plank>();
  const plankFor = (x: number, y: number, orient: number) => {
    const p = mod(x + y, 2 * n);
    const q = mod(x - y, 2 * n);
    const key = p * 8192 + q * 2 + orient;
    let plank = planks.get(key);
    if (!plank) {
      plank = makePlank(rng(key * 7 + 3), tones, W, L, 0.36, 0.05);
      planks.set(key, plank);
    }
    return plank;
  };
  return renderMaps(size, size, (x, y, o) => {
    const X = x * inPerPx;
    const Y = y * inPerPx;
    const u = (X + Y) / (Math.SQRT2 * W);
    const v = (Y - X) / (Math.SQRT2 * W);
    const a = Math.floor(u);
    const b = Math.floor(v);
    const d = mod(a - b, 2 * k);
    if (d < k) {
      const aS = a - d;
      woodSample((u - aS) * W, (v - b) * W, W, L, plankFor(aS, b, 0), style, o);
    } else {
      const bS = b - (2 * k - 1 - d);
      woodSample((v - bS) * W, (u - a) * W, W, L, plankFor(a, bS, 1), style, o);
    }
  });
}

/* --------------------------------------------------------------- floors */

function carpetFloor(size: number): MapSet {
  const tileIn = 36;
  const inPerPx = tileIn / size;
  const freq = size >= 1024 ? 5 : 2.5;
  const base = rgbOf("#726c62");
  const motif = rgbOf("#59544b");
  const accent = rgbOf("#8a8274");
  return renderMaps(size, size, (x, y, o) => {
    const X = x * inPerPx;
    const Y = y * inPerPx;
    const loop =
      0.5 + 0.5 * Math.sin(2 * Math.PI * X * freq) * Math.sin(2 * Math.PI * Y * freq);
    const fibre = vnoise((x / size) * 256, (y / size) * 256, 41, 256, 256);
    const mottle = fbm((x / size) * 6, (y / size) * 6, 43, 3, 6, 6);
    const mx = mod(X, 12) / 12 - 0.5;
    const my = mod(Y, 12) / 12 - 0.5;
    const r = Math.hypot(mx, my);
    const th = Math.atan2(my, mx);
    const ring = 1 - smoothstep(0.01, 0.026, Math.abs(r - (0.3 + 0.06 * Math.cos(4 * th))));
    const corner = Math.hypot(Math.abs(mx) - 0.5, Math.abs(my) - 0.5);
    const dot = 1 - smoothstep(0.04, 0.06, corner);
    const lattice = 1 - smoothstep(0.006, 0.016, Math.abs(Math.abs(mx) - Math.abs(my)) * (r > 0.36 ? 1 : 9));
    const pattern = Math.max(ring, lattice * 0.6);
    let c = lerpRgb(base, motif, pattern * 0.75);
    c = lerpRgb(c, accent, dot * 0.6);
    setRgb(o, c, (0.9 + 0.12 * fibre) * (0.95 + 0.06 * loop) * (0.95 + 0.1 * mottle));
    o.h = 0.45 + 0.28 * loop + 0.2 * fibre - pattern * 0.12;
    o.ro = 0.94 + 0.05 * fibre;
  });
}

function concreteFloor(size: number): MapSet {
  const tileIn = 120;
  const inPerPx = tileIn / size;
  const base = rgbOf("#9b9993");
  const warm = rgbOf("#a59d90");
  const set = renderMaps(size, size, (x, y, o) => {
    const nx = x / size;
    const ny = y / size;
    const cloud = fbm(nx * 6, ny * 6, 71, 5, 6, 6);
    const mottle = fbm(nx * 24, ny * 24, 73, 3, 24, 24);
    const stain = smoothstep(0.55, 0.8, fbm(nx * 3, ny * 3, 79, 3, 3, 3));
    const grain = vnoise(nx * 512, ny * 512, 77, 512, 512);
    const X = x * inPerPx;
    const Y = y * inPerPx;
    const joint = Math.min(X, tileIn - X, Y, tileIn - Y);
    const cut = 1 - smoothstep(0.06, 0.16, joint);
    const c = lerpRgb(base, warm, stain * 0.6);
    setRgb(
      o,
      c,
      (0.84 + 0.26 * cloud) * (0.95 + 0.08 * mottle) * (0.97 + 0.05 * grain) * (1 - cut * 0.55)
    );
    o.h = 0.55 + 0.06 * mottle + 0.04 * grain - cut * 0.5;
    o.ro = 0.16 + 0.16 * cloud + 0.06 * stain + cut * 0.5;
  });
  const rand = rng(83);
  const g = set.color.getContext("2d")!;
  const dots = Math.round(size * size * 0.0035);
  for (let i = 0; i < dots; i++) {
    const r = (0.06 + rand() * rand() * 0.32) / inPerPx;
    const light = rand() < 0.55;
    const a = 0.12 + rand() * 0.28;
    g.fillStyle = light ? `rgba(225,220,210,${a})` : `rgba(55,52,48,${a})`;
    wrapDraw(size, rand() * size, rand() * size, r, (X, Y) => {
      g.beginPath();
      g.ellipse(X, Y, r, r * (0.6 + rand() * 0.4), rand() * Math.PI, 0, Math.PI * 2);
      g.fill();
    });
  }
  g.strokeStyle = "rgba(48,45,42,0.22)";
  g.lineWidth = Math.max(0.6, size / 1700);
  for (let c = 0; c < 3; c++) {
    let px = rand() * size;
    let py = rand() * size;
    let dir = rand() * Math.PI * 2;
    g.beginPath();
    g.moveTo(px, py);
    for (let s = 0; s < 40; s++) {
      dir += (rand() - 0.5) * 0.9;
      px += Math.cos(dir) * size * 0.006;
      py += Math.sin(dir) * size * 0.006;
      if (px < 0 || py < 0 || px > size || py > size) break;
      g.lineTo(px, py);
    }
    g.stroke();
  }
  return set;
}

function blackEventFloor(size: number): MapSet {
  const tileIn = 60;
  const inPerPx = tileIn / size;
  const base = rgbOf("#1f1e1c");
  return renderMaps(size, size, (x, y, o) => {
    const nx = x / size;
    const ny = y / size;
    const mottle = fbm(nx * 5, ny * 5, 91, 4, 5, 5);
    const stipple = vnoise(nx * 420, ny * 420, 93, 420, 420);
    const X = x * inPerPx;
    const ds = Math.min(X, tileIn - X);
    const seam = 1 - smoothstep(0.03, 0.1, ds);
    setRgb(o, base, (0.9 + 0.16 * mottle + 0.08 * stipple) * (1 - seam * 0.5));
    o.h = 0.5 + 0.22 * stipple - seam * 0.4;
    o.ro = 0.42 + 0.14 * mottle + 0.06 * stipple + seam * 0.3;
  });
}

function porcelainFloor(size: number): MapSet {
  const tileIn = 48;
  const inPerPx = tileIn / size;
  const base = rgbOf("#d4cdc1");
  const vein = rgbOf("#b9b0a2");
  const grout = rgbOf("#a69e92");
  return renderMaps(size, size, (x, y, o) => {
    const X = x * inPerPx;
    const Y = y * inPerPx;
    const tx = Math.floor(X / 24);
    const ty = Math.floor(Y / 24);
    const lx = X - tx * 24;
    const ly = Y - ty * 24;
    const edge = Math.min(lx, 24 - lx, ly, 24 - ly);
    const g = 1 - smoothstep(0.07, 0.11, edge);
    const id = tx + ty * 2;
    const nx = x / size;
    const ny = y / size;
    const stone = fbm(nx * 6, ny * 6, 101 + id * 13, 5, 6, 6);
    const speck = vnoise(nx * 300, ny * 300, 103, 300, 300);
    const tileK = 0.97 + hash2(id, 5, 105) * 0.06;
    const c = lerpRgb(base, vein, smoothstep(0.5, 0.8, stone) * 0.6);
    if (g > 0.5) {
      setRgb(o, grout, 0.92 + 0.12 * speck);
      o.h = 0.15;
      o.ro = 0.9;
    } else {
      setRgb(o, c, tileK * (0.97 + 0.05 * speck));
      o.h = 0.6 + 0.04 * speck - g * 0.3;
      o.ro = 0.24 + 0.1 * stone + g * 0.4;
    }
  });
}

function marbleFloor(size: number): MapSet {
  const tileIn = 72;
  const inPerPx = tileIn / size;
  const P = 4;
  const base = rgbOf("#f3f0eb");
  const grey = rgbOf("#8e8b87");
  const wash = rgbOf("#c9c5bf");
  const gold = rgbOf("#b6a88f");
  const cloudC = rgbOf("#e2ded7");
  return renderMaps(size, size, (x, y, o) => {
    const nx = x / size;
    const ny = y / size;
    const X = x * inPerPx;
    const Y = y * inPerPx;
    const sx = Math.floor(X / 36);
    const sy = Math.floor(Y / 36);
    const slabSeed = hash2(sx, sy, 127);
    const flip = slabSeed > 0.5 ? 1 : -1;
    const turb = fbm(nx * P, ny * P, 111, 5, P, P) - 0.5;
    const turb2 = fbm(nx * P * 3 + 3.1, ny * P * 3 + 1.7, 113, 4, P * 3, P * 3) - 0.5;
    const cloud = fbm(nx * 2, ny * 2, 117, 4, 2, 2);
    const fade = smoothstep(0.32, 0.7, fbm(nx * 3, ny * 3, 119, 3, 3, 3));
    const fade2 = smoothstep(0.52, 0.78, fbm(nx * 4 + 5.3, ny * 4, 123, 3, 4, 4));
    const phase1 = 2 * Math.PI * (nx + flip * ny + slabSeed) + turb * 3.6 + turb2 * 0.9;
    const phase2 = 2 * Math.PI * (2 * nx - flip * ny + slabSeed * 3) + turb * 2.4 + turb2 * 1.6;
    const v1 = 1 - Math.abs(Math.sin(phase1));
    const v2 = 1 - Math.abs(Math.sin(phase2));
    const core = Math.pow(v1, 48) * fade;
    const halo = Math.pow(v1, 7) * (0.25 + 0.75 * fade);
    const thread = Math.pow(v2, 90) * fade2;
    const lx = mod(X, 36);
    const ly = mod(Y, 36);
    const edge = Math.min(lx, 36 - lx, ly, 36 - ly);
    const seam = 1 - smoothstep(0.025, 0.07, edge);
    let c = lerpRgb(base, cloudC, smoothstep(0.4, 0.8, cloud) * 0.6);
    c = lerpRgb(c, wash, clamp01(halo * 0.45));
    c = lerpRgb(c, grey, clamp01(core * 0.62));
    c = lerpRgb(c, gold, clamp01(thread * 0.4));
    setRgb(o, c, (0.985 + slabSeed * 0.03) * (1 - seam * 0.25));
    o.h = 0.6 - (core + thread) * 0.02 - seam * 0.4;
    o.ro = 0.06 + (core + thread) * 0.04 + seam * 0.4;
  });
}

function lawnFloor(size: number): MapSet {
  const rand = rng(131);
  const color = makeCanvas(size, size, (g) => {
    g.fillStyle = "#29411a";
    g.fillRect(0, 0, size, size);
  });
  const height = makeCanvas(size, size, (g) => {
    g.fillStyle = "#202020";
    g.fillRect(0, 0, size, size);
  });
  const rough = makeCanvas(size, size, (g) => {
    g.fillStyle = "#f2f2f2";
    g.fillRect(0, 0, size, size);
  });
  const cg = color.getContext("2d")!;
  const hg = height.getContext("2d")!;
  const px = size / 1024;
  for (let i = 0; i < 260; i++) {
    const r = (20 + rand() * 60) * px;
    const tone = rand() < 0.5 ? "rgba(70,96,36,0.18)" : "rgba(28,44,16,0.22)";
    wrapDraw(size, rand() * size, rand() * size, r, (X, Y) => {
      const grd = cg.createRadialGradient(X, Y, 0, X, Y, r);
      grd.addColorStop(0, tone);
      grd.addColorStop(1, "rgba(0,0,0,0)");
      cg.fillStyle = grd;
      cg.fillRect(X - r, Y - r, r * 2, r * 2);
    });
  }
  const count = Math.round(size * size * 0.045);
  cg.lineCap = "round";
  hg.lineCap = "round";
  for (let i = 0; i < count; i++) {
    const t = i / count;
    const x = rand() * size;
    const y = rand() * size;
    const len = (5 + rand() * 11) * px;
    const ang = rand() * Math.PI * 2;
    const bend = (rand() - 0.5) * len * 0.8;
    const hue = 78 + rand() * 32;
    const sat = 32 + rand() * 26;
    const light = 14 + t * 22 + rand() * 10;
    const w = (0.8 + rand() * 1.1) * px;
    const ex = Math.cos(ang) * len;
    const ey = Math.sin(ang) * len;
    const cx = ex / 2 - Math.sin(ang) * bend;
    const cy = ey / 2 + Math.cos(ang) * bend;
    const hv = Math.round(40 + t * 180 + rand() * 30);
    wrapDraw(size, x, y, len + 2, (X, Y) => {
      cg.strokeStyle = `hsl(${hue},${sat}%,${light}%)`;
      cg.lineWidth = w;
      cg.beginPath();
      cg.moveTo(X, Y);
      cg.quadraticCurveTo(X + cx, Y + cy, X + ex, Y + ey);
      cg.stroke();
      hg.strokeStyle = `rgb(${hv},${hv},${hv})`;
      hg.lineWidth = w;
      hg.beginPath();
      hg.moveTo(X, Y);
      hg.quadraticCurveTo(X + cx, Y + cy, X + ex, Y + ey);
      hg.stroke();
    });
  }
  return { color, height, rough };
}

/* ---------------------------------------------------------------- walls */

function paintWall(
  size: number,
  cfg: { seed: number; base: string; mottle: number; peel: number; trowel: number; rough: number }
): MapSet {
  const base = rgbOf(cfg.base);
  const P = 6;
  const half = size / 2;
  return renderMaps(size, size, (x, y, o) => {
    const nx = (x / size) * P;
    const ny = (y / size) * P;
    const m = fbm(nx, ny, cfg.seed, 5, P, P);
    const t =
      cfg.trowel > 0
        ? fbm(nx * 2 + m * 1.6, ny + m * 1.2, cfg.seed + 7, 4, P * 2, P)
        : 0.5;
    const micro = vnoise(x / 2, y / 2, cfg.seed + 3, half, half);
    const k =
      1 + (m - 0.5) * cfg.mottle + (t - 0.5) * cfg.trowel * 0.35 + (micro - 0.5) * 0.025;
    setRgb(o, base, k);
    o.h = 0.5 + (micro - 0.5) * cfg.peel + (t - 0.5) * cfg.trowel;
    o.ro = cfg.rough + (m - 0.5) * 0.06 - (t - 0.5) * cfg.trowel * 0.12;
  });
}

const BRICK = { w: 8, h: 2.625, mortar: 0.375, cols: 6, courses: 18 };
const BRICK_TILE: [number, number] = [BRICK.w * BRICK.cols, BRICK.h * BRICK.courses];

function brickWall(size: number): MapSet {
  const tones = ["#8e4b36", "#9b5641", "#7b3f2f", "#a6634a", "#874833", "#6f392b", "#93503a"].map(rgbOf);
  const mortarC = rgbOf("#aaa194");
  const [tw, th] = BRICK_TILE;
  return renderMaps(size, size, (x, y, o) => {
    const nx = x / size;
    const ny = y / size;
    const X = nx * tw;
    const Y = ny * th;
    const course = Math.min(BRICK.courses - 1, Math.floor(Y / BRICK.h));
    const ly = Y - course * BRICK.h;
    const bx = mod(X + (course % 2) * (BRICK.w / 2), tw);
    const col = Math.min(BRICK.cols - 1, Math.floor(bx / BRICK.w));
    const lx = bx - col * BRICK.w;
    const e = Math.min(lx - BRICK.mortar, BRICK.w - lx, ly - BRICK.mortar, BRICK.h - ly);
    const speck = vnoise(nx * 180, ny * 180, 141, 180, 180);
    const pit = vnoise(nx * 60, ny * 60, 143, 60, 60);
    const cloud = fbm(nx * 4, ny * 4, 147, 4, 4, 4);
    if (e < 0) {
      setRgb(o, mortarC, (0.86 + 0.2 * speck) * (0.92 + 0.12 * cloud));
      o.h = 0.12 + 0.12 * speck;
      o.ro = 0.97;
      return;
    }
    const id = col + course * 8;
    const tone = tones[Math.floor(hash2(id, 1, 149) * tones.length)];
    const burn = hash2(id, 2, 151) > 0.72 ? smoothstep(0, BRICK.w, lx) * 0.25 : 0;
    const chipped = e < 0.25 + pit * 0.3 && pit > 0.72;
    const bevel = smoothstep(0, 0.32, e);
    setRgb(
      o,
      tone,
      (0.82 + 0.26 * speck) * (0.86 + 0.24 * cloud) * (1 - burn) * (chipped ? 0.8 : 1)
    );
    o.h = chipped ? 0.3 : 0.4 + 0.42 * bevel + 0.1 * speck - 0.08 * pit;
    o.ro = 0.86 + 0.08 * speck;
  });
}

const PANEL_TILE: [number, number] = [48, 96];

function woodPanelWall(size: number): MapSet {
  const rand = rng(161);
  const tones = ["#6e4b32", "#734e36", "#69472e", "#77543a", "#6c4931"].map(rgbOf);
  const [tw, th] = PANEL_TILE;
  const boardW = 6;
  const boards = Array.from({ length: tw / boardW }, () => ({
    seam: rand() * th,
    info: makePlank(rand, tones, boardW, th, 0.48, 0.12),
  }));
  const w = size / 2;
  const inPerPx = tw / w;
  const style: WoodStyle = {
    ringFreq: 0.6,
    grain: 0.32,
    warp: 1.4,
    fibre: 0.55,
    seam: Math.max(0.14, inPerPx * 1.6),
    bevel: Math.max(0.3, inPerPx * 3),
  };
  return renderMaps(w, size, (x, y, o) => {
    const X = x * inPerPx;
    const Y = (y / size) * th;
    const col = Math.min(boards.length - 1, Math.floor(X / boardW));
    const board = boards[col];
    woodSample(mod(Y - board.seam, th), X - col * boardW, boardW, th, board.info, style, o);
  });
}

const CANVAS_TILE: [number, number] = [96, 48];

function tentCanvasWall(size: number): MapSet {
  const base = rgbOf("#eee8db");
  const seamC = rgbOf("#d8d0bf");
  const h = size / 2;
  const [tw, th] = CANVAS_TILE;
  return renderMaps(size, h, (x, y, o) => {
    const nx = x / size;
    const ny = y / h;
    const X = nx * tw;
    const Y = ny * th;
    const weave =
      0.5 * vnoise(nx * 384, ny * 12, 171, 384, 12) +
      0.5 * vnoise(nx * 48, ny * 192, 173, 48, 192);
    const f = fbm(nx * 4, ny * 2, 175, 3, 4, 2);
    const wrinkle = Math.sin(2 * Math.PI * 8 * nx + f * 3);
    const ds = Math.min(mod(X, 48), 48 - mod(X, 48));
    const band = 1 - smoothstep(1.0, 1.25, ds);
    const stitch =
      Math.abs(ds - 0.7) < 0.07 && mod(Y, 0.4) < 0.26 ? 1 : 0;
    const c = lerpRgb(base, seamC, band * 0.5);
    setRgb(o, c, (0.95 + 0.06 * weave) * (0.97 + 0.03 * wrinkle) * (1 - stitch * 0.18));
    o.h = 0.45 + 0.15 * weave + 0.12 * wrinkle + band * 0.18 + stitch * 0.15;
    o.ro = 0.88 + 0.06 * weave;
  });
}

/* --------------------------------------------------------------- public */

type FinishDef = {
  tileIn: [number, number];
  normalStrength: number;
  build: (size: number) => MapSet;
};

const WOOD_TONES = ["#a7794e", "#b5875a", "#9a6c43", "#ad7f52", "#c08f62", "#9f7249"];
const OAK_TONES = ["#4b3424", "#563c29", "#3f2c1e", "#5d422d", "#47301f", "#52392a"];

const FLOOR_DEFS: Record<StudioFloorFinish, FinishDef> = {
  warm_wood: {
    tileIn: [96, 96],
    normalStrength: 3,
    build: (s) =>
      plankFloor(s, {
        seed: 11,
        tileIn: 96,
        width: 6,
        minLen: 26,
        maxLen: 70,
        tones: WOOD_TONES,
        rough: 0.4,
        grain: 0.85,
        ringFreq: 1.15,
        knotChance: 0.18,
      }),
  },
  dark_oak: {
    tileIn: [112, 112],
    normalStrength: 3,
    build: (s) =>
      plankFloor(s, {
        seed: 23,
        tileIn: 112,
        width: 7,
        minLen: 40,
        maxLen: 96,
        tones: OAK_TONES,
        rough: 0.36,
        grain: 1,
        ringFreq: 0.9,
        knotChance: 0.3,
      }),
  },
  herringbone: {
    tileIn: [HERRINGBONE_TILE_IN, HERRINGBONE_TILE_IN],
    normalStrength: 3,
    build: herringboneFloor,
  },
  event_carpet: { tileIn: [36, 36], normalStrength: 2.4, build: carpetFloor },
  polished_concrete: { tileIn: [120, 120], normalStrength: 2, build: concreteFloor },
  black_event: { tileIn: [60, 60], normalStrength: 1.6, build: blackEventFloor },
  light_neutral: { tileIn: [48, 48], normalStrength: 2.4, build: porcelainFloor },
  white_marble: { tileIn: [72, 72], normalStrength: 1.4, build: marbleFloor },
  lawn: { tileIn: [36, 36], normalStrength: 2.6, build: lawnFloor },
};

const WALL_DEFS: Record<StudioWallFinish, FinishDef> = {
  warm_ivory: {
    tileIn: [48, 48],
    normalStrength: 1.2,
    build: (s) => paintWall(s, { seed: 201, base: "#e9e1d3", mottle: 0.05, peel: 0.18, trowel: 0, rough: 0.88 }),
  },
  soft_grey: {
    tileIn: [48, 48],
    normalStrength: 1.2,
    build: (s) => paintWall(s, { seed: 203, base: "#b9b9b5", mottle: 0.05, peel: 0.18, trowel: 0, rough: 0.9 }),
  },
  neutral_beige: {
    tileIn: [48, 48],
    normalStrength: 1.2,
    build: (s) => paintWall(s, { seed: 205, base: "#cbbeab", mottle: 0.06, peel: 0.18, trowel: 0, rough: 0.9 }),
  },
  black_box: {
    tileIn: [48, 48],
    normalStrength: 1,
    build: (s) => paintWall(s, { seed: 207, base: "#242321", mottle: 0.1, peel: 0.15, trowel: 0, rough: 0.92 }),
  },
  white_plaster: {
    tileIn: [64, 64],
    normalStrength: 2.2,
    build: (s) => paintWall(s, { seed: 209, base: "#f1ede6", mottle: 0.06, peel: 0.1, trowel: 0.35, rough: 0.9 }),
  },
  exposed_brick: { tileIn: BRICK_TILE, normalStrength: 4, build: brickWall },
  wood_panel: { tileIn: PANEL_TILE, normalStrength: 3, build: woodPanelWall },
  tent_canvas: { tileIn: CANVAS_TILE, normalStrength: 1.6, build: tentCanvasWall },
};

export type VenueTextureSet = {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
};

const mapSets = new Map<string, MapSet>();

function textureSet(key: string, def: FinishDef, size: number): VenueTextureSet {
  const maps = () => {
    let set = mapSets.get(key);
    if (!set) {
      set = def.build(size);
      mapSets.set(key, set);
    }
    return set;
  };
  const map = cachedCanvasTexture(`${key}:color`, () => maps().color, { anisotropy: 16 });
  const normalMap = cachedCanvasTexture(
    `${key}:normal`,
    () => normalMapFromHeight(maps().height, def.normalStrength),
    { srgb: false, anisotropy: 16 }
  );
  const roughnessMap = cachedCanvasTexture(`${key}:rough`, () => maps().rough, {
    srgb: false,
    anisotropy: 16,
  });
  for (const t of [map, normalMap, roughnessMap]) {
    t.repeat.set(12 / def.tileIn[0], 12 / def.tileIn[1]);
  }
  mapSets.delete(key);
  return { map, normalMap, roughnessMap };
}

const FLOOR_SIZE: Record<VenueQuality, number> = { draft: 512, high: 1024, ultra: 2048 };
const WALL_SIZE: Record<VenueQuality, number> = { draft: 512, high: 1024, ultra: 2048 };

/** Floor maps; UVs must be in world feet. Cached for the page lifetime. */
export function getFloorTextures(
  finish: StudioFloorFinish,
  quality: VenueQuality
): VenueTextureSet {
  const size = FLOOR_SIZE[quality];
  return textureSet(`venue-floor:${finish}:${size}`, FLOOR_DEFS[finish], size);
}

/** Wall maps; UVs must be in world feet (u along the wall, v up). */
export function getWallTextures(
  finish: StudioWallFinish,
  quality: VenueQuality
): VenueTextureSet {
  const size = WALL_SIZE[quality];
  return textureSet(`venue-wall:${finish}:${size}`, WALL_DEFS[finish], size);
}

/** Soft radial falloff (white centre → transparent edge) for alpha maps. */
export function getRadialFadeTexture(): THREE.CanvasTexture {
  return cachedCanvasTexture(
    "venue:radial-fade",
    () =>
      makeCanvas(256, 256, (g, w, h) => {
        const grd = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
        grd.addColorStop(0, "#ffffff");
        grd.addColorStop(0.45, "#c8c8c8");
        grd.addColorStop(1, "#000000");
        g.fillStyle = grd;
        g.fillRect(0, 0, w, h);
      }),
    { srgb: false }
  );
}

/**
 * Luminance falloff for additive glow strips: bright at v = 0, black at
 * v = 1 with a soft exponential tail (cove washes, light spill).
 */
export function getGlowFadeTexture(): THREE.CanvasTexture {
  return cachedCanvasTexture(
    "venue:glow-fade",
    () =>
      makeCanvas(4, 256, (g, w, h) => {
        const img = g.createImageData(w, h);
        for (let y = 0; y < h; y++) {
          const t = 1 - y / (h - 1);
          const v = Math.round(255 * Math.pow(1 - t, 2.2) * (0.6 + 0.4 * (1 - t)));
          for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4;
            img.data[i] = v;
            img.data[i + 1] = v;
            img.data[i + 2] = v;
            img.data[i + 3] = 255;
          }
        }
        g.putImageData(img, 0, 0);
      }),
    { srgb: false }
  );
}

/** Soft exponential light spill (centre bright, no visible rim) for halos. */
export function getHaloTexture(): THREE.CanvasTexture {
  return cachedCanvasTexture(
    "venue:halo",
    () =>
      makeCanvas(128, 128, (g, w, h) => {
        const img = g.createImageData(w, h);
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const r = Math.hypot(x + 0.5 - w / 2, y + 0.5 - h / 2) / (w / 2);
            const v = r >= 1 ? 0 : Math.exp(-r * r * 5.5) * (1 - r * r);
            const i = (y * w + x) * 4;
            const c = Math.round(255 * v);
            img.data[i] = c;
            img.data[i + 1] = c;
            img.data[i + 2] = c;
            img.data[i + 3] = 255;
          }
        }
        g.putImageData(img, 0, 0);
      }),
    { srgb: false }
  );
}

/** Warm, dim vestibule seen through doors and entrances. */
export function getFoyerTexture(): THREE.CanvasTexture {
  return cachedCanvasTexture("venue:foyer", () =>
    makeCanvas(128, 256, (g, w, h) => {
      const grd = g.createLinearGradient(0, 0, 0, h);
      grd.addColorStop(0, "#0b0907");
      grd.addColorStop(0.55, "#2a1e14");
      grd.addColorStop(1, "#4a3622");
      g.fillStyle = grd;
      g.fillRect(0, 0, w, h);
      const pool = g.createRadialGradient(w / 2, h * 0.18, 0, w / 2, h * 0.18, w * 0.75);
      pool.addColorStop(0, "rgba(255,206,140,0.55)");
      pool.addColorStop(1, "rgba(255,206,140,0)");
      g.fillStyle = pool;
      g.fillRect(0, 0, w, h);
      const side = g.createLinearGradient(0, 0, w, 0);
      side.addColorStop(0, "rgba(0,0,0,0.65)");
      side.addColorStop(0.25, "rgba(0,0,0,0)");
      side.addColorStop(0.75, "rgba(0,0,0,0)");
      side.addColorStop(1, "rgba(0,0,0,0.65)");
      g.fillStyle = side;
      g.fillRect(0, 0, w, h);
    })
  );
}

export type DaylightTone = "day" | "golden" | "dusk";

/** Soft sky-through-window glow used behind window glass. */
export function getDaylightTexture(tone: DaylightTone): THREE.CanvasTexture {
  const stops: Record<DaylightTone, [string, string, string]> = {
    day: ["#eef6ff", "#cfe3f7", "#f4efe2"],
    golden: ["#ffe6bf", "#f6c88d", "#fff1d8"],
    dusk: ["#2c3a66", "#4a4e86", "#b9849a"],
  };
  const [top, mid, low] = stops[tone];
  return cachedCanvasTexture(`venue:daylight:${tone}`, () =>
    makeCanvas(128, 256, (g, w, h) => {
      const grd = g.createLinearGradient(0, 0, 0, h);
      grd.addColorStop(0, top);
      grd.addColorStop(0.6, mid);
      grd.addColorStop(1, low);
      g.fillStyle = grd;
      g.fillRect(0, 0, w, h);
      const glow = g.createRadialGradient(w * 0.7, h * 0.25, 0, w * 0.7, h * 0.25, w);
      glow.addColorStop(0, "rgba(255,255,255,0.55)");
      glow.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = glow;
      g.fillRect(0, 0, w, h);
    })
  );
}
