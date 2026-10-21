import {
  STUDIO_DESIGN_VERSION,
  cloneStudioTemplate,
  getStudioMaterials,
  validateStudioDesign,
  type StudioDesignJson,
  type StudioPoint,
  type StudioRoomShape,
} from "@/data/studio";
import type { StudioVenuePreset } from "@/data/studio-venue-presets";
import {
  calculateRoomAreaSquareFeet,
  getStudioBounds,
  getWallSegments,
  updateTemplateRoomDimensions,
} from "@/lib/studio-geometry";
import {
  applyRoomOutline,
  convertRoomToCustom,
  setWallLength,
} from "@/lib/studio-room-editing";

export const ROOM_MIN_FEET = 10;
export const ROOM_MAX_FEET = 200;
export const WALL_HEIGHT_MIN_FEET = 6;
export const WALL_HEIGHT_MAX_FEET = 50;

export function isRoomOutlineValid(
  design: StudioDesignJson,
  floor: StudioPoint[],
  shape: StudioRoomShape = "custom"
): boolean {
  const result = validateStudioDesign({
    version: STUDIO_DESIGN_VERSION,
    units: "inches",
    room: {
      shape,
      name: design.room.name.trim() || "Room",
      wallHeight: design.room.wallHeight,
      floor,
    },
    openings: [],
    objects: [],
    drapeRuns: [],
    treatments: [],
    view: { cameraMode: "orbit" },
    notes: "",
  });
  return result.valid;
}

/** Keeps the current outline and wall items, unlocking free-form editing. */
export const convertToCustomRoom = convertRoomToCustom;

/**
 * Moves the wall's end corner so the wall measures `inches`.
 * Returns null when the edit would break the outline.
 */
export function setCustomWallLength(
  design: StudioDesignJson,
  wallIndex: number,
  inches: number
): StudioDesignJson | null {
  const wall = getWallSegments(design.room.floor)[wallIndex];
  if (!wall || !Number.isFinite(inches)) return null;
  const next = setWallLength(design, wallIndex, inches);
  if (next === design && Math.abs(wall.length - inches) > 0.5) return null;
  return next;
}

/** Stretches a free-form outline to a new overall width / length. */
export function scaleCustomRoom(
  design: StudioDesignJson,
  patch: { width?: number; length?: number }
): StudioDesignJson {
  const floor = design.room.floor;
  const bounds = getStudioBounds(floor);
  const scaleX = patch.width ? Math.max(120, patch.width) / bounds.width : 1;
  const scaleZ = patch.length ? Math.max(120, patch.length) / bounds.depth : 1;
  const nextFloor = floor.map((point) => ({
    x: Math.round((bounds.minX + (point.x - bounds.minX) * scaleX) * 100) / 100,
    z: Math.round((bounds.minZ + (point.z - bounds.minZ) * scaleZ) * 100) / 100,
  }));
  if (!isRoomOutlineValid(design, nextFloor)) return design;
  return applyRoomOutline(design, { ...design.room, floor: nextFloor });
}

/** Re-maps object positions from one room footprint into another. */
function remapObjects(
  design: StudioDesignJson,
  previousFloor: StudioPoint[]
): StudioDesignJson {
  const from = getStudioBounds(previousFloor);
  const to = getStudioBounds(design.room.floor);
  return {
    ...design,
    objects: design.objects.map((object) => ({
      ...object,
      x: Math.round(to.minX + ((object.x - from.minX) / from.width) * to.width),
      z: Math.round(to.minZ + ((object.z - from.minZ) / from.depth) * to.depth),
    })),
  };
}

function withoutWallItems(design: StudioDesignJson): StudioDesignJson {
  return { ...design, drapeRuns: [], treatments: [], openings: [] };
}

export function hasWallItems(design: StudioDesignJson): boolean {
  return (
    design.drapeRuns.length > 0 ||
    design.treatments.length > 0 ||
    design.openings.length > 0
  );
}

/** True when switching to `shape` must drop drapes, treatments and openings. */
export function shapeChangeClearsWallItems(
  design: StudioDesignJson,
  shape: StudioRoomShape
): boolean {
  return shape !== "custom" && shape !== design.room.shape && hasWallItems(design);
}

export function changeRoomShape(
  design: StudioDesignJson,
  shape: StudioRoomShape
): StudioDesignJson {
  if (shape === design.room.shape) return design;
  if (shape === "custom") return convertToCustomRoom(design);
  const bounds = getStudioBounds(design.room.floor);
  const template = cloneStudioTemplate(shape);
  const minSide = shape === "l_shape" ? 36 : 120;
  const width = Math.max(minSide, Math.round(bounds.width));
  const length = Math.max(minSide, Math.round(bounds.depth));
  const next = updateTemplateRoomDimensions(
    withoutWallItems({
      ...design,
      room: {
        ...template.room,
        name: design.room.name,
        wallHeight: design.room.wallHeight,
      },
    }),
    {
      width,
      length,
      cutoutWidth: Math.round(width / 3),
      cutoutDepth: Math.round(length / 2),
      wallHeight: design.room.wallHeight,
    }
  );
  return remapObjects(next, design.room.floor);
}

export function venuePresetClearsWallItems(
  design: StudioDesignJson,
  preset: StudioVenuePreset
): boolean {
  return (
    hasWallItems(design) &&
    (preset.shape === "custom" || preset.shape !== design.room.shape)
  );
}

export function applyVenuePreset(
  design: StudioDesignJson,
  preset: StudioVenuePreset
): StudioDesignJson {
  const materials = {
    ...getStudioMaterials(design),
    floor: preset.floorFinish,
    walls: preset.wallFinish,
    lighting: preset.lighting,
  };
  const clears = preset.shape === "custom" || preset.shape !== design.room.shape;
  const base = clears ? withoutWallItems(design) : design;

  let next: StudioDesignJson;
  if (preset.shape === "custom" && preset.floor) {
    next = {
      ...base,
      room: {
        shape: "custom",
        name: preset.roomName,
        wallHeight: preset.wallHeight,
        floor: preset.floor.map((point) => ({ ...point })),
      },
      materials,
    };
  } else {
    const template = cloneStudioTemplate(
      preset.shape === "l_shape" ? "l_shape" : "rectangle"
    );
    const room =
      base.room.shape === preset.shape
        ? { ...base.room, name: preset.roomName }
        : { ...template.room, name: preset.roomName };
    next = updateTemplateRoomDimensions(
      { ...base, room, materials },
      {
        width: preset.width,
        length: preset.length,
        cutoutWidth: preset.cutoutWidth,
        cutoutDepth: preset.cutoutDepth,
        wallHeight: preset.wallHeight,
      }
    );
  }
  return remapObjects(next, design.room.floor);
}

export type StudioRoomStats = {
  areaSqFt: number;
  perimeterFt: number;
  banquet: number;
  cocktail: number;
  theatre: number;
  width: number;
  length: number;
};

export function getStudioRoomStats(design: StudioDesignJson): StudioRoomStats {
  const areaSqFt = calculateRoomAreaSquareFeet(design.room.floor);
  const perimeter = getWallSegments(design.room.floor).reduce(
    (total, wall) => total + wall.length,
    0
  );
  const bounds = getStudioBounds(design.room.floor);
  return {
    areaSqFt,
    perimeterFt: perimeter / 12,
    banquet: Math.floor(areaSqFt / 10),
    cocktail: Math.floor(areaSqFt / 6),
    theatre: Math.floor(areaSqFt / 7),
    width: bounds.width,
    length: bounds.depth,
  };
}
