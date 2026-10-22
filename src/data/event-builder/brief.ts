import {
  DANCE_FLOOR_FINISHES,
  DRAPE_COLORS,
  DRAPE_FABRICS,
  STUDIO_CHAIR_STYLES,
  STUDIO_FLOOR_FINISHES,
  STUDIO_LIGHTING_MOODS,
  STUDIO_OPENING_STYLES,
  STUDIO_WALL_FINISHES,
  type DanceFloorFinish,
  type DrapeColor,
  type DrapeFabric,
  type StudioChairStyle,
  type StudioFloorFinish,
  type StudioLightingMood,
  type StudioOpeningStyle,
  type StudioPoint,
  type StudioWallFinish,
} from "@/data/studio";
import { STUDIO_CEILING_PRESETS } from "@/data/studio-ceiling-presets";
import { STUDIO_VENUE_PRESETS } from "@/data/studio-venue-presets";

export const EVENT_BUILDER_BRIEF_STORAGE_KEY = "tcg-event-builder-brief-v1";
export const EVENT_BUILDER_BRIEF_BACKUP_KEY = "tcg-event-builder-brief-v1-backup";
export const EVENT_BUILDER_STEP_STORAGE_KEY = "tcg-event-builder-step-v2";
export const ESTIMATE_PREFILL_FROM_EVENT_BUILDER_KEY =
  "tcg-estimate-prefill-from-event-builder-v1";
export const ESTIMATE_PREFILL_FROM_EVENT_BUILDER_BACKUP_KEY =
  "tcg-estimate-prefill-from-event-builder-v1-backup";

/** `custom` rooms come from a free-form venue preset (e.g. octagon pavilion). */
export type EventBuilderRoomShape = "rectangle" | "l_shape" | "custom";

/**
 * Wall roles used by the wizard instead of raw wall indexes. They are resolved
 * against the real floor polygon by `computeEventWallRoles`.
 */
export const EVENT_WALL_ROLES = ["front", "back", "left", "right"] as const;
export type EventWallRole = (typeof EVENT_WALL_ROLES)[number];

export type EventBuilderOpening = {
  id: string;
  style: StudioOpeningStyle;
  wall: EventWallRole;
};

/** Master layout keys mirrored from `STUDIO_LAYOUTS` plus "none". */
export const EVENT_LAYOUT_IDS = [
  "none",
  "banquet_grid",
  "banquet_rows",
  "classroom",
  "ceremony",
  "cocktail",
  "gala",
] as const;
export type EventLayoutId = (typeof EVENT_LAYOUT_IDS)[number];

export const EVENT_ACCENT_TARGETS = ["ceiling", "treatments", "both"] as const;
export type EventAccentTarget = (typeof EVENT_ACCENT_TARGETS)[number];

export type EventBuilderLook = {
  /** Legacy estimate fabric-direction ids; kept in sync for estimate/email readers. */
  fabricDirections: string[];
  primaryColor: DrapeColor;
  fullness: number;
  fabric?: DrapeFabric;
  /** Second colour for ceiling and/or treatments; null = single colour. */
  accentColor?: DrapeColor | null;
  accentTarget?: EventAccentTarget;
  lightingMood?: StudioLightingMood;
  /** Perimeter uplight wash; null = off. */
  uplightColor?: DrapeColor | null;
};

export type EventBuilderCeiling = {
  /** `STUDIO_CEILING_PRESETS` id; null = no ceiling drapery. */
  presetId: string | null;
};

export type EventBuilderLayout = {
  id: EventLayoutId;
  chairStyle?: StudioChairStyle;
  /** Table linen colour; null = bare tables. */
  linenColor?: DrapeColor | null;
  danceFloor?: DanceFloorFinish;
};

