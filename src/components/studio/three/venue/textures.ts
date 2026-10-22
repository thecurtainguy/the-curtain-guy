/**
 * Small shared venue textures (alpha falloffs, glow strips, foyer and
 * daylight backdrops). The procedural floor / wall / ceiling PBR maps live in
 * `texture-gen.ts` (generated in a worker) and are handed out ref-counted by
 * `texture-cache.ts`.
 */
import * as THREE from "three";
import { cachedCanvasTexture, makeCanvas } from "../texture-utils";

export {
  acquireVenueTextures,
  useVenueTextures,
  type VenueQuality,
  type VenueTextureSet,
} from "./texture-cache";
export type { CeilingTextureKind, VenueMapSpec } from "./texture-gen";

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
