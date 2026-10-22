import {
  DEFAULT_STUDIO_MATERIALS,
  LINEN_OBJECT_TYPES,
  SEATED_OBJECT_TYPES,
  STUDIO_DESIGN_VERSION,
  STUDIO_MAX_OBJECTS,
  normalizeStudioDesign,
  validateStudioDesign,
  type StudioCeilingDrape,
  type StudioDesignJson,
  type StudioObject,
  type StudioTreatment,
} from "@/data/studio";
import {
  STUDIO_CEILING_PRESETS,
  type StudioCeilingPreset,
} from "@/data/studio-ceiling-presets";
import {
  getBriefCeilingPreset,
  getBriefFabric,
  getBriefGuestCount,
  getBriefLayout,
  getBriefLightingMood,
  getBriefOpenings,
  getBriefUplightColor,
  getBriefVenuePreset,
  type EventBuilderBrief,
} from "@/data/event-builder/brief";
import {
  applyCatalogSelection,
  createEventCatalogContext,
  getEventCatalogItem,
} from "@/data/event-builder/catalog";
import {
  isStudioLayoutKey,
  layoutCountForGuests,
  layoutDefaultSpacing,
} from "@/data/event-builder/wizard-options";
import { createOpeningFromPreset } from "@/data/studio-openings";
import { generateStudioLayout } from "@/components/studio/library/studio-layout-generators";
import { createCeilingDrape } from "@/lib/studio-ceiling";
import { calculateDrapeLength, getWallSegments } from "@/lib/studio-geometry";
import { buildBriefRoom } from "@/lib/event-builder/brief-room";
import {
  computeEventWallRoles,
  type EventWallRoles,
} from "@/lib/event-builder/wall-roles";

function baseDesign(brief: EventBuilderBrief): StudioDesignJson {
  const preset = getBriefVenuePreset(brief);
  const name = brief.venueName?.trim() || preset?.roomName || "Main room";
  return {
    version: STUDIO_DESIGN_VERSION,
    units: "inches",
    room: buildBriefRoom(brief, name),
    openings: [],
    objects: [],
    drapeRuns: [],
    treatments: [],
    ceilingDrapes: [],
    view: { cameraMode: "orbit", transparentWalls: false },
    materials: {
      floor: brief.finishes?.floor ?? preset?.floorFinish ?? DEFAULT_STUDIO_MATERIALS.floor,
      walls: brief.finishes?.walls ?? preset?.wallFinish ?? DEFAULT_STUDIO_MATERIALS.walls,
      lighting: getBriefLightingMood(brief),
      uplightColor: getBriefUplightColor(brief),
      ceiling: "auto",
    },
    notes: "",
  };
}

/** Places the brief's doors and windows on their role walls. */
function addOpenings(
  design: StudioDesignJson,
  brief: EventBuilderBrief,
  roles: EventWallRoles
): StudioDesignJson {
  const walls = getWallSegments(design.room.floor);
  let next = design;
  for (const entry of getBriefOpenings(brief)) {
    const wall = walls[roles[entry.wall]];
    if (!wall || wall.length < 24) continue;
    const opening = createOpeningFromPreset(next, entry.style, wall.index, wall.length);
    next = { ...next, openings: [...next.openings, opening] };
  }
  return next;
}

function ceilingDrapeFor(
  preset: StudioCeilingPreset,
  design: StudioDesignJson,
  brief: EventBuilderBrief
): StudioCeilingDrape {
  const accent = brief.look.accentColor;
  const target = brief.look.accentTarget ?? "both";
  return createCeilingDrape(preset.style, design.room.floor, {
    ...preset.overrides,
    ...(accent && target !== "treatments" ? { color: accent } : {}),
  });
}

function addCeiling(design: StudioDesignJson, brief: EventBuilderBrief): StudioDesignJson {
  const preset = getBriefCeilingPreset(brief);
  if (!preset) return design;
  return {
    ...design,
    ceilingDrapes: [ceilingDrapeFor(preset, design, brief)],
    view: { ...design.view, showCeiling: true },
  };
}

function addLayout(design: StudioDesignJson, brief: EventBuilderBrief): StudioDesignJson {
  const layout = getBriefLayout(brief);
  if (!isStudioLayoutKey(layout.id)) return design;
  const guests = getBriefGuestCount(brief);
  const result = generateStudioLayout(
    design,
    layout.id,
    layoutCountForGuests(layout.id, guests),
    layoutDefaultSpacing(layout.id)
  );
  const objects = result.objects
    .slice(0, Math.max(0, STUDIO_MAX_OBJECTS - design.objects.length))
    .map((object): StudioObject => {
      let next: StudioObject = object;
      if (
        layout.chairStyle &&
        SEATED_OBJECT_TYPES.includes(object.type) &&
        object.chairStyle !== "none" &&
        object.type !== "lounge_area"
      ) {
        next = { ...next, chairStyle: layout.chairStyle };
      }
      if (layout.linenColor !== undefined && LINEN_OBJECT_TYPES.includes(object.type)) {
        next = { ...next, linenColor: layout.linenColor };
      }
      if (layout.danceFloor && next.type === "dance_floor") {
        next = { ...next, finish: layout.danceFloor };
      }
      return next;
    });
  return { ...design, objects: [...design.objects, ...objects] };
}

