/**
 * Seeded procedural PBR maps for venue floors, walls and ceiling architecture.
 * Every finish renders colour, height (→ normal) and roughness in one pass so
 * the maps line up exactly. Maps tile seamlessly; `tileIn` is the real world
 * size of one tile in inches, so UVs authored in feet get
 * `repeat = 12 / tileIn` and planks/bricks land at true scale.
 *
 * Pure (no DOM, no three) so it runs inside `texture-worker.ts`; the few
 * finishes that paint strokes get a 2D context from the caller (OffscreenCanvas
 * in the worker, a DOM canvas on the main-thread fallback). Generators yield
 * every row so the main-thread fallback can time-slice them.
 */
import type { StudioFloorFinish, StudioWallFinish } from "@/data/studio";
import { rgbOf } from "../color-utils";
import { clamp01, fbm, hash2, mod, rng, smoothstep, vnoise, wrapDraw } from "./noise";

/** Canvas-orientation maps: row 0 is the top of the tile. */
type MapSet = {
  w: number;
  h: number;
  /** RGBA. */
  color: Uint8ClampedArray;
  /** One byte per texel. */
  height: Uint8ClampedArray;
  /** One byte per texel. */
  rough: Uint8ClampedArray;
};

type Gen<T> = Generator<void, T, void>;

/** Supplies a 2D context of the given size (OffscreenCanvas or DOM canvas). */
export type Canvas2DFactory = (w: number, h: number) => CanvasRenderingContext2D;

type Build = (size: number, canvas: Canvas2DFactory) => Gen<MapSet>;

