import type {
  DanceFloorFinish,
  DrapeColor,
  DrapeFabric,
  StudioChairStyle,
  StudioLightingMood,
  StudioOpeningStyle,
} from "@/data/studio";
import type { EventLayoutId } from "@/data/event-builder/brief";
import {
  STUDIO_LAYOUTS,
  type StudioLayoutKey,
} from "@/components/studio/library/studio-layout-generators";

export const EVENT_FABRIC_IDS: readonly DrapeFabric[] = [
  "velvet",
  "velour",
  "poly",
  "satin",
  "sheer",
  "chiffon",
  "sequin",
];

/** CSS used to hint each fabric's texture on its tile. */
export const EVENT_FABRIC_TEXTURES: Record<DrapeFabric, string> = {
  velvet:
    "repeating-linear-gradient(90deg, rgba(0,0,0,0.38) 0 6px, rgba(255,255,255,0.05) 6px 13px)",
  velour:
    "repeating-linear-gradient(90deg, rgba(0,0,0,0.3) 0 8px, rgba(255,255,255,0.06) 8px 16px)",
  poly: "repeating-linear-gradient(90deg, rgba(0,0,0,0.18) 0 10px, rgba(255,255,255,0.08) 10px 20px)",
  satin:
    "linear-gradient(115deg, rgba(255,255,255,0.32), transparent 35%, rgba(255,255,255,0.18) 60%, transparent), repeating-linear-gradient(90deg, rgba(0,0,0,0.15) 0 9px, transparent 9px 18px)",
  sheer:
    "repeating-linear-gradient(90deg, rgba(255,255,255,0.18) 0 4px, transparent 4px 11px)",
  chiffon:
    "repeating-linear-gradient(80deg, rgba(255,255,255,0.2) 0 5px, transparent 5px 12px)",
  sequin:
    "radial-gradient(circle, rgba(255,255,255,0.55) 1px, transparent 1.5px) 0 0 / 7px 7px, repeating-linear-gradient(90deg, rgba(0,0,0,0.2) 0 8px, transparent 8px 16px)",
};

export const EVENT_LIGHTING_IDS: readonly StudioLightingMood[] = [
  "warm_gala",
  "candlelight",
  "neutral",
  "twilight_blue",
  "dark_venue",
  "daylight",
  "bright_setup",
];

export const EVENT_LIGHTING_SWATCHES: Record<StudioLightingMood, string> = {
  neutral: "radial-gradient(circle at 50% 20%, #f2ece0 0%, #6f6a62 55%, #1c1a17 100%)",
  warm_gala: "radial-gradient(circle at 50% 20%, #ffd38a 0%, #9c6324 50%, #1d1208 100%)",
  dark_venue: "radial-gradient(circle at 50% 30%, #5c4a8c 0%, #1b1530 55%, #050408 100%)",
  bright_setup: "radial-gradient(circle at 50% 20%, #ffffff 0%, #d6d3cc 50%, #6d6a64 100%)",
  candlelight: "radial-gradient(circle at 50% 70%, #ffb14d 0%, #7a3c0f 45%, #140904 100%)",
  twilight_blue: "radial-gradient(circle at 50% 20%, #9fb7ff 0%, #2b3a75 50%, #0a0e1f 100%)",
  daylight: "radial-gradient(circle at 50% 10%, #fffbe9 0%, #c9d6dd 50%, #5b6a70 100%)",
};

export const EVENT_COLOR_PICKS: readonly DrapeColor[] = [
  "ivory",
  "white",
  "champagne",
  "gold",
  "blush",
  "rose_gold",
  "sage",
  "dusty_blue",
  "navy",
  "emerald",
  "burgundy",
  "plum",
  "charcoal",
  "black",
  "silver",
  "taupe",
];

export const EVENT_UPLIGHT_PICKS: readonly DrapeColor[] = [
  "gold",
  "champagne",
  "blush",
  "lavender",
  "royal_blue",
  "red",
  "emerald",
  "white",
];

export const EVENT_CHAIR_PICKS: readonly StudioChairStyle[] = [
  "chiavari_gold",
  "chiavari_silver",
  "chiavari_white",
  "ghost",
  "cross_back",
  "banquet",
  "folding_white",
];

export const EVENT_LINEN_PICKS: readonly DrapeColor[] = [
  "ivory",
  "white",
  "champagne",
  "gold",
  "blush",
  "sage",
  "navy",
  "black",
];

export const EVENT_DANCE_FLOOR_PICKS: readonly DanceFloorFinish[] = [
  "white_gloss",
  "black_gloss",
  "checkerboard",
  "warm_parquet",
];

export const EVENT_OPENING_QUICK_ADD: readonly StudioOpeningStyle[] = [
  "double_door",
  "single_door",
  "grand_entrance",
  "glass_slider",
  "standard_window",
  "picture_window",
  "floor_to_ceiling",
  "arched_window",
];

export const EVENT_LAYOUT_OPTIONS: ReadonlyArray<{
  id: EventLayoutId;
  label: string;
  description: string;
}> = [
  ...STUDIO_LAYOUTS.map((layout) => ({
    id: layout.key as EventLayoutId,
    label: layout.label,
    description: layout.description,
  })),
  { id: "none", label: "No furniture", description: "Draping only — plan tables later" },
];

/** Guests each primary layout item serves. */
const GUESTS_PER_ITEM: Record<StudioLayoutKey, number> = {
  banquet_grid: 8,
  banquet_rows: 8,
  classroom: 3,
  ceremony: 1,
  cocktail: 8,
  gala: 1,
};

/** Generator `count` for a guest list, clamped to the layout's range. */
export function layoutCountForGuests(key: StudioLayoutKey, guests: number): number {
  const config = STUDIO_LAYOUTS.find((layout) => layout.key === key) ?? STUDIO_LAYOUTS[0];
  const raw = Math.ceil(Math.max(1, guests) / GUESTS_PER_ITEM[key]);
  const stepped = Math.round(raw / config.count.step) * config.count.step;
  return Math.min(config.count.max, Math.max(config.count.min, stepped));
}

export function layoutDefaultSpacing(key: StudioLayoutKey): number {
  return (STUDIO_LAYOUTS.find((layout) => layout.key === key) ?? STUDIO_LAYOUTS[0]).spacing
    .default;
}

export function isStudioLayoutKey(id: EventLayoutId): id is StudioLayoutKey {
  return id !== "none";
}
