import type { LucideIcon } from "lucide-react";
import {
  Building2,
  EyeOff,
  Layers,
  LayoutGrid,
  PartyPopper,
  Theater,
} from "lucide-react";

export type GallerySlot = {
  id: string;
  label: string;
  description: string;
  category: GalleryCategoryId;
  icon: LucideIcon;
  /** Optional path when real photography is ready */
  image?: string;
  alt?: string;
};

export type GalleryCategoryId =
  | "wedding"
  | "pipe-and-drape"
  | "stage"
  | "corporate"
  | "blackout"
  | "mitzvah";

export type GalleryCategory = {
  id: GalleryCategoryId;
  label: string;
  description: string;
  icon: LucideIcon;
  serviceHref?: string;
};

export const galleryCategories: GalleryCategory[] = [
  {
    id: "wedding",
    label: "Wedding draping",
    description: "Ceremony backdrops, reception softening, and photo moments.",
    icon: Layers,
    serviceHref: "/services/wedding-draping",
  },
  {
    id: "pipe-and-drape",
    label: "Pipe and drape",
    description: "Modular walls, partitions, and venue zoning.",
    icon: LayoutGrid,
    serviceHref: "/services/pipe-and-drape-rental",
  },
  {
    id: "stage",
    label: "Stage backdrops",
    description: "Presentation, ceremony, and entertainment focal planes.",
    icon: Theater,
    serviceHref: "/services/stage-backdrop-rentals",
  },
  {
    id: "corporate",
    label: "Corporate / gala",
    description: "Conferences, launches, and polished ballroom draping.",
    icon: Building2,
    serviceHref: "/services/corporate-event-draping",
  },
  {
    id: "blackout",
    label: "Blackout / masking",
    description: "Light control, concealment, and room dividers.",
    icon: EyeOff,
    serviceHref: "/services/blackout-room-divider-drapes",
  },
  {
    id: "mitzvah",
    label: "Bar / Bat Mitzvah",
    description: "Celebration rooms, entrances, and stage focus.",
    icon: PartyPopper,
    serviceHref: "/services/bar-bat-mitzvah-draping",
  },
];

/** Honest photo slots — CSS placeholders until owner photography is added */
export const gallerySlots: GallerySlot[] = [
  {
    id: "wedding-ceremony",
    label: "Wedding ceremony backdrop",
    description: "Photo slot for ceremony focal draping.",
    category: "wedding",
    icon: Layers,
  },
  {
    id: "wedding-reception",
    label: "Reception room draping",
    description: "Photo slot for reception perimeter and softening.",
    category: "wedding",
    icon: Layers,
  },
  {
    id: "pipe-wall",
    label: "Pipe and drape wall",
    description: "Photo slot for modular event walls.",
    category: "pipe-and-drape",
    icon: LayoutGrid,
  },
  {
    id: "pipe-partition",
    label: "Temporary partition",
    description: "Photo slot for zoning and registration areas.",
    category: "pipe-and-drape",
    icon: LayoutGrid,
  },
  {
    id: "stage-black",
    label: "Black stage backdrop",
    description: "Photo slot for presentation stage draping.",
    category: "stage",
    icon: Theater,
  },
  {
    id: "stage-surround",
    label: "Stage surround",
    description: "Photo slot for wing masking and surrounds.",
    category: "stage",
    icon: Theater,
  },
  {
    id: "corporate-gala",
    label: "Gala ballroom polish",
    description: "Photo slot for corporate and gala draping.",
    category: "corporate",
    icon: Building2,
  },
  {
    id: "corporate-sponsor",
    label: "Sponsor / media wall",
    description: "Photo slot for brand and photo backdrops.",
    category: "corporate",
    icon: Building2,
  },
  {
    id: "blackout-window",
    label: "Blackout masking",
    description: "Photo slot for light control and window masking.",
    category: "blackout",
    icon: EyeOff,
  },
  {
    id: "room-divider",
    label: "Room divider drapes",
    description: "Photo slot for temporary room division.",
    category: "blackout",
    icon: EyeOff,
  },
  {
    id: "mitzvah-room",
    label: "Celebration room",
    description: "Photo slot for mitzvah room transformation.",
    category: "mitzvah",
    icon: PartyPopper,
  },
  {
    id: "mitzvah-entrance",
    label: "Entrance / photo moment",
    description: "Photo slot for entrance reveals and family photos.",
    category: "mitzvah",
    icon: PartyPopper,
  },
];
