import type { LucideIcon } from "lucide-react";
import {
  Building2,
  Camera,
  Columns3,
  Crown,
  EyeOff,
  Layers,
  LayoutGrid,
  Lightbulb,
  Monitor,
  Moon,
  Music,
  PartyPopper,
  Sparkles,
  Star,
  Theater,
  Timer,
  Wand2,
} from "lucide-react";
import enEstimate from "../../messages/en/estimate.json";
import { siteConfig } from "@/data/site";

export type EstimateOptionDef = {
  id: string;
  icon?: LucideIcon;
};

export type EstimateOption = {
  id: string;
  label: string;
  description?: string;
  icon?: LucideIcon;
};

export type EstimateStepDef = {
  id: string;
};

export type EstimateStep = {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
};

type EstimateOptionGroup = keyof typeof enEstimate.options;

export const estimateBuilderSteps: EstimateStepDef[] = [
  { id: "event-basics" },
  { id: "drape-goal" },
  { id: "measurements" },
  { id: "look-fabric" },
  { id: "add-ons" },
  { id: "contact-summary" },
];

export const eventTypes: EstimateOptionDef[] = [
  { id: "wedding", icon: Layers },
  { id: "corporate", icon: Building2 },
  { id: "gala", icon: Crown },
  { id: "mitzvah", icon: PartyPopper },
  { id: "stage-show", icon: Theater },
  { id: "trade-show", icon: LayoutGrid },
  { id: "private", icon: Sparkles },
  { id: "other", icon: Wand2 },
];

export const venueSettings: EstimateOptionDef[] = [
  { id: "indoor" },
  { id: "outdoor" },
];

export const drapeGoals: EstimateOptionDef[] = [
  { id: "full-room", icon: LayoutGrid },
  { id: "ceremony-backdrop", icon: Layers },
  { id: "stage-backdrop", icon: Theater },
  { id: "room-divider", icon: Columns3 },
  { id: "blackout-masking", icon: EyeOff },
  { id: "photo-backdrop", icon: Camera },
  { id: "entrance-reveal", icon: Star },
  { id: "trade-show-booth", icon: Building2 },
  { id: "vip-lounge", icon: Crown },
  { id: "screen-surround", icon: Monitor },
];

export const runLayouts: EstimateOptionDef[] = [
  { id: "straight" },
  { id: "corners" },
  { id: "not-sure" },
];

export const floorPlanOptions: EstimateOptionDef[] = [
  { id: "yes" },
  { id: "no" },
  { id: "not-sure" },
];

export const measurementsKnownOptions: EstimateOptionDef[] = [
  { id: "know" },
  { id: "partial" },
  { id: "help" },
];

export const heightOptions: EstimateOptionDef[] = [
  { id: "8ft-under" },
  { id: "10-12ft" },
  { id: "14ft-plus" },
  { id: "not-sure" },
];

export const fabricDirections: EstimateOptionDef[] = [
  { id: "black-velvet", icon: Moon },
  { id: "white-ivory", icon: Layers },
  { id: "champagne", icon: Sparkles },
  { id: "sheer-overlay", icon: Wand2 },
  { id: "blackout-fabric", icon: EyeOff },
  { id: "star-drape", icon: Star },
  { id: "custom-color", icon: Wand2 },
  { id: "recommend", icon: Sparkles },
];

export const fullnessOptions: EstimateOptionDef[] = [
  { id: "clean-flat" },
  { id: "premium" },
  { id: "luxury-deep" },
  { id: "recommend" },
];

export const addOnOptions: EstimateOptionDef[] = [
  { id: "uplighting", icon: Lightbulb },
  { id: "star-drape", icon: Star },
  { id: "kabuki-reveal", icon: Theater },
  { id: "event-carpet", icon: LayoutGrid },
  { id: "stanchions", icon: Columns3 },
  { id: "screen-surround", icon: Monitor },
  { id: "dj-booth", icon: Music },
  { id: "step-repeat", icon: Camera },
  { id: "ceiling-draping", icon: Layers },
  { id: "double-sided", icon: Columns3 },
  { id: "premium-hardware", icon: Sparkles },
  { id: "rush-setup", icon: Timer },
];

export const SUMMARY_NOT_SURE = enEstimate.summary.notSure;
export const SUMMARY_NOT_PROVIDED = enEstimate.summary.notProvided;

