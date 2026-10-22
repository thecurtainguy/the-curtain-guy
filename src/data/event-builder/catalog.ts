import type { LucideIcon } from "lucide-react";
import {
  AppWindow,
  Columns3,
  DoorOpen,
  EyeOff,
  Flower2,
  Layers,
  Lightbulb,
  PanelsTopLeft,
  Sparkles,
  Star,
  Waves,
} from "lucide-react";
import {
  createStudioItemId,
  type DrapeRunType,
  type StudioDesignJson,
  type StudioOpening,
  type StudioTreatment,
} from "@/data/studio";
import type { EventBuilderBrief, EventWallRole } from "@/data/event-builder/brief";
import { getEventCatalogImage } from "@/data/event-builder/catalog-images";
import {
  createOpeningFromPreset,
  isWalkThroughOpening,
} from "@/data/studio-openings";
import {
  calculateRoomAreaSquareFeet,
  clampTreatmentToWall,
  getWallSegments,
} from "@/lib/studio-geometry";
import {
  createStudioTreatment,
  createTreatmentForOpening,
  type StudioOpeningTreatmentKey,
  type StudioTreatmentPresetKey,
} from "@/lib/studio-treatments";
import { buildBriefFloor } from "@/lib/event-builder/brief-room";
import {
  computeEventWallRoles,
  type EventWallRoles,
} from "@/lib/event-builder/wall-roles";

export type EventCatalogCategory =
  | "backdrops"
  | "ceremony"
  | "perimeter"
  | "addons";

/**
 * Placement state shared by every catalog item applied in one build, so items
 * spread across walls instead of stacking on one.
 */
export type EventCatalogContext = {
  brief: EventBuilderBrief;
  roles: EventWallRoles;
  selections: ReadonlySet<string>;
  /** Walls holding a focal backdrop (stage, head table, floral header…). */
  claimed: Set<number>;
  /** Walls whose full width is already a pleated backdrop. */
  covered: Set<number>;
  /** Walls that already carry a swag valance. */
  swagged: Set<number>;
  /** Studio "add to selected wall" — overrides role placement. */
  targetWall?: number;
};

export type EventCatalogItem = {
  id: string;
  label: string;
  description: string;
  category: EventCatalogCategory;
  image: string;
  imageAlt: string;
  icon: LucideIcon;
  comingSoon?: boolean;
  consultRequired?: boolean;
  /** Recorded on the brief only; adds nothing to the design by itself. */
  briefOnly?: boolean;
  /** Kept for labels on older drafts; not offered in the picker. */
  hidden?: boolean;
  /** Short placement hint, e.g. "Front wall". */
  placement?: string;
  apply?: (design: StudioDesignJson, ctx: EventCatalogContext) => StudioDesignJson;
};

export const EVENT_CATALOG_CATEGORIES: Array<{
  id: EventCatalogCategory;
  label: string;
}> = [
  { id: "backdrops", label: "Backdrops & walls" },
  { id: "ceremony", label: "Ceremony & entrances" },
  { id: "perimeter", label: "Perimeter & dividers" },
  { id: "addons", label: "Add-ons & upgrades" },
];

function catalogImage(catalogId: string): { image: string; imageAlt: string } {
  const { src, alt } = getEventCatalogImage(catalogId);
  return { image: src, imageAlt: alt };
}

function withTreatment(
  design: StudioDesignJson,
  treatment: StudioTreatment | null
): StudioDesignJson {
  if (!treatment) return design;
  return { ...design, treatments: [...design.treatments, treatment] };
}

function claimFocalWall(
  ctx: EventCatalogContext,
  prefer: EventWallRole[]
): number | null {
  if (ctx.targetWall !== undefined) return ctx.targetWall;
  for (const role of prefer) {
    const index = ctx.roles[role];
    if (!ctx.claimed.has(index)) {
      ctx.claimed.add(index);
      return index;
    }
  }
  return null;
}

function swagWall(ctx: EventCatalogContext): number {
  if (ctx.targetWall !== undefined) return ctx.targetWall;
  const order = [...ctx.claimed, ctx.roles.front, ctx.roles.right, ctx.roles.left];
  const pick = order.find((index) => !ctx.swagged.has(index)) ?? ctx.roles.front;
  ctx.swagged.add(pick);
  return pick;
}

