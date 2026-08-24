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
import { siteConfig } from "@/data/site";

export type EstimateOption = {
  id: string;
  label: string;
  description?: string;
  icon?: LucideIcon;
};

export type EstimateStep = {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
};

export const estimateBuilderSteps: EstimateStep[] = [
  {
    id: "event-basics",
    title: "Event Basics",
    shortTitle: "Event",
    description: "Tell us about your event, venue, and guest count.",
  },
  {
    id: "drape-goal",
    title: "Drape Goal",
    shortTitle: "Goals",
    description: "What do you want the draping to achieve?",
  },
  {
    id: "measurements",
    title: "Measurements",
    shortTitle: "Measure",
    description: "Share what you know — we can help fill in the rest.",
  },
  {
    id: "look-fabric",
    title: "Look & Fabric",
    shortTitle: "Look",
    description: "Direction for fabric, color, and fullness.",
  },
  {
    id: "add-ons",
    title: "Add-ons",
    shortTitle: "Add-ons",
    description: "Optional enhancements for your setup.",
  },
  {
    id: "contact-summary",
    title: "Contact & Summary",
    shortTitle: "Summary",
    description: "Review your brief and share contact details.",
  },
];

export const eventTypes: EstimateOption[] = [
  { id: "wedding", label: "Wedding", icon: Layers },
  { id: "corporate", label: "Corporate Event", icon: Building2 },
  { id: "gala", label: "Gala", icon: Crown },
  { id: "mitzvah", label: "Bar/Bat Mitzvah", icon: PartyPopper },
  { id: "stage-show", label: "Stage/Show", icon: Theater },
  { id: "trade-show", label: "Trade Show", icon: LayoutGrid },
  { id: "private", label: "Private Event", icon: Sparkles },
  { id: "other", label: "Other", icon: Wand2 },
];

export const venueSettings: EstimateOption[] = [
  { id: "indoor", label: "Indoor", description: "Ballroom, hall, or enclosed venue" },
  { id: "outdoor", label: "Outdoor", description: "Tent, terrace, or open-air setup" },
];

export const drapeGoals: EstimateOption[] = [
  {
    id: "full-room",
    label: "Full room transformation",
    description: "Perimeter draping that reshapes the entire space",
    icon: LayoutGrid,
  },
  {
    id: "ceremony-backdrop",
    label: "Ceremony backdrop",
    description: "Framed focal point for vows and key moments",
    icon: Layers,
  },
  {
    id: "stage-backdrop",
    label: "Stage backdrop",
    description: "Presentation, performance, or program draping",
    icon: Theater,
  },
  {
    id: "room-divider",
    label: "Room divider",
    description: "Fabric partitions between zones or areas",
    icon: Columns3,
  },
  {
    id: "blackout-masking",
    label: "Blackout / masking",
    description: "Light control, window masking, or backstage concealment",
    icon: EyeOff,
  },
  {
    id: "photo-backdrop",
    label: "Photo / step-and-repeat backdrop",
    description: "Branded or elegant photo moment setup",
    icon: Camera,
  },
  {
    id: "entrance-reveal",
    label: "Entrance reveal",
    description: "Dramatic unveil or kabuki-style entrance moment",
    icon: Star,
  },
  {
    id: "trade-show-booth",
    label: "Trade show booth",
    description: "Pipe and drape booth walls and branding zones",
    icon: Building2,
  },
  {
    id: "vip-lounge",
    label: "VIP / lounge area",
    description: "Intimate draped lounge or premium guest zone",
    icon: Crown,
  },
  {
    id: "screen-surround",
    label: "Screen surround",
    description: "Draping around screens, LED walls, or projection",
    icon: Monitor,
  },
];

export const runLayouts: EstimateOption[] = [
  { id: "straight", label: "Straight run", description: "Single continuous drape line" },
  {
    id: "corners",
    label: "Multiple turns / corners",
    description: "L-shaped, U-shaped, or complex perimeter",
  },
  { id: "not-sure", label: "Not sure yet", description: "We can assess from your floor plan" },
];

export const floorPlanOptions: EstimateOption[] = [
  { id: "yes", label: "Yes", description: "I have a floor plan to share" },
  { id: "no", label: "No", description: "I don't have one yet" },
  { id: "not-sure", label: "Not sure", description: "I may be able to get one from the venue" },
];

export const measurementsKnownOptions: EstimateOption[] = [
  {
    id: "know",
    label: "I have measurements",
    description: "I can share linear feet, height, walls, or layout details",
  },
  {
    id: "partial",
    label: "I have some details",
    description: "A few numbers or venue info — not everything yet",
  },
  {
    id: "help",
    label: "Not sure — help me calculate",
    description: "Our team will help from your venue details or floor plan",
  },
];

