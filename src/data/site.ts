import type { LucideIcon } from "lucide-react";
import {
  Building2,
  Camera,
  Columns3,
  EyeOff,
  Layers,
  LayoutGrid,
  Moon,
  Package,
  Star,
  Theater,
  Truck,
  Upload,
  PenLine,
  Box,
  Wrench,
  RotateCcw,
  Crown,
  PartyPopper,
} from "lucide-react";

export const siteConfig = {
  name: "The Curtain Guy",
  tagline: "Event Draping & Rentals",
  motto: "Transform Spaces · Create Moments",
  domain: "thecurtainguy.com",
  email: "info@thecurtainguy.com",
  phone: "514-963-3193",
  phoneHref: "tel:+15149633193",
  location: "Montreal and surrounding areas",
  description:
    "Luxury event drape and curtain rentals in Montreal for weddings, corporate events, galas, Bar Mitzvah and Bat Mitzvah celebrations, stage backdrops, and venue transformations. Full-service rental with delivery, installation, and teardown — not window treatments or e-commerce curtain sales.",
  positioning:
    "The Curtain Guy is a luxury event drape rental company serving Montreal and surrounding areas. We provide temporary draping for live events — with full-service delivery, installation, and teardown — not residential window treatments or online curtain shopping.",
} as const;

/** Brand mark — full lockup (transparent PNG) */
export const brandLogo = {
  src: "/images/brand/logo-full.png",
  alt: "The Curtain Guy — Event Draping & Rentals. Transform Spaces · Create Moments",
  width: 1024,
  height: 1024,
} as const;

/** Horizontal lockup for site header — transparent PNG (skip Next optimizer) */
export const brandLogoHorizontal = {
  src: "/images/brand/logo-horizontal-lockup.png",
  alt: "The Curtain Guy — Event Draping & Rentals. Weddings · Socials · Corporate Events",
  width: 2008,
  height: 546,
} as const;

/** Base paths for photography assets under /public/images */
export const imagePaths = {
  brand: "/images/brand",
  hero: "/images/hero",
  gallery: "/images/gallery",
  services: "/images/services",
  about: "/images/about",
  ai: "/images/ai",
} as const;

export type ImageAsset = {
  /** Public path, e.g. `/images/gallery/weddings.jpg` */
  image?: string;
  alt?: string;
};

export const heroImage: ImageAsset = {
  image: `${imagePaths.hero}/luxury-event-drape-rentals-montreal-hero.jpg`,
  alt: "Ornate ballroom with stage and tiered seating for luxury event draping in Montreal",
};

export const aboutImage: ImageAsset = {
  image: `${imagePaths.about}/luxury-event-drape-rental-montreal-about.jpg`,
  alt: "Historic ballroom interior suited to full-service event drape rental and venue transformation",
};

export const aiStudioImage: ImageAsset = {
  image: `${imagePaths.ai}/event-drape-visualization-studio-01.jpg`,
  alt: "Vertical velvet stage curtains evoking interactive event drape studio visualization",
};

export type NavLink = {
  label: string;
  href: string;
  icon?: LucideIcon;
  special?: boolean;
};

export const navLinks: NavLink[] = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/services" },
  { label: "Gallery", href: "/gallery" },
  { label: "Get Estimate", href: "/get-estimate" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "Studio", href: "/studio", icon: Box, special: true },
];

export type TrustProcessItem = {
  label: string;
  icon: LucideIcon;
};

export const trustProcessItems: TrustProcessItem[] = [
  { label: "Full-service rental", icon: Package },
  { label: "Delivery", icon: Truck },
  { label: "Installation", icon: Wrench },
  { label: "Teardown", icon: RotateCcw },
];

export type TrustEventType = {
  label: string;
  icon: LucideIcon;
};

export const trustEventTypes: TrustEventType[] = [
  { label: "Wedding draping", icon: Layers },
  { label: "Corporate events", icon: Building2 },
  { label: "Galas", icon: Crown },
  { label: "Bar & Bat Mitzvah", icon: PartyPopper },
  { label: "Stage backdrops", icon: Theater },
];

