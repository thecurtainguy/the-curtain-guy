import { getEnglishOptionLabel } from "@/data/estimate";
import type { EventBuilderBrief } from "@/data/event-builder/brief";
import {
  getEventCatalogLabel,
  roomPreviewStats,
} from "@/data/event-builder/catalog";
import { DRAPE_COLORS, type StudioDesignJson } from "@/data/studio";
import { estimateLinearDrapeFromBrief } from "@/lib/event-builder/build-starter-design";
import {
  calculateDrapeLength,
  calculateRoomAreaSquareFeet,
  inchesToFeetLabel,
} from "@/lib/studio-geometry";
import type { CustomerLanguage } from "@/data/customer-language";
import frEstimate from "../../../messages/fr/estimate.json";
import frEventBuilder from "../../../messages/fr/eventBuilder.json";

type OptionGroup = Parameters<typeof getEnglishOptionLabel>[0];

const SUMMARY_LABELS = {
  en: {
    contact: "Contact",
    name: "Name",
    email: "Email",
    phone: "Phone",
    notes: "Notes",
    event: "Event",
    eventType: "Event type",
    eventDate: "Event date",
    venue: "Venue",
    cityArea: "City / area",
    room: "Room",
    shape: "Shape",
    lShape: "L-shape",
    rectangle: "Rectangle",
    dimensions: "Dimensions",
    ceiling: "Ceiling",
    floorArea: "Floor area",
    previewArea: "Preview area",
    setupsTitle: "Selected setups",
    setups: "Setups",
    treatments: "Treatments in design",
    drapeRuns: "Drape runs in design",
    look: "Look & fabric",
    fabric: "Fabric direction",
    color: "Primary color",
    fullness: "Fullness",
    linearPreview: "Linear drape (preview)",
    linearBrief: "Linear drape (brief calc)",
    addOns: "Add-ons",
    selected: "Selected",
    reference: "Event plan reference",
  },
  fr: {
    contact: "Coordonnées",
    name: "Nom",
    email: "Courriel",
    phone: "Téléphone",
    notes: "Notes",
    event: "Événement",
    eventType: "Type d’événement",
    eventDate: "Date de l’événement",
    venue: "Lieu",
    cityArea: "Ville / secteur",
    room: "Salle",
    shape: "Forme",
    lShape: "En L",
    rectangle: "Rectangle",
    dimensions: "Dimensions",
    ceiling: "Plafond",
    floorArea: "Superficie",
    previewArea: "Superficie (aperçu)",
    setupsTitle: "Installations choisies",
    setups: "Installations",
    treatments: "Traitements dans le plan",
    drapeRuns: "Lignes de draperie dans le plan",
    look: "Style et tissu",
    fabric: "Orientation du tissu",
    color: "Couleur principale",
    fullness: "Ampleur",
    linearPreview: "Draperie linéaire (aperçu)",
    linearBrief: "Draperie linéaire (calcul du brief)",
    addOns: "Ajouts",
    selected: "Sélection",
    reference: "Référence du plan d’événement",
  },
} as const;

function optionLabel(
  group: OptionGroup,
  id: string,
  language: CustomerLanguage
): string | undefined {
  if (language === "fr") {
    const groupOptions = (
      frEstimate.options as Record<string, Record<string, { label?: string }>>
    )[group];
    const label = groupOptions?.[id]?.label;
    if (label) return label;
  }
  return getEnglishOptionLabel(group, id);
}

function optionLabels(
  group: OptionGroup,
  ids: string[],
  language: CustomerLanguage
): string[] {
  return ids
    .map((id) => optionLabel(group, id, language))
    .filter((label): label is string => Boolean(label));
}

function catalogLabel(id: string, language: CustomerLanguage): string {
  if (language === "fr") {
    const items = frEventBuilder.catalog.items as Record<
      string,
      { label?: string }
    >;
    if (items[id]?.label) return items[id].label!;
  }
  return getEventCatalogLabel(id);
}

export type EventPlanSummarySection = {
  title: string;
  rows: Array<{ label: string; value: string }>;
};

