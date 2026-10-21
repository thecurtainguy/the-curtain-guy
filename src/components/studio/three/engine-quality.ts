import type { StudioQuality } from "../editor/studio-editor-context";

export type StudioQualityPreset = {
  label: string;
  description: string;
  dpr: number | [number, number];
  shadowMapSize: number;
  /** PCF soft-shadow kernel radius (texels). */
  shadowRadius: number;
  ao: null | {
    samples: number;
    /** Fraction of the canvas resolution the AO buffers render at. */
    resolutionScale: number;
    denoiseSamples: number;
  };
  bloom: boolean;
  smaa: boolean;
  /** MSAA samples on the composer buffers (0 = off). */
  msaaSamples: number;
  /** Real (shadowless) SpotLights for uplighting; the rest fall back to washes. */
  spotBudget: number;
  /** Real PointLights for chandeliers; the rest are glow-only. */
  pointBudget: number;
};

export const STUDIO_QUALITY_PRESETS: Record<StudioQuality, StudioQualityPreset> =
  {
    draft: {
      label: "Draft",
      description: "Fast preview",
      dpr: 1,
      shadowMapSize: 1024,
      shadowRadius: 2,
      ao: null,
      bloom: false,
      smaa: false,
      msaaSamples: 0,
      spotBudget: 4,
      pointBudget: 1,
    },
    high: {
      label: "High",
      description: "AO + glow",
      dpr: [1, 1.75],
      shadowMapSize: 2048,
      shadowRadius: 3,
      ao: { samples: 16, resolutionScale: 0.5, denoiseSamples: 8 },
      bloom: true,
      smaa: true,
      msaaSamples: 0,
      spotBudget: 10,
      pointBudget: 4,
    },
    ultra: {
      label: "Ultra",
      description: "Print-grade",
      dpr: [1, 2],
      shadowMapSize: 4096,
      shadowRadius: 4,
      ao: { samples: 24, resolutionScale: 1, denoiseSamples: 16 },
      bloom: true,
      smaa: true,
      msaaSamples: 4,
      spotBudget: 18,
      pointBudget: 8,
    },
  };

export function getStudioQualityPreset(
  quality: StudioQuality | undefined
): StudioQualityPreset {
  return STUDIO_QUALITY_PRESETS[quality ?? "high"] ?? STUDIO_QUALITY_PRESETS.high;
}