export const heightOptions: EstimateOption[] = [
  { id: "8ft-under", label: "8 ft or under", description: "Lower ceiling or intimate room height" },
  { id: "10-12ft", label: "10–12 ft", description: "Typical ballroom or event hall height" },
  { id: "14ft-plus", label: "14 ft or higher", description: "Tall ceiling or grand venue volume" },
  {
    id: "not-sure",
    label: "Not sure — recommend for me",
    description: "We'll suggest the right height for your space",
  },
];

export const fabricDirections: EstimateOption[] = [
  {
    id: "black-velvet",
    label: "Black velvet / velour look",
    description: "Rich, theatrical depth and light absorption",
    icon: Moon,
  },
  {
    id: "white-ivory",
    label: "White / ivory drape",
    description: "Bright, elegant, and classic event finish",
    icon: Layers,
  },
  {
    id: "champagne",
    label: "Champagne / neutral",
    description: "Warm, refined tones for upscale atmospheres",
    icon: Sparkles,
  },
  {
    id: "sheer-overlay",
    label: "Sheer / soft overlay",
    description: "Layered translucency and soft ambient glow",
    icon: Wand2,
  },
  {
    id: "blackout-fabric",
    label: "Blackout / masking",
    description: "Maximum light control for stages and productions",
    icon: EyeOff,
  },
  {
    id: "star-drape",
    label: "Star drape",
    description: "Sparkling fiber-optic or LED star effect",
    icon: Star,
  },
  {
    id: "custom-color",
    label: "Custom color direction",
    description: "Brand colors or a specific palette in mind",
    icon: Wand2,
  },
  {
    id: "recommend",
    label: "Not sure, recommend for me",
    description: "Our team will suggest fabrics that fit your event",
    icon: Sparkles,
  },
];

export const fullnessOptions: EstimateOption[] = [
  { id: "clean-flat", label: "Clean / flat", description: "Minimal gather, modern and streamlined" },
  {
    id: "premium",
    label: "Premium fullness",
    description: "Balanced pleats with an elevated event finish",
  },
  {
    id: "luxury-deep",
    label: "Luxury deep pleats",
    description: "Maximum volume and dramatic fabric presence",
  },
  {
    id: "recommend",
    label: "Not sure, recommend for me",
    description: "Our team will suggest the right fullness",
  },
];

export const addOnOptions: EstimateOption[] = [
  { id: "uplighting", label: "Uplighting", icon: Lightbulb },
  { id: "star-drape", label: "Star drape", icon: Star },
  { id: "kabuki-reveal", label: "Kabuki / reveal moment", icon: Theater },
  { id: "event-carpet", label: "Event carpet", icon: LayoutGrid },
  { id: "stanchions", label: "Stanchions / ropes", icon: Columns3 },
  { id: "screen-surround", label: "Screen surround", icon: Monitor },
  { id: "dj-booth", label: "DJ / tech booth surround", icon: Music },
  { id: "step-repeat", label: "Step-and-repeat backdrop", icon: Camera },
  { id: "ceiling-draping", label: "Ceiling draping", icon: Layers },
  { id: "double-sided", label: "Double-sided drape", icon: Columns3 },
  { id: "premium-hardware", label: "Premium hardware finish", icon: Sparkles },
  { id: "rush-setup", label: "Rush setup / tight timeline", icon: Timer },
];

export const measurementsReassurance =
  "Not sure? No problem. The Curtain Guy team can help calculate this from your venue details or floor plan.";

export const estimateDisclaimer =
  "This is a planning brief, not final pricing. The Curtain Guy team will review details and confirm availability, measurements, labor, and final rental estimate.";

export const SUMMARY_NOT_SURE = "Not sure — team to review";
export const SUMMARY_NOT_PROVIDED = "Not provided";

export type StepValidationResult = {
  valid: boolean;
  message?: string;
};

