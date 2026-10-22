import {
  CEILING_DRAPE_STYLES,
  STUDIO_OBJECT_CATEGORIES,
  getDrapeColorHex,
  type CeilingDrapeStyle,
  getStudioObjectOption,
  type DanceFloorFinish,
  type DrapeFabric,
  type GenericStudioObjectFinish,
  type StudioChairStyle,
  type StudioObjectType,
  type StudioOpening,
  type StudioOpeningType,
} from "@/data/studio";
import { getOpeningStylePreset } from "@/data/studio-openings";
import type { StudioItemKind } from "@/lib/studio-commands";
import {
  AppWindow,
  Armchair,
  Box,
  Cake,
  Circle,
  Columns3,
  Disc3,
  DoorClosed,
  DoorOpen,
  Flower2,
  Grid2X2,
  LampCeiling,
  Lightbulb,
  Martini,
  Mic,
  Music2,
  PanelsTopLeft,
  Piano,
  Presentation,
  Projector,
  RectangleHorizontal,
  ScissorsLineDashed,
  Sofa,
  Sparkles,
  Table2,
  Theater,
  UtensilsCrossed,
  Warehouse,
  Waves,
  type LucideIcon,
} from "lucide-react";

export const STUDIO_OBJECT_ICONS: Record<StudioObjectType, LucideIcon> = {
  stage: Warehouse,
  dance_floor: Disc3,
  entrance_marker: DoorOpen,
  round_table: Circle,
  rectangle_table: Table2,
  cocktail_table: Martini,
  table_area: Grid2X2,
  dj_booth: Music2,
  bar: AppWindow,
  lounge_area: Sofa,
  sweetheart_table: RectangleHorizontal,
  head_table: Presentation,
  buffet_table: UtensilsCrossed,
  cake_table: Cake,
  ceremony_seating: Armchair,
  chair: Armchair,
  sofa: Sofa,
  photo_booth: Theater,
  plant: Flower2,
  column: Columns3,
  uplight: Lightbulb,
  chandelier: LampCeiling,
  piano: Piano,
  podium: Mic,
  av_screen: Projector,
  drape_backdrop: PanelsTopLeft,
  ceiling_drape: Waves,
};

export const STUDIO_KIND_ICONS: Record<StudioItemKind, LucideIcon> = {
  object: Box,
  drape: ScissorsLineDashed,
  treatment: Sparkles,
  opening: DoorOpen,
  ceiling: LampCeiling,
};

export const STUDIO_KIND_LABELS: Record<StudioItemKind, string> = {
  object: "Room object",
  drape: "Drape run",
  treatment: "Drape treatment",
  opening: "Opening",
  ceiling: "Ceiling design",
};

export const STUDIO_OPENING_META: Record<
  StudioOpeningType,
  { label: string; description: string; icon: LucideIcon }
> = {
  door: { label: "Door", description: "Hinged doorway", icon: DoorClosed },
  entrance: { label: "Entrance", description: "Open guest arrival", icon: DoorOpen },
  window: { label: "Window", description: "Raised glazing", icon: AppWindow },
};

/** Style-level label and size line, e.g. "Grand arched" / "8′ × 10′ · arched head". */
export function getOpeningDisplay(
  opening: Pick<StudioOpening, "type" | "style">
): { label: string; description: string } {
  const preset = getOpeningStylePreset(opening);
  return { label: preset.label, description: preset.description };
}

export function getCeilingStyleLabel(style: CeilingDrapeStyle): string {
  return CEILING_DRAPE_STYLES.find((option) => option.value === style)?.label ?? style;
}

export function getObjectTypeLabel(type: StudioObjectType): string {
  return getStudioObjectOption(type)?.label ?? type.replaceAll("_", " ");
}

export function getObjectCategoryLabel(type: StudioObjectType): string {
  const category = getStudioObjectOption(type)?.category;
  return (
    STUDIO_OBJECT_CATEGORIES.find((item) => item.value === category)?.label ??
    "Objects"
  );
}

export const CHAIR_STYLE_SWATCHES: Record<StudioChairStyle, string> = {
  chiavari_gold: "linear-gradient(135deg,#f1d38a,#b98b3d 55%,#7a5a22)",
  chiavari_silver: "linear-gradient(135deg,#f2f3f5,#b9bbbd 55%,#7d8084)",
  chiavari_white: "linear-gradient(135deg,#ffffff,#e9e5dc)",
  ghost:
    "linear-gradient(135deg,rgba(255,255,255,0.45),rgba(255,255,255,0.08) 60%,rgba(255,255,255,0.3))",
  cross_back: "linear-gradient(135deg,#a8774a,#6b4528)",
  folding_white: "linear-gradient(135deg,#fafafa,#d9d9d9)",
  banquet: "linear-gradient(135deg,#5a1f2b,#2c0f15)",
  none: "repeating-linear-gradient(135deg,transparent 0 5px,rgba(160,160,160,0.35) 5px 6px)",
};

