/**
 * Pure hex colour helpers. Kept free of `three` so 2D/UI code (fabric pickers,
 * swatches) can use them without pulling the 3D engine into the main bundle.
 */

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