export type TransformationCard = {
  title: string;
  description: string;
  icon: LucideIcon;
};

export const transformationCards: TransformationCard[] = [
  {
    title: "Mask unfinished venue walls",
    description:
      "Pipe and drape and perimeter draping hide dated ballrooms, concrete, and blank walls — turning an ordinary room into an elegant event space.",
    icon: Building2,
  },
  {
    title: "Create ceremony and reception backdrops",
    description:
      "Wedding draping and luxury fabric backdrops frame your most important moments, adding depth, texture, and a polished focal point.",
    icon: Layers,
  },
  {
    title: "Divide rooms with draped partitions",
    description:
      "Room divider draping separates cocktail areas, dining zones, and VIP spaces without permanent walls — keeping flow elegant and intentional.",
    icon: Columns3,
  },
  {
    title: "Build stage and photo moments",
    description:
      "Stage backdrop rentals and step-and-repeat setups create polished presentation areas and red-carpet photo opportunities.",
    icon: Camera,
  },
  {
    title: "Control light with blackout draping",
    description:
      "Blackout drape rentals mask windows, backstage areas, and unwanted light spill — essential for galas, productions, and presentations.",
    icon: EyeOff,
  },
  {
    title: "Deliver dramatic reveal moments",
    description:
      "Star drape and kabuki-style reveal draping creates unforgettable entrances and unveilings that captivate your audience.",
    icon: Star,
  },
];

export type ServiceCard = ImageAsset & {
  title: string;
  description: string;
  icon: LucideIcon;
};

export const serviceCards: ServiceCard[] = [
  {
    title: "Pipe & Drape Rentals",
    description:
      "Temporary pipe and drape systems for event walls, trade show booths, and venue perimeters. The foundation of most Montreal event draping — masking walls and defining spaces without construction.",
    icon: LayoutGrid,
    image: `${imagePaths.gallery}/event-room-transformation-draping-01.jpg`,
    alt: "Grand ballroom interior representing pipe and drape venue perimeter rental",
  },
  {
    title: "Wedding Draping",
    description:
      "Ceremony backdrops, sweetheart tables, and full-room wedding draping in Montreal. We shape the atmosphere around your venue — not sell off-the-rack curtains.",
    icon: Layers,
    image: `${imagePaths.services}/wedding-draping-service-01.jpg`,
    alt: "Elegant wedding draping with white fabric, candles, and refined event decor",
  },
  {
    title: "Corporate Event Draping",
    description:
      "Polished draping for conferences, product launches, and executive gatherings. Corporate event draping that elevates brand environments and presentation areas.",
    icon: Building2,
    image: `${imagePaths.gallery}/corporate-event-draping-backdrop-01.jpg`,
    alt: "Theater stage with red curtains for corporate event draping inspiration",
  },
  {
    title: "Stage Backdrops",
    description:
      "Stage backdrop rentals including surrounds, masking, and theatrical drape for presentations, performances, and gala programs.",
    icon: Theater,
    image: `${imagePaths.services}/stage-backdrop-rental-01.jpg`,
    alt: "Red velvet stage curtains hanging vertically for theatrical event backdrop rental",
  },
  {
    title: "Room Dividers",
    description:
      "Room divider draping creates intimate zones within ballrooms and event halls — separating cocktail, dining, and lounge areas with elegant fabric partitions.",
    icon: Columns3,
    image: `${imagePaths.gallery}/gala-ballroom-draping-01.jpg`,
    alt: "Ornate ballroom interior suited to room divider draping within large event spaces",
  },
  {
    title: "Blackout & Masking",
    description:
      "Blackout drape rentals for light control on stages, windows, and production areas. Essential when your event demands darkness, focus, or concealed backstage space.",
    icon: Moon,
    image: `${imagePaths.gallery}/black-velvet-drape-texture-01.jpg`,
    alt: "Black fabric texture representing blackout and masking drape rental",
  },
  {
    title: "Photo & Step-and-Repeat Backdrops",
    description:
      "Step-and-repeat backdrop rentals and branded photo walls for galas, launches, and celebrations. Designed to photograph beautifully under event lighting.",
    icon: Camera,
    image: `${imagePaths.gallery}/photo-backdrop-draping-01.jpg`,
    alt: "Elegant indoor event backdrop with floral decor for photo moments",
  },
  {
    title: "Star Drape & Reveal Moments",
    description:
      "Sparkling star drape and kabuki reveal setups for dramatic entrances and unveilings — a specialty drape rental for high-impact event moments.",
    icon: Star,
    image: `${imagePaths.gallery}/celebration-draping-backdrop-01.jpg`,
    alt: "Decorated celebration stage with drapery for dramatic reveal and entrance moments",
  },
];

