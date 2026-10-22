/**
 * Baked ambient-occlusion cells that darken coffers and beam creases. The
 * ceiling PBR maps (timber, planks, deck, steel, duct) are generated with the
 * other venue finishes in `texture-gen.ts`; use
 * `useVenueTextures({ group: "ceiling", finish })`.
 */
import * as THREE from "three";
import { cachedCanvasTexture } from "../texture-utils";
import { clamp01, smoothstep } from "./noise";

export type { CeilingTextureKind } from "./texture-gen";

/**
 * Per-axis crease shading inside one repeating cell (coffer, beam bay).
 * Sampled through `uv1`: x / y are cell fractions; the first `edge` of each
 * side is hidden under a beam, then occlusion fades out over `falloff`.
 */
export type CeilingAoCell = { edgeU: number; falloffU: number; edgeV: number; falloffV: number };

/** Cell for vertical faces: `uv1.y` = 0.5 × (distance from the crease / falloff). */
export const CEILING_AO_RAMP: CeilingAoCell = { edgeU: 0, falloffU: 0.5, edgeV: 0, falloffV: 0.5 };

const q = (v: number) => Math.round(clamp01(v) * 100) / 100;

export function getCeilingAoTexture(cell: CeilingAoCell): THREE.CanvasTexture {
  const c = { edgeU: q(cell.edgeU), falloffU: q(cell.falloffU), edgeV: q(cell.edgeV), falloffV: q(cell.falloffV) };
  const texture = cachedCanvasTexture(
    `venue-ceiling:ao:${c.edgeU}:${c.falloffU}:${c.edgeV}:${c.falloffV}`,
    () => {
      const size = 128;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const g = canvas.getContext("2d")!;
      const img = g.createImageData(size, size);
      const axis = (t: number, edge: number, falloff: number) => {
        if (falloff <= 0) return 1;
        const d = Math.min(t, 1 - t) - edge;
        const k = 1 - smoothstep(0, 1, clamp01(d / falloff));
        return 1 - 0.62 * k * k * (3 - 2 * k) - 0.12 * k;
      };
      for (let y = 0; y < size; y++) {
        const ay = axis((y + 0.5) / size, c.edgeV, c.falloffV);
        for (let x = 0; x < size; x++) {
          const v = clamp01(axis((x + 0.5) / size, c.edgeU, c.falloffU) * ay) * 255;
          const i = (y * size + x) * 4;
          img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
          img.data[i + 3] = 255;
        }
      }
      g.putImageData(img, 0, 0);
      return canvas;
    },
    { srgb: false, anisotropy: 4 }
  );
  texture.channel = 1;
  return texture;
}
