import type { StudioLightingMood } from "@/data/studio";

/**
 * A complete lighting rig for one mood. Intensities are physical (three's
 * default since r155): directional lights in lux-like units, the scene is in
 * feet, and exposure is applied by ACES tone mapping.
 */
export type StudioLightingRig = {
  exposure: number;
  key: {
    color: string;
    intensity: number;
    /** Degrees above the horizon. */
    elevation: number;
    /** Degrees, clockwise from +Z when seen from above. */
    azimuth: number;
    /** 0–1 darkness of cast shadows. */
    shadowIntensity: number;
  };
  fill: { color: string; intensity: number };
  hemisphere: { sky: string; ground: string; intensity: number };
  ambient: { color: string; intensity: number };
  environment: {
    intensity: number;
    /** Tint of the reflected "room" shell. */
    room: string;
    /** Tint of the overhead softboxes. */
    key: string;
    /** Tint of the side softboxes (coloured accents in reflections). */
    accent: string;
    /** Tint of the rear softboxes. */
    accentAlt: string;
  };
  background: {
    dark: { center: string; edge: string };
    light: { center: string; edge: string };
  };
  /** 0–1 atmospheric haze; drives fog distance. */
  haze: number;
  bloom: { strength: number; radius: number; threshold: number };
  /** Multiplier for uplight spots, washes and fixture lenses. */
  uplightBoost: number;
  /** Multiplier for chandelier lights and glows. */
  practicalBoost: number;
  /** Warm white blended into chandelier light colours (0 = pure lightColor). */
  practicalWarmth: string;
  /** Tuning when the camera stands inside the room at eye level. */
  interior: {
    exposure: number;
    /** Depth-fade colour toward the far walls (never a grey haze). */
    fog: string;
    /** 0–1; how strongly far walls fall off into `fog`. */
    falloff: number;
    /** Multiplier for the hemisphere fill (bounce off floor and drapes). */
    fill: number;
  };
};