export type EventBuilderBrief = {
  version: 1;
  eventType: string;
  room: {
    shape: EventBuilderRoomShape;
    widthFt: number;
    lengthFt: number;
    wallHeightFt: number;
    cutoutWidthFt?: number;
    cutoutDepthFt?: number;
    /** `custom` rooms only: outline in inches, scaled to widthFt × lengthFt. */
    outline?: StudioPoint[];
  };
  catalogSelections: string[];
  look: EventBuilderLook;
  addOns: string[];
  eventName?: string;
  eventDate?: string;
  guestCount?: number;
  venueName?: string;
  cityArea?: string;
  /** `STUDIO_VENUE_PRESETS` key; null/undefined = custom size. */
  venuePreset?: string | null;
  finishes?: { floor: StudioFloorFinish; walls: StudioWallFinish };
  /** Undefined = wizard default (one main entrance on the back wall). */
  openings?: EventBuilderOpening[];
  ceiling?: EventBuilderCeiling;
  /** Undefined = default layout for the event type. */
  layout?: EventBuilderLayout;
};

export const DEFAULT_EVENT_BUILDER_BRIEF: EventBuilderBrief = {
  version: 1,
  eventType: "",
  room: {
    shape: "rectangle",
    widthFt: 40,
    lengthFt: 60,
    wallHeightFt: 12,
    cutoutWidthFt: 20,
    cutoutDepthFt: 20,
  },
  catalogSelections: [],
  look: {
    fabricDirections: [],
    primaryColor: "ivory",
    fullness: 2,
  },
  addOns: [],
};

/** Event type used when the first step is skipped. */
export const EVENT_BUILDER_FALLBACK_EVENT_TYPE = "other";
export const EVENT_BUILDER_DEFAULT_GUESTS = 120;
export const EVENT_BUILDER_MAX_GUESTS = 20000;

export const DEFAULT_EVENT_OPENINGS: EventBuilderOpening[] = [
  { id: "main-entrance", style: "double_door", wall: "back" },
];

const DEFAULT_LAYOUT_BY_EVENT: Record<string, EventLayoutId> = {
  wedding: "banquet_grid",
  corporate: "classroom",
  gala: "gala",
  mitzvah: "gala",
  "stage-show": "classroom",
  "trade-show": "cocktail",
  private: "cocktail",
  other: "banquet_grid",
};

export function getBriefOpenings(brief: EventBuilderBrief): EventBuilderOpening[] {
  return brief.openings ?? DEFAULT_EVENT_OPENINGS;
}

export function getBriefLayout(brief: EventBuilderBrief): EventBuilderLayout {
  return (
    brief.layout ?? {
      id: DEFAULT_LAYOUT_BY_EVENT[brief.eventType] ?? "banquet_grid",
    }
  );
}

export function getBriefGuestCount(brief: EventBuilderBrief): number {
  return brief.guestCount && brief.guestCount > 0
    ? brief.guestCount
    : EVENT_BUILDER_DEFAULT_GUESTS;
}

export function getBriefVenuePreset(brief: EventBuilderBrief) {
  if (!brief.venuePreset) return null;
  return STUDIO_VENUE_PRESETS.find((preset) => preset.key === brief.venuePreset) ?? null;
}

export function getBriefCeilingPreset(brief: EventBuilderBrief) {
  const id = brief.ceiling?.presetId;
  if (!id) return null;
  return STUDIO_CEILING_PRESETS.find((preset) => preset.id === id) ?? null;
}

/** Fabric from the explicit pick, else the legacy fabric direction. */
export function getBriefFabric(brief: EventBuilderBrief): DrapeFabric {
  if (brief.look.fabric) return brief.look.fabric;
  const first = brief.look.fabricDirections[0];
  if (first === "sheer-overlay") return "sheer";
  if (first === "star-drape") return "sequin";
  if (first === "champagne") return "satin";
  return "velvet";
}

export function getBriefLightingMood(brief: EventBuilderBrief): StudioLightingMood {
  return brief.look.lightingMood ?? getBriefVenuePreset(brief)?.lighting ?? "warm_gala";
}

/** Old drafts recorded uplighting as a catalog add-on. */
export function getBriefUplightColor(brief: EventBuilderBrief): DrapeColor | null {
  if (brief.look.uplightColor !== undefined) return brief.look.uplightColor;
  const legacy =
    brief.catalogSelections.includes("addon_uplighting") ||
    brief.addOns.includes("uplighting");
  return legacy ? "gold" : null;
}

