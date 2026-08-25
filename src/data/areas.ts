import type { LucideIcon } from "lucide-react";
import { Building2, MapPin, Trees, Waves } from "lucide-react";

export type AreaPage = {
  slug: string;
  name: string;
  title: string;
  intro: string;
  servicesAvailable: string[];
  eventTypes: string[];
  planningNotes: string[];
  metaTitle: string;
  metaDescription: string;
  icon: LucideIcon;
  /** Related service slugs for internal links */
  relatedServiceSlugs: string[];
};

export const areas: AreaPage[] = [
  {
    slug: "montreal",
    name: "Montreal",
    title: "Luxury Event Drape Rentals in Montreal",
    intro:
      "Luxury event drape rentals in Montreal for weddings, galas, corporate events, stages, room dividers, and venue transformations — with full-service delivery, installation, and teardown.",
    servicesAvailable: [
      "Wedding draping and ceremony backdrops",
      "Pipe and drape rental for walls and zoning",
      "Corporate and gala draping",
      "Stage backdrop rentals",
      "Blackout and room divider drapes",
      "Bar and Bat Mitzvah celebration draping",
    ],
    eventTypes: [
      "Weddings and receptions",
      "Corporate conferences and launches",
      "Galas and fundraising evenings",
      "Bar and Bat Mitzvah celebrations",
      "Stage presentations and entertainment",
    ],
    planningNotes: [
      "Downtown and island venues often have tight load-in windows — share access details early.",
      "Ballrooms, hotels, lofts, and historic spaces each need different hardware footprints.",
      "Floor plans and venue photos help us scope pipe and drape accurately.",
      "We plan install and teardown around your ceremony, program, or dinner timing.",
    ],
    metaTitle: "Event Drape Rentals Montreal",
    metaDescription:
      "Luxury event drape rentals in Montreal for weddings, galas, corporate events, stages, and venue transformations. Full-service delivery, installation, and teardown.",
    icon: Building2,
    relatedServiceSlugs: [
      "wedding-draping",
      "pipe-and-drape-rental",
      "corporate-event-draping",
      "stage-backdrop-rentals",
    ],
  },
  {
    slug: "laval",
    name: "Laval",
    title: "Event Drape Rentals in Laval",
    intro:
      "Event drape rentals for Laval venues and celebrations, with planning for delivery, setup, installation, and teardown across banquet halls, hotels, and private event spaces.",
    servicesAvailable: [
      "Wedding and celebration draping",
      "Pipe and drape walls and partitions",
      "Corporate event and gala polish",
      "Stage and DJ backdrops",
      "Blackout masking and room dividers",
    ],
    eventTypes: [
      "Weddings and family celebrations",
      "Corporate meetings and evenings",
      "Community and banquet-hall events",
      "Milestone celebrations",
    ],
    planningNotes: [
      "Share venue name, address, and loading access for accurate delivery planning.",
      "Banquet halls often need perimeter masking and stage focus — tell us your priorities.",
      "Guest count and room layout help size dividers and backdrops.",
      "We schedule install and teardown around catering and décor timelines.",
    ],
    metaTitle: "Event Drape Rentals Laval",
    metaDescription:
      "Event drape rentals for Laval venues — weddings, corporate events, backdrops, and room masking with delivery, setup, installation, and teardown.",
    icon: MapPin,
    relatedServiceSlugs: [
      "wedding-draping",
      "pipe-and-drape-rental",
      "bar-bat-mitzvah-draping",
      "blackout-room-divider-drapes",
    ],
  },
  {
    slug: "longueuil",
    name: "Longueuil",
    title: "Event Drape Rentals in Longueuil & South Shore",
    intro:
      "Drape rental service for Longueuil and South Shore events, including weddings, corporate setups, backdrops, and room masking — planned with delivery and install logistics in mind.",
    servicesAvailable: [
      "Wedding draping and reception transformation",
      "Corporate and conference draping",
      "Stage backdrop rentals",
      "Pipe and drape partitions",
      "Blackout and masking drapes",
    ],
    eventTypes: [
      "Weddings and receptions",
      "Corporate and association events",
      "Galas and community celebrations",
      "Stage and entertainment programs",
    ],
    planningNotes: [
      "South Shore venues vary widely — hotel ballrooms, community halls, and private spaces.",
      "Allow time for ferry or bridge logistics when sharing your event day timeline.",
      "Upload floor plans or photos with your estimate request when available.",
      "We coordinate teardown so the venue is clear after your event.",
    ],
    metaTitle: "Event Drape Rentals Longueuil",
    metaDescription:
      "Event drape rental for Longueuil and South Shore — weddings, corporate setups, backdrops, and room masking with full-service delivery and installation.",
    icon: Waves,
    relatedServiceSlugs: [
      "wedding-draping",
      "corporate-event-draping",
      "stage-backdrop-rentals",
      "pipe-and-drape-rental",
    ],
  },
  {
    slug: "west-island",
    name: "West Island",
    title: "Event Drape Rentals on the West Island",
    intro:
      "Wedding and corporate draping for West Island venues, private events, banquet halls, and community spaces — with full-service rental planning from delivery through teardown.",
    servicesAvailable: [
      "Wedding ceremony and reception draping",
      "Corporate and private event polish",
      "Stage and photo backdrops",
      "Pipe and drape zoning",
      "Blackout and room divider drapes",
    ],
    eventTypes: [
      "Weddings and receptions",
      "Corporate and private dinners",
      "Community and banquet-hall celebrations",
      "Bar and Bat Mitzvah events",
    ],
    planningNotes: [
      "West Island venues range from banquet halls to clubs and private properties.",
      "Outdoor-adjacent spaces may need indoor masking for weather or light control.",
      "Share parking and loading notes so delivery and install run smoothly.",
      "Inspiration photos and measurements help us prepare a clear rental estimate follow-up.",
    ],
    metaTitle: "Event Drape Rentals West Island",
    metaDescription:
      "Wedding and corporate draping for West Island venues, banquet halls, and private events. Full-service event drape rental with delivery, install, and teardown.",
    icon: Trees,
    relatedServiceSlugs: [
      "wedding-draping",
      "corporate-event-draping",
      "bar-bat-mitzvah-draping",
      "blackout-room-divider-drapes",
    ],
  },
];

export function getAreaBySlug(slug: string): AreaPage | undefined {
  return areas.find((a) => a.slug === slug);
}
