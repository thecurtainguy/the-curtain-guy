import type { StudioFloorFinish, StudioWallFinish } from "@/data/studio";

export {
  acquireVenueTextures,
  useVenueTextures,
  type VenueQuality,
  type VenueTextureSet,
} from "./venue/texture-cache";

export type FloorFinishAppearance = {
  /** Representative swatch colour (the texture carries the real colour). */
  color: string;
  roughness: number;
  metalness: number;
  /** @deprecated Textures are authored at world scale; kept for callers. */
  textureScale: number;
  clearcoat: number;
  clearcoatRoughness: number;
  normalScale: number;
  envMapIntensity: number;
  sheen?: number;
  /** Eligible for a real-time mirror reflector on "ultra" quality. */
  reflective?: boolean;
};

export const FLOOR_FINISHES: Record<StudioFloorFinish, FloorFinishAppearance> = {
  warm_wood: {
    color: "#a97c50",
    roughness: 0.42,
    metalness: 0,
    textureScale: 0.16,
    clearcoat: 0.45,
    clearcoatRoughness: 0.22,
    normalScale: 0.7,
    envMapIntensity: 0.65,
  },
  event_carpet: {
    color: "#716b61",
    roughness: 0.96,
    metalness: 0,
    textureScale: 0.7,
    clearcoat: 0,
    clearcoatRoughness: 1,
    normalScale: 0.9,
    envMapIntensity: 0.15,
    sheen: 0.55,
  },
  polished_concrete: {
    color: "#9a9893",
    roughness: 0.24,
    metalness: 0,
    textureScale: 0.24,
    clearcoat: 0.85,
    clearcoatRoughness: 0.1,
    normalScale: 0.45,
    envMapIntensity: 0.95,
    reflective: true,
  },
  black_event: {
    color: "#1f1e1c",
    roughness: 0.48,
    metalness: 0,
    textureScale: 0.5,
    clearcoat: 0.7,
    clearcoatRoughness: 0.12,
    normalScale: 0.5,
    envMapIntensity: 0.9,
    reflective: true,
  },
  light_neutral: {
    color: "#d2cbbf",
    roughness: 0.3,
    metalness: 0,
    textureScale: 0.28,
    clearcoat: 0.65,
    clearcoatRoughness: 0.08,
    normalScale: 0.6,
    envMapIntensity: 0.8,
  },
  white_marble: {
    color: "#efebe5",
    roughness: 0.08,
    metalness: 0,
    textureScale: 0.2,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    normalScale: 0.35,
    envMapIntensity: 1.15,
    reflective: true,
  },
  dark_oak: {
    color: "#4f3826",
    roughness: 0.38,
    metalness: 0,
    textureScale: 0.16,
    clearcoat: 0.55,
    clearcoatRoughness: 0.18,
    normalScale: 0.7,
    envMapIntensity: 0.7,
  },
  herringbone: {
    color: "#a17650",
    roughness: 0.36,
    metalness: 0,
    textureScale: 0.2,
    clearcoat: 0.55,
    clearcoatRoughness: 0.16,
    normalScale: 0.7,
    envMapIntensity: 0.7,
  },
  lawn: {
    color: "#3d5a24",
    roughness: 1,
    metalness: 0,
    textureScale: 0.5,
    clearcoat: 0,
    clearcoatRoughness: 1,
    normalScale: 1.2,
    envMapIntensity: 0.1,
  },
};

export type WallFinishAppearance = {
  color: string;
  roughness: number;
  normalScale: number;
  /** Painted baseboard / crown colour, or null to skip that trim. */
  baseboard: string | null;
  crown: string | null;
  /** Chair-rail height in inches (wainscot cap), when the finish has one. */
  chairRail?: number;
  /** Colour of wall tops / caps in low and cutaway modes. */
  cap: string;
  /** Door leaf / casing tone for this venue style. */
  door: string;
  casing: string;
  sheen?: number;
};

export const WALL_FINISHES: Record<StudioWallFinish, WallFinishAppearance> = {
  warm_ivory: {
    color: "#e8e0d2",
    roughness: 0.9,
    normalScale: 0.5,
    baseboard: "#f4efe6",
    crown: "#f6f1e8",
    cap: "#efe8dc",
    door: "#4a3122",
    casing: "#f4efe6",
  },
  soft_grey: {
    color: "#b8b8b5",
    roughness: 0.92,
    normalScale: 0.5,
    baseboard: "#ecebe7",
    crown: "#efeeea",
    cap: "#d9d8d4",
    door: "#3a3633",
    casing: "#ecebe7",
  },
  black_box: {
    color: "#242321",
    roughness: 0.86,
    normalScale: 0.4,
    baseboard: "#151413",
    crown: null,
    cap: "#2b2927",
    door: "#121212",
    casing: "#1a1918",
  },
  neutral_beige: {
    color: "#c9bcaa",
    roughness: 0.92,
    normalScale: 0.5,
    baseboard: "#f1ebe0",
    crown: "#f3ede3",
    cap: "#e2d9cb",
    door: "#5a3c28",
    casing: "#f1ebe0",
  },
  white_plaster: {
    color: "#f1eee8",
    roughness: 0.95,
    normalScale: 0.8,
    baseboard: "#f7f4ee",
    crown: "#f9f6f0",
    cap: "#f1ede6",
    door: "#3d2a1d",
    casing: "#f7f4ee",
  },
  exposed_brick: {
    color: "#8a4d3a",
    roughness: 0.95,
    normalScale: 1,
    baseboard: null,
    crown: null,
    cap: "#6d625a",
    door: "#2a2622",
    casing: "#2f2a26",
  },
  wood_panel: {
    color: "#6b4a32",
    roughness: 0.7,
    normalScale: 0.8,
    baseboard: "#4a3222",
    crown: "#523826",
    chairRail: 40,
    cap: "#5a3d29",
    door: "#3b2618",
    casing: "#4f3524",
  },
  tent_canvas: {
    color: "#f3f0e8",
    roughness: 0.9,
    normalScale: 0.6,
    baseboard: null,
    crown: null,
    cap: "#e6dfd0",
    door: "#e9e2d2",
    casing: "#d8cfbd",
    sheen: 0.4,
  },
};