/** Legacy fabric-direction ids that best describe a fabric + colour pick. */
export function fabricDirectionsFor(
  fabric: DrapeFabric,
  color: DrapeColor
): string[] {
  if (fabric === "sheer" || fabric === "chiffon") return ["sheer-overlay"];
  if (fabric === "sequin") return ["star-drape"];
  if (color === "black" && (fabric === "velvet" || fabric === "velour")) {
    return ["black-velvet"];
  }
  if (color === "champagne" || color === "gold") return ["champagne"];
  if (color === "ivory" || color === "white") return ["white-ivory"];
  return ["custom-color"];
}

function isFinitePositive(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function inOptions(
  options: ReadonlyArray<{ value: string }>,
  value: unknown
): boolean {
  return typeof value === "string" && options.some((option) => option.value === value);
}

function isColorOrNull(value: unknown): boolean {
  return value === null || inOptions(DRAPE_COLORS, value);
}

function isValidOutline(value: unknown): value is StudioPoint[] {
  return (
    Array.isArray(value) &&
    value.length >= 3 &&
    value.length <= 64 &&
    value.every(
      (point) =>
        isRecord(point) &&
        typeof point.x === "number" &&
        Number.isFinite(point.x) &&
        typeof point.z === "number" &&
        Number.isFinite(point.z)
    )
  );
}

function isValidOpening(value: unknown): value is EventBuilderOpening {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    value.id.length > 0 &&
    value.id.length <= 80 &&
    STUDIO_OPENING_STYLES.includes(value.style as StudioOpeningStyle) &&
    EVENT_WALL_ROLES.includes(value.wall as EventWallRole)
  );
}

function isValidLookExtras(look: Record<string, unknown>): boolean {
  if (look.fabric !== undefined && !inOptions(DRAPE_FABRICS, look.fabric)) return false;
  if (look.accentColor !== undefined && !isColorOrNull(look.accentColor)) return false;
  if (
    look.accentTarget !== undefined &&
    !EVENT_ACCENT_TARGETS.includes(look.accentTarget as EventAccentTarget)
  ) {
    return false;
  }
  if (
    look.lightingMood !== undefined &&
    !inOptions(STUDIO_LIGHTING_MOODS, look.lightingMood)
  ) {
    return false;
  }
  if (look.uplightColor !== undefined && !isColorOrNull(look.uplightColor)) return false;
  return true;
}

function isValidLayout(value: unknown): value is EventBuilderLayout {
  if (!isRecord(value)) return false;
  if (!EVENT_LAYOUT_IDS.includes(value.id as EventLayoutId)) return false;
  if (value.chairStyle !== undefined && !inOptions(STUDIO_CHAIR_STYLES, value.chairStyle)) {
    return false;
  }
  if (value.linenColor !== undefined && !isColorOrNull(value.linenColor)) return false;
  if (value.danceFloor !== undefined && !inOptions(DANCE_FLOOR_FINISHES, value.danceFloor)) {
    return false;
  }
  return true;
}

function isValidCeiling(value: unknown): value is EventBuilderCeiling {
  if (!isRecord(value)) return false;
  return (
    value.presetId === null ||
    (typeof value.presetId === "string" &&
      STUDIO_CEILING_PRESETS.some((preset) => preset.id === value.presetId))
  );
}

function isValidFinishes(value: unknown): boolean {
  return (
    isRecord(value) &&
    inOptions(STUDIO_FLOOR_FINISHES, value.floor) &&
    inOptions(STUDIO_WALL_FINISHES, value.walls)
  );
}

function isOptionalText(value: unknown): boolean {
  return value === undefined || (typeof value === "string" && value.length <= 2000);
}

/**
 * Version 1 briefs. Every field added after the first release is optional, so
 * drafts saved by older wizards still pass; present extension fields must be
 * well-formed.
 */