export type EstimateValidationKey =
  | "eventTypeRequired"
  | "cityAreaRequired"
  | "drapeGoalsRequired"
  | "measurementsKnownRequired"
  | "floorPlanRequired"
  | "fabricRequired"
  | "nameRequired"
  | "emailRequired";

export type StepValidationResult = {
  valid: boolean;
  messageKey?: EstimateValidationKey;
};

export const NOT_SURE_IDS = new Set(["not-sure", "help", "recommend"]);

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function validateEstimateStep(
  stepId: string,
  data: EstimateFormData
): StepValidationResult {
  switch (stepId) {
    case "event-basics": {
      if (!data.eventType) {
        return { valid: false, messageKey: "eventTypeRequired" };
      }
      if (!data.cityArea.trim()) {
        return { valid: false, messageKey: "cityAreaRequired" };
      }
      return { valid: true };
    }
    case "drape-goal": {
      if (data.drapeGoals.length === 0) {
        return { valid: false, messageKey: "drapeGoalsRequired" };
      }
      return { valid: true };
    }
    case "measurements": {
      if (!data.measurementsKnown) {
        return { valid: false, messageKey: "measurementsKnownRequired" };
      }
      if (!data.floorPlanAvailable) {
        return { valid: false, messageKey: "floorPlanRequired" };
      }
      return { valid: true };
    }
    case "look-fabric": {
      if (data.fabricDirections.length === 0) {
        return { valid: false, messageKey: "fabricRequired" };
      }
      return { valid: true };
    }
    case "add-ons":
      return { valid: true };
    case "contact-summary": {
      if (!data.name.trim()) {
        return { valid: false, messageKey: "nameRequired" };
      }
      if (!data.email.trim() || !isValidEmail(data.email)) {
        return { valid: false, messageKey: "emailRequired" };
      }
      return { valid: true };
    }
    default:
      return { valid: true };
  }
}

export function canSubmitEstimate(data: EstimateFormData): boolean {
  return validateEstimateStep("contact-summary", data).valid;
}

export type EstimateFormData = {
  eventType: string;
  eventDate: string;
  venueName: string;
  cityArea: string;
  venueSetting: string;
  guestCount: string;
  drapeGoals: string[];
  measurementsKnown: string;
  linearFeet: string;
  heightNeeded: string;
  wallSections: string;
  runLayout: string;
  doorsOpenings: string;
  floorPlanAvailable: string;
  fabricDirections: string[];
  fullnessPreference: string;
  addOns: string[];
  name: string;
  email: string;
  phone: string;
  message: string;
};

export const initialEstimateFormData: EstimateFormData = {
  eventType: "",
  eventDate: "",
  venueName: "",
  cityArea: "",
  venueSetting: "",
  guestCount: "",
  drapeGoals: [],
  measurementsKnown: "",
  linearFeet: "",
  heightNeeded: "",
  wallSections: "",
  runLayout: "",
  doorsOpenings: "",
  floorPlanAvailable: "",
  fabricDirections: [],
  fullnessPreference: "",
  addOns: [],
  name: "",
  email: "",
  phone: "",
  message: "",
};

function getEnglishOptionEntry(group: EstimateOptionGroup, id: string) {
  const options = enEstimate.options[group] as Record<
    string,
    { label: string; description?: string }
  >;
  return options[id];
}

export function getEnglishOptions(
  group: EstimateOptionGroup,
  defs: EstimateOptionDef[]
): EstimateOption[] {
  return defs.map((def) => {
    const entry = getEnglishOptionEntry(group, def.id);
    return {
      id: def.id,
      icon: def.icon,
      label: entry?.label ?? def.id,
      description: entry?.description,
    };
  });
}

export function getEnglishOptionLabel(
  group: EstimateOptionGroup,
  id: string
): string | undefined {
  return getEnglishOptionEntry(group, id)?.label;
}

export function getOptionLabel(
  options: EstimateOption[],
  id: string
): string | undefined {
  return options.find((option) => option.id === id)?.label;
}

export function getOptionLabels(
  options: EstimateOption[],
  ids: string[]
): string[] {
  return ids
    .map((id) => getOptionLabel(options, id))
    .filter((label): label is string => Boolean(label));
}

export function getEnglishOptionLabels(
  group: EstimateOptionGroup,
  ids: string[]
): string[] {
  return ids
    .map((id) => getEnglishOptionLabel(group, id))
    .filter((label): label is string => Boolean(label));
}

