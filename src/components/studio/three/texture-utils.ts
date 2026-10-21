/**
 * Shared helpers for deterministic procedural canvas textures (browser only).
 * Seeded so a finish looks identical across visits, renders and snapshots.
 */
import * as THREE from "three";

export function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

export const rgbOf = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** `hex` scaled by k as an `rgb()` string. */
export const shade = (hex: string, k: number) => {
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  const [r, g, b] = rgbOf(hex);
  return `rgb(${f(r)},${f(g)},${f(b)})`;
};

export const alpha = (hex: string, a: number) => {
  const [r, g, b] = rgbOf(hex);
  return `rgba(${r},${g},${b},${a})`;
};

/** `hex` moved `t` (0..1) toward `toward`, as `#rrggbb`. */
export const mix = (hex: string, toward: string, t: number) => {
  const a = rgbOf(hex);
  const b = rgbOf(toward);
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * t));
  return `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
};

export type Ctx2D = CanvasRenderingContext2D;

export function makeCanvas(
  w: number,
  h: number,
  draw: (g: Ctx2D, w: number, h: number) => void
) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!, w, h);
  return c;
}

/** Calls `fn` at (x, y) and its wrapped copies so tiles repeat seamlessly. */
export function wrapDraw(
  size: number,
  x: number,
  y: number,
  r: number,
  fn: (x: number, y: number) => void
) {
  for (const dx of [-size, 0, size]) {
    for (const dy of [-size, 0, size]) {
      const X = x + dx;
      const Y = y + dy;
      if (X > -r && X < size + r && Y > -r && Y < size + r) fn(X, Y);
    }
  }
}

/**
 * Converts a greyscale height canvas into a tangent-space normal map canvas.
 * `strength` ≈ 1–8.
 */
export function normalMapFromHeight(source: HTMLCanvasElement, strength = 3) {
  const w = source.width;
  const h = source.height;
  const src = source.getContext("2d")!.getImageData(0, 0, w, h).data;
  return makeCanvas(w, h, (g) => {
    const out = g.createImageData(w, h);
    const height = (x: number, y: number) =>
      src[(((y + h) % h) * w + ((x + w) % w)) * 4] / 255;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dx = (height(x + 1, y) - height(x - 1, y)) * strength;
        const dy = (height(x, y + 1) - height(x, y - 1)) * strength;
        const len = Math.hypot(dx, dy, 1);
        const i = (y * w + x) * 4;
        out.data[i] = Math.round(((-dx / len) * 0.5 + 0.5) * 255);
        out.data[i + 1] = Math.round(((dy / len) * 0.5 + 0.5) * 255);
        out.data[i + 2] = Math.round(((1 / len) * 0.5 + 0.5) * 255);
        out.data[i + 3] = 255;
      }
    }
    g.putImageData(out, 0, 0);
  });
}

const textureCache = new Map<string, THREE.CanvasTexture>();

/**
 * Cached repeat-wrapped CanvasTexture. Textures live for the page lifetime and
 * are shared across canvases — never dispose them from a component.
 */
export function cachedCanvasTexture(
  key: string,
  build: () => HTMLCanvasElement,
  { srgb = true, anisotropy = 8 }: { srgb?: boolean; anisotropy?: number } = {}
): THREE.CanvasTexture {
  const cached = textureCache.get(key);
  if (cached) return cached;
  const texture = new THREE.CanvasTexture(build());
  if (srgb) texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = anisotropy;
  texture.needsUpdate = true;
  textureCache.set(key, texture);
  return texture;
}