export function isEventBuilderBrief(value: unknown): value is EventBuilderBrief {
  if (!isRecord(value)) return false;
  const raw = value;
  if (raw.version !== 1) return false;
  if (typeof raw.eventType !== "string") return false;
  if (!isRecord(raw.room)) return false;
  const room = raw.room;
  if (room.shape !== "rectangle" && room.shape !== "l_shape" && room.shape !== "custom") {
    return false;
  }
  if (!isFinitePositive(room.widthFt) || !isFinitePositive(room.lengthFt)) {
    return false;
  }
  if (!isFinitePositive(room.wallHeightFt)) return false;
  if (room.shape === "custom" && !isValidOutline(room.outline)) return false;
  if (room.outline !== undefined && !isValidOutline(room.outline)) return false;
  if (!Array.isArray(raw.catalogSelections)) return false;
  if (!raw.catalogSelections.every((id) => typeof id === "string")) return false;
  if (!isRecord(raw.look)) return false;
  const look = raw.look;
  if (!Array.isArray(look.fabricDirections)) return false;
  if (typeof look.primaryColor !== "string") return false;
  if (!isFinitePositive(look.fullness)) return false;
  if (!isValidLookExtras(look)) return false;
  if (!Array.isArray(raw.addOns)) return false;
  if (
    !isOptionalText(raw.eventName) ||
    !isOptionalText(raw.eventDate) ||
    !isOptionalText(raw.venueName) ||
    !isOptionalText(raw.cityArea)
  ) {
    return false;
  }
  if (
    raw.guestCount !== undefined &&
    !(isFinitePositive(raw.guestCount) && raw.guestCount <= EVENT_BUILDER_MAX_GUESTS)
  ) {
    return false;
  }
  if (
    raw.venuePreset !== undefined &&
    raw.venuePreset !== null &&
    !STUDIO_VENUE_PRESETS.some((preset) => preset.key === raw.venuePreset)
  ) {
    return false;
  }
  if (raw.finishes !== undefined && !isValidFinishes(raw.finishes)) return false;
  if (
    raw.openings !== undefined &&
    !(Array.isArray(raw.openings) && raw.openings.length <= 24 && raw.openings.every(isValidOpening))
  ) {
    return false;
  }
  if (raw.ceiling !== undefined && !isValidCeiling(raw.ceiling)) return false;
  if (raw.layout !== undefined && !isValidLayout(raw.layout)) return false;
  return true;
}

/**
 * Drops malformed optional extension fields (e.g. a ceiling preset that was
 * since removed) so an otherwise valid saved draft still loads.
 */
function sanitizeBriefExtensions(value: unknown): unknown {
  if (!isRecord(value)) return value;
  const next: Record<string, unknown> = { ...value };
  if (next.venuePreset !== undefined && next.venuePreset !== null &&
    !STUDIO_VENUE_PRESETS.some((preset) => preset.key === next.venuePreset)) {
    delete next.venuePreset;
  }
  if (next.finishes !== undefined && !isValidFinishes(next.finishes)) delete next.finishes;
  if (next.openings !== undefined) {
    next.openings = Array.isArray(next.openings)
      ? next.openings.filter(isValidOpening).slice(0, 24)
      : undefined;
  }
  if (next.ceiling !== undefined && !isValidCeiling(next.ceiling)) delete next.ceiling;
  if (next.layout !== undefined && !isValidLayout(next.layout)) delete next.layout;
  if (
    next.guestCount !== undefined &&
    !(isFinitePositive(next.guestCount) && next.guestCount <= EVENT_BUILDER_MAX_GUESTS)
  ) {
    delete next.guestCount;
  }
  if (isRecord(next.look) && !isValidLookExtras(next.look)) {
    const look = { ...next.look };
    for (const key of ["fabric", "accentColor", "accentTarget", "lightingMood", "uplightColor"]) {
      delete look[key];
    }
    next.look = look;
  }
  return next;
}

export function parseEventBuilderBrief(value: unknown): EventBuilderBrief | null {
  const sanitized = sanitizeBriefExtensions(value);
  if (!isEventBuilderBrief(sanitized)) return null;
  return structuredClone(sanitized);
}

export function saveEventBuilderBrief(brief: EventBuilderBrief): void {
  const json = JSON.stringify(brief);
  try {
    window.sessionStorage.setItem(EVENT_BUILDER_BRIEF_STORAGE_KEY, json);
    window.localStorage.setItem(EVENT_BUILDER_BRIEF_BACKUP_KEY, json);
  } catch {
    // Storage is best-effort.
  }
}

/** Session-only draft (same tab). */
export function readEventBuilderBriefSession(): EventBuilderBrief | null {
  try {
    const sessionRaw = window.sessionStorage.getItem(
      EVENT_BUILDER_BRIEF_STORAGE_KEY
    );
    if (!sessionRaw) return null;
    return parseEventBuilderBrief(JSON.parse(sessionRaw));
  } catch {
    return null;
  }
}