export const aiPaths = [
  {
    title: "Upload a Floor Plan",
    description:
      "Future: upload a PDF, image, or sketch and identify drape zones, wall lengths, and setup needs for your Montreal venue.",
    icon: Upload,
  },
  {
    title: "Draw Your Room",
    description:
      "Available now: sketch a room manually, add drape runs and a stage, and inspect the same design in 3D.",
    icon: PenLine,
  },
  {
    title: "3D Drape Preview",
    description:
      "Coming soon: configure color, fullness, rail placement, height, and add-ons in an interactive drape studio built for event rental planning.",
    icon: Box,
  },
];

export const whyCards = [
  {
    title: "Luxury event finish",
    description:
      "Premium event curtain rentals with refined fabrics and installation details — every venue feels elevated, never like a basic rental catalog.",
  },
  {
    title: "Full-service drape rental",
    description:
      "Rental, delivery, professional installation, and teardown handled end to end. This is temporary event draping as a managed service.",
  },
  {
    title: "Clean installation and teardown",
    description:
      "Experienced crews respect your timeline, rig safely, and leave the venue ready — full-service drape installation and teardown included.",
  },
  {
    title: "Designed around your venue",
    description:
      "Every setup is shaped by your room, event type, and atmosphere goals — from gala drape rentals to full perimeter transformations.",
  },
  {
    title: "Hardware, safety, and details handled",
    description:
      "Uprights, horizontals, bases, sandbags, and safe rigging are part of the rental — not an afterthought.",
  },
  {
    title: "Montreal-focused service",
    description:
      "Event drape rentals for Montreal and surrounding areas, with local venue knowledge and responsive event-day support.",
  },
];

export type GalleryCategory = ImageAsset & {
  label: string;
  description: string;
  icon?: LucideIcon;
};

export const galleryCategories: GalleryCategory[] = [
  {
    label: "Weddings",
    description: "Wedding draping — ceremony backdrops, reception perimeters, and full-room transformations.",
    image: `${imagePaths.gallery}/wedding-draping-montreal-01.jpg`,
    alt: "Elegant wedding draping with white drapes and candlelit event decor",
  },
  {
    label: "Corporate Events",
    description: "Corporate event draping for conferences, launches, and branded environments.",
    image: `${imagePaths.gallery}/corporate-event-draping-backdrop-01.jpg`,
    alt: "Theater stage with red curtains and empty seating for corporate presentation draping",
  },
  {
    label: "Galas",
    description: "Gala drape rentals with perimeter draping, stages, and elegant fabric finishes.",
    image: `${imagePaths.gallery}/gala-ballroom-draping-01.jpg`,
    alt: "Ornate ballroom interior with stage for gala drape rental inspiration",
  },
  {
    label: "Mitzvahs",
    description: "Bar Mitzvah and Bat Mitzvah draping for celebration backdrops and room transformations.",
    image: `${imagePaths.gallery}/celebration-draping-backdrop-01.jpg`,
    alt: "Decorated celebration stage with drapery and warm event lighting",
  },
  {
    label: "Stage Backdrops",
    description: "Stage backdrop rentals including surrounds, masking, and presentation draping.",
    image: `${imagePaths.gallery}/stage-curtain-backdrop-rental-01.jpg`,
    alt: "Vertical red velvet stage curtains for event backdrop rental",
  },
  {
    label: "Room Transformations",
    description: "Venue transformation drape rentals that reshape entire event spaces.",
    image: `${imagePaths.gallery}/event-room-transformation-draping-01.jpg`,
    alt: "Grand ballroom interior representing full-room event transformation draping",
  },
];