function addBackdrop(
  design: StudioDesignJson,
  ctx: EventCatalogContext,
  wallIndex: number | null,
  preset: StudioTreatmentPresetKey,
  label: string,
  width?: number
): StudioDesignJson {
  if (wallIndex === null) return design;
  const base = createStudioTreatment(design, wallIndex, preset);
  if (!base) return design;
  const wallLength = getWallSegments(design.room.floor)[wallIndex]?.length ?? 0;
  let treatment: StudioTreatment = { ...base, label };
  if (width && wallLength > width) {
    const startOffset = (wallLength - width) / 2;
    treatment = clampTreatmentToWall(
      {
        ...treatment,
        anchor: { ...treatment.anchor, startOffset, endOffset: startOffset + width },
        height: Math.min(design.room.wallHeight, 120),
      },
      design.room.floor
    );
  } else if (preset === "full_backdrop") {
    ctx.covered.add(wallIndex);
  }
  return withTreatment(design, treatment);
}

function addDrapeRun(
  design: StudioDesignJson,
  type: DrapeRunType,
  wallIndex: number,
  label: string,
  span: [number, number] = [0, 1]
): StudioDesignJson {
  const wall = getWallSegments(design.room.floor)[wallIndex];
  if (!wall || wall.length < 24) return design;
  return {
    ...design,
    drapeRuns: [
      ...design.drapeRuns,
      {
        id: createStudioItemId("drape"),
        type,
        wallIndex: wall.index,
        startOffset: wall.length * span[0],
        endOffset: wall.length * span[1],
        height: Math.min(design.room.wallHeight, 192),
        fabric: "velvet",
        color: "ivory",
        fullness: 2,
        label,
      },
    ],
  };
}

/** Doors and entrances, main entrance first (back wall, then widest). */
export function getWalkThroughOpenings(
  design: StudioDesignJson,
  roles: EventWallRoles
): StudioOpening[] {
  return design.openings
    .filter((opening) => isWalkThroughOpening(opening) && !opening.hidden)
    .sort((a, b) => {
      const aBack = a.wallIndex === roles.back ? 1 : 0;
      const bBack = b.wallIndex === roles.back ? 1 : 0;
      return bBack - aBack || b.width - a.width;
    });
}

/** Adds a pair of double doors on the back wall when the room has no doorway yet. */
function ensureEntrance(
  design: StudioDesignJson,
  roles: EventWallRoles
): StudioDesignJson {
  if (getWalkThroughOpenings(design, roles).length > 0) return design;
  const wall = getWallSegments(design.room.floor)[roles.back];
  if (!wall) return design;
  const opening = createOpeningFromPreset(design, "double_door", wall.index, wall.length);
  return { ...design, openings: [...design.openings, { ...opening, label: "Main entrance" }] };
}

function dressOpenings(
  design: StudioDesignJson,
  openings: StudioOpening[],
  key: StudioOpeningTreatmentKey
): StudioDesignJson {
  let next = design;
  for (const opening of openings) {
    next = withTreatment(next, createTreatmentForOpening(next, opening.id, key));
  }
  return next;
}

/**
 * Applied in this order (not click order) so backdrops claim walls before
 * perimeter draping skips them. Roles: front = focal wall (stage/altar side),
 * back = entrance side; see `computeEventWallRoles`.
 */
