import {
  getEnglishOptionLabel,
  getEnglishOptionLabels,
} from "@/data/estimate";
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
  }
): EventPlanSummarySection[] {
  const eventTypeLabel =
    getEnglishOptionLabel("eventTypes", brief.eventType) ??
    brief.eventType ??
    "—";
  const colorLabel =
    DRAPE_COLORS.find((c) => c.value === brief.look.primaryColor)?.label ??
    brief.look.primaryColor;
  const fabricLabels = getEnglishOptionLabels(
    "fabricDirections",
    brief.look.fabricDirections
  );
  const addOnLabels = getEnglishOptionLabels("addOns", brief.addOns);
  const setupLabels = brief.catalogSelections.map(getEventCatalogLabel);
  const stats = roomPreviewStats(brief);
  const linearFromDesign = inchesToFeetLabel(calculateDrapeLength(design));
  const areaSqFt = Math.round(
    calculateRoomAreaSquareFeet(design.room.floor)
  );

  const sections: EventPlanSummarySection[] = [];

  if (contact?.name || contact?.email) {
    sections.push({
      title: "Contact",
      rows: [
        { label: "Name", value: contact.name?.trim() || "—" },
        { label: "Email", value: contact.email?.trim() || "—" },
        { label: "Phone", value: contact.phone?.trim() || "—" },
        { label: "Notes", value: contact.notes?.trim() || "—" },
      ],
    });
  }

  sections.push({
    title: "Event",
    rows: [
      { label: "Event type", value: eventTypeLabel },
      { label: "Event date", value: brief.eventDate?.trim() || "—" },
      { label: "Venue", value: brief.venueName?.trim() || "—" },
      { label: "City / area", value: brief.cityArea?.trim() || "—" },
    ],
  });

  sections.push({
    title: "Room",
    rows: [
      {
        label: "Shape",
        value: brief.room.shape === "l_shape" ? "L-shape" : "Rectangle",
      },
      {
        label: "Dimensions",
        value: `${brief.room.widthFt}′ × ${brief.room.lengthFt}′`,
      },
      { label: "Ceiling", value: `${brief.room.wallHeightFt}′` },
      { label: "Floor area", value: `${areaSqFt.toLocaleString()} ft²` },
      {
        label: "Preview area",
        value: `${stats.areaSqFt.toLocaleString()} ft²`,
      },
    ],
  });

  sections.push({
    title: "Selected setups",
    rows: [
      {
        label: "Setups",
        value: setupLabels.length > 0 ? setupLabels.join(", ") : "—",
      },
      {
        label: "Treatments in design",
        value: String(design.treatments.length),
      },
      {
        label: "Drape runs in design",
        value: String(design.drapeRuns.length),
      },
    ],
  });

  sections.push({
    title: "Look & fabric",
    rows: [
      {
        label: "Fabric direction",
        value: fabricLabels.length > 0 ? fabricLabels.join(", ") : "—",
      },
      { label: "Primary color", value: colorLabel },
      { label: "Fullness", value: String(brief.look.fullness) },
      {
        label: "Linear drape (preview)",
        value: linearFromDesign,
      },
      {
        label: "Linear drape (brief calc)",
        value: inchesToFeetLabel(estimateLinearDrapeFromBrief(brief)),
      },
    ],
  });

  if (addOnLabels.length > 0) {
    sections.push({
      title: "Add-ons",
      rows: [{ label: "Selected", value: addOnLabels.join(", ") }],
    });
  }

  return sections;
}

export function formatEventPlanSummaryText(
  reference: string,
  sections: EventPlanSummarySection[]
): string {
  const lines: string[] = [
    `Event plan reference: ${reference}`,
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
