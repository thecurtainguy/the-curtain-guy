/**
 * Shared helpers for deterministic procedural canvas textures (browser only).
 * Seeded so a finish looks identical across visits, renders and snapshots.
 */
import * as THREE from "three";

export { rng, wrapDraw } from "./venue/noise";

export function hashSeed(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

export { alpha, mix, rgbOf, shade } from "./color-utils";

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

/** Most-recently-used canvas textures kept; older ones are GPU-disposed and forgotten. */
const CANVAS_TEXTURE_CAP = 96;
const textureCache = new Map<string, THREE.CanvasTexture>();

/**
 * Cached repeat-wrapped CanvasTexture, shared across components — never
 * dispose one from a component. Past `CANVAS_TEXTURE_CAP` keys (e.g. many
 * monogram / colour variants) the least recently requested is GPU-disposed;
 * a material still holding it simply re-uploads from the retained canvas.
 */
export function cachedCanvasTexture(
  key: string,
  build: () => HTMLCanvasElement,
  { srgb = true, anisotropy = 8 }: { srgb?: boolean; anisotropy?: number } = {}
): THREE.CanvasTexture {
  const cached = textureCache.get(key);
  if (cached) {
    textureCache.delete(key);
    textureCache.set(key, cached);
    return cached;
  }
  const texture = new THREE.CanvasTexture(build());
  if (srgb) texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = anisotropy;
  texture.needsUpdate = true;
  textureCache.set(key, texture);
  if (textureCache.size > CANVAS_TEXTURE_CAP) {
    const [oldestKey, oldest] = textureCache.entries().next().value!;
    textureCache.delete(oldestKey);
    oldest.dispose();
  }
  return texture;
}
