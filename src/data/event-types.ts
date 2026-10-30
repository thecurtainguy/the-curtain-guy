import type { LucideIcon } from "lucide-react";
import {
  Baby,
  Building2,
  Cake,
  Camera,
  Church,
  Crown,
  Gem,
  GraduationCap,
  Heart,
  Landmark,
  Layers,
  LayoutGrid,
  Mic,
  Music,
  PartyPopper,
  Sparkles,
  Star,
  Theater,
  Trophy,
  Utensils,
  Wand2,
} from "lucide-react";

export const EVENT_TYPE_ICONS = {
  layers: Layers,
  heart: Heart,
  gem: Gem,
  church: Church,
  building: Building2,
  crown: Crown,
  party: PartyPopper,
  cake: Cake,
  baby: Baby,
  graduation: GraduationCap,
  theater: Theater,
  music: Music,
  mic: Mic,
  grid: LayoutGrid,
  landmark: Landmark,
  utensils: Utensils,
  trophy: Trophy,
  camera: Camera,
  star: Star,
  sparkles: Sparkles,
  wand: Wand2,
} satisfies Record<string, LucideIcon>;

export type EventTypeIconKey = keyof typeof EVENT_TYPE_ICONS;

export const EVENT_TYPE_ICON_KEYS = Object.keys(EVENT_TYPE_ICONS) as EventTypeIconKey[];

export type EventType = {
  id: string;
  label: string;
  /** Blank falls back to the English label. */
  label_fr: string;
  icon: EventTypeIconKey;
  sort_order: number;
  /** Hidden types stay valid for existing records but are not offered in pickers. */
  active: boolean;
};

export type EventTypeUsage = {
  estimates: number;
  event_plans: number;
  quotes: number;
  invoices: number;
  jobs: number;
  studio_designs: number;
  products: number;
};

export const EVENT_TYPE_USAGE_LABELS: Record<keyof EventTypeUsage, string> = {
  estimates: "Estimates",
  event_plans: "Event plans",
  quotes: "Quotes",
  invoices: "Invoices",
  jobs: "Jobs",
  studio_designs: "Studio designs",
  products: "Products",
};

export function totalEventTypeUsage(usage: EventTypeUsage | undefined): number {
  if (!usage) return 0;
  return Object.values(usage).reduce((sum, count) => sum + count, 0);
}

export const EVENT_TYPE_LABEL_MAX = 60;

/** Used until the database list loads, and if it ever fails to load. */
export const DEFAULT_EVENT_TYPES: EventType[] = [
  { id: "wedding", label: "Wedding", label_fr: "Mariage", icon: "layers", sort_order: 10, active: true },
  { id: "corporate", label: "Corporate Event", label_fr: "Événement corporatif", icon: "building", sort_order: 20, active: true },
  { id: "gala", label: "Gala", label_fr: "Gala", icon: "crown", sort_order: 30, active: true },
  { id: "mitzvah", label: "Bar/Bat Mitzvah", label_fr: "Bar/Bat Mitzvah", icon: "party", sort_order: 40, active: true },
  { id: "stage-show", label: "Stage/Show", label_fr: "Scène/Show", icon: "theater", sort_order: 50, active: true },
  { id: "trade-show", label: "Trade Show", label_fr: "Salon professionnel", icon: "grid", sort_order: 60, active: true },
  { id: "private", label: "Private Event", label_fr: "Événement privé", icon: "sparkles", sort_order: 70, active: true },
  { id: "other", label: "Other", label_fr: "Autre", icon: "wand", sort_order: 80, active: true },
];

let catalog: EventType[] = DEFAULT_EVENT_TYPES;

/**
 * Module-level copy of the managed list so synchronous label helpers (emails,
 * PDFs, brief builders) resolve custom types. Primed by the server loader and
 * by the client provider.
 */
export function setEventTypeCatalog(types: EventType[]): void {
  if (types.length > 0) catalog = types;
}

export function getEventTypeCatalog(): EventType[] {
  return catalog;
}

export function getActiveEventTypes(types: EventType[] = catalog): EventType[] {
  return types.filter((type) => type.active);
}

export function findEventType(
  id: string | null | undefined,
  types: EventType[] = catalog
): EventType | undefined {
  if (!id) return undefined;
  return types.find((type) => type.id === id);
}

export function isKnownEventType(value: unknown, types: EventType[] = catalog): value is string {
  return typeof value === "string" && types.some((type) => type.id === value);
}

export function eventTypeDisplayLabel(type: EventType, language: "en" | "fr" = "en"): string {
  return language === "fr" ? type.label_fr.trim() || type.label : type.label;
}

export function getEventTypeLabel(
  id: string | null | undefined,
  language: "en" | "fr" = "en",
  types: EventType[] = catalog
): string | undefined {
  const type = findEventType(id, types) ?? findEventType(id, DEFAULT_EVENT_TYPES);
  return type ? eventTypeDisplayLabel(type, language) : undefined;
}

export function getEventTypeIcon(
  id: string | null | undefined,
  types: EventType[] = catalog
): LucideIcon | undefined {
  const type = findEventType(id, types) ?? findEventType(id, DEFAULT_EVENT_TYPES);
  return type ? EVENT_TYPE_ICONS[type.icon] : undefined;
}

export function isEventTypeIconKey(value: unknown): value is EventTypeIconKey {
  return typeof value === "string" && value in EVENT_TYPE_ICONS;
}

export function slugifyEventTypeLabel(label: string): string {
  return label
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}