type Px = { r: number; g: number; b: number; h: number; ro: number };

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
function* renderMaps(
  w: number,
  h: number,
  fn: (x: number, y: number, o: Px) => void
): Gen<MapSet> {
  const color = new Uint8ClampedArray(w * h * 4);
  const height = new Uint8ClampedArray(w * h);
  const rough = new Uint8ClampedArray(w * h);
  const o: Px = { r: 0, g: 0, b: 0, h: 0.5, ro: 0.8 };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      o.h = 0.5;
      o.ro = 0.8;
      fn(x + 0.5, y + 0.5, o);
      const p = y * w + x;
      const i = p * 4;
      color[i] = o.r;
      color[i + 1] = o.g;
      color[i + 2] = o.b;
      color[i + 3] = 255;
      height[p] = clamp01(o.h) * 255;
      rough[p] = clamp01(o.ro) * 255;
    }
    yield;
  }
  return { w, h, color, height, rough };
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
): Gen<MapSet> {
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
function herringboneFloor(size: number): Gen<MapSet> {
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

function carpetFloor(size: number): Gen<MapSet> {
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

/** Paints `pixels` (RGBA) onto a fresh context, runs `draw`, reads the result back. */
function paintOver(
  canvas: Canvas2DFactory,
  w: number,
  h: number,
  pixels: Uint8ClampedArray,
  draw: (g: CanvasRenderingContext2D) => void
): Uint8ClampedArray {
  const g = canvas(w, h);
  const img = g.createImageData(w, h);
  img.data.set(pixels);
  g.putImageData(img, 0, 0);
  draw(g);
  return g.getImageData(0, 0, w, h).data;
}

function* concreteFloor(size: number, canvas: Canvas2DFactory): Gen<MapSet> {
  const tileIn = 120;
  const inPerPx = tileIn / size;
  const base = rgbOf("#9b9993");
  const warm = rgbOf("#a59d90");
  const set = yield* renderMaps(size, size, (x, y, o) => {
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
  set.color = paintOver(canvas, size, size, set.color, (g) => {
    const rand = rng(83);
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
  });
  return set;
}

function blackEventFloor(size: number): Gen<MapSet> {
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

function porcelainFloor(size: number): Gen<MapSet> {
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

function marbleFloor(size: number): Gen<MapSet> {
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

function* lawnFloor(size: number, canvas: Canvas2DFactory): Gen<MapSet> {
  const rand = rng(131);
  const cg = canvas(size, size);
  const hg = canvas(size, size);
  cg.fillStyle = "#29411a";
  cg.fillRect(0, 0, size, size);
  hg.fillStyle = "#202020";
  hg.fillRect(0, 0, size, size);
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
  yield;
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
    if ((i & 1023) === 1023) yield;
  }
  const color = cg.getImageData(0, 0, size, size).data;
  const heightRgba = hg.getImageData(0, 0, size, size).data;
  const height = new Uint8ClampedArray(size * size);
  for (let p = 0; p < height.length; p++) height[p] = heightRgba[p * 4];
  const rough = new Uint8ClampedArray(size * size).fill(0xf2);
  return { w: size, h: size, color, height, rough };
}

/* ---------------------------------------------------------------- walls */

function paintWall(
  size: number,
  cfg: { seed: number; base: string; mottle: number; peel: number; trowel: number; rough: number }
): Gen<MapSet> {
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

function brickWall(size: number): Gen<MapSet> {
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

function woodPanelWall(size: number): Gen<MapSet> {
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

function tentCanvasWall(size: number): Gen<MapSet> {
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

/* -------------------------------------------------------------- ceiling */

/** Dark-stained, rough-sawn beam: long grain, saw kerfs and drying checks. Tile 48″ × 12″. */
function timber(size: number): Gen<MapSet> {
  const w = size;
  const h = Math.max(32, size / 4);
  const tones = ["#5b3d26", "#4f3420", "#64442b"].map(rgbOf);
  const rand = rng(301);
  const checks = Array.from({ length: 4 }, () => ({
    across: 1.5 + rand() * 9,
    start: rand() * 48,
    length: 8 + rand() * 22,
    width: 0.05 + rand() * 0.07,
  }));
  return renderMaps(w, h, (x, y, o) => {
    const nx = x / w;
    const ny = y / h;
    const along = nx * 48;
    const across = ny * 12;
    const warp = fbm(nx * 2, ny * 3, 303, 3, 2, 3);
    const ring = (across * 10) / 12 + warp * 3.2 + Math.sin(nx * Math.PI * 2) * 0.6;
    const f = ring - Math.floor(ring);
    const late = smoothstep(0.55, 0.9, f) * (1 - smoothstep(0.92, 1, f));
    const fibre = vnoise(nx * 24, ny * 96, 305, 24, 96);
    const streak = fbm(nx * 4, ny * 24, 307, 3, 4, 24);
    const kerf = 0.5 + 0.5 * Math.sin(2 * Math.PI * (along / 0.55 + vnoise(nx * 8, ny * 2, 309, 8, 2) * 1.4));
    const stain = fbm(nx * 3, ny * 1, 311, 4, 3, 1);
    let crack = 0;
    for (const c of checks) {
      const t = mod(along - c.start, 48);
      if (t > c.length) continue;
      const taper = Math.sin((t / c.length) * Math.PI);
      const wobble = (vnoise(t * 0.4, c.across, 313) - 0.5) * 0.5;
      crack = Math.max(crack, 1 - smoothstep(0, c.width * taper + 0.01, Math.abs(across - c.across - wobble)));
    }
    const tone = lerpRgb(tones[0], stain > 0.5 ? tones[2] : tones[1], Math.abs(stain - 0.5) * 2);
    const k =
      (1 - 0.32 * late) *
      (0.86 + 0.22 * fibre) *
      (0.9 + 0.16 * streak) *
      (0.96 + 0.05 * kerf) *
      (1 - 0.7 * crack);
    setRgb(o, tone, k);
    o.h = 0.5 + 0.12 * fibre + 0.08 * streak + 0.06 * kerf - 0.05 * late - 0.45 * crack;
    o.ro = 0.78 + 0.12 * fibre + 0.06 * late + 0.1 * crack;
  });
}

/** Whitewashed tongue-and-groove pine running along +u. Tile 96″ × 96″. */
function ceilingPlanks(size: number): Gen<MapSet> {
  const rand = rng(331);
  const width = 96 / 17;
  const rows = Array.from({ length: 17 }, () => {
    const joint = rand() * 96;
    return { joint, tone: 0.92 + rand() * 0.1, s1: rand() * 50, s2: rand() * 50, center: rand() * width };
  });
  const wash = rgbOf("#e6e0d4");
  const pine = rgbOf("#b7976f");
  const inPerPx = 96 / size;
  return renderMaps(size, size, (x, y, o) => {
    const X = x * inPerPx;
    const Y = y * inPerPx;
    const row = Math.min(rows.length - 1, Math.floor(Y / width));
    const r = rows[row];
    const across = Y - row * width;
    const along = mod(X - r.joint, 96);
    const warp = vnoise(along * 0.05 + r.s1, across * 0.4 + r.s2, 333);
    const ring = Math.abs(across - r.center) * 1.3 + warp * 2.6 + along * 0.01;
    const f = ring - Math.floor(ring);
    const late = smoothstep(0.5, 0.88, f) * (1 - smoothstep(0.9, 1, f));
    const fibre = vnoise((X / 96) * 64, (Y / 96) * 512, 335, 64, 512);
    const knot = Math.exp(-((mod(along - 30 - r.s1, 96) / 1.6) ** 2 + ((across - r.center) / 0.7) ** 2));
    const edge = Math.min(across, width - across);
    const groove = 1 - smoothstep(0, Math.max(0.12, inPerPx * 1.5), edge);
    const joint = 1 - smoothstep(0, Math.max(0.08, inPerPx), Math.min(along, 96 - along));
    const grain = clamp01(late * 0.55 + knot * 0.6 + (1 - fibre) * 0.12);
    const c = lerpRgb(wash, pine, grain * 0.55);
    const seam = Math.max(groove, joint * 0.8);
    setRgb(o, c, r.tone * (1 - seam * 0.55));
    o.h = 0.55 + 0.06 * fibre - 0.05 * late - seam * 0.5;
    o.ro = 0.84 + 0.06 * late + seam * 0.1;
  });
}

/** Painted fluted steel deck: 6″ ribs running along +u. Tile 24″ × 24″. */
function steelDeck(size: number): Gen<MapSet> {
  const paint = rgbOf("#34363a");
  const dust = rgbOf("#57565a");
  return renderMaps(size, size, (x, y, o) => {
    const nx = x / size;
    const ny = y / size;
    const v = mod(ny * 24, 6);
    const flat = v < 2.2 ? 1 : v < 3 ? 1 - (v - 2.2) / 0.8 : v < 5.2 ? 0 : (v - 5.2) / 0.8;
    const slope = v >= 2.2 && v < 3 ? 1 : v >= 5.2 ? 1 : 0;
    const mottle = fbm(nx * 4, ny * 4, 351, 4, 4, 4);
    const speck = vnoise(nx * 220, ny * 220, 353, 220, 220);
    const lap = 1 - smoothstep(0, 0.12, Math.abs(mod(nx * 24, 24) - 12));
    const c = lerpRgb(paint, dust, smoothstep(0.55, 0.85, mottle) * 0.45 + flat * 0.08);
    setRgb(o, c, (0.9 + 0.14 * mottle) * (0.96 + 0.06 * speck) * (1 - slope * 0.18) * (1 - lap * 0.25));
    o.h = 0.2 + 0.6 * flat + 0.03 * speck - lap * 0.05;
    o.ro = 0.62 + 0.14 * mottle + 0.08 * speck + slope * 0.06;
  });
}

/** Painted structural steel (girders, hangers). Tile 48″ × 48″. */
function paintedSteel(size: number): Gen<MapSet> {
  const paint = rgbOf("#2f3033");
  const scuff = rgbOf("#4a4a4d");
  return renderMaps(size, size, (x, y, o) => {
    const nx = x / size;
    const ny = y / size;
    const mottle = fbm(nx * 6, ny * 6, 361, 4, 6, 6);
    const brush = vnoise(nx * 8, ny * 160, 363, 8, 160);
    const pit = vnoise(nx * 300, ny * 300, 365, 300, 300);
    const c = lerpRgb(paint, scuff, smoothstep(0.6, 0.9, mottle) * 0.5);
    setRgb(o, c, (0.9 + 0.14 * mottle) * (0.97 + 0.05 * brush));
    o.h = 0.5 + 0.08 * brush - 0.12 * smoothstep(0.82, 0.95, pit);
    o.ro = 0.5 + 0.16 * mottle + 0.06 * brush;
  });
}

/** Galvanised spiral duct: spangle crystals and a raised lock seam. Tile 24″ × 24″ (u around, v along). */
function galvanised(size: number): Gen<MapSet> {
  const zinc = rgbOf("#b3b7bb");
  const dark = rgbOf("#8b9094");
  return renderMaps(size, size, (x, y, o) => {
    const nx = x / size;
    const ny = y / size;
    const around = nx * 24;
    const along = ny * 24;
    const cell = 1.5;
    const cx = Math.floor(around / cell);
    const cy = Math.floor(along / cell);
    const spangle = hash2(mod(cx, 24 / cell) | 0, mod(cy, 24 / cell) | 0, 371);
    const facet = vnoise(nx * 48, ny * 48, 373, 48, 48);
    const seamPos = mod(along + around * 0.25, 6);
    const seam = 1 - smoothstep(0.1, 0.3, Math.min(seamPos, 6 - seamPos));
    const grime = fbm(nx * 3, ny * 3, 377, 3, 3, 3);
    const c = lerpRgb(zinc, dark, clamp01(spangle * 0.5 + grime * 0.3 - 0.15));
    setRgb(o, c, (0.92 + 0.1 * facet) * (1 + seam * 0.08));
    o.h = 0.45 + 0.04 * spangle + seam * 0.45;
    o.ro = 0.26 + 0.18 * spangle + 0.1 * grime - seam * 0.05;
  });
}

/* ------------------------------------------------------------ registry */

export type FinishDef = {
  tileIn: [number, number];
  normalStrength: number;
  /** Placeholder colour (hex) and roughness shown until the first maps land. */
  flat: [string, number];
  build: Build;
};

const WOOD_TONES = ["#a7794e", "#b5875a", "#9a6c43", "#ad7f52", "#c08f62", "#9f7249"];
const OAK_TONES = ["#4b3424", "#563c29", "#3f2c1e", "#5d422d", "#47301f", "#52392a"];

const FLOOR_DEFS: Record<StudioFloorFinish, FinishDef> = {
  warm_wood: {
    tileIn: [96, 96],
    normalStrength: 3,
    flat: ["#a97c50", 0.44],
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
    flat: ["#4f3826", 0.4],
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
    flat: ["#a17650", 0.4],
    build: herringboneFloor,
  },
  event_carpet: { tileIn: [36, 36], normalStrength: 2.4, flat: ["#716b61", 0.96], build: carpetFloor },
  polished_concrete: {
    tileIn: [120, 120],
    normalStrength: 2,
    flat: ["#9a9893", 0.24],
    build: concreteFloor,
  },
  black_event: { tileIn: [60, 60], normalStrength: 1.6, flat: ["#1f1e1c", 0.48], build: blackEventFloor },
  light_neutral: { tileIn: [48, 48], normalStrength: 2.4, flat: ["#d2cbbf", 0.3], build: porcelainFloor },
  white_marble: { tileIn: [72, 72], normalStrength: 1.4, flat: ["#efebe5", 0.08], build: marbleFloor },
  lawn: { tileIn: [36, 36], normalStrength: 2.6, flat: ["#33501f", 0.95], build: lawnFloor },
};

const WALL_DEFS: Record<StudioWallFinish, FinishDef> = {
  warm_ivory: {
    tileIn: [48, 48],
    normalStrength: 1.2,
    flat: ["#e9e1d3", 0.88],
    build: (s) => paintWall(s, { seed: 201, base: "#e9e1d3", mottle: 0.05, peel: 0.18, trowel: 0, rough: 0.88 }),
  },
  soft_grey: {
    tileIn: [48, 48],
    normalStrength: 1.2,
    flat: ["#b9b9b5", 0.9],
    build: (s) => paintWall(s, { seed: 203, base: "#b9b9b5", mottle: 0.05, peel: 0.18, trowel: 0, rough: 0.9 }),
  },
  neutral_beige: {
    tileIn: [48, 48],
    normalStrength: 1.2,
    flat: ["#cbbeab", 0.9],
    build: (s) => paintWall(s, { seed: 205, base: "#cbbeab", mottle: 0.06, peel: 0.18, trowel: 0, rough: 0.9 }),
  },
  black_box: {
    tileIn: [48, 48],
    normalStrength: 1,
    flat: ["#242321", 0.92],
    build: (s) => paintWall(s, { seed: 207, base: "#242321", mottle: 0.1, peel: 0.15, trowel: 0, rough: 0.92 }),
  },
  white_plaster: {
    tileIn: [64, 64],
    normalStrength: 2.2,
    flat: ["#f1ede6", 0.9],
    build: (s) => paintWall(s, { seed: 209, base: "#f1ede6", mottle: 0.06, peel: 0.1, trowel: 0.35, rough: 0.9 }),
  },
  exposed_brick: { tileIn: BRICK_TILE, normalStrength: 4, flat: ["#8a4d3a", 0.9], build: brickWall },
  wood_panel: { tileIn: PANEL_TILE, normalStrength: 3, flat: ["#6b4a32", 0.55], build: woodPanelWall },
  tent_canvas: { tileIn: CANVAS_TILE, normalStrength: 1.6, flat: ["#ebe5d8", 0.91], build: tentCanvasWall },
};

const CEILING_DEFS = {
  timber: { tileIn: [48, 12], normalStrength: 3.2, flat: ["#55392a", 0.85], build: timber },
  planks: { tileIn: [96, 96], normalStrength: 2.4, flat: ["#d8cdbb", 0.88], build: ceilingPlanks },
  deck: { tileIn: [24, 24], normalStrength: 5, flat: ["#38393d", 0.72], build: steelDeck },
  steel: { tileIn: [48, 48], normalStrength: 1.4, flat: ["#313235", 0.58], build: paintedSteel },
  duct: { tileIn: [24, 24], normalStrength: 2.6, flat: ["#a8acb0", 0.36], build: galvanised },
} satisfies Record<string, FinishDef>;

export type CeilingTextureKind = keyof typeof CEILING_DEFS;

/** Which procedural map set: a floor, wall or ceiling-architecture finish. */
export type VenueMapSpec =
  | { group: "floor"; finish: StudioFloorFinish }
  | { group: "wall"; finish: StudioWallFinish }
  | { group: "ceiling"; finish: CeilingTextureKind };

export type VenueMapGroup = VenueMapSpec["group"];

export function venueMapDef(spec: VenueMapSpec): FinishDef | undefined {
  switch (spec.group) {
    case "floor":
      return FLOOR_DEFS[spec.finish];
    case "wall":
      return WALL_DEFS[spec.finish];
    case "ceiling":
      return (CEILING_DEFS as Record<string, FinishDef>)[spec.finish];
  }
}

/**
 * GPU-ready maps, rows bottom-up (WebGL order) so they upload with
 * `flipY = false` and land exactly where the old flipped canvases did.
 */
export type VenueMapData = {
  width: number;
  height: number;
  /** RGBA, sRGB. */
  color: Uint8Array;
  /** RGBA tangent-space normal. */
  normal: Uint8Array;
  /** RG (roughness duplicated; three samples `.g`). */
  rough: Uint8Array;
};

/** Tangent-space normals from the height map, written bottom-up. */
function* packMaps(maps: MapSet, strength: number): Gen<VenueMapData> {
  const { w, h } = maps;
  const hs = new Float64Array(w * h);
  for (let p = 0; p < hs.length; p++) hs[p] = maps.height[p] / 255;
  const color = new Uint8Array(w * h * 4);
  const normal = new Uint8Array(w * h * 4);
  const rough = new Uint8Array(w * h * 2);
  const row = w * 4;
  for (let y = 0; y < h; y++) {
    const fy = h - 1 - y;
    color.set(maps.color.subarray(y * row, (y + 1) * row), fy * row);
    const up = ((y - 1 + h) % h) * w;
    const mid = y * w;
    const down = ((y + 1) % h) * w;
    for (let x = 0; x < w; x++) {
      const left = (x - 1 + w) % w;
      const right = (x + 1) % w;
      const dx = (hs[mid + right] - hs[mid + left]) * strength;
      const dy = (hs[down + x] - hs[up + x]) * strength;
      const len = Math.hypot(dx, dy, 1);
      const i = (fy * w + x) * 4;
      normal[i] = Math.round(((-dx / len) * 0.5 + 0.5) * 255);
      normal[i + 1] = Math.round(((dy / len) * 0.5 + 0.5) * 255);
      normal[i + 2] = Math.round(((1 / len) * 0.5 + 0.5) * 255);
      normal[i + 3] = 255;
      const r = maps.rough[mid + x];
      const j = (fy * w + x) * 2;
      rough[j] = r;
      rough[j + 1] = r;
    }
    if ((y & 31) === 31) yield;
  }
  return { width: w, height: h, color, normal, rough };
}

/** Builds one finish at `size`; drive with `runToEnd` or time-slice with `.next()`. */
export function* generateVenueMaps(
  spec: VenueMapSpec,
  size: number,
  canvas: Canvas2DFactory
): Gen<VenueMapData> {
  const def = venueMapDef(spec);
  if (!def) throw new Error(`Unknown venue finish ${spec.group}/${spec.finish}`);
  const maps = yield* def.build(size, canvas);
  return yield* packMaps(maps, def.normalStrength);
}

/** Finishes that draw strokes and therefore need a 2D canvas. */
export function venueMapNeedsCanvas(spec: VenueMapSpec) {
  return spec.group === "floor" && (spec.finish === "lawn" || spec.finish === "polished_concrete");
}

export function runToEnd<T>(gen: Gen<T>): T {
  for (;;) {
    const step = gen.next();
    if (step.done) return step.value;
  }
}