export function formatEventPlanSummary(
  brief: EventBuilderBrief,
  design: StudioDesignJson,
  contact?: {
    name?: string;
    email?: string;
    phone?: string;
    notes?: string;
  },
  language: CustomerLanguage = "en"
): EventPlanSummarySection[] {
  const L = SUMMARY_LABELS[language];
  const eventTypeLabel =
    optionLabel("eventTypes", brief.eventType, language) ??
    brief.eventType ??
    "—";
  const frColors = frEventBuilder.colors as Record<string, string>;
  const colorLabel =
    (language === "fr" ? frColors[brief.look.primaryColor] : undefined) ??
    DRAPE_COLORS.find((c) => c.value === brief.look.primaryColor)?.label ??
    brief.look.primaryColor;
  const fabricLabels = optionLabels(
    "fabricDirections",
    brief.look.fabricDirections,
    language
  );
  const addOnLabels = optionLabels("addOns", brief.addOns, language);
  const setupLabels = brief.catalogSelections.map((id) =>
    catalogLabel(id, language)
  );
  const numberLocale = language === "fr" ? "fr-CA" : "en-CA";
  const stats = roomPreviewStats(brief);
  const linearFromDesign = inchesToFeetLabel(calculateDrapeLength(design));
  const areaSqFt = Math.round(
    calculateRoomAreaSquareFeet(design.room.floor)
  );

  const sections: EventPlanSummarySection[] = [];

  if (contact?.name || contact?.email) {
    sections.push({
      title: L.contact,
      rows: [
        { label: L.name, value: contact.name?.trim() || "—" },
        { label: L.email, value: contact.email?.trim() || "—" },
        { label: L.phone, value: contact.phone?.trim() || "—" },
        { label: L.notes, value: contact.notes?.trim() || "—" },
      ],
    });
  }

  sections.push({
    title: L.event,
    rows: [
      { label: L.eventType, value: eventTypeLabel },
      { label: L.eventDate, value: brief.eventDate?.trim() || "—" },
      { label: L.venue, value: brief.venueName?.trim() || "—" },
      { label: L.cityArea, value: brief.cityArea?.trim() || "—" },
    ],
  });

  sections.push({
    title: L.room,
    rows: [
      {
        label: L.shape,
        value: brief.room.shape === "l_shape" ? L.lShape : L.rectangle,
      },
      {
        label: L.dimensions,
        value: `${brief.room.widthFt}′ × ${brief.room.lengthFt}′`,
      },
      { label: L.ceiling, value: `${brief.room.wallHeightFt}′` },
      {
        label: L.floorArea,
        value: `${areaSqFt.toLocaleString(numberLocale)} ${language === "fr" ? "pi²" : "ft²"}`,
      },
      {
        label: L.previewArea,
        value: `${stats.areaSqFt.toLocaleString(numberLocale)} ${language === "fr" ? "pi²" : "ft²"}`,
      },
    ],
  });

  sections.push({
    title: L.setupsTitle,
    rows: [
      {
        label: L.setups,
        value: setupLabels.length > 0 ? setupLabels.join(", ") : "—",
      },
      {
        label: L.treatments,
        value: String(design.treatments.length),
      },
      {
        label: L.drapeRuns,
        value: String(design.drapeRuns.length),
      },
    ],
  });

  sections.push({
    title: L.look,
    rows: [
      {
        label: L.fabric,
        value: fabricLabels.length > 0 ? fabricLabels.join(", ") : "—",
      },
      { label: L.color, value: colorLabel },
      { label: L.fullness, value: String(brief.look.fullness) },
      {
        label: L.linearPreview,
        value: linearFromDesign,
      },
      {
        label: L.linearBrief,
        value: inchesToFeetLabel(estimateLinearDrapeFromBrief(brief)),
      },
    ],
  });

  if (addOnLabels.length > 0) {
    sections.push({
      title: L.addOns,
      rows: [{ label: L.selected, value: addOnLabels.join(", ") }],
    });
  }

  return sections;
}

export function formatEventPlanSummaryText(
  reference: string,
  sections: EventPlanSummarySection[],
  language: CustomerLanguage = "en"
): string {
  const lines: string[] = [
    `${SUMMARY_LABELS[language].reference}: ${reference}`,
    "",
  ];
  for (const section of sections) {
    lines.push(section.title);
    for (const row of section.rows) {
      lines.push(`  ${row.label}: ${row.value}`);
    }
    lines.push("");
  }
  return lines.join("\n").trim();
}
