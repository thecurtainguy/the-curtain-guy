import {
  createStudioItemId,
  type StudioDesignJson,
  type StudioOpening,
  type StudioOpeningStyle,
  type StudioOpeningType,
} from "./studio";

export type StudioOpeningPresetGroup = "doors" | "windows";

export type StudioOpeningPreset = {
  style: StudioOpeningStyle;
  type: StudioOpeningType;
  group: StudioOpeningPresetGroup;
  label: string;
  /** Short size/usage line for tiles, e.g. "36″ × 7′ · standard". */
  description: string;
  /** Inches. */
  width: number;
  /** Clear opening height in inches; `"fill"` = to the wall head (minus header). */
  height: number | "fill";
  /** Inches from floor to the bottom of the opening. */
  sill: number;
  arched?: boolean;
  glass?: boolean;
};

/** Header kept above a `"fill"` opening, inches. */
export const OPENING_FILL_HEADER = 12;

export const STUDIO_OPENING_PRESETS: readonly StudioOpeningPreset[] = [
  { style: "single_door", type: "door", group: "doors", label: "Single door", description: "36″ × 7′ · standard", width: 36, height: 84, sill: 0 },
  { style: "wide_door", type: "door", group: "doors", label: "Wide single", description: "42″ × 7′ · accessible", width: 42, height: 84, sill: 0 },
  { style: "double_door", type: "entrance", group: "doors", label: "Double doors", description: "6′ × 7′ · pair of 3′", width: 72, height: 84, sill: 0 },
  { style: "grand_entrance", type: "entrance", group: "doors", label: "Grand entrance", description: "8′ × 9′ · ballroom doors", width: 96, height: 108, sill: 0 },
  { style: "grand_arched", type: "entrance", group: "doors", label: "Grand arched", description: "8′ × 10′ · arched head", width: 96, height: 120, sill: 0, arched: true },
  { style: "glass_slider", type: "entrance", group: "doors", label: "Glass slider", description: "6′ × 7′ · patio / terrace", width: 72, height: 84, sill: 0, glass: true },
  { style: "service_door", type: "door", group: "doors", label: "Service door", description: "36″ × 7′ · kitchen / staff", width: 36, height: 84, sill: 0 },
  { style: "standard_window", type: "window", group: "windows", label: "Standard window", description: "3′ × 4′ · sill 3′", width: 36, height: 48, sill: 36 },
  { style: "picture_window", type: "window", group: "windows", label: "Picture window", description: "6′ × 4′ · sill 2′6″", width: 72, height: 48, sill: 30 },
  { style: "floor_to_ceiling", type: "window", group: "windows", label: "Floor-to-ceiling", description: "4′ wide · full height", width: 48, height: "fill", sill: 6, glass: true },
  { style: "transom", type: "window", group: "windows", label: "Transom", description: "5′ × 2′ · high clerestory", width: 60, height: 24, sill: 86 },
  { style: "arched_window", type: "window", group: "windows", label: "Arched window", description: "3′ × 6′ · arched head", width: 36, height: 72, sill: 30, arched: true },
];

const PRESET_BY_STYLE = new Map(
  STUDIO_OPENING_PRESETS.map((preset) => [preset.style, preset])
);

const DEFAULT_STYLE: Record<StudioOpeningType, StudioOpeningStyle> = {
  door: "single_door",
  entrance: "double_door",
  window: "standard_window",
};

/** Quick width picks (inches) shown in the inspector, per opening type. */
export const OPENING_QUICK_WIDTHS: Record<StudioOpeningType, readonly number[]> = {
  door: [32, 36, 42, 48],
  entrance: [60, 72, 96, 120],
  window: [24, 36, 48, 72, 96],
};

/** Quick height picks (inches) shown in the inspector, per opening type. */
export const OPENING_QUICK_HEIGHTS: Record<StudioOpeningType, readonly number[]> = {
  door: [80, 84, 96],
  entrance: [84, 96, 108, 120],
  window: [24, 36, 48, 60, 72],
};