export const EVENT_CATALOG_ITEMS: EventCatalogItem[] = [
  {
    id: "backdrop_stage",
    label: "Stage / DJ backdrop",
    description: "Backdrop behind stage or DJ setup.",
    category: "backdrops",
    placement: "Front wall",
    ...catalogImage("backdrop_stage"),
    icon: PanelsTopLeft,
    apply: (design, ctx) =>
      addBackdrop(design, ctx, claimFocalWall(ctx, ["front"]), "full_backdrop", "Stage backdrop"),
  },
  {
    id: "backdrop_full",
    label: "Full pleated backdrop",
    description: "Full-width pleated fabric on your main wall.",
    category: "backdrops",
    placement: "Front wall",
    ...catalogImage("backdrop_full"),
    icon: PanelsTopLeft,
    apply: (design, ctx) =>
      addBackdrop(
        design,
        ctx,
        claimFocalWall(ctx, ["front", "right", "left"]),
        "full_backdrop",
        "Pleated backdrop"
      ),
  },
  {
    id: "floral_header",
    label: "Floral header",
    description: "Backdrop crowned with a floral garland.",
    category: "backdrops",
    placement: "Focal wall",
    ...catalogImage("floral_header"),
    icon: Flower2,
    apply: (design, ctx) =>
      addBackdrop(
        design,
        ctx,
        claimFocalWall(ctx, ["front", "right", "left"]),
        "floral_header",
        "Floral header backdrop"
      ),
  },
  {
    id: "backdrop_head_table",
    label: "Head / sweetheart table backdrop",
    description: "Shorter backdrop behind the head table.",
    category: "backdrops",
    placement: "Focal wall",
    ...catalogImage("backdrop_head_table"),
    icon: PanelsTopLeft,
    apply: (design, ctx) =>
      addBackdrop(
        design,
        ctx,
        claimFocalWall(ctx, ["front", "right", "left"]),
        "full_backdrop",
        "Head table backdrop",
        192
      ),
  },
  {
    id: "layered_swag",
    label: "Layered swag",
    description: "Two-tone scallops with jabot tails.",
    category: "backdrops",
    placement: "Over the focal wall",
    ...catalogImage("layered_swag"),
    icon: Waves,
    apply: (design, ctx) =>
      withTreatment(design, createStudioTreatment(design, swagWall(ctx), "layered_swag")),
  },
  {
    id: "ceremony_chuppah",
    label: "Ceremony arch / chuppah",
    description: "Ceremony frame with panels and swag.",
    category: "ceremony",
    placement: "Front wall",
    ...catalogImage("ceremony_chuppah"),
    icon: Sparkles,
    apply: (design, ctx) =>
      withTreatment(
        design,
        createStudioTreatment(design, ctx.targetWall ?? ctx.roles.front, "ceremony_arch")
      ),
  },
  {
    id: "entrance_tunnel",
    label: "Draped doorway tunnel",
    description: "Panels and a soft swag framing the main entrance.",
    category: "ceremony",
    placement: "Main entrance",
    ...catalogImage("entrance_tunnel"),
    icon: DoorOpen,
    apply: (design, ctx) => {
      const next = ensureEntrance(design, ctx.roles);
      const main = getWalkThroughOpenings(next, ctx.roles)[0];
      return main ? dressOpenings(next, [main], "door_surround") : next;
    },
  },
  {
    id: "entrance_door_drape",
    label: "Door entrance drape",
    description: "Tied-back sheer panels on every doorway.",
    category: "ceremony",
    placement: "Your doors",
    ...catalogImage("entrance_door_drape"),
    icon: DoorOpen,
    apply: (design, ctx) => {
      const next = ensureEntrance(design, ctx.roles);
      const doors = getWalkThroughOpenings(next, ctx.roles);
      const skipMain = ctx.selections.has("entrance_tunnel");
      return dressOpenings(next, skipMain ? doors.slice(1) : doors, "entrance_reveal");
    },
  },
  {
    id: "window_drapes",
    label: "Window drapes",
    description: "Floor-length panels and a swag on each window.",
    category: "ceremony",
    placement: "Your windows",
    ...catalogImage("top_swag"),
    icon: AppWindow,
    apply: (design) =>
      dressOpenings(
        design,
        design.openings.filter((opening) => opening.type === "window" && !opening.hidden),
        "window_surround"
      ),
  },
  {
    id: "coming_infinity_entrance",
    label: "Infinity entrance (3-section)",
    description: "Coming soon in Studio.",
    category: "ceremony",
    ...catalogImage("coming_infinity_entrance"),
    icon: DoorOpen,
    comingSoon: true,
  },
  {
    id: "perimeter_full",
    label: "Full room perimeter drape",
    description: "Soft draping along every wall — doors stay clear.",
    category: "perimeter",
    placement: "Every wall",
    ...catalogImage("perimeter_full"),
    icon: Layers,
    apply: (design, ctx) => {
      let next = design;
      for (const wall of getWallSegments(design.room.floor)) {
        if (ctx.covered.has(wall.index)) continue;
        next = addDrapeRun(next, "wall_drape", wall.index, `Wall ${wall.index + 1} drape`);
      }
      return next;
    },
  },
  {
    id: "perimeter_partial",
    label: "Partial wall softening",
    description: "Draping on the two side walls for atmosphere.",
    category: "perimeter",
    placement: "Side walls",
    ...catalogImage("perimeter_partial"),
    icon: Layers,
    apply: (design, ctx) => {
      if (ctx.selections.has("perimeter_full")) return design;
      if (ctx.targetWall !== undefined) {
        return addDrapeRun(design, "partial_drape", ctx.targetWall, "Partial wall drape", [0.25, 0.75]);
      }
      let next = addDrapeRun(design, "partial_drape", ctx.roles.left, "Left wall drape", [0.25, 0.75]);
      next = addDrapeRun(next, "partial_drape", ctx.roles.right, "Right wall drape", [0.25, 0.75]);
      return next;
    },
  },
  {
    id: "room_divider",
    label: "Room divider",
    description: "Fabric partition to separate zones.",
    category: "perimeter",
    placement: "Back wall",
    ...catalogImage("room_divider"),
    icon: Columns3,
    apply: (design, ctx) =>
      addDrapeRun(design, "divider", ctx.targetWall ?? ctx.roles.back, "Room divider", [0.15, 0.85]),
  },
  {
    id: "top_swag",
    label: "Top swag / valance",
    description: "Curved valance band along a wall.",
    category: "perimeter",
    placement: "Over the focal wall",
    ...catalogImage("top_swag"),
    icon: Waves,
    apply: (design, ctx) =>
      withTreatment(design, createStudioTreatment(design, swagWall(ctx), "top_swag")),
  },
  {
    id: "coming_tent_wrap",
    label: "Tent / pavilion wrap",
    description: "Coming soon in Studio.",
    category: "perimeter",
    ...catalogImage("coming_tent_wrap"),
    icon: Layers,
    comingSoon: true,
  },
  {
    id: "addon_star_drape",
    label: "Star drape look",
    description: "Sparkle fabric note for your brief.",
    category: "addons",
    ...catalogImage("addon_star_drape"),
    icon: Star,
    briefOnly: true,
  },
  {
    id: "addon_blackout",
    label: "Blackout masking",
    description: "Black velvet on backdrops to block light.",
    category: "addons",
    ...catalogImage("addon_blackout"),
    icon: EyeOff,
    briefOnly: true,
  },
  {
    id: "addon_uplighting",
    label: "Uplighting",
    description: "Now chosen in Look & lighting.",
    category: "addons",
    ...catalogImage("addon_uplighting"),
    icon: Lightbulb,
    briefOnly: true,
    hidden: true,
  },
  {
    id: "coming_ceiling_drape",
    label: "Ceiling draping",
    description: "Now chosen in the Ceiling step.",
    category: "addons",
    ...catalogImage("coming_ceiling_drape"),
    icon: Layers,
    hidden: true,
  },
];

