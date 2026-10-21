import type { StudioLightingMood } from "@/data/studio";

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
  candlelight: {
    ambientColor: "#ffcf96",
    ambientIntensity: 0.22,
    hemisphereSky: "#ffcf96",
    hemisphereGround: "#2a1d12",
    hemisphereIntensity: 0.3,
    keyColor: "#ffb867",
    keyIntensity: 1.2,
    fillColor: "#ff9d4d",
    fillIntensity: 0.3,
    exposure: 0.92,
    backgroundDark: "#120c07",
    backgroundLight: "#1d150e",
  },
  twilight_blue: {
    ambientColor: "#9fb4ff",
    ambientIntensity: 0.26,
    hemisphereSky: "#8aa0ff",
    hemisphereGround: "#15182a",
    hemisphereIntensity: 0.36,
    keyColor: "#c6d2ff",
    keyIntensity: 1.3,
    fillColor: "#b07cff",
    fillIntensity: 0.34,
    exposure: 0.95,
    backgroundDark: "#0b0e1a",
    backgroundLight: "#1a1f33",
  },
  daylight: {
    ambientColor: "#ffffff",
    ambientIntensity: 0.6,
    hemisphereSky: "#dcecff",
    hemisphereGround: "#b3ab9c",
    hemisphereIntensity: 0.75,
    keyColor: "#fffaf0",
    keyIntensity: 2.2,
    fillColor: "#e3eeff",
    fillIntensity: 0.5,
    exposure: 1.1,
    backgroundDark: "#23262a",
    backgroundLight: "#eef1f4",
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