/** localStorage backup from a prior session (not auto-applied on load). */
export function readEventBuilderBriefBackup(): EventBuilderBrief | null {
  try {
    const backupRaw = window.localStorage.getItem(EVENT_BUILDER_BRIEF_BACKUP_KEY);
    if (!backupRaw) return null;
    return parseEventBuilderBrief(JSON.parse(backupRaw));
  } catch {
    return null;
  }
}

export function readEventBuilderBrief(): EventBuilderBrief | null {
  const session = readEventBuilderBriefSession();
  if (session) return session;
  return readEventBuilderBriefBackup();
}

export function clearEventBuilderBrief(): void {
  try {
    window.sessionStorage.removeItem(EVENT_BUILDER_BRIEF_STORAGE_KEY);
    window.localStorage.removeItem(EVENT_BUILDER_BRIEF_BACKUP_KEY);
    window.sessionStorage.removeItem(EVENT_BUILDER_STEP_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function saveEventBuilderStep(stepIndex: number): void {
  try {
    window.sessionStorage.setItem(
      EVENT_BUILDER_STEP_STORAGE_KEY,
      String(stepIndex)
    );
  } catch {
    // ignore
  }
}

export function readEventBuilderStep(maxStep = 5): number {
  try {
    const raw = window.sessionStorage.getItem(EVENT_BUILDER_STEP_STORAGE_KEY);
    if (!raw) return 0;
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed < 0) return 0;
    return Math.min(parsed, maxStep);
  } catch {
    return 0;
  }
}

export function saveEstimatePrefillFromEventBuilder(
  prefill: Record<string, unknown>
): void {
  const json = JSON.stringify(prefill);
  try {
    window.sessionStorage.setItem(
      ESTIMATE_PREFILL_FROM_EVENT_BUILDER_KEY,
      json
    );
    window.localStorage.setItem(
      ESTIMATE_PREFILL_FROM_EVENT_BUILDER_BACKUP_KEY,
      json
    );
  } catch {
    // ignore
  }
}

export function readEstimatePrefillFromEventBuilder(): Record<
  string,
  unknown
> | null {
  try {
    const sessionRaw = window.sessionStorage.getItem(
      ESTIMATE_PREFILL_FROM_EVENT_BUILDER_KEY
    );
    if (sessionRaw) {
      const parsed = JSON.parse(sessionRaw);
      if (parsed && typeof parsed === "object") {
        return parsed as Record<string, unknown>;
      }
    }
    const backupRaw = window.localStorage.getItem(
      ESTIMATE_PREFILL_FROM_EVENT_BUILDER_BACKUP_KEY
    );
    if (backupRaw) {
      const parsed = JSON.parse(backupRaw);
      if (parsed && typeof parsed === "object") {
        return parsed as Record<string, unknown>;
      }
    }
  } catch {
    return null;
  }
  return null;
}

export function clearEstimatePrefillFromEventBuilder(): void {
  try {
    window.sessionStorage.removeItem(ESTIMATE_PREFILL_FROM_EVENT_BUILDER_KEY);
    window.localStorage.removeItem(
      ESTIMATE_PREFILL_FROM_EVENT_BUILDER_BACKUP_KEY
    );
  } catch {
    // ignore
  }
}

export function openStudioEventMode(): void {
  window.open("/studio/new?mode=event", "_blank", "noopener,noreferrer");
}

export function openStudioDesignerMode(): void {
  window.open("/studio/new?mode=designer", "_blank", "noopener,noreferrer");
}

export function openGetEstimateFromEventBuilder(): void {
  window.open("/get-estimate", "_blank", "noopener,noreferrer");
}

type StudioBuildHrefOptions = {
  newPlan?: boolean;
  edit?: string;
  from?: "admin" | "customer";
};

/** Canonical links into `/studio/build` (use `newPlan` for a blank wizard). */
export function studioBuildHref(options: StudioBuildHrefOptions = {}): string {
  const params = new URLSearchParams();
  if (options.newPlan) params.set("new", "1");
  if (options.edit) params.set("edit", options.edit);
  if (options.from === "admin") params.set("from", "admin");
  const query = params.toString();
  return query ? `/studio/build?${query}` : "/studio/build";
}
