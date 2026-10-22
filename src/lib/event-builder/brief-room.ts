import type { EventBuilderBrief } from "@/data/event-builder/brief";
import type { StudioPoint, StudioRoom } from "@/data/studio";
import type { StudioVenuePreset } from "@/data/studio-venue-presets";
import {
  createLShapeRoom,
  createRectangleRoom,
  feetToInches,
  getStudioBounds,
} from "@/lib/studio-geometry";

export const ROOM_MIN_FT = 10;
export const ROOM_MAX_FT = 200;
export const WALL_HEIGHT_MIN_FT = 6;
export const WALL_HEIGHT_MAX_FT = 50;

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Scales a free-form outline so its bounds measure `width` × `length` from the origin. */
function fitOutline(outline: readonly StudioPoint[], width: number, length: number): StudioPoint[] {
  const bounds = getStudioBounds(outline as StudioPoint[]);
  return outline.map((point) => ({
    x: round2(((point.x - bounds.minX) / bounds.width) * width),
    z: round2(((point.z - bounds.minZ) / bounds.depth) * length),
  }));
}

/**
 * Studio room for a brief — the same floor, height and template dimensions the
 * studio's own room tools would produce, clamped into validation range.
 */
export function buildBriefRoom(brief: EventBuilderBrief, name: string): StudioRoom {
  const minSide = brief.room.shape === "l_shape" ? 24 : 12;
  const width = Math.max(minSide, feetToInches(clamp(brief.room.widthFt, ROOM_MIN_FT, ROOM_MAX_FT)));
  const length = Math.max(minSide, feetToInches(clamp(brief.room.lengthFt, ROOM_MIN_FT, ROOM_MAX_FT)));
  const wallHeight = feetToInches(
    clamp(brief.room.wallHeightFt, WALL_HEIGHT_MIN_FT, WALL_HEIGHT_MAX_FT)
  );
  const safeName = name.trim().slice(0, 160) || "Main room";

  if (brief.room.shape === "custom" && brief.room.outline && brief.room.outline.length >= 3) {
    return {
      shape: "custom",
      name: safeName,
      wallHeight,
      floor: fitOutline(brief.room.outline, width, length),
    };
  }

  if (brief.room.shape === "l_shape") {
    const cutoutWidth = clamp(feetToInches(brief.room.cutoutWidthFt ?? 20), 12, width - 12);
    const cutoutDepth = clamp(feetToInches(brief.room.cutoutDepthFt ?? 20), 12, length - 12);
    return {
      shape: "l_shape",
      name: safeName,
      wallHeight,
      floor: createLShapeRoom(width, length, cutoutWidth, cutoutDepth),
      templateDimensions: { width, length, cutoutWidth, cutoutDepth },
    };
  }

  return {
    shape: "rectangle",
    name: safeName,
    wallHeight,
    floor: createRectangleRoom(width, length),
    templateDimensions: { width, length },
  };
}

export function buildBriefFloor(brief: EventBuilderBrief): StudioPoint[] {
  return buildBriefRoom(brief, "Room").floor;
}

/** Brief room fields for a studio venue preset. */
export function roomFromVenuePreset(
  preset: StudioVenuePreset,
  current: EventBuilderBrief["room"]
): EventBuilderBrief["room"] {
  const toFt = (inches: number) => Math.round(inches / 12);
  return {
    shape: preset.shape,
    widthFt: toFt(preset.width),
    lengthFt: toFt(preset.length),
    wallHeightFt: toFt(preset.wallHeight),
    cutoutWidthFt: preset.cutoutWidth ? toFt(preset.cutoutWidth) : current.cutoutWidthFt,
    cutoutDepthFt: preset.cutoutDepth ? toFt(preset.cutoutDepth) : current.cutoutDepthFt,
    ...(preset.shape === "custom" && preset.floor
      ? { outline: preset.floor.map((point) => ({ ...point })) }
      : {}),
  };
}