export function formatSummaryValue(value: string | undefined): string {
  if (!value?.trim()) return SUMMARY_NOT_PROVIDED;
  return value.trim();
}

export function formatMeasurementSummaryValue(
  value: string | undefined
): string {
  if (!value?.trim()) return SUMMARY_NOT_SURE;
  if (NOT_SURE_IDS.has(value.trim())) return SUMMARY_NOT_SURE;
  return value.trim();
}

export function formatOptionSummaryValue(
  group: EstimateOptionGroup,
  id: string | undefined
): string {
  if (!id?.trim()) return SUMMARY_NOT_SURE;
  if (NOT_SURE_IDS.has(id)) return SUMMARY_NOT_SURE;
  return getEnglishOptionLabel(group, id) ?? id;
}

export function formatHeightSummaryValue(data: EstimateFormData): string {
  if (!data.heightNeeded?.trim()) return SUMMARY_NOT_SURE;
  if (NOT_SURE_IDS.has(data.heightNeeded)) return SUMMARY_NOT_SURE;
  const fromOption = getEnglishOptionLabel("heightOptions", data.heightNeeded);
  if (fromOption) return fromOption;
  return data.heightNeeded.trim();
}

/**
 * Display reference for an estimate / opportunity.
 * Prefer master opportunity_ref (TCG-10000). Fall back to legacy TCG-{uuid8}.
 * Never includes quote revision suffixes (those belong on quotes only).
 */
export function formatEstimateReference(
  id: string,
  opportunityRef?: string | null
): string {
  const ref = opportunityRef?.trim();
  if (ref) return ref;
  return `TCG-${id.slice(0, 8).toUpperCase()}`;
}

export type EstimateLabelSource = {
  eventType: (id: string) => string | undefined;
  venueSetting: (id: string) => string | undefined;
  drapeGoals: (ids: string[]) => string[];
  measurementsKnown: (id: string) => string | undefined;
  height: (id: string) => string | undefined;
  runLayout: (id: string) => string | undefined;
  floorPlan: (id: string) => string | undefined;
  fabricDirections: (ids: string[]) => string[];
  fullness: (id: string) => string | undefined;
  addOns: (ids: string[]) => string[];
  notSure: string;
  notProvided: string;
  disclaimer: string;
};

export function createEnglishLabelSource(): EstimateLabelSource {
  return {
    eventType: (id) => getEnglishOptionLabel("eventTypes", id),
    venueSetting: (id) => getEnglishOptionLabel("venueSettings", id),
    drapeGoals: (ids) => getEnglishOptionLabels("drapeGoals", ids),
    measurementsKnown: (id) => getEnglishOptionLabel("measurementsKnown", id),
    height: (id) => getEnglishOptionLabel("heightOptions", id),
    runLayout: (id) => formatOptionSummaryValue("runLayouts", id),
    floorPlan: (id) => formatOptionSummaryValue("floorPlanOptions", id),
    fabricDirections: (ids) => getEnglishOptionLabels("fabricDirections", ids),
    fullness: (id) => formatOptionSummaryValue("fullnessOptions", id),
    addOns: (ids) => getEnglishOptionLabels("addOns", ids),
    notSure: SUMMARY_NOT_SURE,
    notProvided: SUMMARY_NOT_PROVIDED,
    disclaimer: enEstimate.disclaimer,
  };
}

export function createLabelSourceFromOptions(
  options: {
    eventTypes: EstimateOption[];
    venueSettings: EstimateOption[];
    drapeGoals: EstimateOption[];
    measurementsKnownOptions: EstimateOption[];
    heightOptions: EstimateOption[];
    runLayouts: EstimateOption[];
    floorPlanOptions: EstimateOption[];
    fabricDirections: EstimateOption[];
    fullnessOptions: EstimateOption[];
    addOns: EstimateOption[];
  },
  strings: {
    notSure: string;
    notProvided: string;
    disclaimer: string;
  }
): EstimateLabelSource {
  const formatLocalizedOption = (
    optionList: EstimateOption[],
    id: string | undefined
  ) => {
    if (!id?.trim()) return strings.notSure;
    if (NOT_SURE_IDS.has(id)) return strings.notSure;
    return getOptionLabel(optionList, id) ?? id;
  };

  return {
    eventType: (id) => getOptionLabel(options.eventTypes, id),
    venueSetting: (id) => getOptionLabel(options.venueSettings, id),
    drapeGoals: (ids) => getOptionLabels(options.drapeGoals, ids),
    measurementsKnown: (id) =>
      getOptionLabel(options.measurementsKnownOptions, id),
    height: (id) => getOptionLabel(options.heightOptions, id),
    runLayout: (id) => formatLocalizedOption(options.runLayouts, id),
    floorPlan: (id) => formatLocalizedOption(options.floorPlanOptions, id),
    fabricDirections: (ids) => getOptionLabels(options.fabricDirections, ids),
    fullness: (id) => formatLocalizedOption(options.fullnessOptions, id),
    addOns: (ids) => getOptionLabels(options.addOns, ids),
    notSure: strings.notSure,
    notProvided: strings.notProvided,
    disclaimer: strings.disclaimer,
  };
}

