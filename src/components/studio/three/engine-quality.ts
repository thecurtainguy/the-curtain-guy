import type { StudioQuality } from "../editor/studio-editor-context";

/** Fabric tessellation profile (see three/fabric/geometry.ts quality profiles). */
export type StudioFabricProfile = "draft" | "high" | "ultra";

export type StudioQualityPreset = {
  label: string;
  description: string;
  /** DPR cap as [min, max]; the effective DPR is further limited by `pixelBudget`. */
  dpr: number | [number, number];
  /** Max render pixels (megapixels, canvas CSS px × DPR²) so big screens don't explode GPU memory. */
  pixelBudget: number;
  /** WebGL context MSAA. Only worth it when no composer runs (otherwise SMAA does AA). */
  contextAntialias: boolean;
  powerPreference: WebGLPowerPreference;
  shadows: boolean;
  shadowMapSize: number;
  /** Shadow map size used for snapshots/stills (may exceed the interactive size). */
  snapshotShadowMapSize: number;
  /** PCF soft-shadow kernel radius (texels). */
  shadowRadius: number;
  ao: null | {
    samples: number;
    /** Fraction of the canvas resolution the AO buffers render at. */
    resolutionScale: number;
    denoiseSamples: number;
  };
  /** AO is skipped while orbiting/dragging and refined once the view settles. */
  aoIdleOnly: boolean;
  bloom: boolean;
  smaa: boolean;
  /** MSAA samples on the composer buffers (0 = off). */
  msaaSamples: number;
  /** Floor reflections: off, or rendered only on settled (idle) frames. */
  reflector: "off" | "idle";
  reflectorResolution: number;
  /** Procedural venue (floor/wall) texture edge, px. */
  textureSize: number;
  /** Procedural ceiling texture edge, px. */
  ceilingTextureSize: number;
  anisotropy: number;
  /** Real (shadowless) SpotLights for uplighting; the rest fall back to washes. Includes the ceiling share. */
  spotBudget: number;
  /** Real PointLights for chandeliers; the rest are glow-only. Includes the ceiling share. */
  pointBudget: number;
  /** Portion of spot/point budgets reserved for ceiling designs (scene rig gets the remainder). */
  ceilingSpotBudget: number;
  ceilingPointBudget: number;
  /** 1 = key only (fill/bounce folded into the hemisphere); 3 = key + fill + interior bounce. */
  directionalLights: 1 | 3;
  fabricProfile: StudioFabricProfile;
  /** Cheap MeshStandardMaterial fabric instead of sheen/clearcoat physical. */
  fabricStandardMaterial: boolean;
  /** Total ceiling string-light sparkle points across all designs. */
  sparkleCap: number;
  /** Animated twinkle (shared low-fps clock). */
  twinkle: boolean;
};

export const STUDIO_QUALITY_PRESETS: Record<StudioQuality, StudioQualityPreset> =
  {
    draft: {
      label: "Draft",
      description: "Fast preview",
      dpr: 1,
      pixelBudget: 1.0,
      contextAntialias: true,
      powerPreference: "default",
      shadows: true,
      shadowMapSize: 1024,
      snapshotShadowMapSize: 1024,
      shadowRadius: 1,
      ao: null,
      aoIdleOnly: true,
      bloom: false,
      smaa: false,
      msaaSamples: 0,
      reflector: "off",
      reflectorResolution: 256,
      textureSize: 512,
      ceilingTextureSize: 256,
      anisotropy: 2,
      spotBudget: 2,
      pointBudget: 0,
      ceilingSpotBudget: 0,
      ceilingPointBudget: 0,
      directionalLights: 1,
      fabricProfile: "draft",
      fabricStandardMaterial: true,
      sparkleCap: 2500,
      twinkle: false,
    },
    high: {
      label: "High",
      description: "AO + glow",
      dpr: [1, 1.5],
      pixelBudget: 2.2,
      contextAntialias: false,
      powerPreference: "default",
      shadows: true,
      shadowMapSize: 2048,
      snapshotShadowMapSize: 2048,
      shadowRadius: 3,
      ao: { samples: 12, resolutionScale: 0.5, denoiseSamples: 6 },
      aoIdleOnly: true,
      bloom: true,
      smaa: true,
      msaaSamples: 0,
      reflector: "off",
      reflectorResolution: 512,
      textureSize: 1024,
      ceilingTextureSize: 512,
      anisotropy: 8,
      spotBudget: 8,
      pointBudget: 4,
      ceilingSpotBudget: 2,
      ceilingPointBudget: 2,
      directionalLights: 3,
      fabricProfile: "high",
      fabricStandardMaterial: false,
      sparkleCap: 6000,
      twinkle: false,
    },
    ultra: {
      label: "Ultra",
      description: "Print / stills",
      dpr: [1, 2],
      pixelBudget: 4.5,
      contextAntialias: false,
      powerPreference: "high-performance",
      shadows: true,
      shadowMapSize: 2048,
      snapshotShadowMapSize: 4096,
      shadowRadius: 4,
      ao: { samples: 16, resolutionScale: 0.75, denoiseSamples: 8 },
      aoIdleOnly: true,
      bloom: true,
      smaa: true,
      msaaSamples: 0,
      reflector: "idle",
      reflectorResolution: 512,
      textureSize: 2048,
      ceilingTextureSize: 1024,
      anisotropy: 16,
      spotBudget: 16,
      pointBudget: 10,
      ceilingSpotBudget: 4,
      ceilingPointBudget: 4,
      directionalLights: 3,
      fabricProfile: "ultra",
      fabricStandardMaterial: false,
      sparkleCap: 16000,
      twinkle: true,
    },
  };

export function getStudioQualityPreset(
  quality: StudioQuality | undefined
): StudioQualityPreset {
  return STUDIO_QUALITY_PRESETS[quality ?? "high"] ?? STUDIO_QUALITY_PRESETS.high;
}

/** True when the preset renders through the EffectComposer (AA comes from SMAA there). */
export function usesStudioComposer(preset: StudioQualityPreset) {
  return Boolean(preset.ao || preset.bloom || preset.smaa);
}

/** Lowest DPR the budget or governor may push the canvas to. */
export const STUDIO_MIN_DPR = 0.75;
/* Snap to 1/20ths so live resizes don't reallocate targets for imperceptible changes. */
const DPR_STEP = 0.05;

/**
 * Effective device pixel ratio: the preset cap, the screen's own DPR and the
 * preset's pixel budget (megapixels of drawing buffer), whichever is lowest,
 * times the governor scale. Keeps GPU memory flat on 4K / ultrawide screens.
 */
export function computeStudioDpr(
  preset: StudioQualityPreset,
  cssWidth: number,
  cssHeight: number,
  deviceDpr: number,
  scale = 1
) {
  const presetMax = Array.isArray(preset.dpr) ? preset.dpr[1] : preset.dpr;
  const area = Math.max(1, cssWidth * cssHeight);
  const budget = Math.sqrt((preset.pixelBudget * 1e6) / area);
  const raw = Math.min(presetMax, deviceDpr || 1, budget) * scale;
  const snapped = Math.floor(raw / DPR_STEP) * DPR_STEP;
  return Math.max(STUDIO_MIN_DPR, Number(snapped.toFixed(2)));
}
