import type { LucideIcon } from "lucide-react";
import {
  Building2,
  Crown,
  Heart,
  PartyPopper,
  Sparkles,
  Theater,
} from "lucide-react";

export type ReviewCategory =
  | "wedding"
  | "corporate"
  | "gala"
  | "mitzvah"
  | "venue"
  | "production";

export type ClientReview = {
  id: string;
  name: string;
  role: string;
  organization?: string;
  venue?: string;
  location: string;
  category: ReviewCategory;
  rating: 5;
  eventLabel: string;
  quote: string;
  featured?: boolean;
};

export type ReviewCategoryMeta = {
  id: ReviewCategory | "all";
  label: string;
  icon?: LucideIcon;
};

export const reviewCategories: ReviewCategoryMeta[] = [
  { id: "all", label: "All voices" },
  { id: "wedding", label: "Weddings", icon: Heart },
  { id: "corporate", label: "Corporate", icon: Building2 },
  { id: "gala", label: "Galas", icon: Crown },
  { id: "mitzvah", label: "Mitzvahs", icon: PartyPopper },
  { id: "venue", label: "Venues", icon: Sparkles },
  { id: "production", label: "Production", icon: Theater },
];

export const reviewStats = [
  { value: "5.0", label: "Average rating" },
  { value: "30+", label: "Client voices" },
  { value: "100%", label: "Full-service installs" },
  { value: "Montreal", label: "& surrounding areas" },
] as const;

