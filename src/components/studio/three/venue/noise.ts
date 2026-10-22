/**
 * Seeded, optionally periodic value noise for tileable procedural textures.
 * DOM- and three-free so the texture worker can import it.
 */

/** Mulberry32 PRNG in [0, 1). */
export function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
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

export function hash2(x: number, y: number, seed: number) {
  let h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul((y | 0) + 0x3c6ef372, 0x165667b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b) ^ Math.imul(seed | 0, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

const fade = (t: number) => t * t * (3 - 2 * t);

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

export function smoothstep(a: number, b: number, v: number) {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
}

export const mod = (v: number, m: number) => ((v % m) + m) % m;

/**
 * 2D value noise in [0, 1]. With `px`/`py` > 0 the lattice wraps, so the noise
 * tiles every `px` × `py` units.
 */
export function vnoise(
  x: number,
  y: number,
  seed: number,
  px = 0,
  py = 0
) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = fade(x - ix);
  const fy = fade(y - iy);
  const x0 = px > 0 ? mod(ix, px) : ix;
  const y0 = py > 0 ? mod(iy, py) : iy;
  const x1 = px > 0 ? mod(ix + 1, px) : ix + 1;
  const y1 = py > 0 ? mod(iy + 1, py) : iy + 1;
  const a = hash2(x0, y0, seed);
  const b = hash2(x1, y0, seed);
  const c = hash2(x0, y1, seed);
  const d = hash2(x1, y1, seed);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}

/** Fractal value noise in ~[0, 1]; periods double with each octave. */
export function fbm(
  x: number,
  y: number,
  seed: number,
  octaves = 4,
  px = 0,
  py = 0
) {
  let sum = 0;
  let amp = 0.5;
  let norm = 0;
  let f = 1;
  for (let o = 0; o < octaves; o++) {
    sum += vnoise(x * f, y * f, seed + o * 101, px * f, py * f) * amp;
    norm += amp;
    amp *= 0.5;
    f *= 2;
  }
  return sum / norm;
}