export const LIGHTING_MOODS: Record<StudioLightingMood, StudioLightingRig> = {
  neutral: {
    exposure: 1,
    key: {
      color: "#fff3e2",
      intensity: 2.3,
      elevation: 62,
      azimuth: 38,
      shadowIntensity: 0.82,
    },
    fill: { color: "#dfe8f2", intensity: 0.45 },
    hemisphere: { sky: "#fbf6ee", ground: "#6f6a62", intensity: 0.55 },
    ambient: { color: "#f2eee6", intensity: 0.1 },
    environment: {
      intensity: 0.55,
      room: "#8a8580",
      key: "#ffffff",
      accent: "#f6f1e8",
      accentAlt: "#e8eef8",
    },
    background: {
      dark: { center: "#2b2825", edge: "#0e0d0c" },
      light: { center: "#f3f0ea", edge: "#cfc9bf" },
    },
    haze: 0.2,
    bloom: { strength: 0.32, radius: 0.55, threshold: 1 },
    uplightBoost: 1,
    practicalBoost: 1,
    practicalWarmth: "#ffe2b8",
    interior: { exposure: 1.06, fog: "#1c1915", falloff: 0.3, fill: 1.2 },
  },
  warm_gala: {
    exposure: 1.02,
    key: {
      color: "#ffd29a",
      intensity: 2.1,
      elevation: 58,
      azimuth: 34,
      shadowIntensity: 0.86,
    },
    fill: { color: "#b9c6dc", intensity: 0.26 },
    hemisphere: { sky: "#ffdcab", ground: "#3d2b1c", intensity: 0.46 },
    ambient: { color: "#ffd9a8", intensity: 0.07 },
    environment: {
      intensity: 0.5,
      room: "#6b5440",
      key: "#ffd49a",
      accent: "#ffb066",
      accentAlt: "#ffcf94",
    },
    background: {
      dark: { center: "#3b2716", edge: "#0c0806" },
      light: { center: "#f0e3cf", edge: "#c6b294" },
    },
    haze: 0.35,
    bloom: { strength: 0.48, radius: 0.62, threshold: 0.95 },
    uplightBoost: 1.25,
    practicalBoost: 1.15,
    practicalWarmth: "#ffcf8f",
    interior: { exposure: 1.1, fog: "#22150b", falloff: 0.42, fill: 1.3 },
  },
  candlelight: {
    exposure: 0.98,
    key: {
      color: "#ffaa62",
      intensity: 0.95,
      elevation: 54,
      azimuth: 28,
      shadowIntensity: 0.9,
    },
    fill: { color: "#ff8a3a", intensity: 0.2 },
    hemisphere: { sky: "#ffbd78", ground: "#1d1209", intensity: 0.26 },
    ambient: { color: "#ffae6e", intensity: 0.04 },
    environment: {
      intensity: 0.26,
      room: "#3d2a1b",
      key: "#ffa95a",
      accent: "#ff8433",
      accentAlt: "#ffb877",
    },
    background: {
      dark: { center: "#2e1808", edge: "#060302" },
      light: { center: "#3f2814", edge: "#120b05" },
    },
    haze: 0.55,
    bloom: { strength: 0.72, radius: 0.72, threshold: 0.84 },
    uplightBoost: 1.6,
    practicalBoost: 1.6,
    practicalWarmth: "#ffab52",
    interior: { exposure: 1.14, fog: "#1a0d05", falloff: 0.52, fill: 1.45 },
  },
  twilight_blue: {
    exposure: 1,
    key: {
      color: "#b6c4ff",
      intensity: 1.45,
      elevation: 56,
      azimuth: 42,
      shadowIntensity: 0.85,
    },
    fill: { color: "#a46bff", intensity: 0.42 },
    hemisphere: { sky: "#8796ff", ground: "#1a1430", intensity: 0.38 },
    ambient: { color: "#9aa6ff", intensity: 0.06 },
    environment: {
      intensity: 0.42,
      room: "#2a2c4a",
      key: "#aab8ff",
      accent: "#b07cff",
      accentAlt: "#5f86ff",
    },
    background: {
      dark: { center: "#1f1b42", edge: "#04050e" },
      light: { center: "#2d2f58", edge: "#0d0f22" },
    },
    haze: 0.42,
    bloom: { strength: 0.58, radius: 0.66, threshold: 0.9 },
    uplightBoost: 1.5,
    practicalBoost: 1.3,
    practicalWarmth: "#e9e4ff",
    interior: { exposure: 1.1, fog: "#0f0e22", falloff: 0.46, fill: 1.35 },
  },
  daylight: {
    exposure: 1.04,
    key: {
      color: "#fff8ec",
      intensity: 3.1,
      elevation: 64,
      azimuth: 48,
      shadowIntensity: 0.78,
    },
    fill: { color: "#dceaff", intensity: 0.75 },
    hemisphere: { sky: "#dcecff", ground: "#b0a898", intensity: 0.8 },
    ambient: { color: "#ffffff", intensity: 0.14 },
    environment: {
      intensity: 0.85,
      room: "#b8b8b8",
      key: "#ffffff",
      accent: "#eef4ff",
      accentAlt: "#fff8ee",
    },
    background: {
      dark: { center: "#2f343a", edge: "#111316" },
      light: { center: "#f6f9fc", edge: "#d3dae2" },
    },
    haze: 0.12,
    bloom: { strength: 0.18, radius: 0.4, threshold: 1.25 },
    uplightBoost: 0.6,
    practicalBoost: 0.7,
    practicalWarmth: "#fff1dc",
    interior: { exposure: 1.06, fog: "#3b3730", falloff: 0.1, fill: 1.1 },
  },
  dark_venue: {
    exposure: 0.94,
    key: {
      color: "#f0c088",
      intensity: 0.72,
      elevation: 60,
      azimuth: 30,
      shadowIntensity: 0.92,
    },
    fill: { color: "#5c7090", intensity: 0.2 },
    hemisphere: { sky: "#8e7f69", ground: "#120f0c", intensity: 0.22 },
    ambient: { color: "#8a7c68", intensity: 0.03 },
    environment: {
      intensity: 0.24,
      room: "#2a2420",
      key: "#f2c48a",
      accent: "#7088b0",
      accentAlt: "#c79a62",
    },
    background: {
      dark: { center: "#1d1714", edge: "#030202" },
      light: { center: "#26201b", edge: "#090706" },
    },
    haze: 0.48,
    bloom: { strength: 0.5, radius: 0.7, threshold: 0.86 },
    uplightBoost: 1.75,
    practicalBoost: 1.45,
    practicalWarmth: "#ffc782",
    interior: { exposure: 1.18, fog: "#0e0907", falloff: 0.5, fill: 1.55 },
  },
  bright_setup: {
    exposure: 1.06,
    key: {
      color: "#ffffff",
      intensity: 2.9,
      elevation: 72,
      azimuth: 40,
      shadowIntensity: 0.7,
    },
    fill: { color: "#f2f6ff", intensity: 0.85 },
    hemisphere: { sky: "#ffffff", ground: "#a9a6a0", intensity: 0.95 },
    ambient: { color: "#ffffff", intensity: 0.2 },
    environment: {
      intensity: 0.9,
      room: "#c8c6c2",
      key: "#ffffff",
      accent: "#ffffff",
      accentAlt: "#f4f6fa",
    },
    background: {
      dark: { center: "#2a2a2e", edge: "#141416" },
      light: { center: "#f4f3f0", edge: "#d6d4ce" },
    },
    haze: 0.08,
    bloom: { strength: 0.14, radius: 0.4, threshold: 1.35 },
    uplightBoost: 0.5,
    practicalBoost: 0.6,
    practicalWarmth: "#fff6ea",
    interior: { exposure: 1.05, fog: "#3d3a35", falloff: 0.08, fill: 1.1 },
  },
};

export const STUDIO_LIGHTING_MOOD_LABELS: Record<StudioLightingMood, string> = {
  neutral: "Neutral",
  warm_gala: "Warm gala",
  candlelight: "Candlelight",
  twilight_blue: "Twilight blue",
  daylight: "Daylight",
  dark_venue: "Dark venue",
  bright_setup: "Bright setup",
};
