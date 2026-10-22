import type { CustomerLanguage } from "@/data/customer-language";
import {
  STUDIO_EVENT_TYPE_LABELS,
  type StudioEventDetails,
} from "@/data/studio-leads";
import type { ProductEventTypeId } from "@/data/product-colors";

const STUDIO_EVENT_TYPE_LABELS_FR: Record<ProductEventTypeId, string> = {
  wedding: "Mariage",
  corporate: "Événement corporatif",
  gala: "Gala",
  mitzvah: "Bar/Bat Mitzvah",
  "stage-show": "Scène/Spectacle",
  "trade-show": "Salon professionnel",
  private: "Événement privé",
  other: "Autre",
};

export function studioEventTypeLabel(
  eventType: StudioEventDetails["eventType"],
  language: CustomerLanguage = "en"
): string | null {
  if (!eventType) return null;
  return language === "fr"
    ? STUDIO_EVENT_TYPE_LABELS_FR[eventType]
    : STUDIO_EVENT_TYPE_LABELS[eventType];
}

/** "Jun 14" this year, "Jun 14, 2027" otherwise. Dates are calendar days (no timezone shift). */
export function formatStudioEventDate(
  isoDate: string | null,
  language: CustomerLanguage = "en",
  style: "short" | "long" = "short"
): string | null {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null;
  const date = new Date(`${isoDate}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  const sameYear = date.getUTCFullYear() === new Date().getUTCFullYear();
  return new Intl.DateTimeFormat(language === "fr" ? "fr-CA" : "en-CA", {
    month: style === "long" ? "long" : "short",
    day: "numeric",
    ...(style === "long" || !sameYear ? { year: "numeric" } : {}),
    ...(style === "long" ? { weekday: "long" } : {}),
    timeZone: "UTC",
  }).format(date);
}

export function formatStudioGuestCount(
  guestCount: number | null,
  language: CustomerLanguage = "en"
): string | null {
  if (!guestCount) return null;
  const count = guestCount.toLocaleString(language === "fr" ? "fr-CA" : "en-CA");
  if (language === "fr") return `${count} invité${guestCount > 1 ? "s" : ""}`;
  return `${count} guest${guestCount === 1 ? "" : "s"}`;
}

/** Compact one-line summary, e.g. "Smith Wedding · Jun 14 · 180 guests". */
export function formatStudioEventSummary(
  details: StudioEventDetails,
  language: CustomerLanguage = "en"
): string {
  const name = details.eventName ?? studioEventTypeLabel(details.eventType, language);
  return [
    name,
    formatStudioEventDate(details.eventDate, language),
    formatStudioGuestCount(details.guestCount, language),
  ]
    .filter((part): part is string => Boolean(part))
    .join(" · ");
}

export function hasStudioEventDetails(details: StudioEventDetails): boolean {
  return Boolean(
    details.eventName ||
      details.eventType ||
      details.eventDate ||
      details.guestCount ||
      details.venueName ||
      details.cityArea
  );
}
