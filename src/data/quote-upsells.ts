import type { LucideIcon } from "lucide-react";
import {
  Building2,
  Camera,
  Columns3,
  EyeOff,
  Layers,
  LayoutGrid,
  Lightbulb,
  Monitor,
  Music,
  PartyPopper,
  Sparkles,
  Star,
  Theater,
  Timer,
} from "lucide-react";
import { addOnOptions, getEnglishOptionLabel } from "@/data/estimate";
import { services } from "@/data/services";

export type QuoteUpsellType = "service" | "add_on";
export type QuoteUpsellSource = "estimate_addon" | "service_page";

export type QuoteUpsellItem = {
  key: string;
  title: string;
  description: string;
  type: QuoteUpsellType;
  source: QuoteUpsellSource;
  route?: string;
  icon?: LucideIcon;
  statusLabelDefault: string;
  ownerReviewRequired: true;
};

const ADDON_DESCRIPTIONS: Record<string, string> = {
  uplighting: "Accent lighting to elevate fabric and room atmosphere.",
  "star-drape": "Starfield fabric look for ceilings or feature walls.",
  "kabuki-reveal": "Reveal moment for entrances, stages, or photo cues.",
  "event-carpet": "Carpet runs for entrances, aisles, or VIP zones.",
  stanchions: "Ropes and stanchions for queueing or VIP framing.",
  "screen-surround": "Fabric framing around screens or projection.",
  "dj-booth": "Surround draping for DJ or tech booth areas.",
  "step-repeat": "Step-and-repeat or branded photo backdrop.",
  "ceiling-draping": "Soft ceiling treatment for ballrooms and halls.",
  "double-sided": "Double-faced drape for two-sided visibility.",
  "premium-hardware": "Elevated hardware finish where it shows.",
  "rush-setup": "Compressed install window or rush timeline support.",
};

const SERVICE_DESCRIPTIONS: Record<string, string> = {
  "wedding-draping":
    "Ceremony and reception draping for weddings — backdrops, room softens, and photo moments.",
  "pipe-and-drape-rental":
    "Pipe and drape rental systems for flexible room shaping and masking.",
  "corporate-event-draping":
    "Corporate event draping for stages, branding zones, and polished venue transforms.",
  "stage-backdrop-rentals":
    "Stage backdrop rentals for presentations, performances, and focal walls.",
  "blackout-room-divider-drapes":
    "Blackout and room-divider drapes for light control and space separation.",
  "bar-bat-mitzvah-draping":
    "Bar and Bat Mitzvah draping for celebration rooms, stages, and photo areas.",
};

const SERVICE_ICONS: Record<string, LucideIcon> = {
  "wedding-draping": Layers,
  "pipe-and-drape-rental": Columns3,
  "corporate-event-draping": Building2,
  "stage-backdrop-rentals": Theater,
  "blackout-room-divider-drapes": EyeOff,
  "bar-bat-mitzvah-draping": PartyPopper,
};

const FALLBACK_ADDON_ICONS: Record<string, LucideIcon> = {
  uplighting: Lightbulb,
  "star-drape": Star,
  "kabuki-reveal": Theater,
  "event-carpet": LayoutGrid,
  stanchions: Columns3,
  "screen-surround": Monitor,
  "dj-booth": Music,
  "step-repeat": Camera,
  "ceiling-draping": Layers,
  "double-sided": Columns3,
  "premium-hardware": Sparkles,
  "rush-setup": Timer,
};

function buildAddOnUpsells(): QuoteUpsellItem[] {
  return addOnOptions.map((option) => ({
    key: option.id,
    title: getEnglishOptionLabel("addOns", option.id) ?? option.id,
    description:
      ADDON_DESCRIPTIONS[option.id] ??
      "Optional enhancement for your draping proposal.",
    type: "add_on" as const,
    source: "estimate_addon" as const,
    icon: option.icon ?? FALLBACK_ADDON_ICONS[option.id],
    statusLabelDefault: "Available to request",
    ownerReviewRequired: true as const,
  }));
}

function buildServiceUpsells(): QuoteUpsellItem[] {
  return services.map((service) => ({
    key: service.slug,
    title: service.title,
    description:
      SERVICE_DESCRIPTIONS[service.slug] ?? service.hubCardDescription,
    type: "service" as const,
    source: "service_page" as const,
    route: `/services/${service.slug}`,
    icon: SERVICE_ICONS[service.slug] ?? service.icon,
    statusLabelDefault: "Available to request",
    ownerReviewRequired: true as const,
  }));
}

export const quoteUpsells: QuoteUpsellItem[] = [
  ...buildAddOnUpsells(),
  ...buildServiceUpsells(),
];

export function getQuoteUpsellByKey(key: string): QuoteUpsellItem | undefined {
  return quoteUpsells.find((item) => item.key === key);
}

export function getAddOnUpsells(): QuoteUpsellItem[] {
  return quoteUpsells.filter((item) => item.type === "add_on");
}

export function getServiceUpsells(): QuoteUpsellItem[] {
  return quoteUpsells.filter((item) => item.type === "service");
}
