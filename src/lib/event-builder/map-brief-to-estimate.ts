import type { EventBuilderBrief } from "@/data/event-builder/brief";
import type { EstimateFormData } from "@/data/estimate";
import { getEventCatalogLabel } from "@/data/event-builder/catalog";
import { estimateLinearDrapeFromBrief } from "@/lib/event-builder/build-starter-design";

const CATALOG_TO_DRAPE_GOALS: Record<string, string> = {
  backdrop_full: "photo-backdrop",
  backdrop_head_table: "ceremony-backdrop",
  backdrop_stage: "stage-backdrop",
  entrance_door_drape: "entrance-reveal",
  entrance_tunnel: "entrance-reveal",
  ceremony_chuppah: "ceremony-backdrop",
  perimeter_full: "full-room",
  perimeter_partial: "full-room",
  room_divider: "room-divider",
  top_swag: "ceremony-backdrop",
  addon_blackout: "blackout-masking",
};

function mapFullness(fullness: number): string {
  if (fullness >= 3) return "luxury-deep";
  if (fullness >= 2.5) return "premium";
  return "clean-flat";
}

function mapHeight(wallHeightFt: number): string {
  if (wallHeightFt <= 8) return "8ft-under";
  if (wallHeightFt <= 12) return "10-12ft";
  return "14ft-plus";
}

function buildStudioNote(brief: EventBuilderBrief): string {
  const setups = brief.catalogSelections.map(getEventCatalogLabel);
  const parts = [
    "From Studio Event Builder:",
    setups.length > 0 ? `Setups: ${setups.join(", ")}` : null,
    `Room: ${brief.room.widthFt}′ × ${brief.room.lengthFt}′ (${brief.room.shape})`,
    `Ceiling: ${brief.room.wallHeightFt}′`,
    brief.look.primaryColor ? `Color: ${brief.look.primaryColor}` : null,
  ].filter(Boolean);
  return parts.join("\n");
}

/** Maps event builder brief into estimate form fields (partial — only what we know). */
export function mapEventBuilderBriefToEstimate(
  brief: EventBuilderBrief
): Partial<EstimateFormData> {
  const drapeGoals = new Set<string>();
  for (const id of brief.catalogSelections) {
    const goal = CATALOG_TO_DRAPE_GOALS[id];
    if (goal) drapeGoals.add(goal);
  }

  const linearInches = estimateLinearDrapeFromBrief(brief);
  const linearFeet =
    linearInches > 0 ? String(Math.max(1, Math.round(linearInches / 12))) : "";

  const mergedAddOns = new Set<string>(brief.addOns);
  if (brief.catalogSelections.includes("addon_star_drape")) {
    mergedAddOns.add("star-drape");
  }
  if (brief.catalogSelections.includes("addon_uplighting")) {
    mergedAddOns.add("uplighting");
  }

  return {
    eventType: brief.eventType || "",
    eventDate: brief.eventDate?.trim() || "",
    venueName: brief.venueName?.trim() || "",
    cityArea: brief.cityArea?.trim() || "",
    drapeGoals: [...drapeGoals],
    measurementsKnown: linearFeet ? "partial" : "help",
    linearFeet,
    heightNeeded: mapHeight(brief.room.wallHeightFt),
    wallSections:
      brief.room.shape === "l_shape"
        ? `L-shape ~${brief.room.widthFt}×${brief.room.lengthFt} ft`
        : `${brief.room.widthFt}×${brief.room.lengthFt} ft`,
    fabricDirections:
      brief.look.fabricDirections.length > 0
        ? [...brief.look.fabricDirections]
        : [],
    fullnessPreference: mapFullness(brief.look.fullness),
    addOns: [...mergedAddOns],
    message: buildStudioNote(brief),
  };
}

export function mergeEstimatePrefill(
  base: EstimateFormData,
  prefill: Partial<EstimateFormData>
): EstimateFormData {
  const next = { ...base };

  for (const [key, value] of Object.entries(prefill) as Array<
    [keyof EstimateFormData, EstimateFormData[keyof EstimateFormData]]
  >) {
    if (Array.isArray(value)) {
      if (value.length > 0) {
        (next as Record<string, unknown>)[key] = value;
      }
      continue;
    }
    if (typeof value === "string" && value.trim()) {
      (next as Record<string, unknown>)[key] = value;
    }
  }

  return next;
}
