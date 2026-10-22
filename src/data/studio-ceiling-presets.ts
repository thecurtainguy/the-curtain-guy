import type { CeilingDrapeStyle, StudioCeilingDrape } from "@/data/studio";

/**
 * Signature ceiling looks for the Studio library. `overrides` sit on top of
 * `createCeilingDrape(style, floor)`; row styles leave `count` alone so the
 * row count scales with the room.
 */
export type StudioCeilingPreset = {
  id: string;
  label: string;
  description: string;
  style: CeilingDrapeStyle;
  overrides: Partial<Omit<StudioCeilingDrape, "id" | "type">>;
};

export const STUDIO_CEILING_PRESETS: StudioCeilingPreset[] = [
  {
    id: "ballroom_starburst",
    label: "Ballroom starburst",
    description: "24 white chiffon panels around a crystal chandelier",
    style: "starburst",
    overrides: {
      label: "Ballroom starburst",
      fabric: "chiffon",
      color: "white",
      count: 24,
      panelWidth: 66,
      sag: 26,
      hubDecor: "chandelier",
      lights: "none",
    },
  },
  {
    id: "tuscan_tent",
    label: "Tuscan tent",
    description: "Ivory tented peak strung with bistro bulbs",
    style: "tent",
    overrides: {
      label: "Tuscan tent",
      fabric: "poly",
      color: "ivory",
      count: 28,
      edgeDrop: 30,
      hubDecor: "medallion",
      lights: "bistro",
      lightColor: "gold",
    },
  },
  {
    id: "starlit_sky",
    label: "Starlit sky",
    description: "Black velour panels pierced with starlight",
    style: "stretch_panels",
    overrides: {
      label: "Starlit sky",
      fabric: "velour",
      color: "black",
      sag: 2,
      edgeDrop: 6,
      inset: 0,
      lights: "starlight",
      lightColor: "white",
    },
  },
  {
    id: "garden_billows",
    label: "Garden billows",
    description: "Ivory chiffon clouds woven with fairy lights",
    style: "billow_rows",
    overrides: {
      label: "Garden billows",
      fabric: "chiffon",
      color: "ivory",
      scallops: 4,
      sag: 26,
      lights: "fairy",
      lightColor: "gold",
    },
  },
  {
    id: "gatsby_gold",
    label: "Gatsby gold",
    description: "Champagne satin criss-cross with gold accents",
    style: "crisscross",
    overrides: {
      label: "Gatsby gold",
      fabric: "satin",
      color: "champagne",
      accentColor: "gold",
      count: 4,
      uplightColor: "gold",
    },
  },
  {
    id: "romantic_cascades",
    label: "Romantic cascades",
    description: "Blush chiffon falls glowing with fairy lights",
    style: "cascades",
    overrides: {
      label: "Romantic cascades",
      fabric: "chiffon",
      color: "blush",
      count: 5,
      scallops: 3,
      sag: 48,
      lights: "fairy",
      lightColor: "ivory",
    },
  },
  {
    id: "midnight_canopy",
    label: "Midnight canopy",
    description: "Navy sheer web gathered at a chandelier",
    style: "canopy",
    overrides: {
      label: "Midnight canopy",
      fabric: "sheer",
      color: "navy",
      count: 24,
      hubDrop: 36,
      hubDecor: "chandelier",
      lights: "starlight",
      lightColor: "white",
    },
  },
  {
    id: "classic_perimeter",
    label: "Classic perimeter",
    description: "Burgundy velvet swags framing the ceiling",
    style: "perimeter_swag",
    overrides: {
      label: "Classic perimeter",
      fabric: "velvet",
      color: "burgundy",
      accentColor: null,
      panelWidth: 108,
      sag: 22,
      uplightColor: "champagne",
    },
  },
  {
    id: "two_tone_swags",
    label: "Two-tone swags",
    description: "White sheer rows alternating with gold",
    style: "swag_rows",
    overrides: {
      label: "Two-tone swags",
      fabric: "sheer",
      color: "white",
      accentColor: "gold",
      sag: 34,
      perimeterValance: true,
    },
  },
  {
    id: "sage_garden_canopy",
    label: "Sage garden canopy",
    description: "Sage chiffon canopy with a floral ring",
    style: "canopy",
    overrides: {
      label: "Sage garden canopy",
      fabric: "chiffon",
      color: "sage",
      count: 18,
      hubDrop: 36,
      hubDecor: "floral_ring",
      lights: "fairy",
      lightColor: "ivory",
    },
  },
  {
    id: "rose_starburst",
    label: "Rosé starburst",
    description: "Blush and ivory rays with a floral ring",
    style: "starburst",
    overrides: {
      label: "Rosé starburst",
      fabric: "chiffon",
      color: "blush",
      accentColor: "ivory",
      count: 18,
      sag: 26,
      hubDecor: "floral_ring",
      lights: "fairy",
      lightColor: "gold",
    },
  },
  {
    id: "gallery_wash",
    label: "Gallery wash",
    description: "Taut white bands under a royal-blue wash",
    style: "stretch_panels",
    overrides: {
      label: "Gallery wash",
      fabric: "poly",
      color: "white",
      sag: 3,
      uplightColor: "royal_blue",
    },
  },
];