export const galleryPageCategories: GalleryCategory[] = [
  {
    label: "Weddings",
    description:
      "Wedding draping in Montreal — ceremony backdrops, reception perimeter draping, and full-room transformations.",
    image: `${imagePaths.gallery}/wedding-draping-montreal-01.jpg`,
    alt: "Elegant wedding draping with white drapes and candlelit event decor",
    icon: Layers,
  },
  {
    label: "Corporate",
    description:
      "Corporate event draping for conferences, launches, and branded environments.",
    image: `${imagePaths.gallery}/corporate-event-draping-backdrop-01.jpg`,
    alt: "Theater stage with red curtains for corporate event draping inspiration",
    icon: Building2,
  },
  {
    label: "Galas",
    description:
      "Gala drape rentals that elevate ballrooms with perimeter draping, stages, and elegant fabric finishes.",
    image: `${imagePaths.gallery}/gala-ballroom-draping-01.jpg`,
    alt: "Ornate ballroom with stage for gala drape rental inspiration",
    icon: Crown,
  },
  {
    label: "Mitzvahs",
    description:
      "Bar Mitzvah and Bat Mitzvah draping for room transformations, stages, and celebration backdrops.",
    image: `${imagePaths.gallery}/celebration-draping-backdrop-01.jpg`,
    alt: "Celebration stage with drapery and warm event lighting",
    icon: PartyPopper,
  },
  {
    label: "Stage",
    description:
      "Stage backdrop rentals including surrounds, masking, and presentation draping.",
    image: `${imagePaths.gallery}/stage-curtain-backdrop-rental-01.jpg`,
    alt: "Red velvet stage curtains for backdrop rental inspiration",
    icon: Theater,
  },
  {
    label: "Room Transformation",
    description:
      "Venue transformation drape rentals that reshape entire rooms with perimeter and decorative draping.",
    image: `${imagePaths.gallery}/event-room-transformation-draping-01.jpg`,
    alt: "Grand ballroom interior for venue transformation draping inspiration",
    icon: LayoutGrid,
  },
  {
    label: "Blackout / Masking",
    description:
      "Blackout drape rentals for light control, window masking, and production concealment.",
    image: `${imagePaths.gallery}/black-velvet-drape-texture-01.jpg`,
    alt: "Black fabric texture representing blackout and masking drape rental",
    icon: Moon,
  },
  {
    label: "Photo Backdrops",
    description:
      "Step-and-repeat backdrop rentals and photo moment draping for events and galas.",
    image: `${imagePaths.gallery}/photo-backdrop-draping-01.jpg`,
    alt: "Elegant indoor event backdrop with floral decor for photo moments",
    icon: Camera,
  },
];

export const estimateSteps = [
  {
    title: "Event details",
    description: "Date, venue, guest count, and event type — wedding, corporate, gala, or mitzvah.",
  },
  {
    title: "Drape goal",
    description: "What you want to achieve — backdrop, perimeter, room dividers, stage masking, or full transformation.",
  },
  {
    title: "Measurements / floor plan",
    description: "Room dimensions or a venue floor plan to scope pipe and drape, height, and coverage.",
  },
  {
    title: "Fabric and color",
    description: "Drape style, color, fullness, and texture preferences for your event atmosphere.",
  },
  {
    title: "Add-ons",
    description: "Star drape, blackout zones, step-and-repeat, uplighting surrounds, and specialty elements.",
  },
  {
    title: "Review and submit",
    description: "Confirm your setup and request a final event drape rental estimate from our team.",
  },
];

export const aiFeatures = [
  "Rail placement",
  "Drape height",
  "Color selection",
  "Fullness",
  "Stage / backdrop placement",
  "Room dividers",
  "Blackout zones",
  "Add-ons",
  "Estimate request",
];