export function buildEstimateBrief(
  data: EstimateFormData,
  labels: EstimateLabelSource = createEnglishLabelSource()
): string {
  const eventType = labels.eventType(data.eventType) ?? data.eventType;
  const venueSetting =
    labels.venueSetting(data.venueSetting) ?? data.venueSetting;
  const runLayout = labels.runLayout(data.runLayout);
  const floorPlan = labels.floorPlan(data.floorPlanAvailable);
  const fullness = labels.fullness(data.fullnessPreference);
  const measurementsKnown =
    labels.measurementsKnown(data.measurementsKnown) ?? data.measurementsKnown;

  const formatMeasurement = (value: string | undefined) => {
    if (!value?.trim()) return labels.notSure;
    if (NOT_SURE_IDS.has(value.trim())) return labels.notSure;
    return value.trim();
  };

  const formatHeight = () => {
    if (!data.heightNeeded?.trim()) return labels.notSure;
    if (NOT_SURE_IDS.has(data.heightNeeded)) return labels.notSure;
    const heightLabel = labels.height(data.heightNeeded);
    if (heightLabel) return heightLabel;
    return data.heightNeeded.trim();
  };

  return [
    "--- EVENT BASICS ---",
    `Event type: ${eventType || "—"}`,
    `Event date: ${data.eventDate || "—"}`,
    `Venue: ${data.venueName || "—"}`,
    `City / area: ${data.cityArea || "—"}`,
    `Setting: ${venueSetting || "—"}`,
    `Guest count: ${data.guestCount || "—"}`,
    "",
    "--- DRAPE GOALS ---",
    labels.drapeGoals(data.drapeGoals).join(", ") || "—",
    "",
    "--- MEASUREMENTS ---",
    `Measurement confidence: ${measurementsKnown || labels.notSure}`,
    `Linear feet: ${formatMeasurement(data.linearFeet)}`,
    `Height needed: ${formatHeight()}`,
    `Walls / sections: ${formatMeasurement(data.wallSections)}`,
    `Run layout: ${runLayout}`,
    `Doors / openings: ${formatMeasurement(data.doorsOpenings)}`,
    `Floor plan available: ${floorPlan}`,
    "",
    "--- LOOK & FABRIC ---",
    `Fabric direction: ${labels.fabricDirections(data.fabricDirections).join(", ") || "—"}`,
    `Fullness: ${fullness || "—"}`,
    "",
    "--- ADD-ONS ---",
    labels.addOns(data.addOns).join(", ") || "None selected",
    "",
    "--- CONTACT ---",
    `Name: ${data.name || "—"}`,
    `Email: ${data.email || "—"}`,
    `Phone: ${data.phone || "—"}`,
    "",
    "--- NOTES ---",
    data.message || "—",
    "",
    labels.disclaimer,
  ].join("\n");
}

export function buildEstimateMailto(
  data: EstimateFormData,
  labels: EstimateLabelSource = createEnglishLabelSource()
): string {
  const eventType = labels.eventType(data.eventType) ?? data.eventType;

  const subject = encodeURIComponent(
    `Event Drape Rental Estimate Request — ${eventType || "Montreal Event"}`
  );

  const bodyLines = [
    "Hi The Curtain Guy team,",
    "",
    "I'd like to request a final event drape rental estimate based on my planning brief:",
    "",
    buildEstimateBrief(data, labels),
    "",
    "Submitted via the Get Estimate builder on thecurtainguy.com",
  ];

  const body = encodeURIComponent(bodyLines.join("\n"));
  return `mailto:${siteConfig.email}?subject=${subject}&body=${body}`;
}