export function getOpeningPreset(style: StudioOpeningStyle): StudioOpeningPreset {
  return PRESET_BY_STYLE.get(style) ?? STUDIO_OPENING_PRESETS[0];
}

export function getOpeningStyle(opening: Pick<StudioOpening, "type" | "style">): StudioOpeningStyle {
  const style = opening.style;
  if (style && PRESET_BY_STYLE.get(style)?.type === opening.type) return style;
  return DEFAULT_STYLE[opening.type];
}

export function getOpeningStylePreset(
  opening: Pick<StudioOpening, "type" | "style">
): StudioOpeningPreset {
  return getOpeningPreset(getOpeningStyle(opening));
}

export function isOpeningArched(opening: Pick<StudioOpening, "type" | "style">): boolean {
  return Boolean(getOpeningStylePreset(opening).arched);
}

export function isOpeningGlass(opening: Pick<StudioOpening, "type" | "style">): boolean {
  return Boolean(getOpeningStylePreset(opening).glass);
}

/** Doors and entrances are walk-through; drapes leave them clear. */
export function isWalkThroughOpening(opening: Pick<StudioOpening, "type">): boolean {
  return opening.type !== "window";
}

/** Clamped size of a preset for a room of the given wall height and wall length. */
export function getOpeningPresetSize(
  preset: StudioOpeningPreset,
  wallHeight: number,
  wallLength: number
): { width: number; openingHeight: number; sillHeight: number } {
  const width = Math.max(12, Math.min(preset.width, wallLength));
  const maxSill = Math.max(0, wallHeight - 12);
  const sillHeight = Math.min(preset.sill, maxSill);
  const room = Math.max(12, wallHeight - sillHeight);
  const wanted =
    preset.height === "fill" ? wallHeight - sillHeight - OPENING_FILL_HEADER : preset.height;
  const openingHeight = Math.max(12, Math.min(wanted, room));
  return { width, openingHeight, sillHeight };
}

/**
 * Offset (inches from wall start) for a new opening of `width` on a wall,
 * preferring the centre and sliding to the nearest spot clear of existing
 * openings. Falls back to the centre when the wall is full.
 */
export function findOpeningOffset(
  design: StudioDesignJson,
  wallIndex: number,
  wallLength: number,
  width: number,
  gap = 12
): number {
  const max = Math.max(0, wallLength - width);
  const centre = Math.min(max, Math.max(0, wallLength / 2 - width / 2));
  const taken = design.openings
    .filter((opening) => opening.wallIndex === wallIndex)
    .map((opening) => [opening.offset - gap, opening.offset + opening.width + gap] as const);
  const fits = (offset: number) =>
    taken.every(([start, end]) => offset + width <= start || offset >= end);
  if (fits(centre)) return centre;
  const candidates = taken
    .flatMap(([start, end]) => [start - width, end])
    .filter((offset) => offset >= 0 && offset <= max && fits(offset))
    .sort((a, b) => Math.abs(a - centre) - Math.abs(b - centre));
  if (candidates.length > 0) return candidates[0];
  for (const offset of [0, max]) if (fits(offset)) return offset;
  return centre;
}

export function createOpeningFromPreset(
  design: StudioDesignJson,
  style: StudioOpeningStyle,
  wallIndex: number,
  wallLength: number
): StudioOpening {
  const preset = getOpeningPreset(style);
  const size = getOpeningPresetSize(preset, design.room.wallHeight, wallLength);
  const count = design.openings.filter(
    (opening) => getOpeningStyle(opening) === style
  ).length;
  return {
    id: createStudioItemId("opening"),
    type: preset.type,
    style,
    wallIndex,
    offset: findOpeningOffset(design, wallIndex, wallLength, size.width),
    width: size.width,
    label: count > 0 ? `${preset.label} ${count + 1}` : preset.label,
    sillHeight: size.sillHeight,
    openingHeight: size.openingHeight,
  };
}
