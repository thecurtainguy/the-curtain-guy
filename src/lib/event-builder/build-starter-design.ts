import {
  cloneStudioTemplate,
  normalizeStudioDesign,
  type StudioDesignJson,
} from "@/data/studio";
import type { EventBuilderBrief } from "@/data/event-builder/brief";
import { applyCatalogSelection } from "@/data/event-builder/catalog";
import {
  createLShapeRoom,
  createRectangleRoom,
  feetToInches,
  calculateDrapeLength,
} from "@/lib/studio-geometry";

export function buildStarterDesignFromBrief(
  brief: EventBuilderBrief
): StudioDesignJson {
  const templateKey = brief.room.shape === "l_shape" ? "l_shape" : "rectangle";
  const design = cloneStudioTemplate(templateKey);

  const widthIn = feetToInches(brief.room.widthFt);
  const lengthIn = feetToInches(brief.room.lengthFt);
  const wallHeightIn = feetToInches(brief.room.wallHeightFt);

  const floor =
    brief.room.shape === "l_shape"
      ? createLShapeRoom(
          widthIn,
          lengthIn,
          feetToInches(brief.room.cutoutWidthFt ?? 20),
          feetToInches(brief.room.cutoutDepthFt ?? 20)
        )
      : createRectangleRoom(widthIn, lengthIn);

  const base: StudioDesignJson = {
    ...design,
    room: {
      ...design.room,
      shape: brief.room.shape,
      wallHeight: wallHeightIn,
      floor,
      templateDimensions:
        brief.room.shape === "l_shape"
          ? {
              width: widthIn,
              length: lengthIn,
              cutoutWidth: feetToInches(brief.room.cutoutWidthFt ?? 20),
              cutoutDepth: feetToInches(brief.room.cutoutDepthFt ?? 20),
            }
          : { width: widthIn, length: lengthIn },
    },
    openings: [],
    objects: [],
    drapeRuns: [],
    treatments: [],
  };

  const withCatalog = applyCatalogSelection(base, brief);
  return normalizeStudioDesign(withCatalog);
}

export function estimateLinearDrapeFromBrief(brief: EventBuilderBrief): number {
  return calculateDrapeLength(buildStarterDesignFromBrief(brief));
}