export const GENERIC_FINISH_SWATCHES: Record<GenericStudioObjectFinish, string> = {
  natural_wood: "linear-gradient(135deg,#c08a55,#8a5a2f)",
  painted_white: "linear-gradient(135deg,#ffffff,#e6e2d9)",
  painted_black: "linear-gradient(135deg,#3a3a3a,#0d0d0d)",
  metal: "linear-gradient(135deg,#e3e6ea,#8d9399 50%,#c9ced3)",
  upholstered: "linear-gradient(135deg,#8a7866,#5b4c3e)",
  gold: "linear-gradient(135deg,#f6dc8f,#c49b3c 50%,#8a6522)",
  acrylic:
    "linear-gradient(135deg,rgba(255,255,255,0.55),rgba(190,220,255,0.15) 60%,rgba(255,255,255,0.4))",
  marble:
    "linear-gradient(120deg,#f6f4ef 0%,#e5e1d8 40%,#cfcac0 42%,#f3f0ea 46%,#ece8e0 100%)",
  custom: "conic-gradient(from 180deg,#c9ab78,#5a1f2b,#1d2a44,#9caf88,#c9ab78)",
};

export const DANCE_FLOOR_SWATCHES: Record<DanceFloorFinish, string> = {
  white_gloss: "linear-gradient(135deg,#ffffff,#e7e7e7 60%,#ffffff)",
  black_gloss: "linear-gradient(135deg,#2c2c2c,#050505 60%,#262626)",
  checkerboard: "repeating-conic-gradient(#111 0 25%,#f5f5f5 0 50%) 0 0/50% 50%",
  warm_parquet:
    "repeating-linear-gradient(45deg,#a8733f 0 4px,#8b5a2b 4px 8px)",
  oak: "repeating-linear-gradient(90deg,#c69a62 0 6px,#b4874f 6px 7px)",
  dark_wood: "repeating-linear-gradient(90deg,#4d311d 0 6px,#3a2414 6px 7px)",
  neutral_event_carpet: "linear-gradient(135deg,#8f857a,#6f665c)",
  led_starlit:
    "radial-gradient(circle at 25% 30%,#fff 0 1px,transparent 2px),radial-gradient(circle at 70% 60%,#ffe9a8 0 1px,transparent 2px),radial-gradient(circle at 45% 80%,#fff 0 1px,transparent 2px),#0b0d1a",
  custom_wrap_monogram:
    "radial-gradient(circle,#c9ab78 0 30%,transparent 32%),linear-gradient(135deg,#1d1a17,#3a2f22)",
};

export const FABRIC_DESCRIPTIONS: Record<DrapeFabric, string> = {
  velvet: "Deep, rich pile",
  velour: "Soft matte drape",
  poly: "Everyday premier",
  sheer: "Light filtering",
  satin: "Liquid sheen",
  chiffon: "Airy, flowing",
  sequin: "Full sparkle",
};

/** Sample of a fabric rendered in a drape colour. */
export function fabricSwatch(fabric: DrapeFabric, color: string): string {
  const hex = getDrapeColorHex(color);
  switch (fabric) {
    case "velvet":
      return `linear-gradient(90deg, color-mix(in oklch, ${hex} 70%, black) 0%, ${hex} 30%, color-mix(in oklch, ${hex} 70%, black) 55%, ${hex} 80%)`;
    case "satin":
      return `linear-gradient(110deg, ${hex} 20%, color-mix(in oklch, ${hex} 45%, white) 45%, ${hex} 70%)`;
    case "sheer":
    case "chiffon":
      return `repeating-linear-gradient(90deg, color-mix(in oklch, ${hex} 55%, transparent) 0 4px, color-mix(in oklch, ${hex} 25%, transparent) 4px 8px)`;
    case "sequin":
      return `radial-gradient(circle at 30% 30%, color-mix(in oklch, ${hex} 30%, white) 0 1.5px, transparent 2px) 0 0/5px 5px, ${hex}`;
    default:
      return `repeating-linear-gradient(90deg, ${hex} 0 5px, color-mix(in oklch, ${hex} 82%, black) 5px 8px)`;
  }
}