const NOT_SURE_IDS = new Set(["not-sure", "help", "recommend"]);

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
        return {
          valid: false,
          message: "Select an event type so we know what kind of draping setup to plan.",
        };
      }
      if (!data.cityArea.trim()) {
        return {
          valid: false,
          message: "Add your city or area so we can confirm Montreal service coverage.",
        };
      }
      return { valid: true };
    }
    case "drape-goal": {
      if (data.drapeGoals.length === 0) {
        return {
          valid: false,
          message:
            "Choose at least one drape goal so we know what you're trying to create.",
        };
      }
      return { valid: true };
    }
    case "measurements": {
      if (!data.measurementsKnown) {
        return {
          valid: false,
          message:
            "Not sure on measurements? That's okay — select the option that says you need help calculating.",
        };
      }
      if (!data.floorPlanAvailable) {
        return {
          valid: false,
          message:
            "Let us know if you have a floor plan — or select Not sure if you're still checking with the venue.",
        };
      }
      return { valid: true };
    }
    case "look-fabric": {
      if (data.fabricDirections.length === 0) {
        return {
          valid: false,
          message:
            "Choose at least one fabric direction — or select Not sure, recommend for me.",
        };
      }
      return { valid: true };
    }
    case "add-ons":
      return { valid: true };
    case "contact-summary": {
      if (!data.name.trim()) {
        return {
          valid: false,
          message:
            "Add your name and email so our team can follow up on the estimate brief.",
        };
      }
      if (!data.email.trim() || !isValidEmail(data.email)) {
        return {
          valid: false,
          message:
            "Add a valid email address so our team can follow up on the estimate brief.",
        };
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
  options: EstimateOption[],
  id: string | undefined
): string {
  if (!id?.trim()) return SUMMARY_NOT_SURE;
  if (NOT_SURE_IDS.has(id)) return SUMMARY_NOT_SURE;
  return getOptionLabel(options, id) ?? id;
}

export function formatHeightSummaryValue(data: EstimateFormData): string {
  if (!data.heightNeeded?.trim()) return SUMMARY_NOT_SURE;
  if (NOT_SURE_IDS.has(data.heightNeeded)) return SUMMARY_NOT_SURE;
  const fromOption = getOptionLabel(heightOptions, data.heightNeeded);
  if (fromOption) return fromOption;
  return data.heightNeeded.trim();
}

export function buildEstimateMailto(data: EstimateFormData): string {
  const eventType = getOptionLabel(eventTypes, data.eventType) ?? data.eventType;
  const venueSetting =
    getOptionLabel(venueSettings, data.venueSetting) ?? data.venueSetting;
  const runLayout = formatOptionSummaryValue(runLayouts, data.runLayout);
  const floorPlan = formatOptionSummaryValue(
    floorPlanOptions,
    data.floorPlanAvailable
  );
  const fullness = formatOptionSummaryValue(
    fullnessOptions,
    data.fullnessPreference
  );
  const measurementsKnown =
    getOptionLabel(measurementsKnownOptions, data.measurementsKnown) ??
    data.measurementsKnown;

  const subject = encodeURIComponent(
    `Event Drape Rental Estimate Request — ${eventType || "Montreal Event"}`
  );

  const bodyLines = [
    "Hi The Curtain Guy team,",
    "",
    "I'd like to request a final event drape rental estimate based on my planning brief:",
    "",
    "--- EVENT BASICS ---",
    `Event type: ${eventType || "—"}`,
    `Event date: ${data.eventDate || "—"}`,
    `Venue: ${data.venueName || "—"}`,
    `City / area: ${data.cityArea || "—"}`,
    `Setting: ${venueSetting || "—"}`,
    `Guest count: ${data.guestCount || "—"}`,
    "",
    "--- DRAPE GOALS ---",
    getOptionLabels(drapeGoals, data.drapeGoals).join(", ") || "—",
    "",
    "--- MEASUREMENTS ---",
    `Measurement confidence: ${measurementsKnown || SUMMARY_NOT_SURE}`,
    `Linear feet: ${formatMeasurementSummaryValue(data.linearFeet)}`,
    `Height needed: ${formatHeightSummaryValue(data)}`,
    `Walls / sections: ${formatMeasurementSummaryValue(data.wallSections)}`,
    `Run layout: ${runLayout}`,
    `Doors / openings: ${formatMeasurementSummaryValue(data.doorsOpenings)}`,
    `Floor plan available: ${floorPlan}`,
    "",
    "--- LOOK & FABRIC ---",
    `Fabric direction: ${getOptionLabels(fabricDirections, data.fabricDirections).join(", ") || "—"}`,
    `Fullness: ${fullness || "—"}`,
    "",
    "--- ADD-ONS ---",
    getOptionLabels(addOnOptions, data.addOns).join(", ") || "None selected",
    "",
    "--- CONTACT ---",
    `Name: ${data.name || "—"}`,
    `Email: ${data.email || "—"}`,
    `Phone: ${data.phone || "—"}`,
    "",
    "--- NOTES ---",
    data.message || "—",
    "",
    "Submitted via the Get Estimate builder on thecurtainguy.com",
  ];

  const body = encodeURIComponent(bodyLines.join("\n"));
  return `mailto:${siteConfig.email}?subject=${subject}&body=${body}`;
}
