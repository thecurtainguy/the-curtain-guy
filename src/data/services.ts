import type { LucideIcon } from "lucide-react";
import {
  Building2,
  EyeOff,
  Layers,
  LayoutGrid,
  PartyPopper,
  Theater,
  Truck,
} from "lucide-react";

export type ServicePage = {
  slug: string;
  title: string;
  shortTitle: string;
  hubCardDescription: string;
  intro: string;
  whatItIs: string;
  bestUseCases: string[];
  planningFactors: string[];
  whatWeHandle: string[];
  faq: { question: string; answer: string }[];
  relatedSlugs: string[];
  keywords: string[];
  metaTitle: string;
  metaDescription: string;
  icon: LucideIcon;
  /** Optional real photo path under /public — omit for CSS placeholder */
  image?: string;
  imageAlt?: string;
};

export const services: ServicePage[] = [
  {
    slug: "wedding-draping",
    title: "Wedding Draping",
    shortTitle: "Wedding Draping",
    hubCardDescription:
      "Ceremony backdrops, reception room transformation, sweetheart tables, entrances, and photo areas for Montreal weddings.",
    intro:
      "Wedding draping in Montreal shapes atmosphere around your ceremony and reception — soft fabric walls, elegant backdrops, and venue softening that photographs beautifully without promising a one-size design.",
    whatItIs:
      "Wedding draping is temporary luxury fabric installed for your event day: ceremony focal points, reception perimeters, head-table backdrops, entrances, and photo moments. It is event rental draping — not residential curtains or window treatments.",
    bestUseCases: [
      "Ceremony backdrop and aisle framing",
      "Reception room perimeter and ceiling softening",
      "Sweetheart or head-table backdrop",
      "Entrance reveal and photo areas",
      "Venue walls that need a more polished look",
    ],
    planningFactors: [
      "Venue layout, ceiling height, and load-bearing options",
      "Ceremony vs. reception timing and room turns",
      "Fabric color, fullness, and lighting goals",
      "Guest flow, photo sightlines, and existing décor",
      "Delivery access, install window, and teardown schedule",
    ],
    whatWeHandle: [
      "Planning the drape layout around your venue",
      "Pipe and drape hardware where needed",
      "Delivery, professional installation, and teardown",
      "Coordination notes for your planner or venue",
    ],
    faq: [
      {
        question: "Can draping transform a wedding venue?",
        answer:
          "Yes. Temporary draping can mask unfinished walls, create ceremony focus, soften large ballrooms, and define photo moments — always planned around your specific room and timeline.",
      },
      {
        question: "What details help a wedding drape estimate?",
        answer:
          "Event date, venue name or address, guest count, ceremony and reception goals, preferred fabric look, and any floor plans or inspiration photos.",
      },
    ],
    relatedSlugs: [
      "pipe-and-drape-rental",
      "stage-backdrop-rentals",
      "blackout-room-divider-drapes",
    ],
    keywords: [
      "wedding draping Montreal",
      "wedding backdrop rental",
      "luxury wedding drape rental",
    ],
    metaTitle: "Wedding Draping Montreal",
    metaDescription:
      "Luxury wedding draping in Montreal — ceremony backdrops, reception room transformation, sweetheart tables, and photo areas. Full-service rental with delivery, install, and teardown.",
    icon: Layers,
  },
  {
    slug: "pipe-and-drape-rental",
    title: "Pipe and Drape Rental",
    shortTitle: "Pipe & Drape",
    hubCardDescription:
      "Modular drape walls, temporary partitions, registration areas, and venue zoning for Montreal events.",
    intro:
      "Pipe and drape rental in Montreal gives you modular fabric walls for zoning, masking, and polished temporary architecture — without construction.",
    whatItIs:
      "Pipe and drape is a modular upright-and-crossbar system dressed with fabric panels. It creates temporary walls, booths, corridors, and perimeter finishes for events, trade setups, and venue transformations.",
    bestUseCases: [
      "Temporary event walls and perimeter masking",
      "Registration and check-in areas",
      "Trade show or corporate booth framing",
      "Venue zoning and guest-flow corridors",
      "Back-of-house and storage concealment",
    ],
    planningFactors: [
      "Wall lengths, heights, and open spans",
      "Base plate and safety footprint in guest areas",
      "Fabric opacity, color, and finish",
      "Doorways, AV, catering paths, and fire egress",
      "Install and teardown windows at the venue",
    ],
    whatWeHandle: [
      "Hardware and fabric scoping for your layout",
      "Safe rigging with bases and ballast as needed",
      "Delivery, setup, and teardown",
      "Adjustments for venue rules and access",
    ],
    faq: [
      {
        question: "What is pipe and drape rental?",
        answer:
          "Pipe and drape rental is a temporary modular wall system using uprights, horizontals, and fabric panels — ideal for masking, zoning, and creating clean event architecture without permanent build-outs.",
      },
      {
        question: "Is pipe and drape only for trade shows?",
        answer:
          "No. It is widely used for weddings, galas, corporate events, and venue transformations whenever you need temporary walls, backdrops, or room definition.",
      },
    ],
    relatedSlugs: [
      "corporate-event-draping",
      "blackout-room-divider-drapes",
      "stage-backdrop-rentals",
    ],
    keywords: [
      "pipe and drape rental Montreal",
      "event drape wall rental",
      "temporary drape partitions",
    ],
    metaTitle: "Pipe and Drape Rental Montreal",
    metaDescription:
      "Pipe and drape rental in Montreal for modular event walls, partitions, registration areas, and venue zoning. Full-service delivery, installation, and teardown.",
    icon: LayoutGrid,
  },
  {
    slug: "corporate-event-draping",
    title: "Corporate Event Draping",
    shortTitle: "Corporate & Gala",
    hubCardDescription:
      "Conferences, product launches, galas, brand reveals, sponsor backdrops, and polished room masking.",
    intro:
      "Corporate event draping in Montreal elevates conferences, launches, and galas with clean staging, sponsor-ready backdrops, and rooms that feel intentional — not unfinished.",
    whatItIs:
      "Corporate and gala draping uses temporary fabric to polish venues, frame stages, hide clutter, and support brand moments. It is production-minded event rental, not décor shopping.",
    bestUseCases: [
      "Conference and keynote staging",
      "Product launches and brand reveals",
      "Gala ballroom perimeter and polish",
      "Sponsor and media backdrops",
      "Masking venue clutter and unfinished walls",
    ],
    planningFactors: [
      "Program flow, stage size, and brand colors",
      "Sponsor logo walls and photo requirements",
      "AV sightlines, lighting, and camera positions",
      "Guest capacity and room turn timing",
      "Load-in access and overnight security needs",
    ],
    whatWeHandle: [
      "Layout planning for stage and room polish",
      "Backdrop and perimeter fabric selection",
      "Delivery, installation, and teardown",
      "Coordination with planners, AV, and venues",
    ],
    faq: [
      {
        question: "Can draping work for both conferences and galas?",
        answer:
          "Yes. The same rental systems support daytime corporate polish and evening gala atmosphere — planned around your program, branding, and venue constraints.",
      },
      {
        question: "Do you provide brand-colored fabrics?",
        answer:
          "We plan fabric color and finish around your brand goals during the estimate brief. Exact inventory depends on the event and availability.",
      },
    ],
    relatedSlugs: [
      "stage-backdrop-rentals",
      "pipe-and-drape-rental",
      "wedding-draping",
    ],
    keywords: [
      "corporate event draping Montreal",
      "gala drape rental",
      "event backdrop rental",
    ],
    metaTitle: "Corporate Event Draping Montreal",
    metaDescription:
      "Corporate event and gala draping in Montreal — conferences, product launches, sponsor backdrops, and room polish. Full-service rental with install and teardown.",
    icon: Building2,
  },
  {
    slug: "stage-backdrop-rentals",
    title: "Stage Backdrop Rentals",
    shortTitle: "Stage Backdrops",
    hubCardDescription:
      "Stages, presentations, media walls, ceremonies, DJ areas, and production-friendly backdrop draping.",
    intro:
      "Stage backdrop rentals in Montreal give presentations, ceremonies, and performances a clean focal plane — production-friendly and tailored to your stage footprint.",
    whatItIs:
      "Stage backdrop draping is temporary fabric behind or around a stage or presentation area. It can include black masking, colored panels, surrounds, and media-friendly walls for cameras and lighting.",
    bestUseCases: [
      "Keynote and presentation stages",
      "Ceremony and entertainment platforms",
      "DJ and band backdrop framing",
      "Media and camera-friendly walls",
      "Black stage masking for productions",
    ],
    planningFactors: [
      "Stage width, height, and depth",
      "Lighting, LED walls, and camera angles",
      "Fabric color (often black or brand tone)",
      "Wing masking and backstage concealment",
      "Rigging points vs. freestanding systems",
    ],
    whatWeHandle: [
      "Backdrop sizing to your stage",
      "Masking and surround planning",
      "Hardware, delivery, install, and teardown",
      "Notes for AV and production teams",
    ],
    faq: [
      {
        question: "Do you offer black stage drape rental?",
        answer:
          "Yes. Black masking and stage drape are common for presentations and productions when you need a clean, light-controlled backdrop.",
      },
      {
        question: "Can a backdrop work with LED walls?",
        answer:
          "Often yes. We plan fabric around screens, truss, and camera sightlines so the stage reads clean without fighting your production design.",
      },
    ],
    relatedSlugs: [
      "corporate-event-draping",
      "blackout-room-divider-drapes",
      "pipe-and-drape-rental",
    ],
    keywords: [
      "stage backdrop rental Montreal",
      "event stage drapes",
      "black stage drape rental",
    ],
    metaTitle: "Stage Backdrop Rentals Montreal",
    metaDescription:
      "Stage backdrop rental in Montreal for presentations, ceremonies, DJ areas, and productions. Full-service event stage drapes with delivery, install, and teardown.",
    icon: Theater,
  },
  {
    slug: "blackout-room-divider-drapes",
    title: "Blackout & Room Divider Drapes",
    shortTitle: "Blackout & Dividers",
    hubCardDescription:
      "Blackout masking, room dividers, hiding storage and catering, and controlling visual lines.",
    intro:
      "Blackout and room divider drapes in Montreal control light and sightlines — hiding storage, catering, and AV while dividing large rooms into intentional zones.",
    whatItIs:
      "Blackout draping uses opaque fabric to block light and conceal areas. Room divider draping creates temporary partitions so one venue can host cocktail, dining, and program spaces without permanent walls.",
    bestUseCases: [
      "Window and skylight light control",
      "Hiding storage, catering, and back-of-house",
      "Dividing ballrooms into zones",
      "AV and production concealment",
      "Controlling guest visual lines",
    ],
    planningFactors: [
      "How dark the space needs to be",
      "Divider lengths and doorway placements",
      "Ceiling height and hardware footprint",
      "Guest flow vs. service corridors",
      "Fire egress and venue safety rules",
    ],
    whatWeHandle: [
      "Opacity and layout recommendations",
      "Divider and masking hardware",
      "Delivery, installation, and teardown",
      "Coordination with venue operations",
    ],
    faq: [
      {
        question: "When should you use blackout draping?",
        answer:
          "Use blackout draping when presentations, projections, or evening atmosphere need controlled light — or when windows and unfinished areas should disappear from guest view.",
      },
      {
        question: "Are room divider drapes permanent?",
        answer:
          "No. They are temporary rental partitions installed for your event and removed during teardown.",
      },
    ],
    relatedSlugs: [
      "pipe-and-drape-rental",
      "stage-backdrop-rentals",
      "corporate-event-draping",
    ],
    keywords: [
      "blackout drape rental Montreal",
      "room divider drapes",
      "event masking drapes",
    ],
    metaTitle: "Blackout & Room Divider Drapes Montreal",
    metaDescription:
      "Blackout drape rental and room divider drapes in Montreal for light control, masking, and venue zoning. Full-service delivery, installation, and teardown.",
    icon: EyeOff,
  },
  {
    slug: "bar-bat-mitzvah-draping",
    title: "Bar & Bat Mitzvah Draping",
    shortTitle: "Bar & Bat Mitzvah",
    hubCardDescription:
      "Celebration room transformation, stage and DJ backdrops, entrance reveals, and photo moments.",
    intro:
      "Bar and Bat Mitzvah draping in Montreal transforms celebration rooms with stage focus, entrance moments, and fabric that supports family photos and evening energy.",
    whatItIs:
      "Mitzvah draping is temporary event fabric for celebration venues — room transformation, stage or DJ backdrops, entrances, and photo areas planned around your theme and timeline.",
    bestUseCases: [
      "Full celebration room softening",
      "Stage, DJ, or entertainment backdrop",
      "Entrance reveal moments",
      "Photo and family backdrop areas",
      "Masking banquet-hall walls",
    ],
    planningFactors: [
      "Venue type and existing décor",
      "Theme colors and lighting goals",
      "Entertainment stage footprint",
      "Guest count and dance-floor layout",
      "Install timing around catering and décor",
    ],
    whatWeHandle: [
      "Layout planning for celebration flow",
      "Backdrop and perimeter draping",
      "Delivery, setup, and teardown",
      "Coordination with planners and venues",
    ],
    faq: [
      {
        question: "Can draping match a mitzvah theme?",
        answer:
          "We plan fabric color and placement around your celebration goals. Share theme notes and inspiration photos with your estimate brief so we can scope the right look.",
      },
      {
        question: "Do you handle banquet halls and community venues?",
        answer:
          "Yes. Many mitzvah celebrations use banquet halls and community venues — we plan around access, timing, and what the room already provides.",
      },
    ],
    relatedSlugs: [
      "wedding-draping",
      "stage-backdrop-rentals",
      "pipe-and-drape-rental",
    ],
    keywords: [
      "Bar Mitzvah draping Montreal",
      "Bat Mitzvah drape rental",
      "event draping Montreal",
    ],
    metaTitle: "Bar & Bat Mitzvah Draping Montreal",
    metaDescription:
      "Bar and Bat Mitzvah draping in Montreal — celebration room transformation, stage backdrops, entrances, and photo moments. Full-service rental with install and teardown.",
    icon: PartyPopper,
  },
];

export function getServiceBySlug(slug: string): ServicePage | undefined {
  return services.find((s) => s.slug === slug);
}

export function getRelatedServices(slug: string): ServicePage[] {
  const current = getServiceBySlug(slug);
  if (!current) return [];
  return current.relatedSlugs
    .map((related) => getServiceBySlug(related))
    .filter((s): s is ServicePage => Boolean(s));
}

/** Homepage / hub capability labels (honest, no fake stats) */
export const trustCapabilityLabels = [
  { label: "Weddings & celebrations", icon: Layers },
  { label: "Corporate & galas", icon: Building2 },
  { label: "Pipe & drape", icon: LayoutGrid },
  { label: "Backdrops & masking", icon: Theater },
  { label: "Delivery / install / teardown", icon: Truck },
] as const;
