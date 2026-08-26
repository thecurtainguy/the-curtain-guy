import type { LucideIcon } from "lucide-react";
import {
  Columns3,
  DoorOpen,
  EyeOff,
  Layers,
  Lightbulb,
  PanelsTopLeft,
  Sparkles,
  Star,
  Waves,
} from "lucide-react";
import {
  createStudioItemId,
  type DrapeFabric,
  type DrapeRunType,
  type StudioDesignJson,
} from "@/data/studio";
import type { EventBuilderBrief } from "@/data/event-builder/brief";
import { getEventCatalogImage } from "@/data/event-builder/catalog-images";
import {
  calculateRoomAreaSquareFeet,
  createLShapeRoom,
  createRectangleRoom,
  feetToInches,
  getWallSegments,
} from "@/lib/studio-geometry";
import { createStudioTreatment } from "@/lib/studio-treatments";

export type EventCatalogCategory =
  | "backdrops"
  | "ceremony"
  | "perimeter"
  | "addons";

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
  briefOnly?: boolean;
  apply?: (design: StudioDesignJson, brief: EventBuilderBrief) => StudioDesignJson;
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

function mapFabricFromBrief(brief: EventBuilderBrief): DrapeFabric {
  const first = brief.look.fabricDirections[0];
  if (first === "sheer-overlay") return "sheer";
  if (first === "black-velvet" || first === "blackout-fabric") return "velvet";
  if (first === "star-drape") return "poly";
  return "velvet";
}

function applyLookToDesign(
  design: StudioDesignJson,
  brief: EventBuilderBrief,
  useBlackout = false
): StudioDesignJson {
  const fabric = useBlackout ? "velvet" : mapFabricFromBrief(brief);
  const color = useBlackout ? "black" : brief.look.primaryColor;
  const fullness = brief.look.fullness;

  return {
    ...design,
    drapeRuns: design.drapeRuns.map((run) => ({
      ...run,
      fabric,
      color,
      fullness,
    })),
    treatments: design.treatments.map((treatment) => ({
      ...treatment,
      fabric,
      color,
      secondaryColor: brief.look.primaryColor,
      fullness,
    })),
  };
}

function addDrapeRun(
  design: StudioDesignJson,
  type: DrapeRunType,
  wallIndex: number,
  partial = false
): StudioDesignJson {
  const walls = getWallSegments(design.room.floor);
  const wall = walls[wallIndex] ?? walls[0];
  if (!wall) return design;
  const startOffset = partial ? wall.length * 0.25 : 0;
  const endOffset = partial ? wall.length * 0.75 : wall.length;
  const id = createStudioItemId("drape");
  return {
    ...design,
    drapeRuns: [
      ...design.drapeRuns,
      {
        id,
        type,
        wallIndex: wall.index,
        startOffset,
        endOffset,
        height: Math.min(design.room.wallHeight, 144),
        fabric: "velvet",
        color: "ivory",
        fullness: 2,
        label:
          type === "wall_drape"
            ? `Wall ${wall.index + 1} drape`
            : type === "partial_drape"
              ? "Partial wall drape"
              : type === "backdrop"
                ? "Backdrop"
                : "Room divider",
      },
    ],
  };
}

function addTreatmentOnWall(
  design: StudioDesignJson,
  wallIndex: number,
  preset: "full_backdrop" | "side_tiebacks" | "entrance_reveal" | "top_swag" | "ceremony_arch"
): StudioDesignJson {
  const treatment = createStudioTreatment(design, wallIndex, preset);
  if (!treatment) return design;
  return {
    ...design,
    treatments: [...design.treatments, treatment],
  };
}

function addDoorOpening(design: StudioDesignJson, wallIndex: number): StudioDesignJson {
  const walls = getWallSegments(design.room.floor);
  const wall = walls[wallIndex] ?? walls[0];
  if (!wall) return design;
  const id = createStudioItemId("opening");
  return {
    ...design,
    openings: [
      ...design.openings,
      {
        id,
        type: "door",
        wallIndex: wall.index,
        offset: Math.max(0, wall.length / 2 - 18),
        width: Math.min(36, wall.length),
        label: "Door",
      },
    ],
  };
}