export const clientReviews: ClientReview[] = [
  {
    id: "r01",
    name: "Sophie Marchessault",
    role: "Bride",
    venue: "Ritz-Carlton Montréal",
    location: "Montréal",
    category: "wedding",
    rating: 5,
    eventLabel: "January ballroom wedding",
    featured: true,
    quote:
      "Honestly the room looked completely different once the drape went up — softer, warmer, way better in photos than I expected. They were in and out without stressing anyone, and I didn't even know teardown happened until my coordinator told me the next day.",
  },
  {
    id: "r02",
    name: "Marc-André Lefebvre",
    role: "Event Director",
    organization: "Summit AV Productions",
    venue: "Palais des congrès",
    location: "Montréal",
    category: "corporate",
    rating: 5,
    eventLabel: "Product launch keynote",
    featured: true,
    quote:
      "Big LED wall, tight rigging schedule, no drama — that's what I needed. Their guys worked around our tech crew instead of getting in the way, and the masking looked clean on camera. Would book again for sure.",
  },
  {
    id: "r03",
    name: "Isabelle Fontaine",
    role: "Gala Chair",
    organization: "Montreal Children's Foundation",
    venue: "Hotel William Gray",
    location: "Old Montréal",
    category: "gala",
    rating: 5,
    eventLabel: "Charity gala",
    featured: true,
    quote:
      "People were commenting on the room before dinner even started, which never happens at our galas. The gold drape made a standard hotel ballroom feel like an actual black-tie night. Worth every line item on the budget.",
  },
  {
    id: "r04",
    name: "David Chen",
    role: "Planner",
    organization: "Lumière Events",
    location: "Westmount",
    category: "wedding",
    rating: 5,
    eventLabel: "Garden tent reception",
    quote:
      "Rain pushed everything back three hours and they still got the tent walls and backdrop done before guests walked in. My couple is still sending me photos of the fabric at sunset — I'm taking that as a win.",
  },
  {
    id: "r05",
    name: "Nadia Rahman",
    role: "Marketing VP",
    organization: "Northline Biotech",
    location: "Laval",
    category: "corporate",
    rating: 5,
    eventLabel: "Investor reception",
    quote:
      "We had ugly pillars and a weird registration corner. Pipe and drape fixed both without making the room feel boxed in. Quote was clear, crew was on time, nobody had to chase anyone for updates.",
  },
  {
    id: "r06",
    name: "Thomas Bergeron",
    role: "Father of the bar mitzvah",
    venue: "Congregation Shaar Hashomayim",
    location: "Westmount",
    category: "mitzvah",
    rating: 5,
    eventLabel: "Bat mitzvah party",
    quote:
      "We didn't want it to look like a kids' gymnasium, and it didn't. Nice backdrop for the hora, and the side lounge actually got used — my wife was shocked parents stayed off the dance floor that long.",
  },
  {
    id: "r07",
    name: "Émilie Gagnon",
    role: "Venue Manager",
    organization: "Le Salon 1861",
    location: "Montréal",
    category: "venue",
    rating: 5,
    eventLabel: "Repeat venue partner",
    quote:
      "We send a lot of drape requests their way. They know our load-in rules, they talk to catering instead of guessing, and the space is always left the way we need it for the next event.",
  },
  {
    id: "r08",
    name: "James Whitfield",
    role: "Production Manager",
    organization: "Stagecraft Montréal",
    venue: "Théâtre Maisonneuve",
    location: "Place des Arts",
    category: "production",
    rating: 5,
    eventLabel: "Award show dress rehearsal",
    quote:
      "Black legs, rear masking, all labelled — our LD was happy, which is rare. Show day had no drape surprises. In this business that's basically a five-star review.",
  },
  {
    id: "r09",
    name: "Camille Dubois",
    role: "Bride",
    venue: "Château Vaudreuil",
    location: "Vaudreuil-Dorion",
    category: "wedding",
    rating: 5,
    eventLabel: "Château ceremony & reception",
    quote:
      "I sent Pinterest photos and a Studio layout I made at midnight lol — and it still matched what I had in my head. Crew was super nice during photos, didn't hover or make awkward small talk.",
  },
  {
    id: "r10",
    name: "Robert Kowalski",
    role: "COO",
    organization: "Harbour Capital",
    location: "Montréal",
    category: "corporate",
    rating: 5,
    eventLabel: "Annual leadership summit",
    quote:
      "Breakout rooms, main stage, branded walls — one vendor handled all of it. Our lead actually replied to emails at 9 p.m. the week before. Small thing, but it mattered.",
  },
  {
    id: "r11",
    name: "Leah Cohen",
    role: "Mother of the mitzvah",
    venue: "Temple Emanu-El-Beth Sholom",
    location: "Westmount",
    category: "mitzvah",
    rating: 5,
    eventLabel: "Bar mitzvah party",
    quote:
      "Community hall, 200 people, needed it to feel special. Dance floor draping and a proper photo wall did the trick. Setup was done before we got there — not mid-appetizers like last time with another vendor.",
  },
  {
    id: "r12",
    name: "Antoine Mercier",
    role: "Creative Director",
    organization: "Maison Éclat",
    location: "Montréal",
    category: "gala",
    rating: 5,
    eventLabel: "Fashion fundraiser",
    quote:
      "Runway lighting is picky — warm spots, cool spots, photographers complaining about everything. Fabric choice was right though. Photos came back clean and we didn't have to fix it in post.",
  },
  {
    id: "r13",
    name: "Priya Sharma",
    role: "Planner",
    organization: "Two Peonies Co.",
    location: "Montréal",
    category: "wedding",
    rating: 5,
    eventLabel: "South Asian fusion wedding",
    quote:
      "Mandap, perimeter, separate lounge — a lot moving parts. No meltdowns, no last-minute 'that won't fit.' Bride cried when she saw the room. Groom pretended he didn't. Standard wedding stuff.",
  },
  {
    id: "r14",
    name: "François Tremblay",
    role: "GM",
    organization: "Hôtel Nelligan",
    location: "Old Montréal",
    category: "venue",
    rating: 5,
    eventLabel: "Hotel partner install",
    quote:
      "Freight elevator, floor protection, strike at 2 a.m. — they know the drill here. That's why we keep recommending them when couples ask for drape.",
  },
  {
    id: "r15",
    name: "Hannah Brooks",
    role: "Executive Assistant",
    organization: "Clarion Legal LLP",
    location: "Montréal",
    category: "corporate",
    rating: 5,
    eventLabel: "Partner retreat dinner",
    quote:
      "We turned a boring boardroom into something that actually felt like a private dinner. Quote had real numbers, not vague ranges. Partners noticed — one asked who did the draping.",
  },
  {
    id: "r16",
    name: "Michael O'Brien",
    role: "Technical Director",
    venue: "Club Soda",
    location: "Montréal",
    category: "production",
    rating: 5,
    eventLabel: "Live concert broadcast",
    quote:
      "Back wall was a mess for the broadcast cameras. Blackout masking fixed it. Safe rigging, fast strike after the encore — crew knew what they were doing.",
  },
  {
    id: "r17",
    name: "Valérie Poirier",
    role: "Bride",
    venue: "Espace C2",
    location: "Montréal",
    category: "wedding",
    rating: 5,
    eventLabel: "Modern loft wedding",
    quote:
      "Loft weddings can feel cold. Drape warmed it up without covering the windows we paid extra for. Our photographer said the sweetheart backdrop was the shot of the night — she's not usually that enthusiastic.",
  },
  {
    id: "r18",
    name: "Daniel Kim",
    role: "Events Lead",
    organization: "NeoHealth",
    location: "Brossard",
    category: "corporate",
    rating: 5,
    eventLabel: "National sales kickoff",
    quote:
      "Freight showed up late, not their fault, and they still got registration and both demo pods up before doors. Navy pipe and drape matched our brand colours — sounds small, but our CEO noticed.",
  },
  {
    id: "r19",
    name: "Rachel Stein",
    role: "Fundraising Director",
    organization: "Montreal Arts Council",
    location: "Montréal",
    category: "gala",
    rating: 5,
    eventLabel: "Arts patron dinner",
    quote:
      "Museum atrium, artwork everywhere, curators nervous about everything. Install respected clearances and still made the room feel intimate. Huge relief for our team.",
  },
  {
    id: "r20",
    name: "Gabriel Santos",
    role: "Planner",
    organization: "Velvet Circle Events",
    location: "Montréal",
    category: "wedding",
    rating: 5,
    eventLabel: "Destination-style hotel wedding",
    quote:
      "I don't add vendors to my short list easily. These guys stay on it — proposals make sense, finishing is tight, and I don't get texts from brides asking why drape looks wrinkled.",
  },
  {
    id: "r21",
    name: "Chloé Martin",
    role: "Event Chair",
    organization: "West Island Hospital Foundation",
    location: "Pointe-Claire",
    category: "gala",
    rating: 5,
    eventLabel: "Hospital foundation gala",
    quote:
      "We beat last year's numbers and I'm convinced the room had something to do with it. Stage drape drew eyes to the speakers without blocking views from the cheap seats — my board chair's words, not mine.",
  },
  {
    id: "r22",
    name: "Alexandre Roy",
    role: "Operations Manager",
    organization: "Montreal Auto Show",
    location: "Montréal",
    category: "corporate",
    rating: 5,
    eventLabel: "VIP preview lounge",
    quote:
      "Built overnight, gone before the public show opened. Temp walls hid all our storage chaos. Trade show timing is brutal and they didn't miss the window.",
  },
  {
    id: "r23",
    name: "Maya Patel",
    role: "Bride",
    venue: "Le Mount Stephen",
    location: "Montréal",
    category: "wedding",
    rating: 5,
    eventLabel: "Heritage hotel wedding",
    quote:
      "Old building, picky venue rules, lots of mouldings. They used floor mats, didn't scratch anything, and the drape worked with the room instead of fighting it. Venue manager thanked me — rare.",
  },
  {
    id: "r24",
    name: "Jonathan Walsh",
    role: "Producer",
    organization: "Lumen Broadcast",
    location: "Montréal",
    category: "production",
    rating: 5,
    eventLabel: "Televised gala taping",
    quote:
      "Director wanted a wall masked in twenty minutes. I didn't think it was possible. They pulled it off and the wide shots looked like a proper studio build. Saved my afternoon.",
  },
  {
    id: "r25",
    name: "Fatima El-Amin",
    role: "Community Organizer",
    venue: "Centre communautaire Côte-des-Neiges",
    location: "Montréal",
    category: "mitzvah",
    rating: 5,
    eventLabel: "Community celebration",
    quote:
      "Tight budget, still wanted it to look nice. They suggested focusing on backdrop, head table, and dance floor instead of draping the whole gym. Smart call — looked way more expensive than it was.",
  },
  {
    id: "r26",
    name: "Christine Lau",
    role: "Director of Events",
    organization: "Québec Finance Forum",
    location: "Montréal",
    category: "corporate",
    rating: 5,
    eventLabel: "Two-day conference",
    quote:
      "Two days, four rooms, same branding everywhere. Timelines were written down, crew names were on the sheet, changeovers happened when they said they would. I don't say that about every vendor.",
  },
  {
    id: "r27",
    name: "Olivier Bélanger",
    role: "Groom",
    venue: "Domaine Cataraqui",
    location: "Québec City area",
    category: "wedding",
    rating: 5,
    eventLabel: "Estate tent wedding",
    quote:
      "They drove up for our tent wedding and dealt with rain, mud, and a last-minute sidewall change without complaining. My mother-in-law still talks about how nice the crew was. I'll take it.",
  },
  {
    id: "r28",
    name: "Sandra Mitchell",
    role: "General Manager",
    organization: "Verde Hospitality",
    location: "Montréal",
    category: "venue",
    rating: 5,
    eventLabel: "Preferred vendor partner",
    quote:
      "Our guests expect vendors to act like hotel staff, not random contractors. These guys show up on time, read the BEO, and don't leave a mess for housekeeping. That's why we keep sending work their way.",
  },
  {
    id: "r29",
    name: "Kevin Nguyen",
    role: "Step-and-repeat Producer",
    organization: "Red Carpet Montréal",
    location: "Montréal",
    category: "production",
    rating: 5,
    eventLabel: "Press wall & masking",
    quote:
      "Square corners, no sagging panels, photographers stopped complaining — my three metrics for a good press wall. Already booked them for our next premiere.",
  },
  {
    id: "r30",
    name: "Amélie Caron",
    role: "Bride",
    venue: "Arthurs Bar & Grill private event",
    location: "Saint-Henri",
    category: "wedding",
    rating: 5,
    eventLabel: "Intimate restaurant wedding",
    quote:
      "Forty guests, weird corner by the bar, needed a ceremony spot. They made it the prettiest part of the room. Two cousins asked if we'd renovated. We didn't — just good drape.",
  },
];

export function getReviewsByCategory(category: ReviewCategory | "all") {
  if (category === "all") return clientReviews;
  return clientReviews.filter((review) => review.category === category);
}

export function getFeaturedReviews() {
  return clientReviews.filter((review) => review.featured);
}

export function getReviewCategoryLabel(category: ReviewCategory): string {
  return reviewCategories.find((item) => item.id === category)?.label ?? category;
}

export function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
