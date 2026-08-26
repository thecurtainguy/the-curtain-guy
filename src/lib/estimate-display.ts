import {
  addOnOptions,
  drapeGoals,
  eventTypes,
  fabricDirections,
  formatHeightSummaryValue,
  formatMeasurementSummaryValue,
  formatOptionSummaryValue,
  fullnessOptions,
  getEnglishOptionLabel,
  getEnglishOptionLabels,
  getEnglishOptions,
  measurementsKnownOptions,
  runLayouts,
  type EstimateFormData,
  type EstimateOption,
} from "@/data/estimate";

export type DetailRow = { label: string; value: string };

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function labelList(group: "drapeGoals" | "addOns" | "fabricDirections", ids: string[]): string {
  return getEnglishOptionLabels(group, ids).join(", ") || "—";
}

export function asOptionIds(value: unknown): string[] {
  return asStringArray(value);
}

/** Friendly rows for owner admin estimate detail (not raw JSON). */
export function buildAdminLookAndFabricRows(lookAndFabric: unknown): DetailRow[] {
  const data = asRecord(lookAndFabric);
  const directions = asStringArray(data.fabricDirections);
  const fullness = asString(data.fullnessPreference);

  return [
    {
      label: "Fabric direction",
      value: labelList("fabricDirections", directions),
    },
    {
      label: "Fullness",
      value: fullness
        ? formatOptionSummaryValue("fullnessOptions", fullness)
        : "—",
    },
  ];
}

export function buildAdminMeasurementRows(measurements: unknown): DetailRow[] {
  const data = asRecord(measurements);
  const pseudo: EstimateFormData = {
    eventType: "",
    eventDate: "",
    venueName: "",
    cityArea: "",
    venueSetting: "",
    guestCount: "",
    drapeGoals: [],
    measurementsKnown: asString(data.measurementsKnown),
    linearFeet: asString(data.linearFeet),
    heightNeeded: asString(data.heightNeeded),
    wallSections: asString(data.wallSections),
    runLayout: asString(data.runLayout),
    doorsOpenings: asString(data.doorsOpenings),
    floorPlanAvailable: asString(data.floorPlanAvailable),
    fabricDirections: [],
    fullnessPreference: "",
    addOns: [],
    name: "",
    email: "",
    phone: "",
    message: "",
  };

  return [
    {
      label: "Confidence",
      value: pseudo.measurementsKnown
        ? formatOptionSummaryValue(
            "measurementsKnown",
            pseudo.measurementsKnown
          )
        : "—",
    },
    {
      label: "Linear feet",
      value: formatMeasurementSummaryValue(pseudo.linearFeet),
    },
    {
      label: "Height needed",
      value: formatHeightSummaryValue(pseudo),
    },
    {
      label: "Walls / sections",
      value: formatMeasurementSummaryValue(pseudo.wallSections),
    },
    {
      label: "Run layout",
      value: pseudo.runLayout
        ? formatOptionSummaryValue("runLayouts", pseudo.runLayout)
        : "—",
    },
    {
      label: "Doors / openings",
      value: formatMeasurementSummaryValue(pseudo.doorsOpenings),
    },
    {
      label: "Floor plan available",
      value: pseudo.floorPlanAvailable
        ? formatOptionSummaryValue("floorPlanOptions", pseudo.floorPlanAvailable)
        : "—",
    },
  ];
}

export function getLookAndFabricIds(lookAndFabric: unknown): {
  fabricDirections: string[];
  fullnessPreference: string;
} {
  const data = asRecord(lookAndFabric);
  return {
    fabricDirections: asStringArray(data.fabricDirections),
    fullnessPreference: asString(data.fullnessPreference),
  };
}

export function formatDrapeGoals(value: unknown): string {
  return labelList("drapeGoals", asStringArray(value));
}

export function formatAddOns(value: unknown): string {
  const ids = asStringArray(value);
  if (ids.length === 0) return "None selected";
  return labelList("addOns", ids);
}

export function formatVenueSetting(value: string | null): string {
  if (!value) return "—";
  return getEnglishOptionLabel("venueSettings", value) ?? value;
}

export function formatEventType(value: string | null | undefined): string {
  if (!value) return "—";
  return getEnglishOptionLabel("eventTypes", value) ?? value;
}

const englishEventTypes = getEnglishOptions("eventTypes", eventTypes);
const englishDrapeGoals = getEnglishOptions("drapeGoals", drapeGoals);
const englishFabricDirections = getEnglishOptions(
  "fabricDirections",
  fabricDirections
);
const englishFullnessOptions = getEnglishOptions("fullnessOptions", fullnessOptions);
const englishAddOnOptions = getEnglishOptions("addOns", addOnOptions);

export {
  englishAddOnOptions as addOnOptions,
  englishDrapeGoals as drapeGoals,
  englishEventTypes as eventTypes,
  englishFabricDirections as fabricDirections,
  englishFullnessOptions as fullnessOptions,
};