/** Fabric, colours and fullness from the Look step onto every run and treatment. */
function applyLook(design: StudioDesignJson, brief: EventBuilderBrief): StudioDesignJson {
  const fabric = getBriefFabric(brief);
  const primary = brief.look.primaryColor;
  const accent = brief.look.accentColor ?? null;
  const target = brief.look.accentTarget ?? "both";
  const treatmentColor = accent && target !== "ceiling" ? accent : primary;
  const fullness = Math.min(4, Math.max(1, brief.look.fullness));
  const blackout =
    brief.catalogSelections.includes("addon_blackout") ||
    brief.addOns.includes("blackout-fabric");

  const isMaskingBackdrop = (treatment: StudioTreatment) =>
    blackout && treatment.type === "full_pleated_backdrop" && !treatment.hasFloralHeader;

  return {
    ...design,
    drapeRuns: design.drapeRuns.map((run) => ({
      ...run,
      fabric,
      color: primary,
      fullness,
      puddle: fullness >= 3 || undefined,
    })),
    treatments: design.treatments.map((treatment) =>
      isMaskingBackdrop(treatment)
        ? { ...treatment, fabric: "velvet", color: "black", fullness }
        : {
            ...treatment,
            fabric,
            color: treatment.type === "full_pleated_backdrop" ? primary : treatmentColor,
            secondaryColor: accent ?? treatment.secondaryColor,
            fullness,
          }
    ),
  };
}

function designNotes(brief: EventBuilderBrief): string {
  const parts = [
    brief.eventName?.trim(),
    brief.guestCount ? `${brief.guestCount} guests` : null,
    brief.eventDate?.trim() || null,
    [brief.venueName?.trim(), brief.cityArea?.trim()].filter(Boolean).join(", ") || null,
  ].filter(Boolean);
  return parts.length > 0 ? `Built with Build your event — ${parts.join(" · ")}`.slice(0, 1000) : "";
}

function isValid(design: StudioDesignJson): boolean {
  return validateStudioDesign(design).valid;
}

/**
 * A complete studio design for a wizard brief: venue room and finishes, doors
 * and windows on their role walls, every selected setup, ceiling drapery,
 * look and lighting, and a guest-count-sized furniture layout.
 *
 * Always returns a design that passes `validateStudioDesign`; if an optional
 * layer ever fails validation it is dropped rather than breaking the handoff.
 */
export function buildStarterDesignFromBrief(brief: EventBuilderBrief): StudioDesignJson {
  const room = baseDesign(brief);
  const roles = computeEventWallRoles(room.room.floor);
  const withOpenings = addOpenings(room, brief, roles);
  const base = isValid(withOpenings) ? withOpenings : room;

  const ctx = createEventCatalogContext(base, brief, roles);
  const withSetups = applyLook(applyCatalogSelection(base, brief, ctx), brief);
  const dressed = isValid(withSetups) ? withSetups : base;

  const withCeiling = addCeiling(dressed, brief);
  const ceilinged = isValid(withCeiling) ? withCeiling : dressed;

  const withLayout = addLayout(ceilinged, brief);
  const complete = isValid(withLayout) ? withLayout : ceilinged;

  return normalizeStudioDesign({ ...complete, notes: designNotes(brief) });
}

export function estimateLinearDrapeFromBrief(brief: EventBuilderBrief): number {
  return calculateDrapeLength(buildStarterDesignFromBrief(brief));
}

/**
 * Studio "add setup": applies one catalog item to an existing design, styled
 * with the brief's look. Existing runs and treatments keep their styling.
 * Returns null when the item has no studio placement or the result is invalid.
 */
export function addCatalogItemWithLook(
  design: StudioDesignJson,
  brief: EventBuilderBrief,
  itemId: string,
  targetWall?: number
): StudioDesignJson | null {
  const item = getEventCatalogItem(itemId);
  if (!item?.apply || item.briefOnly || item.comingSoon) return null;
  const ctx = { ...createEventCatalogContext(design, brief), targetWall };
  const applied = item.apply(design, ctx);
  const styled = applyLook(applied, brief);
  const runIds = new Set(design.drapeRuns.map((run) => run.id));
  const treatmentIds = new Set(design.treatments.map((treatment) => treatment.id));
  const next: StudioDesignJson = {
    ...applied,
    drapeRuns: applied.drapeRuns.map((run, index) =>
      runIds.has(run.id) ? run : styled.drapeRuns[index]
    ),
    treatments: applied.treatments.map((treatment, index) =>
      treatmentIds.has(treatment.id) ? treatment : styled.treatments[index]
    ),
  };
  if (isValid(next)) return next;
  return isValid(applied) && applied !== design ? applied : null;
}

/** Studio "add ceiling": appends a ceiling preset tinted by the brief's accent. */
export function addCeilingPresetWithLook(
  design: StudioDesignJson,
  brief: EventBuilderBrief,
  presetId: string
): StudioDesignJson | null {
  const preset = STUDIO_CEILING_PRESETS.find((entry) => entry.id === presetId);
  if (!preset) return null;
  const next: StudioDesignJson = {
    ...design,
    ceilingDrapes: [...(design.ceilingDrapes ?? []), ceilingDrapeFor(preset, design, brief)],
    view: { ...design.view, showCeiling: true },
  };
  return isValid(next) ? next : null;
}
