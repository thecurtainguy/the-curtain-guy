import { imagePaths } from "@/data/site";

/** Canonical folder — swap a file here to update the catalog card without code changes. */
export const EVENT_BUILDER_IMAGE_ROOT = "/images/event-builder";

export type EventCatalogImageSlot = {
  /** Matches `EventCatalogItem.id` */
  catalogId: string;
  /** Filename under `public/images/event-builder/` */
  file: string;
  alt: string;
  /** Where the current file was sourced (for IMAGE-SOURCES.md updates) */
  sourcePath: string;
};

export const EVENT_CATALOG_IMAGE_SLOTS: EventCatalogImageSlot[] = [
  {
    catalogId: "backdrop_full",
    file: "backdrop-full.jpg",
    alt: "Full-width pleated white wedding backdrop behind ceremony space",
    sourcePath: "services/wedding-draping-service-01.jpg",
  },
  {
    catalogId: "backdrop_head_table",
    file: "backdrop-head-table.jpg",
    alt: "Sweetheart table backdrop with drapery and floral header",
    sourcePath: "gallery/wedding/03.jpg",
  },
  {
    catalogId: "backdrop_stage",
    file: "backdrop-stage.jpg",
    alt: "Red velvet stage curtain backdrop for DJ or presentation",
    sourcePath: "services/stage-backdrop-rental-01.jpg",
  },
  {
    catalogId: "entrance_door_drape",
    file: "entrance-door-drape.jpg",
    alt: "Decorated celebration entrance with draped fabric panels",
    sourcePath: "gallery/mitzvah/01.jpg",
  },
  {
    catalogId: "entrance_tunnel",
    file: "entrance-tunnel.jpg",
    alt: "Pipe and drape entrance tunnel with center opening",
    sourcePath: "gallery/pipe-and-drape/01.jpg",
  },
  {
    catalogId: "ceremony_chuppah",
    file: "ceremony-chuppah.jpg",
    alt: "Outdoor ceremony arch with white drapes and greenery",
    sourcePath: "services/wedding-hero.jpg",
  },
  {
    catalogId: "perimeter_full",
    file: "perimeter-full.jpg",
    alt: "Full ballroom perimeter pipe and drape transformation",
    sourcePath: "gallery/event-room-transformation-draping-01.jpg",
  },
  {
    catalogId: "perimeter_partial",
    file: "perimeter-partial.jpg",
    alt: "Corporate event space with soft draped wall panels",
    sourcePath: "services/corporate-hero.jpg",
  },
  {
    catalogId: "room_divider",
    file: "room-divider.jpg",
    alt: "Pipe and drape partition separating event zones",
    sourcePath: "gallery/pipe-and-drape/02.jpg",
  },
  {
    catalogId: "top_swag",
    file: "top-swag.jpg",
    alt: "Wedding draping with curved swag valance along wall",
    sourcePath: "gallery/wedding/02.jpg",
  },
  {
    catalogId: "addon_star_drape",
    file: "addon-star-drape.jpg",
    alt: "Celebration stage with sparkle drape and dramatic lighting",
    sourcePath: "gallery/celebration-draping-backdrop-01.jpg",
  },
  {
    catalogId: "addon_blackout",
    file: "addon-blackout.jpg",
    alt: "Black velvet drape texture for blackout masking",
    sourcePath: "gallery/black-velvet-drape-texture-01.jpg",
  },
  {
    catalogId: "addon_uplighting",
    file: "addon-uplighting.jpg",
    alt: "Theater stage with uplighting on draped backdrop",
    sourcePath: "gallery/stage/01.jpg",
  },
  {
    catalogId: "coming_ceiling_drape",
    file: "coming-ceiling-drape.jpg",
    alt: "Ballroom ceiling and perimeter draping inspiration",
    sourcePath: "gallery/gala-ballroom-draping-01.jpg",
  },
  {
    catalogId: "coming_tent_wrap",
    file: "coming-tent-wrap.jpg",
    alt: "Pipe and drape tent and pavilion wrap inspiration",
    sourcePath: "services/pipe-hero.jpg",
  },
  {
    catalogId: "coming_infinity_entrance",
    file: "coming-infinity-entrance.jpg",
    alt: "Multi-section pipe and drape entrance inspiration",
    sourcePath: "gallery/pipe-and-drape/02.jpg",
  },
  {
    catalogId: "coming_floral_header",
    file: "coming-floral-header.jpg",
    alt: "Backdrop with floral header and ceremony draping",
    sourcePath: "gallery/wedding/03.jpg",
  },
  {
    catalogId: "coming_layered_swag",
    file: "coming-layered-swag.jpg",
    alt: "Layered wedding swag draping along wall",
    sourcePath: "gallery/wedding/02.jpg",
  },
];

const slotByCatalogId = new Map(
  EVENT_CATALOG_IMAGE_SLOTS.map((slot) => [slot.catalogId, slot])
);

export function getEventCatalogImage(catalogId: string): {
  src: string;
  alt: string;
} {
  const slot = slotByCatalogId.get(catalogId);
  if (!slot) {
    return {
      src: `${imagePaths.services}/hub-hero.jpg`,
      alt: "Event draping setup",
    };
  }
  return {
    src: `${EVENT_BUILDER_IMAGE_ROOT}/${slot.file}`,
    alt: slot.alt,
  };
}

export function eventBuilderImagePath(file: string): string {
  return `${EVENT_BUILDER_IMAGE_ROOT}/${file}`;
}
