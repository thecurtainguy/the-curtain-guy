import {
  fabricDirectionsFor,
  getBriefCeilingPreset,
  getBriefFabric,
  getBriefLayout,
  getBriefLightingMood,
  getBriefOpenings,
  getBriefUplightColor,
  getBriefVenuePreset,
  type EventBuilderBrief,
} from "@/data/event-builder/brief";
import type { EstimateFormData } from "@/data/estimate";
import { getEventCatalogLabel } from "@/data/event-builder/catalog";
import { EVENT_LAYOUT_OPTIONS } from "@/data/event-builder/wizard-options";
import {
  DRAPE_COLORS,
  DRAPE_FABRICS,
  STUDIO_LIGHTING_MOODS,
} from "@/data/studio";
import { getOpeningPreset } from "@/data/studio-openings";
import { buildStarterDesignFromBrief } from "@/lib/event-builder/build-starter-design";
import { calculateDrapeLength } from "@/lib/studio-geometry";

const CATALOG_TO_DRAPE_GOALS: Record<string, string> = {
  backdrop_full: "photo-backdrop",
  backdrop_head_table: "ceremony-backdrop",
  backdrop_stage: "stage-backdrop",
  floral_header: "photo-backdrop",
  layered_swag: "ceremony-backdrop",
  entrance_door_drape: "entrance-reveal",
  entrance_tunnel: "entrance-reveal",
  ceremony_chuppah: "ceremony-backdrop",
  perimeter_full: "full-room",
  perimeter_partial: "full-room",
  room_divider: "room-divider",
  top_swag: "ceremony-backdrop",
  addon_blackout: "blackout-masking",
};

const OUTDOOR_VENUES = new Set(["wedding_tent", "octagon_pavilion"]);

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

function colorLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  return DRAPE_COLORS.find((color) => color.value === value)?.label ?? value;
}

function describeOpenings(brief: EventBuilderBrief): string {
  const openings = getBriefOpenings(brief);
  if (openings.length === 0) return "";
  return openings
    .map((opening) => `${getOpeningPreset(opening.style).label} (${opening.wall} wall)`)
    .join(", ");
}

function buildStudioNote(brief: EventBuilderBrief): string {
  const setups = brief.catalogSelections.map(getEventCatalogLabel);
  const venue = getBriefVenuePreset(brief);
  const ceiling = getBriefCeilingPreset(brief);
  const layout = getBriefLayout(brief);
  const layoutLabel = EVENT_LAYOUT_OPTIONS.find((option) => option.id === layout.id)?.label;
  const fabric = DRAPE_FABRICS.find((option) => option.value === getBriefFabric(brief))?.label;
  const lighting = STUDIO_LIGHTING_MOODS.find(
    (option) => option.value === getBriefLightingMood(brief)
  )?.label;
  const uplight = colorLabel(getBriefUplightColor(brief));
  const accent = colorLabel(brief.look.accentColor);
  const parts = [
    "From Studio Event Builder:",
    brief.eventName?.trim() ? `Event: ${brief.eventName.trim()}` : null,
    brief.guestCount ? `Guests: ${brief.guestCount}` : null,
    venue ? `Venue style: ${venue.label}` : null,
    setups.length > 0 ? `Setups: ${setups.join(", ")}` : null,
    `Room: ${brief.room.widthFt}′ × ${brief.room.lengthFt}′ (${brief.room.shape})`,
    `Ceiling height: ${brief.room.wallHeightFt}′`,
    ceiling ? `Ceiling drapery: ${ceiling.label}` : null,
    `Look: ${[fabric, colorLabel(brief.look.primaryColor)].filter(Boolean).join(", ")}${
      accent ? ` + ${accent} accent` : ""
    }`,
    lighting ? `Lighting: ${lighting}${uplight ? `, ${uplight} uplights` : ""}` : null,
    layoutLabel && layout.id !== "none" ? `Layout: ${layoutLabel}` : null,
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

  const linearInches = calculateDrapeLength(buildStarterDesignFromBrief(brief));
  const linearFeet =
    linearInches > 0 ? String(Math.max(1, Math.round(linearInches / 12))) : "";

  const mergedAddOns = new Set<string>(brief.addOns);
  if (brief.catalogSelections.includes("addon_star_drape")) {
    mergedAddOns.add("star-drape");
  }
  if (getBriefUplightColor(brief)) {
    mergedAddOns.add("uplighting");
  }
  if (getBriefCeilingPreset(brief)) {
    mergedAddOns.add("ceiling-draping");
  }

  const fabricDirections = brief.look.fabric
    ? fabricDirectionsFor(getBriefFabric(brief), brief.look.primaryColor)
    : [...brief.look.fabricDirections];

  return {
    eventType: brief.eventType || "",
    eventDate: brief.eventDate?.trim() || "",
    venueName: brief.venueName?.trim() || "",
    cityArea: brief.cityArea?.trim() || "",
    venueSetting: brief.venuePreset
      ? OUTDOOR_VENUES.has(brief.venuePreset)
        ? "outdoor"
        : "indoor"
      : "",
    guestCount: brief.guestCount ? String(brief.guestCount) : "",
    drapeGoals: [...drapeGoals],
    measurementsKnown: linearFeet ? "partial" : "help",
    linearFeet,
    heightNeeded: mapHeight(brief.room.wallHeightFt),
    wallSections:
      brief.room.shape === "l_shape"
        ? `L-shape ~${brief.room.widthFt}×${brief.room.lengthFt} ft`
        : `${brief.room.widthFt}×${brief.room.lengthFt} ft`,
    doorsOpenings: describeOpenings(brief),
    fabricDirections,
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
