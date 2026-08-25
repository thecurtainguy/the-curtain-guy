import type {
  StudioFloorFinish,
  StudioLightingMood,
  StudioWallFinish,
} from "@/data/studio";
import * as THREE from "three";

export const FLOOR_FINISHES: Record<
  StudioFloorFinish,
  {
    color: string;
    roughness: number;
    metalness: number;
    textureScale: number;
  }
> = {
  warm_wood: {
    color: "#8a6d4f",
    roughness: 0.72,
    metalness: 0.01,
    textureScale: 0.16,
  },
  event_carpet: {
    color: "#716d66",
    roughness: 0.98,
    metalness: 0,
    textureScale: 0.7,
  },
  polished_concrete: {
    color: "#8a8985",
    roughness: 0.64,
    metalness: 0.03,
    textureScale: 0.24,
  },
  black_event: {
    color: "#242321",
    roughness: 0.88,
    metalness: 0.01,
    textureScale: 0.5,
  },
  light_neutral: {
    color: "#b9b2a6",
    roughness: 0.82,
    metalness: 0.01,
    textureScale: 0.28,
  },
};

export const WALL_FINISHES: Record<
  StudioWallFinish,
  { color: string; roughness: number }
> = {
  warm_ivory: { color: "#e8e0d2", roughness: 0.9 },
  soft_grey: { color: "#b8b8b5", roughness: 0.92 },
  black_box: { color: "#242321", roughness: 0.86 },
  neutral_beige: { color: "#c9bcaa", roughness: 0.92 },
};

export const LIGHTING_MOODS: Record<
  StudioLightingMood,
  {
    ambientColor: string;
    ambientIntensity: number;
    hemisphereSky: string;
    hemisphereGround: string;
    hemisphereIntensity: number;
    keyColor: string;
    keyIntensity: number;
    fillColor: string;
    fillIntensity: number;
    exposure: number;
    backgroundDark: string;
    backgroundLight: string;
  }
> = {
  neutral: {
    ambientColor: "#f4f0e7",
    ambientIntensity: 0.42,
    hemisphereSky: "#fffaf0",
    hemisphereGround: "#77736d",
    hemisphereIntensity: 0.56,
    keyColor: "#fff4df",
    keyIntensity: 1.72,
    fillColor: "#dbe7f3",
    fillIntensity: 0.44,
    exposure: 1.02,
    backgroundDark: "#171716",
    backgroundLight: "#dedbd4",
  },
  warm_gala: {
    ambientColor: "#f4dfbc",
    ambientIntensity: 0.38,
    hemisphereSky: "#ffe8bf",
    hemisphereGround: "#554637",
    hemisphereIntensity: 0.48,
    keyColor: "#ffd59b",
    keyIntensity: 1.85,
    fillColor: "#c9d6e8",
    fillIntensity: 0.34,
    exposure: 1.04,
    backgroundDark: "#181411",
    backgroundLight: "#ded5c8",
  },
  dark_venue: {
    ambientColor: "#8d806f",
    ambientIntensity: 0.26,
    hemisphereSky: "#b7a98f",
    hemisphereGround: "#171513",
    hemisphereIntensity: 0.3,
    keyColor: "#e9bd7c",
    keyIntensity: 1.48,
    fillColor: "#7689a3",
    fillIntensity: 0.28,
    exposure: 0.86,
    backgroundDark: "#0e0d0c",
    backgroundLight: "#1b1917",
  },
  bright_setup: {
    ambientColor: "#ffffff",
    ambientIntensity: 0.58,
    hemisphereSky: "#ffffff",
    hemisphereGround: "#aaa8a1",
    hemisphereIntensity: 0.7,
    keyColor: "#fff9ee",
    keyIntensity: 1.92,
    fillColor: "#e6f0fa",
    fillIntensity: 0.54,
    exposure: 1.12,
    backgroundDark: "#20201e",
    backgroundLight: "#eceae5",
  },
};

const floorTextureCache = new Map<StudioFloorFinish, THREE.DataTexture>();

function deterministicNoise(x: number, y: number, seed: number): number {
  const value = Math.sin(x * 12.9898 + y * 78.233 + seed * 37.719);
  return value - Math.floor(value);
}

export function getFloorTexture(finish: StudioFloorFinish): THREE.DataTexture {
  const cached = floorTextureCache.get(finish);
  if (cached) return cached;

  const size = 64;
  const data = new Uint8Array(size * size * 4);
  const seed = Object.keys(FLOOR_FINISHES).indexOf(finish) + 1;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const noise = deterministicNoise(x, y, seed);
      let value = 236;

      if (finish === "warm_wood") {
        const plankSeam = y % 12 === 0;
        const staggerSeam = (x + (Math.floor(y / 12) % 2) * 32) % 64 === 0;
        const grain = Math.sin(x * 0.48 + y * 0.08) * 5 + noise * 7;
        value = plankSeam || staggerSeam ? 188 : 224 + grain;
      } else if (finish === "event_carpet") {
        value = 220 + noise * 18;
      } else if (finish === "polished_concrete") {
        const cloud = Math.sin(x * 0.16) * Math.cos(y * 0.13) * 7;
        value = 222 + cloud + noise * 14;
      } else if (finish === "black_event") {
        value = 214 + noise * 13;
      } else {
        value = 228 + noise * 16;
      }

      const offset = (y * size + x) * 4;
      const channel = Math.max(0, Math.min(255, Math.round(value)));
      data[offset] = channel;
      data[offset + 1] = channel;
      data[offset + 2] = channel;
      data[offset + 3] = 255;
    }
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  const scale = FLOOR_FINISHES[finish].textureScale;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(scale, scale);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  floorTextureCache.set(finish, texture);
  return texture;
}