/** Wall 0 = front, 1 = right, 2 = back, 3 = left (rectangle rooms). */
export const EVENT_CATALOG_ITEMS: EventCatalogItem[] = [
  {
    id: "backdrop_full",
    label: "Full pleated backdrop",
    description: "Full-width pleated fabric on your main wall.",
    category: "backdrops",
    ...catalogImage("backdrop_full"),
    icon: PanelsTopLeft,
    apply: (design) => addTreatmentOnWall(design, 0, "full_backdrop"),
  },
  {
    id: "backdrop_head_table",
    label: "Head / sweetheart table backdrop",
    description: "Shorter backdrop behind the head table.",
    category: "backdrops",
    ...catalogImage("backdrop_head_table"),
    icon: PanelsTopLeft,
    apply: (design) => addTreatmentOnWall(design, 2, "full_backdrop"),
  },
  {
    id: "backdrop_stage",
    label: "Stage / DJ backdrop",
    description: "Backdrop behind stage or DJ setup.",
    category: "backdrops",
    ...catalogImage("backdrop_stage"),
    icon: PanelsTopLeft,
    apply: (design) => addTreatmentOnWall(design, 0, "full_backdrop"),
  },
  {
    id: "entrance_door_drape",
    label: "Door entrance drape",
    description: "Paired panels with tiebacks at the main entrance.",
    category: "ceremony",
    ...catalogImage("entrance_door_drape"),
    icon: DoorOpen,
    apply: (design) => {
      let next = addTreatmentOnWall(design, 0, "side_tiebacks");
      next = addDoorOpening(next, 0);
      return next;
    },
  },
  {
    id: "entrance_tunnel",
    label: "Draped doorway tunnel",
    description: "Entrance reveal with open center passage.",
    category: "ceremony",
    ...catalogImage("entrance_tunnel"),
    icon: DoorOpen,
    apply: (design) => addTreatmentOnWall(design, 0, "entrance_reveal"),
  },
  {
    id: "ceremony_chuppah",
    label: "Ceremony arch / chuppah",
    description: "Ceremony frame with panels and swag.",
    category: "ceremony",
    ...catalogImage("ceremony_chuppah"),
    icon: Sparkles,
    apply: (design) => addTreatmentOnWall(design, 0, "ceremony_arch"),
  },
  {
    id: "perimeter_full",
    label: "Full room perimeter drape",
    description: "Soft draping along every wall.",
    category: "perimeter",
    ...catalogImage("perimeter_full"),
    icon: Layers,
    apply: (design) => {
      const walls = getWallSegments(design.room.floor);
      let next = design;
      for (const wall of walls) {
        next = addDrapeRun(next, "wall_drape", wall.index, false);
      }
      return next;
    },
  },
  {
    id: "perimeter_partial",
    label: "Partial wall softening",
    description: "Draping on two key walls for atmosphere.",
    category: "perimeter",
    ...catalogImage("perimeter_partial"),
    icon: Layers,
    apply: (design) => {
      let next = addDrapeRun(design, "partial_drape", 0, true);
      next = addDrapeRun(next, "partial_drape", 2, true);
      return next;
    },
  },
  {
    id: "room_divider",
    label: "Room divider",
    description: "Fabric partition to separate zones.",
    category: "perimeter",
    ...catalogImage("room_divider"),
    icon: Columns3,
    apply: (design) => addDrapeRun(design, "divider", 1, false),
  },
  {
    id: "top_swag",
    label: "Top swag / valance",
    description: "Curved valance band along a wall.",
    category: "perimeter",
    ...catalogImage("top_swag"),
    icon: Waves,
    apply: (design) => addTreatmentOnWall(design, 0, "top_swag"),
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
    description: "Light-blocking fabric on backdrops.",
    category: "addons",
    ...catalogImage("addon_blackout"),
    icon: EyeOff,
    briefOnly: true,
  },
  {
    id: "addon_uplighting",
    label: "Uplighting",
    description: "Ambient lighting — consult required.",
    category: "addons",
    ...catalogImage("addon_uplighting"),
    icon: Lightbulb,
    consultRequired: true,
    briefOnly: true,
  },
  {
    id: "coming_ceiling_drape",
    label: "Ceiling draping",
    description: "Coming soon in Studio.",
    category: "addons",
    ...catalogImage("coming_ceiling_drape"),
    icon: Layers,
    comingSoon: true,
  },
  {
    id: "coming_tent_wrap",
    label: "Tent / pavilion wrap",
    description: "Coming soon in Studio.",
    category: "addons",
    ...catalogImage("coming_tent_wrap"),
    icon: Layers,
    comingSoon: true,
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
    id: "coming_floral_header",
    label: "Floral header",
    description: "Coming soon in Studio.",
    category: "backdrops",
    ...catalogImage("coming_floral_header"),
    icon: Sparkles,
    comingSoon: true,
  },
  {
    id: "coming_layered_swag",
    label: "Layered swag",
    description: "Coming soon in Studio.",
    category: "backdrops",
    ...catalogImage("coming_layered_swag"),
    icon: Waves,
    comingSoon: true,
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
    return item?.category === category;
  }).length;
}

export function getEventCatalogLabel(id: string): string {
  return getEventCatalogItem(id)?.label ?? id;
}

export function getSelectableCatalogItems(): EventCatalogItem[] {
  return EVENT_CATALOG_ITEMS.filter((item) => !item.comingSoon);
}

export function applyCatalogSelection(
  design: StudioDesignJson,
  brief: EventBuilderBrief
): StudioDesignJson {
  let next = design;
  const useBlackout =
    brief.catalogSelections.includes("addon_blackout") ||
    brief.addOns.includes("blackout-fabric");

  for (const id of brief.catalogSelections) {
    const item = getEventCatalogItem(id);
    if (!item?.apply || item.comingSoon) continue;
    next = item.apply(next, brief);
  }

  return applyLookToDesign(next, brief, useBlackout);
}

export function roomPreviewStats(brief: EventBuilderBrief): {
  areaSqFt: number;
  ceilingLabel: string;
} {
  const floor =
    brief.room.shape === "l_shape"
      ? createLShapeRoom(
          feetToInches(brief.room.widthFt),
          feetToInches(brief.room.lengthFt),
          feetToInches(brief.room.cutoutWidthFt ?? 20),
          feetToInches(brief.room.cutoutDepthFt ?? 20)
        )
      : createRectangleRoom(
          feetToInches(brief.room.widthFt),
          feetToInches(brief.room.lengthFt)
        );
  const areaSqFt = Math.round(calculateRoomAreaSquareFeet(floor));
  return {
    areaSqFt,
    ceilingLabel: `${brief.room.wallHeightFt}′ ceiling`,
  };
}
