import type { CustomerLanguage } from "@/data/customer-language";
import { formatDisplayTime, parseDisplayTime } from "@/lib/time";

/** Optional schedule on a quote. Same columns (and time text format) as event_jobs. */
export type QuoteSchedule = {
  event_date: string | null;
  event_start_time?: string | null;
  event_end_time?: string | null;
  install_date?: string | null;
  install_start_time?: string | null;
  install_end_time?: string | null;
  teardown_date?: string | null;
  teardown_start_time?: string | null;
  teardown_end_time?: string | null;
};

export const QUOTE_SCHEDULE_TIME_FIELDS = [
  "event_start_time",
  "event_end_time",
  "install_start_time",
  "install_end_time",
  "teardown_start_time",
  "teardown_end_time",
] as const;

export const QUOTE_SCHEDULE_DATE_FIELDS = ["install_date", "teardown_date"] as const;

export type QuoteScheduleKey = "event" | "install" | "teardown";

export const QUOTE_SCHEDULE_COPY: Record<
  CustomerLanguage,
  Record<QuoteScheduleKey, string> & {
    title: string;
    description: string;
    from: string;
    until: string;
  }
> = {
  en: {
    title: "Schedule",
    description: "Event, install, and teardown timing for your date.",
    event: "Event",
    install: "Install",
    teardown: "Teardown",
    from: "From",
    until: "Until",
  },
  fr: {
    title: "Horaire",
    description: "Heures de l’événement, de l’installation et du démontage.",
    event: "Événement",
    install: "Installation",
    teardown: "Démontage",
    from: "À partir de",
    until: "Jusqu’à",
  },
};

/**
 * Normalizes a time to the stored display format ("6:00 PM").
 * Returns null when empty and undefined when it can't be parsed.
 */
export function normalizeScheduleTime(value: unknown): string | null | undefined {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return undefined;
  if (!value.trim()) return null;
  const parts = parseDisplayTime(value);
  return parts ? formatDisplayTime(parts) : undefined;
}

export function formatScheduleTime(
  value: string | null | undefined,
  language: CustomerLanguage
): string | null {
  const parts = parseDisplayTime(value ?? undefined);
  if (!parts) return value?.trim() || null;
  if (language === "en") return formatDisplayTime(parts);
  let hour24 = parts.hour % 12;
  if (parts.period === "PM") hour24 += 12;
  return parts.minute
    ? `${hour24} h ${String(parts.minute).padStart(2, "0")}`
    : `${hour24} h`;
}

export function formatTimeWindow(
  start: string | null | undefined,
  end: string | null | undefined,
  language: CustomerLanguage
): string | null {
  const copy = QUOTE_SCHEDULE_COPY[language];
  const from = formatScheduleTime(start, language);
  const to = formatScheduleTime(end, language);
  if (from && to) return `${from} – ${to}`;
  if (from) return `${copy.from} ${from}`;
  if (to) return `${copy.until} ${to}`;
  return null;
}

export type QuoteScheduleRow = {
  key: QuoteScheduleKey;
  label: string;
  date: string | null;
  window: string | null;
};

/** Install / teardown / event-time rows worth showing to the customer, or [] when none are set. */
export function quoteScheduleRows(
  quote: QuoteSchedule,
  language: CustomerLanguage
): QuoteScheduleRow[] {
  const copy = QUOTE_SCHEDULE_COPY[language];
  const eventWindow = formatTimeWindow(quote.event_start_time, quote.event_end_time, language);
  const installWindow = formatTimeWindow(quote.install_start_time, quote.install_end_time, language);
  const teardownWindow = formatTimeWindow(
    quote.teardown_start_time,
    quote.teardown_end_time,
    language
  );
  const rows: QuoteScheduleRow[] = [];
  if (quote.install_date || installWindow) {
    rows.push({ key: "install", label: copy.install, date: quote.install_date ?? null, window: installWindow });
  }
  if (eventWindow || rows.length || quote.teardown_date || teardownWindow) {
    rows.push({ key: "event", label: copy.event, date: quote.event_date, window: eventWindow });
  }
  if (quote.teardown_date || teardownWindow) {
    rows.push({ key: "teardown", label: copy.teardown, date: quote.teardown_date ?? null, window: teardownWindow });
  }
  return rows;
}