export const EVENT_CATALOG_BUNDLES: Array<{
  id: string;
  label: string;
  selections: string[];
}> = [
  {
    id: "wedding_popular",
    label: "Popular for weddings",
    selections: ["ceremony_chuppah", "entrance_tunnel", "backdrop_full"],
  },
  {
    id: "corporate_stage",
    label: "Corporate stage",
    selections: ["backdrop_stage", "perimeter_partial", "entrance_door_drape"],
  },
  {
    id: "gala_glam",
    label: "Gala glamour",
    selections: ["perimeter_full", "layered_swag", "entrance_tunnel"],
  },
];

export function getEventCatalogItem(id: string): EventCatalogItem | undefined {
  return EVENT_CATALOG_ITEMS.find((item) => item.id === id);
}

export function countCatalogSelectionsForCategory(
  selections: string[],
  category: EventCatalogCategory
): number {
  return selections.filter((id) => {
    const item = getEventCatalogItem(id);
    return item?.category === category && !item.hidden;
  }).length;
}

export function getEventCatalogLabel(id: string): string {
  return getEventCatalogItem(id)?.label ?? id;
}

/** Items a customer can pick (excludes coming-soon and retired entries). */
export function getSelectableCatalogItems(): EventCatalogItem[] {
  return EVENT_CATALOG_ITEMS.filter((item) => !item.comingSoon && !item.hidden);
}

/** Items shown in the picker (coming-soon items render disabled). */
export function getVisibleCatalogItems(): EventCatalogItem[] {
  return EVENT_CATALOG_ITEMS.filter((item) => !item.hidden);
}

export function createEventCatalogContext(
  design: StudioDesignJson,
  brief: EventBuilderBrief,
  roles: EventWallRoles = computeEventWallRoles(design.room.floor)
): EventCatalogContext {
  return {
    brief,
    roles,
    selections: new Set(brief.catalogSelections),
    claimed: new Set(),
    covered: new Set(),
    swagged: new Set(),
  };
}

/** Adds every selected setup to the design (fabric and colour come later). */
export function applyCatalogSelection(
  design: StudioDesignJson,
  brief: EventBuilderBrief,
  ctx: EventCatalogContext = createEventCatalogContext(design, brief)
): StudioDesignJson {
  let next = design;
  for (const item of EVENT_CATALOG_ITEMS) {
    if (!ctx.selections.has(item.id) || !item.apply || item.comingSoon) continue;
    next = item.apply(next, ctx);
  }
  return next;
}

export function roomPreviewStats(brief: EventBuilderBrief): {
  areaSqFt: number;
  ceilingLabel: string;
} {
  const areaSqFt = Math.round(calculateRoomAreaSquareFeet(buildBriefFloor(brief)));
  return {
    areaSqFt,
    ceilingLabel: `${brief.room.wallHeightFt}′ ceiling`,
  };
}
